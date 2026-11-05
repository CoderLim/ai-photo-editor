import { createFileRoute } from '@tanstack/react-router';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Pricing } from '@/blocks/pricing';
import { envConfigs } from '@/config';

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: 'Pricing — GetAIPhotoEditor' },
      { name: 'description', content: 'One-time AI photo editing credit packs. No subscriptions. 200, 500 or 1200 credits for simple photo editing.' },
    ],
    links: [{ rel: 'canonical', href: envConfigs.app_url + '/pricing' }],
  }),
  component: () => <div className="min-h-screen bg-[#f7f9fc]"><Header /><main><Pricing /></main><Footer /></div>,
});
