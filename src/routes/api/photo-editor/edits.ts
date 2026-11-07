import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import { AIMediaType } from '@/core/ai';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import {
  AITaskStatus,
  createTask,
  findTask,
  getTasks,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import {
  BACKGROUND_REMOVAL_CREDITS,
  DEFAULT_PHOTO_EDIT_QUALITY,
  getPhotoTool,
  photoEditCharge,
  PhotoEditQualityError,
} from '@/modules/photo-editor/config';
import {
  createPhotoProvider,
  getSelectedPhotoProvider,
  photoModelInput,
} from '@/modules/photo-editor/service';
import { verifyUploadToken } from '@/modules/photo-editor/upload-token';
import { md5 } from '@/lib/hash';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function sessionFor(request: Request) {
  return (await getAuth().api.getSession({ headers: request.headers }))?.user;
}

export async function POST({ request }: { request: Request }) {
  const user = await sessionFor(request);
  if (!user) return respErr('AUTH_REQUIRED', { status: 401 });
  const limited = enforceMinIntervalRateLimit(request, {
    keyPrefix: 'photo-edit',
    extraKey: user.id,
    intervalMs: 2000,
  });
  if (limited) return limited;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return respErr('Invalid JSON');
  }
  const requestedPrompt =
    typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  const tool = typeof body.tool === 'string' ? body.tool : 'general';
  const isBackgroundRemoval = tool === 'remove-background';
  // Do not accept a user-provided prompt for automatic, unprompted segmentation.
  const prompt = isBackgroundRemoval
    ? 'Remove the background and preserve the original subject.'
    : requestedPrompt;
  if (!prompt || prompt.length > 2000)
    return respErr('Prompt must be 1–2000 characters');
  if (
    !imageUrl ||
    imageUrl.length > 2048 ||
    (!/^https?:\/\//.test(imageUrl) && !imageUrl.startsWith('/uploads/'))
  ) {
    return respErr('Invalid image URL');
  }
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(requestId))
    return respErr('Invalid request ID');
  if (tool !== 'general' && !getPhotoTool(tool))
    return respErr('Unsupported tool');

  // Credits, model, and provider are server-side. credits, costCredits, model,
  // provider, and price on the body are ignored so a client cannot undercharge.
  let charge: ReturnType<typeof photoEditCharge>;
  try {
    charge = isBackgroundRemoval
      ? {
          quality: DEFAULT_PHOTO_EDIT_QUALITY,
          credits: BACKGROUND_REMOVAL_CREDITS,
        }
      : photoEditCharge(body.quality);
  } catch (error) {
    if (error instanceof PhotoEditQualityError) {
      return respErr(error.message, { status: 400 });
    }
    throw error;
  }

  let imageAuthorized = await verifyUploadToken(
    user.id,
    imageUrl,
    String(body.uploadToken || '')
  );
  if (!imageAuthorized && typeof body.sourceJobId === 'string') {
    const source = await findTask(body.sourceJobId);
    if (source?.userId === user.id && source.status === AITaskStatus.SUCCESS) {
      try {
        const output = JSON.parse(source.taskResult || '{}');
        imageAuthorized =
          output.images?.some((item: any) => item.imageUrl === imageUrl) ===
          true;
      } catch {
        /* Invalid source job */
      }
    }
  }
  if (!imageAuthorized)
    return respErr('Upload or select an image you own', { status: 403 });

  const stableId =
    'edit_' + md5(user.id + ':' + requestId + ':' + charge.quality);
  const previous = await findTask(stableId);
  if (previous) {
    if (previous.userId !== user.id)
      return respErr('Forbidden', { status: 403 });
    return respData({
      jobId: previous.id,
      status: previous.status,
      credits: previous.costCredits,
    });
  }

  // The current provider adapters need a publicly fetchable HTTPS input
  // image; R2 with no public domain would bill users for an inaccessible file.
  const configs = await getAllConfigs();
  if (!configs.r2_domain?.startsWith('https://')) {
    return respErr(
      'Photo editing is unavailable until an HTTPS R2 image domain is configured',
      { status: 503 }
    );
  }
  const provider = isBackgroundRemoval
    ? 'fal'
    : await getSelectedPhotoProvider();
  let instance: Awaited<ReturnType<typeof createPhotoProvider>>;
  try {
    instance = await createPhotoProvider(
      provider,
      isBackgroundRemoval ? 'remove-background' : 'edit'
    );
  } catch {
    return respErr('Image editing service is not configured', { status: 503 });
  }

  let task: any;
  try {
    task = await createTask({
      id: stableId,
      userId: user.id,
      mediaType: 'image',
      provider,
      model: instance.model,
      prompt,
      costCredits: charge.credits,
      options: { imageUrl, tool, quality: charge.quality },
    });
  } catch (err: any) {
    if (/insufficient credits/i.test(err?.message || '')) {
      return respErr(
        user.isAnonymous ? 'GUEST_CREDITS_EXHAUSTED' : 'CREDITS_INSUFFICIENT',
        {
          status: user.isAnonymous ? 403 : 402,
        }
      );
    }
    return respErr(err?.message || 'Unable to reserve credits', {
      status: 400,
    });
  }
  if (task.alreadyExisted) {
    return respData({
      jobId: task.id,
      status: task.status,
      credits: task.costCredits,
    });
  }

  try {
    const remote = await instance.instance.generate({
      params: {
        mediaType: AIMediaType.IMAGE,
        model: instance.model,
        prompt,
        options: isBackgroundRemoval
          ? { image_url: imageUrl }
          : photoModelInput(provider, imageUrl, charge.quality),
        async: true,
      },
    });
    await db()
      .update(aiTask)
      .set({
        taskId: remote.taskId,
        status:
          remote.taskStatus === 'success'
            ? AITaskStatus.PROCESSING
            : AITaskStatus.PENDING,
      })
      .where(eq(aiTask.id, task.id));
  } catch (error: any) {
    // Unknown remote outcome can incur supplier costs, but must not charge a
    // user for a task that the app cannot track or deliver.
    await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
    return respErr('Could not submit the edit. Credits were restored.', {
      status: 502,
    });
  }

  return respData({
    jobId: task.id,
    status: 'pending',
    credits: charge.credits,
  });
}

async function GET({ request }: { request: Request }) {
  const user = await sessionFor(request);
  if (!user) return respErr('Unauthorized', { status: 401 });
  const { reconcilePhotoEditTask } =
    await import('@/modules/photo-editor/reconcile');
  const tasks = await getTasks({
    userId: user.id,
    mediaType: 'image',
    limit: 30,
  });
  const items = [];
  for (const t of tasks as Array<typeof aiTask.$inferSelect>) {
    if (!t.id.startsWith('edit_')) continue;
    const settled =
      t.status === AITaskStatus.PENDING || t.status === AITaskStatus.PROCESSING
        ? await reconcilePhotoEditTask(t)
        : t;
    let result: any = {};
    let opts: any = {};
    try {
      result = JSON.parse(settled.taskResult || '{}');
    } catch {
      /* ignore */
    }
    try {
      opts = JSON.parse(settled.options || '{}');
    } catch {
      /* ignore */
    }
    items.push({
      id: settled.id,
      status: settled.status,
      createdAt: settled.createdAt,
      prompt: settled.prompt,
      originalUrl: opts.imageUrl,
      resultUrl: result.images?.[0]?.imageUrl,
      credits: settled.costCredits,
    });
  }
  return respData({ items });
}

export const Route = createFileRoute('/api/photo-editor/edits')({
  server: { handlers: { POST, GET } },
});
