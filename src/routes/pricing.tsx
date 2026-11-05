import { createFileRoute } from '@tanstack/react-router';

import { pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Pricing } from '@/blocks/pricing';

export const Route = createFileRoute('/pricing')({
  head: () =>
    pageHead({
      title: 'AI Photo Editor Pricing — Credit Packs | GetAIPhotoEditor',
      description:
        'AI photo editor credit packs — pay once, no subscription. Choose 200, 500, or 1200 credits for backgrounds, retouching, and enhancements.',
      path: '/pricing',
    }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Header />
      <main>
        <Pricing title="AI Photo Editor Pricing" headingAs="h1" />
      </main>
      <Footer />
    </div>
  );
}
