import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          'User-Agent: *',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /settings',
          'Disallow: /api/',
          'Disallow: /creations',
          'Disallow: /sign-in',
          'Disallow: /sign-up',
          'Disallow: /forgot-password',
          'Disallow: /reset-password',
          'Disallow: /verify-email',
          'Disallow: /redeem-invite',
          'Disallow: /auth-callback',
          '',
          `Sitemap: ${envConfigs.app_url}/sitemap.xml`,
          '',
        ].join('\n');
        return new Response(body, {
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    },
  },
});
