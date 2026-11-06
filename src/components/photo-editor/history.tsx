'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Images, LoaderCircle } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

type Item = {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  originalUrl?: string;
  resultUrl?: string;
  credits: number;
};

const SIGN_IN_HREF = `/sign-in?callbackUrl=${encodeURIComponent('/creations')}`;

function isUnauthorized(status: number, message: string) {
  return status === 401 || /unauthorized/i.test(message);
}

function SignInToViewEdits() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
      <Images className="mx-auto mb-4 size-10 text-slate-400" />
      <p className="font-medium text-slate-900">Sign in to see your edits</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Your edit history is saved to your account. Sign in to view it.
      </p>
      <Link
        href={SIGN_IN_HREF}
        className={cn(
          buttonVariants(),
          'mt-6 h-9 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700'
        )}
      >
        Sign in
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

export function PhotoEditHistory() {
  const { data: session, isPending } = useSession();
  const signedIn = !!session?.user;
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || isPending || !signedIn) return;
    let cancelled = false;
    fetch('/api/photo-editor/edits')
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        const message =
          typeof payload?.message === 'string' ? payload.message : '';
        if (isUnauthorized(response.status, message)) {
          if (!cancelled) setNeedsSignIn(true);
          return;
        }
        if (!response.ok || payload.code !== 0) {
          throw new Error('unavailable');
        }
        if (!cancelled) setItems(payload.data?.items || []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, isPending, signedIn]);

  if (!ready || isPending || (signedIn && loading && !needsSignIn)) {
    return (
      <p className="flex items-center gap-2 py-12 text-sm text-slate-500">
        <LoaderCircle className="size-4 animate-spin" />
        Loading your edits...
      </p>
    );
  }
  if (!signedIn || needsSignIn) return <SignInToViewEdits />;
  if (failed) {
    return (
      <p className="py-12 text-sm text-slate-500">
        We couldn&apos;t load your edits. Refresh the page and try again.
      </p>
    );
  }
  if (!items.length)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
        <Images className="mx-auto mb-4 size-10 text-slate-400" />
        <p className="font-medium">No edits yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Your generated photos will appear here.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-600"
        >
          Start editing <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex h-48 items-center justify-center bg-slate-100">
            {item.resultUrl || item.originalUrl ? (
              <img
                src={item.resultUrl || item.originalUrl}
                alt="Photo edit"
                className="h-full w-full object-contain"
              />
            ) : (
              <Images className="size-10 text-slate-300" />
            )}
          </div>
          <div className="space-y-2 p-4">
            <p className="line-clamp-2 text-sm font-medium text-slate-900">
              {item.prompt}
            </p>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{item.status}</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            {item.resultUrl && (
              <Link
                href={'/?sourceJobId=' + item.id}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600"
              >
                Edit again <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
