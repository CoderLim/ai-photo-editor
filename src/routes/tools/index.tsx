import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, WandSparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { PHOTO_TOOLS } from '@/modules/photo-editor/config';
import { pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';

export const Route = createFileRoute('/tools/')({
  head: () =>
    pageHead({
      title: 'AI Photo Editing Tools — GetAIPhotoEditor',
      description:
        'Task-focused AI photo editor tools for object removal, background changes, and image enhancement. Prepare free; generate with credits.',
      path: '/tools',
    }),
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            AI Tools
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Explore photo editing tools
          </h1>
          <p className="mt-4 max-w-2xl text-slate-500">
            Different tasks, one simple workflow. Choose the edit you need and
            get started with a suggested prompt.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PHOTO_TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={
                tool.slug === 'remove-background'
                  ? '/ai-background-remover'
                  : tool.slug === 'enhance-photo'
                    ? '/ai-photo-enhancer'
                    : tool.slug === 'change-background'
                      ? '/photo-background-changer'
                      : tool.slug === 'edit-text'
                        ? '/photo-text-editor'
                        : tool.slug === 'image-to-image'
                          ? '/image-to-image/'
                          : '/#editor'
              }
              className="group rounded-2xl border border-slate-200 bg-white p-7 hover:border-blue-300 hover:shadow-lg"
            >
              <WandSparkles className="mb-6 size-8 text-blue-600" />
              <p className="mb-3 text-xs text-slate-500">{tool.category}</p>
              <h2 className="text-xl font-semibold">{tool.title}</h2>
              <p className="mt-3 min-h-24 text-sm leading-6 text-slate-500">
                {tool.description}
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                {tool.slug === 'image-to-image'
                  ? 'AI image to image editor'
                  : 'Open tool'}{' '}
                <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
