import { and, count, desc, eq, isNull, type SQL } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, user } from '@/config/db/schema';
import { respErr, respPage } from '@/lib/resp';
import { keywordMatch } from '@/lib/sql-search';

import type { AdminHandlerContext } from '../types';

function parseJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function resultImageUrl(taskResult: string | null | undefined): string | null {
  const result = parseJson(taskResult);
  const images = result.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (!first || typeof first !== 'object') return null;
  const url = (first as { imageUrl?: unknown }).imageUrl;
  return typeof url === 'string' && url ? url : null;
}

export async function GET({ request }: AdminHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20'))
    );
    const offset = (page - 1) * pageSize;

    const status = searchParams.get('status');
    const mediaType = searchParams.get('mediaType');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');

    const conditions: SQL[] = [isNull(aiTask.deletedAt)];
    if (userId) conditions.push(eq(aiTask.userId, userId));
    if (status && status !== 'all') conditions.push(eq(aiTask.status, status));
    if (mediaType && mediaType !== 'all')
      conditions.push(eq(aiTask.mediaType, mediaType));

    const keyword = keywordMatch(search, {
      contains: [
        aiTask.prompt,
        aiTask.provider,
        aiTask.model,
        user.email,
        user.name,
      ],
      exact: [aiTask.id, aiTask.userId, aiTask.taskId],
    });
    if (keyword) conditions.push(keyword);

    const where = and(...conditions);

    const [totalResult] = await db()
      .select({ count: count() })
      .from(aiTask)
      .leftJoin(user, eq(user.id, aiTask.userId))
      .where(where);
    const total = totalResult.count;

    const rows = await db()
      .select({
        id: aiTask.id,
        userId: aiTask.userId,
        userEmail: user.email,
        userName: user.name,
        userImage: user.image,
        mediaType: aiTask.mediaType,
        provider: aiTask.provider,
        model: aiTask.model,
        prompt: aiTask.prompt,
        options: aiTask.options,
        status: aiTask.status,
        costCredits: aiTask.costCredits,
        taskId: aiTask.taskId,
        taskResult: aiTask.taskResult,
        createdAt: aiTask.createdAt,
        updatedAt: aiTask.updatedAt,
      })
      .from(aiTask)
      .leftJoin(user, eq(user.id, aiTask.userId))
      .where(where)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((row: {
      options: string | null;
      taskResult: string | null;
      [key: string]: unknown;
    }) => {
      const opts = parseJson(row.options);
      const tool = typeof opts.tool === 'string' ? opts.tool : null;
      const quality = typeof opts.quality === 'string' ? opts.quality : null;
      const originalUrl =
        typeof opts.imageUrl === 'string' ? opts.imageUrl : null;
      const { options: _options, taskResult, ...rest } = row;
      return {
        ...rest,
        tool,
        quality,
        originalUrl,
        resultUrl: resultImageUrl(taskResult),
      };
    });

    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}
