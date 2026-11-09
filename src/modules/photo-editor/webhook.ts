import {
  createHash,
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify,
} from 'node:crypto';

import { AITaskStatus, type AITaskResult } from '@/core/ai';
import { getAllConfigs } from '@/modules/config/service';

import {
  claimPhotoEditProviderTaskId,
  findPhotoEditById,
  reconcilePhotoEditTask,
} from './reconcile';
import { verifyPhotoEditWebhookJob } from './webhook-sign';

const REPLICATE_SECRET_TTL_MS = 60 * 60 * 1000;
const FAL_JWKS_TTL_MS = 12 * 60 * 60 * 1000;
const TIMESTAMP_TOLERANCE_SEC = 300;

let replicateSecretCache: { key: string; fetchedAt: number } | null = null;
let falJwksCache: {
  keys: ReturnType<typeof createPublicKey>[];
  fetchedAt: number;
} | null = null;

export class PhotoEditWebhookError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable = false) {
    super(message);
    this.name = 'PhotoEditWebhookError';
    this.status = status;
    this.retryable = retryable;
  }
}

function header(headers: Headers, name: string): string {
  return headers.get(name) || headers.get(name.toLowerCase()) || '';
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function getReplicateWebhookSecret(): Promise<string> {
  if (
    replicateSecretCache &&
    Date.now() - replicateSecretCache.fetchedAt < REPLICATE_SECRET_TTL_MS
  ) {
    return replicateSecretCache.key;
  }
  const configs = await getAllConfigs();
  const token = configs.replicate_api_token;
  if (!token)
    throw new PhotoEditWebhookError('Replicate is not configured', 503, true);
  const resp = await fetch(
    'https://api.replicate.com/v1/webhooks/default/secret',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!resp.ok) {
    throw new PhotoEditWebhookError(
      'Failed to load Replicate webhook secret',
      503,
      true
    );
  }
  const data = (await resp.json()) as { key?: string };
  if (!data.key?.startsWith('whsec_')) {
    throw new PhotoEditWebhookError(
      'Invalid Replicate webhook secret',
      503,
      true
    );
  }
  replicateSecretCache = { key: data.key, fetchedAt: Date.now() };
  return data.key;
}

/** Test helper — inject or clear the cached Replicate signing secret. */
export function setReplicateWebhookSecretForTests(key: string | null) {
  replicateSecretCache = key ? { key, fetchedAt: Date.now() } : null;
}

export async function verifyReplicateWebhook(
  rawBody: string,
  headers: Headers
): Promise<boolean> {
  const id = header(headers, 'webhook-id');
  const timestamp = header(headers, 'webhook-timestamp');
  const signatureHeader = header(headers, 'webhook-signature');
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TIMESTAMP_TOLERANCE_SEC) {
    return false;
  }

  const secret = await getReplicateWebhookSecret();
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', key)
    .update(signedContent)
    .digest('base64');

  return signatureHeader.split(' ').some((part) => {
    const sig = part.includes(',') ? part.split(',')[1] : part;
    return sig ? safeEqualString(sig, expected) : false;
  });
}

async function getFalPublicKeys() {
  if (falJwksCache && Date.now() - falJwksCache.fetchedAt < FAL_JWKS_TTL_MS) {
    return falJwksCache.keys;
  }
  const resp = await fetch('https://rest.fal.ai/.well-known/jwks.json');
  if (!resp.ok) {
    throw new PhotoEditWebhookError('Failed to load Fal JWKS', 503, true);
  }
  const data = (await resp.json()) as { keys?: JsonWebKey[] };
  const keys = (data.keys || []).map((jwk) =>
    createPublicKey({ key: jwk, format: 'jwk' })
  );
  falJwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

/** Test helper — inject or clear cached Fal JWKS public keys. */
export function setFalJwksForTests(
  keys: ReturnType<typeof createPublicKey>[] | null
) {
  falJwksCache = keys ? { keys, fetchedAt: Date.now() } : null;
}

export async function verifyFalWebhook(
  rawBody: Buffer,
  headers: Headers
): Promise<boolean> {
  const requestId = header(headers, 'x-fal-webhook-request-id');
  const userId = header(headers, 'x-fal-webhook-user-id');
  const timestamp = header(headers, 'x-fal-webhook-timestamp');
  const signatureHex = header(headers, 'x-fal-webhook-signature');
  if (!requestId || !userId || !timestamp || !signatureHex) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TIMESTAMP_TOLERANCE_SEC) {
    return false;
  }

  const hash = createHash('sha256').update(rawBody).digest('hex');
  const message = Buffer.from(
    [requestId, userId, timestamp, hash].join('\n'),
    'utf8'
  );
  const signature = Buffer.from(signatureHex, 'hex');
  const keys = await getFalPublicKeys();
  return keys.some((key) => verify(null, message, key, signature));
}

