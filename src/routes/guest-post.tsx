import { createFileRoute } from '@tanstack/react-router';

import { pageHead } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { GuestPostLanding } from '@/blocks/guest-post';
import { Header } from '@/blocks/header';

export const Route = createFileRoute('/guest-post')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['guest_posts.landing.title']({}, { locale }),
      description: m['guest_posts.landing.description']({}, { locale }),
    };
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageHead({
          title: `${loaderData.title} | GetAIPhotoEditor`,
          description: loaderData.description,
          path: '/guest-post',
          locale: loaderData.locale,
          localized: true,
        })
      : {},
  component: GuestPostPage,
});

function GuestPostPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <GuestPostLanding />
      </main>
      <Footer />
    </div>
  );
}
