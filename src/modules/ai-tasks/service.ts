import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { atomic, AtomicGuardError, guard } from '@/core/db/atomic';
import { aiTask } from '@/config/db/schema';
import { planConsume, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTask(params: {
  userId: string;
  id?: string; // deterministic ID for idempotent photo edit requests
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: any;
}): Promise<any> {
  const { userId, mediaType, provider, model, prompt, costCredits, options } =
    params;

  if (params.id) {
    const previous = await findTask(params.id);
    if (previous) return { ...previous, alreadyExisted: true };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const taskData: typeof aiTask.$inferInsert = {
      id: params.id || getUuid(),
      userId,
      mediaType,
      provider,
      model,
      prompt,
      options: options ? JSON.stringify(options) : null,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
    };

    // Plan the credit charge first, then write the task and the charge in one
    // atomic step (D1-safe) — never a task without its charge or vice versa.
    const plan =
      costCredits && costCredits > 0
        ? await planConsume({
            userId,
            credits: costCredits,
            scene: 'ai_task',
            description: `AI ${mediaType} generation`,
            metadata: JSON.stringify({ taskId: taskData.id }),
          })
        : undefined;
    if (plan === null) throw new Error('Insufficient credits');
    if (plan) {
      // Stored for revocation if the task fails.
      taskData.taskInfo = JSON.stringify({
        creditId: plan.consumedCredit.id,
      });
    }

    try {
      await atomic((q) => [
        q.insert(aiTask).values(taskData),
        ...(plan ? plan.steps(q) : []),
      ]);
    } catch (error) {
      // A concurrent spend drained the grants we planned on: re-plan.
      if (params.id) {
        const previous = await findTask(params.id);
        if (previous) return { ...previous, alreadyExisted: true };
      }
      if (error instanceof AtomicGuardError) continue;
      throw error;
    }

    const [task] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, taskData.id))
      .limit(1);
    return task;
  }
  throw new Error('Insufficient credits');
}

/**
 * Update task status. Revokes credits on failure.
 */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;

  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) throw new Error('Task not found');

  // Terminal statuses are immutable. Concurrent polls must never overwrite a
  // successful job with a late failure, or refund a successfully settled job.
  if (![AITaskStatus.PENDING, AITaskStatus.PROCESSING].includes(task.status as AITaskStatus)) {
    return;
  }
  const updateData: any = { status };
  if (taskResult) {
    updateData.taskResult = JSON.stringify(taskResult);
  }
  try {
    await atomic((q) => [
      guard({
        table: aiTask, column: 'userId', where: eq(aiTask.id, taskId),
        require: inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING]),
        message: 'Task already settled',
      }),
      q.update(aiTask).set(updateData).where(eq(aiTask.id, taskId)),
    ]);
  } catch (error) {
    if (error instanceof AtomicGuardError) return;
    throw error;
  }

  // Revoke credits on failure
  if (status === AITaskStatus.FAILED && task.taskInfo) {
    try {
      const info = JSON.parse(task.taskInfo as string);
      if (info.creditId) {
        await revoke(info.creditId);
      }
    } catch {
      // Ignore parse errors
    }
  }
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);
  return result;
}
