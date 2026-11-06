import { useQuery } from '@tanstack/react-query';
import { Coins } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

type CreditsResponse = {
  balance: number;
  accountType?: 'visitor' | 'guest' | 'registered';
  trialCredits?: number;
};

export function HeaderCredits({ className }: { className?: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['user-credits', 'balance'],
    queryFn: () => apiGet<CreditsResponse>('/api/credits'),
  });

  if (isPending && !data) {
    return (
      <span
        className={cn(
          'inline-flex h-9 min-w-14 items-center justify-center rounded-lg px-2.5',
          className
        )}
        aria-hidden
      >
        <span className="h-4 w-10 animate-pulse rounded bg-slate-200/80" />
      </span>
    );
  }

  if (!data) return null;

  const amount =
    data.accountType === 'visitor'
      ? (data.trialCredits ?? data.balance)
      : data.balance;

  return (
    <Link
      href="/pricing"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900',
        className
      )}
      aria-label={m['common.nav.credits']({ count: amount })}
      title={m['common.nav.credits']({ count: amount })}
    >
      <Coins className="size-4 text-amber-500" aria-hidden />
      <span className="tabular-nums">{amount}</span>
    </Link>
  );
}
