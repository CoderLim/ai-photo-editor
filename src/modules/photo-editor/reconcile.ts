import { and, asc, inArray, isNull, like, lt } from 'drizzle-orm';

import { AIMediaType, type AITaskResult } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask, type AiTask } from '@/config/db/schema';
import { AITaskStatus, findTask, updateTask } from '@/modules/ai-tasks/service';

import {
  PHOTO_EDIT_MISSING_PROVIDER_ID_MS,
  PHOTO_EDIT_STALE_MS,
} from './config';
import { createPhotoProvider, persistPhotoOutput } from './service';

export type PhotoEditReconcileDeps = {
  now?: number;
  queryProvider?: (task: AiTask) => Promise<AITaskResult>;
  persistOutput?: (url: string, taskId: string) => Promise<string>;
};

function createdAtMs(task: AiTask): number {
  const value = task.createdAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

async function markFailed(taskId: string): Promise<AiTask> {
  await updateTask({ taskId, status: AITaskStatus.FAILED });
  return (await findTask(taskId))!;
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
 * Safe to call from client polls, history lists, admin pages, or a cron sweep.
 */
export async function reconcilePhotoEditTask(
  task: AiTask,
  deps: PhotoEditReconcileDeps = {}
): Promise<AiTask> {
  if (
    task.status !== AITaskStatus.PENDING &&
    task.status !== AITaskStatus.PROCESSING
  ) {
    return task;
  }
  if (!task.id.startsWith('edit_')) return task;

  const now = deps.now ?? Date.now();
  const age = now - createdAtMs(task);

  if (!task.taskId) {
    if (age > PHOTO_EDIT_MISSING_PROVIDER_ID_MS) {
      return markFailed(task.id);
    }
    return task;
  }

  const queryProvider = deps.queryProvider ?? defaultQueryProvider;
  const persistOutput = deps.persistOutput ?? persistPhotoOutput;

  try {
    const remote = await queryProvider(task);
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
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Photo edit status query failed:', message);
    if (age > PHOTO_EDIT_STALE_MS) {
      return markFailed(task.id);
    }
    return task;
  }
}

/**
 * Find photo edits that have outlived PHOTO_EDIT_STALE_MS and settle them.
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
        like(aiTask.id, 'edit_%'),
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
