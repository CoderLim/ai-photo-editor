import { createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { getPhotoTool, PHOTO_TOOLS } from '@/modules/photo-editor/config';
import { pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PhotoEditorWorkspace } from '@/components/photo-editor/workspace';

export const Route = createFileRoute('/tools/$slug')({
  loader: ({ params }) => {
    const tool = getPhotoTool(params.slug);
    if (!tool) throw notFound();
    return { tool };
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageHead({
          title: `${loaderData.tool.heading} — GetAIPhotoEditor`,
          description: loaderData.tool.description,
          path: `/tools/${loaderData.tool.slug}`,
        })
      : {},
  component: ToolPage,
});
function ToolPage() {
  const { tool } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="bg-gradient-to-b from-[#eef5ff] to-[#f7f9fc] px-4 pt-14 pb-16 sm:px-6">
          <div className="mx-auto max-w-[1320px]">
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
                {tool.category}
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {tool.heading}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-slate-600">
                {tool.description}
              </p>
            </div>
            <PhotoEditorWorkspace key={tool.slug} tool={tool} />
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="mb-8 text-3xl font-bold tracking-tight">
            How to use {tool.title}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {tool.steps.map((step, i) => (
              <div
                key={step}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <span className="font-bold text-blue-600">0{i + 1}</span>
                <p className="mt-4 text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-blue-100 bg-blue-50 p-7">
            <h3 className="font-semibold text-slate-900">
              What to know before you edit
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {tool.limitations}
            </p>
          </div>
          <h2 className="mt-16 text-2xl font-bold tracking-tight">
            Explore related AI photo tools
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {PHOTO_TOOLS.filter((t) => t.slug !== tool.slug).map((t) => (
              <Link
                key={t.slug}
                href={'/tools/' + t.slug}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 hover:text-blue-600"
              >
                {t.title}
                <ArrowRight className="size-4" />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
