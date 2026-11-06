import { createFileRoute } from '@tanstack/react-router';
import { getAuth } from '@/core/auth';
import { getBalance } from '@/modules/credits/service';
import { claimGuestTrial, GuestTrialLimitError } from '@/modules/guest-credits/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    keyPrefix: 'guest-credit-claim', intervalMs: 1200,
  });
  if (limited) return limited;
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.isAnonymous)
      return respErr('AUTH_REQUIRED', { status: 401 });
    // Independent second throttle: guest identity, not only the public IP.
    // This complements (never replaces) the IP limit above and DB quota.
    const userLimited = enforceMinIntervalRateLimit(request, {
      keyPrefix: 'guest-credit-claim-user',
      extraKey: session.user.id,
      intervalMs: 1200,
    });
    if (userLimited) return userLimited;
    const { granted } = await claimGuestTrial({
      request, userId: session.user.id, userEmail: session.user.email,
    });
    return respData({ granted, accountType: 'guest', balance: await getBalance(session.user.id) });
  } catch (error: any) {
    if (error instanceof GuestTrialLimitError)
      return respErr(error.message, { status: 429 });
    console.error('[guest-trial]', error);
    return respErr('Unable to claim free credits', { status: 503 });
  }
}
export const Route = createFileRoute('/api/guest/trial')({
  server: { handlers: { POST } },
});
