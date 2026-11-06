'use client';

import { Gift, Wallet } from 'lucide-react';
import { Link } from '@/core/i18n/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type CreditGate = 'signup' | 'purchase' | null;

/** Explicit upgrade path; the editor and selected image stay in place. */
export function CreditGateDialog({
  mode, onClose,
}: { mode: CreditGate; onClose: () => void }) {
  const callback = typeof window === 'undefined' ? '/' :
    window.location.pathname + window.location.search + window.location.hash;
  const go = (path: string) => path + '?callbackUrl=' + encodeURIComponent(callback);
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm p-6">
        {mode === 'signup' ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Gift className="size-6" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-lg">Get 10 More Free Credits</DialogTitle>
              <DialogDescription>
                Sign up for a free account to keep editing photos with AI.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
              <strong className="block text-2xl text-blue-700">+10 Credits</strong>
              <span className="text-xs text-blue-700">Free welcome bonus · once per account</span>
            </div>
            <Button asChild className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
              <Link href={go('/sign-up')}>Sign Up for Free</Link>
            </Button>
            <p className="text-center text-xs text-slate-500">
              Already have an account? <Link href={go('/sign-in')} className="font-semibold text-blue-600">Sign in</Link>
            </p>
          </>
        ) : mode === 'purchase' ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Wallet className="size-6" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-lg">You're Out of Credits</DialogTitle>
              <DialogDescription>
                Get more credits to keep editing your photos.
              </DialogDescription>
            </DialogHeader>
            <Button asChild className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
              <Link href="/pricing">Get More Credits</Link>
            </Button>
            <p className="text-center text-xs text-slate-500">One-time credit packs, no subscription required.</p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
