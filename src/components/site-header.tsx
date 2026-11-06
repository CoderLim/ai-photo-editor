'use client';

import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { currentPathWithQuery } from '@/lib/redirect';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { SiteUserMenu } from '@/components/site-user-menu';
import { buttonVariants } from '@/components/ui/button';

function authHref(path: '/sign-in' | '/sign-up') {
  return `${path}?callbackUrl=${encodeURIComponent(currentPathWithQuery('/'))}`;
}

export interface NavLink {
  href: string;
  label: string;
  /** Open in a new tab. Off-site (http) hrefs always open in a new tab. */
  external?: boolean;
}

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

export function SiteHeader({ navLinks }: { navLinks?: NavLink[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const { data: session } = useSession();
  const user = session?.user?.isAnonymous ? null : session?.user;
  const logo = envConfigs.app_logo;
  const showLogo = !!logo && !logoFailed;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="relative z-10 flex items-center">
          <span className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {showLogo ? (
              <img
                src={logo}
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-[8px] object-cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                {(envConfigs.app_name || 'A').charAt(0)}
              </span>
            )}
            {envConfigs.app_name === 'GetAIPhotoEditor'
              ? 'Get AI Photo Editor'
              : envConfigs.app_name}
          </span>
        </Link>

        {/* Desktop nav — visually centered */}
        <nav className="absolute inset-x-0 hidden items-center justify-center gap-8 md:flex">
          {navLinks?.map((link) =>
            isExternalHref(link.href) ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 transition-colors hover:text-slate-900"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                className="text-sm text-slate-500 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Desktop actions */}
        <div className="relative z-10 hidden items-center gap-1.5 md:flex">
          {user ? (
            <SiteUserMenu
              name={user.name || 'User'}
              email={user.email}
              image={user.image}
            />
          ) : (
            <Link
              href={authHref('/sign-in')}
              className={cn(
                buttonVariants({ size: 'sm' }),
                'ml-1.5 gap-1.5 rounded-lg bg-blue-600 px-3.5 text-white hover:bg-blue-700'
              )}
            >
              {m['common.nav.get_started']()}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="relative z-10 p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pt-2 pb-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks?.map((link) =>
              isExternalHref(link.href) ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  className="rounded-md px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            {user ? (
              <SiteUserMenu
                name={user.name || 'User'}
                email={user.email}
                image={user.image}
              />
            ) : (
              <Link
                href={authHref('/sign-in')}
                className={cn(
                  buttonVariants({ size: 'sm' }),
                  'gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {m['common.nav.get_started']()}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
