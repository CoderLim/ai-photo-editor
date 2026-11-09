import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';

import { AIMediaType, type AITaskResult } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask, type AiTask } from '@/config/db/schema';
import {
  AITaskStatus,
  ensureTaskRefund,
  findTask,
  updateTask,
} from '@/modules/ai-tasks/service';

import {
  PHOTO_EDIT_MISSING_PROVIDER_ID_MS,
  PHOTO_EDIT_STALE_MS,
} from './config';
import { createPhotoProvider, persistPhotoOutput } from './service';

/** Cap provider queries when reconciling a history list in one request. */
export const PHOTO_EDIT_LIST_PROVIDER_BUDGET = 3;

export type PhotoEditReconcileDeps = {
  now?: number;
  /** When set, skip the live provider query (e.g. verified webhook payload). */
  remote?: AITaskResult;
  queryProvider?: (task: AiTask) => Promise<AITaskResult>;
  persistOutput?: (url: string, taskId: string) => Promise<string>;
  /**
   * Webhook path: surface transient failures so the HTTP handler can return
   * 5xx and let the provider retry. Poll/list/cron keep the default (false).
   */
  throwOnError?: boolean;
};

function createdAtMs(task: AiTask): number {
  const value = task.createdAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

async function markFailed(taskId: string): Promise<AiTask> {
  await updateTask({ taskId, status: AITaskStatus.FAILED });
  const settled = (await findTask(taskId))!;
  await ensureTaskRefund(settled);
  return settled;
}

function toolFromOptions(
  options: string | null | undefined
): 'edit' | 'remove-background' {
  try {
    const parsed = JSON.parse(options || '{}');
    return parsed?.tool === 'remove-background' ? 'remove-background' : 'edit';
  } catch {
    return 'edit';
  }
}

async function defaultQueryProvider(task: AiTask): Promise<AITaskResult> {
  const provider = await createPhotoProvider(
    task.provider,
    toolFromOptions(task.options)
  );
  if (!provider.instance.query) {
    throw new Error('Provider does not support status queries');
  }
  return provider.instance.query({
    taskId: task.taskId!,
    mediaType: AIMediaType.IMAGE,
    model: task.model,
  });
}

/**
 * Advance one photo-edit ai_task toward a terminal status.
 * Safe to call from client polls, history lists, admin pages, webhooks, or a cron sweep.
 */
export async function reconcilePhotoEditTask(
  task: AiTask,
  deps: PhotoEditReconcileDeps = {}
): Promise<AiTask> {
  if (
    task.status !== AITaskStatus.PENDING &&
    task.status !== AITaskStatus.PROCESSING
  ) {
    await ensureTaskRefund(task);
    return task;
  }
  if (!task.id.startsWith('edit_')) return task;

  const now = deps.now ?? Date.now();
  const age = now - createdAtMs(task);
  const throwOnError = deps.throwOnError === true;

  if (!task.taskId) {
    if (age > PHOTO_EDIT_MISSING_PROVIDER_ID_MS) {
      return markFailed(task.id);
    }
    return task;
  }

  const queryProvider = deps.queryProvider ?? defaultQueryProvider;
  const persistOutput = deps.persistOutput ?? persistPhotoOutput;

  try {
    const remote = deps.remote ?? (await queryProvider(task));
    if (remote.taskStatus === AITaskStatus.SUCCESS) {
      const original = remote.taskInfo?.images?.[0]?.imageUrl;
      if (!original) {
        // Provider finished but output is gone/unparseable (e.g. Replicate
        // data_removed). Do not leave credits held in pending forever.
        return markFailed(task.id);
      }
      const stored = await persistOutput(original, task.id);
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.SUCCESS,
        taskResult: { images: [{ imageUrl: stored }] },
      });
      return (await findTask(task.id))!;
    }
    if (
      remote.taskStatus === AITaskStatus.FAILED ||
      remote.taskStatus === AITaskStatus.CANCELED
    ) {
      return markFailed(task.id);
    }
    if (age > PHOTO_EDIT_STALE_MS) {
      return markFailed(task.id);
    }
    return task;
  } catch (error: unknown) {
    if (throwOnError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Photo edit status query failed:', message);
    if (age > PHOTO_EDIT_STALE_MS) {
      return markFailed(task.id);
    }
    return task;
  }
}

