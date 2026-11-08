import { envConfigs } from '@/config';
import {
  baseLocale,
  getLocale,
  locales,
  localizeUrl,
} from '@/paraglide/runtime.js';

type Locale = (typeof locales)[number];

export type PageSeoInput = {
  title: string;
  description: string;
  /** Locale-free path, e.g. `/`, `/pricing`, `/tools/remove-object`. */
  path: string;
  locale?: string;
  image?: string;
  /** Optional social-only copy; page title and meta description remain unchanged. */
  socialTitle?: string;
  socialDescription?: string;
  noindex?: boolean;
  /**
   * True when the page should advertise hreflang alternates for every
   * project locale. With a single locale this is effectively a no-op.
   */
  localized?: boolean;
};

type MetaEntry =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type LinkEntry = {
  rel: string;
  href: string;
  hrefLang?: string;
};

function asLocale(value: string | undefined): Locale {
  if (value && (locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return baseLocale;
}

/** Absolute URL for a locale-free path. */
export function absoluteUrl(path: string, locale?: string): string {
  const normalised =
    !path || path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`;
  return localizeUrl(`${envConfigs.app_url}${normalised}`, {
    locale: asLocale(locale),
  }).href;
}

function absoluteAsset(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = envConfigs.app_url.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function hreflangLinks(path: string, localized: boolean): LinkEntry[] {
  const langs = localized ? [...locales] : [baseLocale];
  return [
    ...langs.map((loc) => ({
      rel: 'alternate',
      hrefLang: loc,
      href: absoluteUrl(path, loc),
    })),
    {
      rel: 'alternate',
      hrefLang: 'x-default',
      href: absoluteUrl(path, baseLocale),
    },
  ];
}

/**
 * Shared `head()` payload: title, description, canonical, hreflang, and
 * Open Graph / Twitter tags. Auth and private pages pass `noindex: true`.
 */
export function pageHead(input: PageSeoInput): {
  meta: MetaEntry[];
  links: LinkEntry[];
} {
  const locale = asLocale(input.locale ?? getLocale());
  const localized = !!input.localized;
  const canonicalLocale = localized ? locale : baseLocale;
  const canonical = absoluteUrl(input.path, canonicalLocale);
  // A dedicated, versioned social asset uses the latest brand logo and avoids
  // crawlers continuing to display a stale share image after a logo refresh.
  const brandShareImage = '/og-brand-20261108.png';
  const isBrandImage = !input.image;
  const image = absoluteAsset(input.image ?? brandShareImage);
  const socialTitle = input.socialTitle ?? input.title;
  const socialDescription = input.socialDescription ?? input.description;

  const meta: MetaEntry[] = [
    { title: input.title },
    { name: 'description', content: input.description },
  ];

  if (input.noindex) {
    meta.push({ name: 'robots', content: 'noindex, nofollow' });
  } else {
    meta.push(
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: envConfigs.app_name },
      { property: 'og:title', content: socialTitle },
      { property: 'og:description', content: socialDescription },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: image },
      { property: 'og:image:secure_url', content: image },
      ...(isBrandImage
        ? ([
            { property: 'og:image:type', content: 'image/png' },
            { property: 'og:image:width', content: '1024' },
            { property: 'og:image:height', content: '1024' },
            { property: 'og:image:alt', content: 'GetAIPhotoEditor logo' },
          ] as MetaEntry[])
        : []),
      { property: 'og:locale', content: 'en_US' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: socialTitle },
      { name: 'twitter:description', content: socialDescription },
      { name: 'twitter:image', content: image },
      ...(isBrandImage
        ? [{ name: 'twitter:image:alt', content: 'GetAIPhotoEditor logo' }]
        : [])
    );
  }

  const links: LinkEntry[] = [{ rel: 'canonical', href: canonical }];
  if (!input.noindex) {
    links.push(...hreflangLinks(input.path, localized));
  }

  return { meta, links };
}

/** Locales to advertise in the sitemap for a given public path. */
export function sitemapLocalesForPath(_path: string): readonly string[] {
  return locales;
}
