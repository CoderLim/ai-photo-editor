import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useRouter as useTanStackRouter,
} from '@tanstack/react-router';

import { getLocale } from '@/paraglide/runtime.js';

// Locale-aware navigation. Locale prefixes are handled entirely by the
// router rewrite (Paraglide localizeUrl/deLocalizeUrl) — internal hrefs
// stay locale-free and get localized on output automatically.

export function useCurrentLocale(): string {
  return getLocale();
}

type LinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href: string;
  locale?: string; // kept for API compat; locale switching goes via setLocale()
  prefetch?: boolean | string;
  children?: ReactNode;
};

function scrollToHash(hash: string | undefined) {
  if (!hash || typeof document === 'undefined') return;
  const id = hash.replace(/^#/, '');
  // Wait a frame so route transitions can paint the target.
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  });
}

export function Link({ href, locale, prefetch, onClick, ...rest }: LinkProps) {
  if (/^(https?:|mailto:|tel:|#)/.test(href)) {
    return (
      <a
        href={href}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented && href.startsWith('#')) {
            scrollToHash(href);
          }
        }}
        {...rest}
      />
    );
  }
  const Comp = RouterLink as any;
  // Parse ?search and #hash so hrefs like `/#editor` navigate correctly.
  if (href.includes('?') || href.includes('#')) {
    const opts = toNavigateOptions(href);
    return (
      <Comp
        {...opts}
        {...rest}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          // Same-route hash navigations often noop in the router — scroll manually.
          scrollToHash(opts.hash);
        }}
      />
    );
  }
  return <Comp to={href} {...rest} />;
}

export function usePathname(): string {
  // Routes are matched against the de-localized tree, so pathname here is
  // already locale-free.
  return useLocation().pathname;
}

function toNavigateOptions(href: string) {
  const [pathPart, hash] = href.split('#');
  const [pathname, searchStr] = pathPart.split('?');
  return {
    to: pathname || '/',
    search: searchStr
      ? Object.fromEntries(new URLSearchParams(searchStr))
      : undefined,
    hash,
  };
}

export function useRouter() {
  const router = useTanStackRouter();
  return {
    // navigate() goes through the router rewrite so outgoing URLs are
    // localized — do not switch this back to history.push.
    push: (href: string) => {
      router.navigate(toNavigateOptions(href) as any);
    },
    replace: (href: string) => {
      router.navigate({ ...toNavigateOptions(href), replace: true } as any);
    },
    back: () => router.history.back(),
    forward: () => router.history.forward(),
    refresh: () => router.invalidate(),
    prefetch: (_href: string) => {},
  };
}
