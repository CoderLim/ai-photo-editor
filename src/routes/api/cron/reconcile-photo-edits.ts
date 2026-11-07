import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { reconcileStalePhotoEdits } from '@/modules/photo-editor/reconcile';
import { respData, respErr } from '@/lib/resp';

function authorized(request: Request): boolean {
  const secret = envConfigs.cron_secret;
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const alt = request.headers.get('x-cron-secret') || '';
  return bearer === secret || alt === secret;
}

async function POST({ request }: { request: Request }) {
  if (!authorized(request)) {
    return respErr('Unauthorized', { status: 401 });
  }
  const result = await reconcileStalePhotoEdits({ limit: 20 });
  return respData(result);
}

async function GET({ request }: { request: Request }) {
  return POST({ request });
}

export const Route = createFileRoute('/api/cron/reconcile-photo-edits')({
  server: { handlers: { GET, POST } },
});
