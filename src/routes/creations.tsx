import { createFileRoute } from '@tanstack/react-router';

import { pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PhotoEditHistory } from '@/components/photo-editor/history';

export const Route = createFileRoute('/creations')({
  head: () =>
    pageHead({
      title: 'My Creations — GetAIPhotoEditor',
      description: 'Your AI-edited images and prompts.',
      path: '/creations',
      noindex: true,
    }),
  component: () => (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h1 className="mb-3 text-3xl font-bold tracking-tight">My Creations</h1>
        <p className="mb-10 text-slate-500">
          Your AI-edited images and prompts, all in one place.
        </p>
        <PhotoEditHistory />
      </main>
      <Footer />
    </div>
  ),
});
