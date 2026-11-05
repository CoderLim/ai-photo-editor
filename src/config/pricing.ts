/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * To change pricing, edit this file and redeploy. Admin UI cannot alter prices.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  /**
   * Price in fen for CNY-only providers (Alipay, WeChat Pay) when `currency`
   * isn't CNY. Without it those providers refuse the product — the amount is
   * never reused across currencies.
   */
  cnyPriceInCents?: number;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
  /**
   * 'guest_post': a guest post package. Sold only through
   * /api/guest-posts/$id/checkout (tied to an approved submission); the
   * generic checkout refuses it.
   */
  kind?: 'guest_post';
  /** Guest post packages: most external links the article may contain. */
  maxLinks?: number;
};

/**
 * Default demo catalog. Replace with your real products when launching.
 * Keys MUST match what the pricing UI sends as product_id.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  starter_pack: {
    productId: 'starter_pack', productName: 'Starter Credits', planName: 'Starter',
    description: '200 AI photo editor credits', type: PaymentType.ONE_TIME,
    priceInCents: 499, currency: 'usd', credits: 200, creditsValidDays: 365,
  },
  creator_pack: {
    productId: 'creator_pack', productName: 'Creator Credits', planName: 'Creator',
    description: '500 AI photo editor credits', type: PaymentType.ONE_TIME,
    priceInCents: 999, currency: 'usd', credits: 500, creditsValidDays: 365,
  },
  pro_pack: {
    productId: 'pro_pack', productName: 'Pro Credits', planName: 'Pro',
    description: '1200 AI photo editor credits', type: PaymentType.ONE_TIME,
    priceInCents: 1999, currency: 'usd', credits: 1200, creditsValidDays: 365,
  },

  // Guest posts (see src/modules/guest-posts). Published permanently, every
  // external link rendered rel="sponsored nofollow".
  guest_post_standard: {
    productId: 'guest_post_standard',
    productName: 'Guest Post',
    planName: 'Standard',
    description: 'Guest post (1 link)',
    type: PaymentType.ONE_TIME,
    priceInCents: 9900,
    currency: 'usd',
    cnyPriceInCents: 69900,
    credits: 0,
    kind: 'guest_post',
    maxLinks: 1,
  },
  guest_post_premium: {
    productId: 'guest_post_premium',
    productName: 'Guest Post',
    planName: 'Premium',
    description: 'Guest post (3 links)',
    type: PaymentType.ONE_TIME,
    priceInCents: 19900,
    currency: 'usd',
    cnyPriceInCents: 139900,
    credits: 0,
    kind: 'guest_post',
    maxLinks: 3,
  },
};

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}

export function listGuestPostPackages(): PricingProduct[] {
  return listPricingProducts().filter((p) => p.kind === 'guest_post');
}