function replicateRemote(body: Record<string, unknown>): {
  providerTaskId: string;
  remote: AITaskResult;
} {
  const providerTaskId = typeof body.id === 'string' ? body.id : '';
  if (!providerTaskId) {
    throw new PhotoEditWebhookError('Missing Replicate prediction id', 400);
  }
  const status = String(body.status || '');
  let taskStatus = AITaskStatus.PENDING;
  if (status === 'succeeded') taskStatus = AITaskStatus.SUCCESS;
  else if (status === 'failed') taskStatus = AITaskStatus.FAILED;
  else if (status === 'canceled') taskStatus = AITaskStatus.CANCELED;
  else if (status === 'processing') taskStatus = AITaskStatus.PROCESSING;

  const images: { imageUrl: string }[] = [];
  const output = body.output;
  if (typeof output === 'string' && output) {
    images.push({ imageUrl: output });
  } else if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === 'string' && item) images.push({ imageUrl: item });
      else if (
        item &&
        typeof item === 'object' &&
        typeof (item as any).url === 'string'
      ) {
        images.push({ imageUrl: (item as any).url });
      }
    }
  }

  return {
    providerTaskId,
    remote: {
      taskId: providerTaskId,
      taskStatus,
      taskInfo: {
        images: images.length
          ? images.map((image) => ({
              id: '',
              createTime: new Date(),
              imageUrl: image.imageUrl,
            }))
          : undefined,
        status,
        errorMessage: typeof body.error === 'string' ? body.error : undefined,
      },
      taskResult: body,
    },
  };
}

function falRemote(body: Record<string, unknown>): {
  providerTaskId: string;
  remote: AITaskResult;
} {
  const providerTaskId =
    typeof body.request_id === 'string' ? body.request_id : '';
  if (!providerTaskId) {
    throw new PhotoEditWebhookError('Missing Fal request id', 400);
  }
  const status = String(body.status || '');
  let taskStatus = AITaskStatus.PENDING;
  if (status === 'OK') taskStatus = AITaskStatus.SUCCESS;
  else if (status === 'ERROR') taskStatus = AITaskStatus.FAILED;

  const images: { imageUrl: string }[] = [];
  const payload = body.payload;
  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    if (data.image && typeof data.image === 'object') {
      const url = (data.image as { url?: string }).url;
      if (url) images.push({ imageUrl: url });
    }
    if (Array.isArray(data.images)) {
      for (const item of data.images) {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as any).url === 'string'
        ) {
          images.push({ imageUrl: (item as any).url });
        }
      }
    }
  }

  return {
    providerTaskId,
    remote: {
      taskId: providerTaskId,
      taskStatus,
      taskInfo: {
        images: images.length
          ? images.map((image) => ({
              id: '',
              createTime: new Date(),
              imageUrl: image.imageUrl,
            }))
          : undefined,
        status,
      },
      taskResult: body,
    },
  };
}

export type PhotoEditWebhookSettleDeps = {
  persistOutput?: (url: string, taskId: string) => Promise<string>;
  queryProvider?: (
    task: import('@/config/db/schema').AiTask
  ) => Promise<AITaskResult>;
};

/**
 * Verify, claim, and settle a photo-edit webhook. Throws PhotoEditWebhookError
 * with HTTP status for the route handler.
 */
export async function handlePhotoEditWebhook(params: {
  provider: string;
  jobId: string;
  sig: string;
  rawBody: Buffer;
  headers: Headers;
  deps?: PhotoEditWebhookSettleDeps;
}) {
  const { provider, jobId, sig, rawBody, headers, deps } = params;
  if (provider !== 'replicate' && provider !== 'fal') {
    throw new PhotoEditWebhookError('Unsupported provider', 404);
  }
  if (!jobId.startsWith('edit_')) {
    throw new PhotoEditWebhookError('Invalid job id', 400);
  }
  if (!(await verifyPhotoEditWebhookJob(provider, jobId, sig))) {
    throw new PhotoEditWebhookError('Invalid job signature', 401);
  }

  const rawText = rawBody.toString('utf8');
  let verified = false;
  if (provider === 'replicate') {
    verified = await verifyReplicateWebhook(rawText, headers);
  } else {
    verified = await verifyFalWebhook(rawBody, headers);
  }
  if (!verified) {
    throw new PhotoEditWebhookError('Invalid webhook signature', 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new PhotoEditWebhookError('Invalid JSON body', 400);
  }

  const parsed =
    provider === 'replicate' ? replicateRemote(body) : falRemote(body);

  // Incomplete / intermediate events — ack without settling so the provider
  // does not retry forever; the completed event (or poll/cron) will finish.
  if (
    parsed.remote.taskStatus === AITaskStatus.PENDING ||
    parsed.remote.taskStatus === AITaskStatus.PROCESSING
  ) {
    return { status: 'ignored' as const, jobId };
  }

  let task = await findPhotoEditById(jobId);
  if (!task) {
    throw new PhotoEditWebhookError('Task not found', 503, true);
  }
  if (task.provider !== provider) {
    throw new PhotoEditWebhookError('Provider mismatch', 400);
  }

  try {
    task = (await claimPhotoEditProviderTaskId(jobId, parsed.providerTaskId))!;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PhotoEditWebhookError(message, 409);
  }
  if (!task) {
    throw new PhotoEditWebhookError('Task not found after claim', 503, true);
  }

  // Prefer payload images; if success but no URL, fall back to a live query.
  const hasImage = Boolean(parsed.remote.taskInfo?.images?.[0]?.imageUrl);
  const remote =
    parsed.remote.taskStatus === AITaskStatus.SUCCESS && !hasImage
      ? undefined
      : parsed.remote;

  const settled = await reconcilePhotoEditTask(task, {
    remote,
    throwOnError: true,
    persistOutput: deps?.persistOutput,
    queryProvider: deps?.queryProvider,
  });

  return {
    status: settled.status,
    jobId: settled.id,
  };
}
