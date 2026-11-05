'use client';

import { useState } from 'react';
import { Check, LoaderCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { apiPost } from '@/lib/api-client';
import { getLocale } from '@/paraglide/runtime.js';

const PACKS = [
  {
    id: 'starter_pack',
    name: 'Starter',
    price: '$4.99',
    credits: 200,
    edits: 20,
    description: 'For a quick photo project',
    featured: false,
  },
  {
    id: 'creator_pack',
    name: 'Creator',
    price: '$9.99',
    credits: 500,
    edits: 50,
    description: 'For frequent photo edits',
    featured: true,
  },
  {
    id: 'pro_pack',
    name: 'Pro',
    price: '$19.99',
    credits: 1200,
    edits: 120,
    description: 'For bigger creative projects',
    featured: false,
  },
] as const;

export function Pricing({
  title,
  headingAs: Heading = 'h2',
}: { title?: string; headingAs?: 'h1' | 'h2' } = {}) {
  const { data: session } = useSession();
  const [buying, setBuying] = useState<string | null>(null);

  async function checkout(id: string) {
    if (!session?.user) {
      window.location.href =
        '/sign-in?callbackUrl=' + encodeURIComponent('/pricing');
      return;
    }
    setBuying(id);
    try {
      const data = await apiPost<{ checkout_url?: string }>(
        '/api/payment/checkout',
        {
          product_id: id,
          payment_provider: 'waffo',
          redirect: '/settings/payments',
          locale: getLocale(),
        }
      );
      if (!data?.checkout_url)
        throw new Error('Waffo checkout was not created');
      window.location.href = data.checkout_url;
    } catch (error: any) {
      toast.error(error?.message || 'Unable to start checkout');
      setBuying(null);
    }
  }

  return (
    <section id="pricing" className="bg-[#f7f9fc] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-11 text-center">
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-blue-600 uppercase">
            Simple pricing
          </p>
          <Heading className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title || 'Pay once. Edit whenever you need.'}
          </Heading>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            Buy credits when you need them. No automatic subscription or
            surprise renewal.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={
                'relative flex flex-col rounded-2xl border bg-white p-7 transition-shadow hover:shadow-lg ' +
                (pack.featured
                  ? 'border-blue-400 shadow-lg shadow-blue-100'
                  : 'border-slate-200 shadow-sm')
              }
            >
              {pack.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-slate-900">
                {pack.name}
              </h3>
              <p className="mt-2 text-sm text-slate-500">{pack.description}</p>
              <div className="mt-7 text-4xl font-bold tracking-tight text-slate-950">
                {pack.price}
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                One-time purchase
              </p>
              <div className="my-7 border-t border-slate-100" />
              <p className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Sparkles className="size-5 text-blue-600" />
                {pack.credits.toLocaleString()} credits
              </p>
              <div className="space-y-3 text-sm text-slate-600">
                <p className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  {pack.edits} standard 1K edits (10 credits each)
                </p>
                <p className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  Credits valid for 365 days
                </p>
                <p className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  Download and edit again
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(buying)}
                onClick={() => checkout(pack.id)}
                className={
                  'mt-9 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60 ' +
                  (pack.featured
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50')
                }
              >
                {buying === pack.id && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                Get {pack.name}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
          One standard 1K edit uses 10 credits. Credits are added after payment
          is verified. Generated results may vary with your prompt.
        </p>
      </div>
    </section>
  );
}
