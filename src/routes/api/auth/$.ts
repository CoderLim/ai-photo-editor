import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getDbConfigs } from '@/modules/config/service';
import { guestTrialEnabled } from '@/modules/guest-credits/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';

// better-auth catch-all — the handler takes a standard Request and
// returns a standard Response, so it mounts directly.
async function handle(request: Request) {
  if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/sign-in/anonymous')) {
    if (!guestTrialEnabled()) return Response.json({ message: 'Anonymous trial is disabled' }, { status: 403 });
    const limited = enforceMinIntervalRateLimit(request, { keyPrefix: 'anonymous-login', intervalMs: 1200 });
    if (limited) return limited;
  }
  const configs = await getDbConfigs();
  const auth = getAuth(configs);
  return auth.handler(request);
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
