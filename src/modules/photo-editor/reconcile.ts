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

async function markFailed(taskId: string, error?: string): Promise<AiTask> {
  const message = typeof error === 'string' ? error.trim() : '';
  // Only persist supplier/exception text. Do not invent cause labels
  // (timeout / reject / missing id) when we do not have a real message.
  await updateTask({
    taskId,
    status: AITaskStatus.FAILED,
    ...(message ? { error: message } : {}),
  });
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
        return markFailed(task.id, remote.taskInfo?.errorMessage);
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
      return markFailed(task.id, remote.taskInfo?.errorMessage);
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
      return markFailed(task.id, message);
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
 * Includes rows still missing `task_id` (unconfirmed submit waiting on a
 * webhook): after the shared stale window they fail and refund via reconcile.
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

export class PhotoEditProviderIdError extends Error {
  code: 'mismatch' | 'attach_failed' | 'not_found';

  constructor(code: PhotoEditProviderIdError['code'], message: string) {
    super(message);
    this.name = 'PhotoEditProviderIdError';
    this.code = code;
  }
}

function isOpenStatus(status: string): boolean {
  return status === AITaskStatus.PENDING || status === AITaskStatus.PROCESSING;
}

/**
 * Attach a provider prediction id without touching terminal status.
 * Used by both the submit handler (after generate) and webhooks (early claim).
 * Never overwrites an existing different taskId or reopens a settled row.
 */
export async function attachPhotoEditProviderTaskId(
  taskId: string,
  providerTaskId: string
): Promise<AiTask> {
  const task = await findPhotoEditById(taskId);
  if (!task) {
    throw new PhotoEditProviderIdError('not_found', 'Task not found');
  }
  if (task.taskId === providerTaskId) return task;
  if (task.taskId && task.taskId !== providerTaskId) {
    throw new PhotoEditProviderIdError('mismatch', 'Provider task id mismatch');
  }

  // Already settled (webhook won the race): do not mutate status or force
  // a pending rewrite. Record the id only when still null.
  if (!isOpenStatus(task.status)) {
    if (!task.taskId) {
      await db()
        .update(aiTask)
        .set({ taskId: providerTaskId })
        .where(
          and(
            eq(aiTask.id, taskId),
            isNull(aiTask.taskId),
            inArray(aiTask.status, [
              AITaskStatus.SUCCESS,
              AITaskStatus.FAILED,
              AITaskStatus.CANCELED,
            ])
          )
        );
      const terminal = await findPhotoEditById(taskId);
      if (!terminal) {
        throw new PhotoEditProviderIdError('not_found', 'Task not found');
      }
      if (terminal.taskId && terminal.taskId !== providerTaskId) {
        throw new PhotoEditProviderIdError(
          'mismatch',
          'Provider task id mismatch'
        );
      }
      return terminal;
    }
    return task;
  }

  // Open row with null taskId — claim. Do not catch-all: real DB errors must
  // propagate so webhooks can 5xx and retry. A concurrent claim simply
  // updates 0 rows; we re-read and verify below.
  await db()
    .update(aiTask)
    .set({ taskId: providerTaskId })
    .where(
      and(
        eq(aiTask.id, taskId),
        isNull(aiTask.taskId),
        inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING])
      )
    );

  const refreshed = await findPhotoEditById(taskId);
  if (!refreshed) {
    throw new PhotoEditProviderIdError('not_found', 'Task not found');
  }
  if (refreshed.taskId === providerTaskId) return refreshed;
  if (refreshed.taskId && refreshed.taskId !== providerTaskId) {
    throw new PhotoEditProviderIdError('mismatch', 'Provider task id mismatch');
  }
  // Still null after an open-row claim: either a transient write failure or
  // the row flipped terminal with no id. Never pretend the claim succeeded.
  throw new PhotoEditProviderIdError(
    'attach_failed',
    'Failed to attach provider task id'
  );
}

/** @deprecated use attachPhotoEditProviderTaskId */
export async function claimPhotoEditProviderTaskId(
  taskId: string,
  providerTaskId: string
): Promise<AiTask | null> {
  return attachPhotoEditProviderTaskId(taskId, providerTaskId);
}
