import { useEffect, useState } from 'react';
import { ArrowRight, Images, LoaderCircle } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { BeforeAfterSlider } from '@/components/photo-editor/before-after-slider';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [active, setActive] = useState<Item | null>(null);

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

  const canCompare = Boolean(active?.originalUrl && active?.resultUrl);
  const previewSrc = active?.resultUrl || active?.originalUrl;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const thumb = item.resultUrl || item.originalUrl;
          const openable = Boolean(thumb);
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                disabled={!openable}
                onClick={() => openable && setActive(item)}
                className={cn(
                  'flex h-48 w-full items-center justify-center bg-slate-100',
                  openable &&
                    'cursor-zoom-in transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset'
                )}
                aria-label="View photo comparison"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Images className="size-10 text-slate-300" />
                )}
              </button>
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
          );
        })}
      </div>

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <DialogContent className="force-light max-w-3xl gap-4 bg-white p-4 text-slate-900 sm:p-5">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-base text-slate-900 sm:text-lg">
              {canCompare ? 'Compare before & after' : 'Edited photo'}
            </DialogTitle>
            <DialogDescription className="line-clamp-2 text-slate-500">
              {active?.prompt}
            </DialogDescription>
          </DialogHeader>

          {canCompare ? (
            <BeforeAfterSlider
              beforeSrc={active!.originalUrl!}
              afterSrc={active!.resultUrl!}
              alt="Original versus edited photo"
            />
          ) : previewSrc ? (
            <div className="overflow-hidden rounded-xl bg-slate-100">
              <img
                src={previewSrc}
                alt="Edited photo"
                className="mx-auto max-h-[min(70vh,720px)] w-full object-contain"
              />
            </div>
          ) : null}

          {active?.resultUrl ? (
            <div className="flex justify-end">
              <Link
                href={'/?sourceJobId=' + active.id}
                className={cn(
                  buttonVariants(),
                  'h-9 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700'
                )}
                onClick={() => setActive(null)}
              >
                Edit again
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
