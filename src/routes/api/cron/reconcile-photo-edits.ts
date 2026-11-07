import { timingSafeEqual } from 'node:crypto';
import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { reconcileStalePhotoEdits } from '@/modules/photo-editor/reconcile';
import { respData, respErr } from '@/lib/resp';

/** Constant-time compare; unequal lengths reject immediately (same idea as Creem). */
function secretMatches(provided: string, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(provided, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false;
  }
}

function authorized(request: Request): boolean {
  const secret = envConfigs.cron_secret;
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const alt = request.headers.get('x-cron-secret') || '';
  return secretMatches(bearer, secret) || secretMatches(alt, secret);
}

export async function POST({ request }: { request: Request }) {
  if (!authorized(request)) {
    return respErr('Unauthorized', { status: 401 });
  }
  // Stale sweep only (> PHOTO_EDIT_STALE_MS). The shorter missing-taskId
  // window still relies on poll / My Creations / admin list reconciles.
  const result = await reconcileStalePhotoEdits({ limit: 20 });
  return respData(result);
}

export async function GET({ request }: { request: Request }) {
  return POST({ request });
}

export const Route = createFileRoute('/api/cron/reconcile-photo-edits')({
  server: { handlers: { GET, POST } },
});