/**
 * Whether a history/list request should run reconcile for this open task.
 * Always settles expired missing-id / stale rows; caps fresh provider polls.
 */
export function shouldReconcileOnList(
  task: AiTask,
  now: number,
  providerBudget: number
): { reconcile: boolean; consumesProviderBudget: boolean } {
  if (
    task.status !== AITaskStatus.PENDING &&
    task.status !== AITaskStatus.PROCESSING
  ) {
    return { reconcile: false, consumesProviderBudget: false };
  }
  if (!task.id.startsWith('edit_')) {
    return { reconcile: false, consumesProviderBudget: false };
  }
  const age = now - createdAtMs(task);
  if (!task.taskId) {
    return {
      reconcile: age > PHOTO_EDIT_MISSING_PROVIDER_ID_MS,
      consumesProviderBudget: false,
    };
  }
  if (age > PHOTO_EDIT_STALE_MS) {
    return { reconcile: true, consumesProviderBudget: true };
  }
  if (providerBudget > 0) {
    return { reconcile: true, consumesProviderBudget: true };
  }
  return { reconcile: false, consumesProviderBudget: false };
}

/**
 * Find photo edits that have outlived PHOTO_EDIT_STALE_MS and settle them.
 * Does not include the shorter missing-taskId window — that still runs via
 * poll / list / admin reconciles so submit has time to persist task_id.
 */
export async function reconcileStalePhotoEdits(
  params: PhotoEditReconcileDeps & { limit?: number } = {}
): Promise<{ checked: number; failed: number; succeeded: number }> {
  const now = params.now ?? Date.now();
  const cutoff = new Date(now - PHOTO_EDIT_STALE_MS);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);

  const rows = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        isNull(aiTask.deletedAt),
        inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING]),
        // `_` is a LIKE wildcard; escape so we match the literal `edit_` prefix.
        sql`${aiTask.id} like ${'edit!_%'} escape '!'`,
        lt(aiTask.createdAt, cutoff)
      )
    )
    .orderBy(asc(aiTask.createdAt))
    .limit(limit);

  let failed = 0;
  let succeeded = 0;
  for (const row of rows) {
    const settled = await reconcilePhotoEditTask(row, { ...params, now });
    if (settled.status === AITaskStatus.FAILED) failed += 1;
    if (settled.status === AITaskStatus.SUCCESS) succeeded += 1;
  }
  return { checked: rows.length, failed, succeeded };
}

/** Look up a photo-edit row by our stable edit_ id. */
export async function findPhotoEditById(id: string): Promise<AiTask | null> {
  if (!id.startsWith('edit_')) return null;
  const [row] = await db()
    .select()
    .from(aiTask)
    .where(and(eq(aiTask.id, id), isNull(aiTask.deletedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * Claim the provider prediction id when the webhook arrives before the
 * submit handler writes task_id. No-op when already set to the same value.
 */
export async function claimPhotoEditProviderTaskId(
  taskId: string,
  providerTaskId: string
): Promise<AiTask | null> {
  const task = await findPhotoEditById(taskId);
  if (!task) return null;
  if (task.taskId === providerTaskId) return task;
  if (task.taskId && task.taskId !== providerTaskId) {
    throw new Error('Provider task id mismatch');
  }
  try {
    await db()
      .update(aiTask)
      .set({ taskId: providerTaskId })
      .where(
        and(
          eq(aiTask.id, taskId),
          isNull(aiTask.taskId),
          inArray(aiTask.status, [
            AITaskStatus.PENDING,
            AITaskStatus.PROCESSING,
          ])
        )
      );
  } catch {
    // Concurrent claim — re-read below.
  }
  const refreshed = await findPhotoEditById(taskId);
  if (!refreshed) return null;
  if (refreshed.taskId && refreshed.taskId !== providerTaskId) {
    throw new Error('Provider task id mismatch');
  }
  return refreshed;
}
