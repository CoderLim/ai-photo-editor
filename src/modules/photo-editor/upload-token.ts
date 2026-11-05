import { envConfigs } from '@/config';

const ttlMs = 60 * 60 * 1000;

// Upload URL is not proof of ownership. The authenticated uploader returns
// an HMAC-bound, short-lived token that the edit route verifies.
async function signature(message: string): Promise<string> {
  const secret = envConfigs.auth_secret;
  if (!secret) throw new Error('AUTH_SECRET is required for uploads');
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
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function issueUploadToken(userId: string, imageUrl: string) {
  const expires = Date.now() + ttlMs;
  const digest = await signature(userId + '|' + imageUrl + '|' + expires);
  return expires + '.' + digest;
}

export async function verifyUploadToken(
  userId: string,
  imageUrl: string,
  token: string
) {
  const [expiresString, supplied] = token.split('.');
  const expires = Number(expiresString);
  if (!Number.isSafeInteger(expires) || expires <= Date.now() ||
      expires > Date.now() + ttlMs || !/^[a-f0-9]{64}$/.test(supplied || '')) {
    return false;
  }
  const expected = await signature(userId + '|' + imageUrl + '|' + expires);
  // Compare all bytes without short-circuit.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return diff === 0;
}
