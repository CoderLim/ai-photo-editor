import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    {
      label: 'AI Tools',
      children: [
        { href: '/ai-photo-enhancer', label: 'AI Photo Enhancer' },
        { href: '/ai-background-remover', label: 'AI Background Remover' },
      ],
    },
    { href: '/pricing', label: m['landing.nav.pricing']() },
    { href: '/blog', label: m['landing.nav.blog']() },
    { href: '/creations', label: 'My Creations' },
  ];

  return <SiteHeader navLinks={navLinks} />;
}
