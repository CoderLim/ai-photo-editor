import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getBalance, getHistory } from '@/modules/credits/service';
import {
  GUEST_TRIAL_CREDITS,
  guestTrialEnabled,
} from '@/modules/guest-credits/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respData({
        balance: 0,
        history: [],
        accountType: 'visitor',
        // Only advertise trial allotment when anonymous grants are actually on.
        ...(guestTrialEnabled() ? { trialCredits: GUEST_TRIAL_CREDITS } : {}),
      });
    }

    const [balance, history] = await Promise.all([
      getBalance(session.user.id),
      getHistory(session.user.id),
    ]);

    return respData({
      balance,
      history,
      accountType: session.user.isAnonymous ? 'guest' : 'registered',
    });
  } catch (error: any) {
    return respErr(error.message || 'Failed to get credits');
  }
}

export const Route = createFileRoute('/api/credits')({
  server: {
    handlers: { GET },
  },
});
