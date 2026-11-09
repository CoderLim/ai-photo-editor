import { createFileRoute } from '@tanstack/react-router';

import {
  handlePhotoEditWebhook,
  PhotoEditWebhookError,
} from '@/modules/photo-editor/webhook';
import { respData, respErr } from '@/lib/resp';

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { provider: string };
}) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('job') || '';
  const sig = url.searchParams.get('sig') || '';
  const rawBody = Buffer.from(await request.arrayBuffer());

  try {
    const result = await handlePhotoEditWebhook({
      provider: params.provider,
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
