import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/image-to-image/', label: 'Image To Image' },
    {
      label: 'AI Tools',
      children: [
        { href: '/ai-photo-enhancer', label: 'AI Photo Enhancer' },
        { href: '/ai-background-remover', label: 'AI Background Remover' },
        {
          href: '/photo-background-changer',
          label: 'Photo Background Changer',
        },
        { href: '/photo-text-editor', label: 'Photo Text Editor' },
      ],
    },
    { href: '/pricing', label: m['landing.nav.pricing']() },
    { href: '/blog', label: m['landing.nav.blog']() },
    { href: '/creations', label: 'My Creations' },
  ];

  return <SiteHeader navLinks={navLinks} />;
}
