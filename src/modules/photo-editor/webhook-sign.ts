import { envConfigs } from '@/config';

/**
 * Bind a webhook callback to our edit_ job id so a delivery that races the
 * task_id write can still find the row. Same HMAC style as upload-token.
 */
async function hmacHex(message: string): Promise<string> {
  const secret = envConfigs.auth_secret;
  if (!secret)
    throw new Error('AUTH_SECRET is required for photo-edit webhooks');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  );
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(
    ''
  );
}

export async function signPhotoEditWebhookJob(
  provider: string,
  jobId: string
): Promise<string> {
  return hmacHex(`${provider}:${jobId}`);
}

export async function verifyPhotoEditWebhookJob(
  provider: string,
  jobId: string,
  supplied: string
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(supplied || '')) return false;
  const expected = await signPhotoEditWebhookJob(provider, jobId);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return diff === 0;
}

/** Build the public callback URL passed to Replicate / Fal on submit. */
export async function photoEditWebhookCallbackUrl(
  appUrl: string,
  provider: string,
  jobId: string
): Promise<string | undefined> {
  if (
    !appUrl.startsWith('http') ||
    appUrl.includes('localhost') ||
    appUrl.includes('127.0.0.1')
  ) {
    return undefined;
  }
  const base = appUrl.replace(/\/$/, '');
  const sig = await signPhotoEditWebhookJob(provider, jobId);
  const url = new URL(`${base}/api/photo-editor/webhook/${provider}`);
  url.searchParams.set('job', jobId);
  url.searchParams.set('sig', sig);
  return url.toString();
}
