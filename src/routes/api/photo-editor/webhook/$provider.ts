import { createFileRoute } from '@tanstack/react-router';

import { PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES } from '@/modules/photo-editor/config';
import {
  handlePhotoEditWebhook,
  PhotoEditWebhookError,
} from '@/modules/photo-editor/webhook';
import { respData, respErr } from '@/lib/resp';

/**
 * Read at most `maxBytes` from the request. Prefer rejecting a declared
 * Content-Length early, but always count streamed bytes — CL can be absent
 * or forged.
 */
export async function readWebhookBodyLimited(
  request: Request,
  maxBytes: number
): Promise<Buffer> {
  const declared = Number(request.headers.get('content-length') || NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PhotoEditWebhookError('Payload too large', 413);
  }

  if (!request.body) return Buffer.alloc(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      throw new PhotoEditWebhookError('Payload too large', 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST({
  request,
  params,
}: {
  request: Request;
  params: { provider: string };
}) {
  // Cheap checks before allocating the body buffer.
  const provider = params.provider;
  if (provider !== 'replicate' && provider !== 'fal') {
    return respErr('Unsupported provider', { status: 404 });
  }
  const url = new URL(request.url);
  const jobId = url.searchParams.get('job') || '';
  const sig = url.searchParams.get('sig') || '';
  if (!jobId.startsWith('edit_') || !/^[a-f0-9]{64}$/.test(sig)) {
    return respErr('Invalid job signature', { status: 401 });
  }

  let rawBody: Buffer;
  try {
    rawBody = await readWebhookBodyLimited(
      request,
      PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES
    );
  } catch (error: unknown) {
    if (error instanceof PhotoEditWebhookError) {
      return respErr(error.message, { status: error.status });
    }
    throw error;
  }

  try {
    const result = await handlePhotoEditWebhook({
      provider,
      jobId,
      sig,
      rawBody,
      headers: request.headers,
    });
    return respData(result);
  } catch (error: unknown) {
    if (error instanceof PhotoEditWebhookError) {
      console.warn('photo-edit webhook:', error.message);
      return respErr(error.message, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Webhook failed';
    console.error('photo-edit webhook error:', message);
    // Transient settle failures (R2 / provider query) must not ack as 200 or
    // Replicate/Fal will stop retrying and the output may be lost.
    return respErr(message, { status: 503 });
  }
}

export const Route = createFileRoute('/api/photo-editor/webhook/$provider')({
  server: { handlers: { POST } },
});
