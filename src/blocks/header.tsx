import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/tools', label: 'AI Tools' },
    { href: '/pricing', label: m['landing.nav.pricing']() },
    { href: '/blog', label: m['landing.nav.blog']() },
    { href: '/creations', label: 'My Creations' },
  ];

  return <SiteHeader navLinks={navLinks} />;
}
