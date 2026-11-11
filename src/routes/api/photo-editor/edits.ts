import { createFileRoute } from '@tanstack/react-router';

import { AIMediaType } from '@/core/ai';
import { getAuth } from '@/core/auth';
import { envConfigs } from '@/config';
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
  TEXT_EDIT_PROMPT_SUFFIX,
  TEXT_EDIT_USER_PROMPT_MAX,
} from '@/modules/photo-editor/config';
import {
  attachPhotoEditProviderTaskId,
  PhotoEditProviderIdError,
} from '@/modules/photo-editor/reconcile';
import {
  createPhotoProvider,
  getSelectedPhotoProvider,
  photoModelInput,
} from '@/modules/photo-editor/service';
import { verifyUploadToken } from '@/modules/photo-editor/upload-token';
import { photoEditWebhookCallbackUrl } from '@/modules/photo-editor/webhook-sign';
import { md5 } from '@/lib/hash';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

/**
 * Provider clearly refused the request (no billable job). Timeouts, 5xx, and
 * network blips are NOT definite — the supplier may still run and webhook.
 */
export function isDefiniteProviderReject(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = /(?:status(?:\s*code)?\s*[:=]?\s*|HTTP\s+)(\d{3})/i.exec(
    message
  );
  if (statusMatch) {
    const code = Number(statusMatch[1]);
    return code >= 400 && code < 500 && code !== 408 && code !== 429;
  }
  return /not configured|unsupported image provider|api key is not configured|api token is not configured/i.test(
    message
  );
}

function clientStatus(status: string): string {
  if (status === AITaskStatus.SUCCESS) return 'success';
  if (status === AITaskStatus.FAILED || status === AITaskStatus.CANCELED) {
    return 'failed';
  }
  return 'pending';
}

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
  const maskUrl = typeof body.maskUrl === 'string' ? body.maskUrl.trim() : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  const tool = typeof body.tool === 'string' ? body.tool : 'general';
  const isBackgroundRemoval = tool === 'remove-background';
  const isTextEdit = tool === 'edit-text';
  // Background removal ignores client prompts. Text edits keep the user's short
  // instruction and append server-side lettering rules so they cannot be stripped.
  let prompt: string;
  if (isBackgroundRemoval) {
    prompt = 'Remove the background and preserve the original subject.';
  } else if (isTextEdit) {
    if (
      !requestedPrompt ||
      requestedPrompt.length > TEXT_EDIT_USER_PROMPT_MAX
    ) {
      return respErr(
        `Describe the text change in 1–${TEXT_EDIT_USER_PROMPT_MAX} characters`
      );
    }
    prompt = `${requestedPrompt}\n\n${TEXT_EDIT_PROMPT_SUFFIX}`;
  } else {
    prompt = requestedPrompt;
  }
  if (!prompt || prompt.length > 2000)
    return respErr('Prompt must be 1–2000 characters');
  if (
    !imageUrl ||
    imageUrl.length > 2048 ||
    (!/^https?:\/\//.test(imageUrl) && !imageUrl.startsWith('/uploads/'))
  ) {
    return respErr('Invalid image URL');
  }
  if (maskUrl) {
    if (isBackgroundRemoval) {
      return respErr('Mask is not supported for this tool', { status: 400 });
    }
    if (
      maskUrl.length > 2048 ||
      (!/^https?:\/\//.test(maskUrl) && !maskUrl.startsWith('/uploads/'))
    ) {
      return respErr('Invalid mask URL', { status: 400 });
    }
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

  if (maskUrl) {
    const maskAuthorized = await verifyUploadToken(
      user.id,
      maskUrl,
      String(body.maskUploadToken || '')
    );
    if (!maskAuthorized)
      return respErr('Upload a mask you own', { status: 403 });
  }

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
      options: {
        imageUrl,
        tool,
        quality: charge.quality,
        ...(maskUrl ? { maskUrl } : {}),
      },
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

  let remoteTaskId: string | undefined;
  try {
    const callbackUrl = await photoEditWebhookCallbackUrl(
      envConfigs.app_url,
      provider,
      task.id
    );
    const remote = await instance.instance.generate({
      params: {
        mediaType: AIMediaType.IMAGE,
        model: instance.model,
        prompt,
        options: isBackgroundRemoval
          ? { image_url: imageUrl }
          : photoModelInput(
              provider,
              imageUrl,
              charge.quality,
              maskUrl || undefined
            ),
        async: true,
        callbackUrl,
      },
    });
    remoteTaskId = remote.taskId;
  } catch (error: unknown) {
    if (isDefiniteProviderReject(error)) {
      const message = error instanceof Error ? error.message : String(error);
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
        ...(message.trim() ? { error: message.trim() } : {}),
      });
      return respErr('Could not submit the edit. Credits were restored.', {
        status: 502,
      });
    }
    // Outcome uncertain (timeout / 5xx / network): leave pending so a late
    // webhook can still claim and settle. Do not refund or reopen later.
    console.warn(
      'Photo edit submit unconfirmed:',
      error instanceof Error ? error.message : error
    );
    return respData({
      jobId: task.id,
      status: 'pending',
      credits: charge.credits,
    });
  }

  try {
    // Never force status back to pending — webhook may already have settled.
    const current = await attachPhotoEditProviderTaskId(task.id, remoteTaskId!);
    return respData({
      jobId: current.id,
      status: clientStatus(current.status),
      credits: current.costCredits,
    });
  } catch (error: unknown) {
    if (
      error instanceof PhotoEditProviderIdError &&
      error.code === 'mismatch'
    ) {
      console.warn(
        'Photo edit provider id conflict after submit:',
        error.message
      );
    } else {
      console.warn(
        'Photo edit attach after submit failed:',
        error instanceof Error ? error.message : error
      );
    }
    // Provider already accepted the job — keep pending for webhook/poll.
    const current = await findTask(task.id);
    return respData({
      jobId: task.id,
      status: clientStatus(current?.status || AITaskStatus.PENDING),
      credits: task.costCredits,
    });
  }
}

async function GET({ request }: { request: Request }) {
  const user = await sessionFor(request);
  if (!user) return respErr('Unauthorized', { status: 401 });
  const {
    PHOTO_EDIT_LIST_PROVIDER_BUDGET,
    reconcilePhotoEditTask,
    shouldReconcileOnList,
  } = await import('@/modules/photo-editor/reconcile');
  const tasks = await getTasks({
    userId: user.id,
    mediaType: 'image',
    limit: 30,
  });
  const now = Date.now();
  let providerBudget = PHOTO_EDIT_LIST_PROVIDER_BUDGET;
  const items = [];
  for (const t of tasks as Array<typeof aiTask.$inferSelect>) {
    if (!t.id.startsWith('edit_')) continue;
    const decision = shouldReconcileOnList(t, now, providerBudget);
    let settled = t;
    if (decision.reconcile) {
      settled = await reconcilePhotoEditTask(t, { now });
      if (decision.consumesProviderBudget) providerBudget -= 1;
    }
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
