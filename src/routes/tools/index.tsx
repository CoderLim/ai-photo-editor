import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, WandSparkles } from 'lucide-react';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { PHOTO_TOOLS } from '@/modules/photo-editor/config';
import { Header } from '@/blocks/header';
import { Footer } from '@/blocks/footer';

export const Route = createFileRoute('/tools/')({
  head: () => ({
    meta: [{ title: 'AI Photo Editing Tools — GetAIPhotoEditor' },
      { name: 'description', content: 'Browse task-focused AI photo editing tools for object removal, background changes, and image enhancement.' }],
    links: [{ rel: 'canonical', href: envConfigs.app_url + '/tools' }],
  }),
  component: ToolsPage,
});
function ToolsPage() {
  return <div className="min-h-screen bg-[#f7f9fc] text-slate-900"><Header/>
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">AI Tools</p>
        <h1 className="text-4xl font-bold tracking-tight">Explore photo editing tools</h1>
        <p className="mt-4 max-w-2xl text-slate-500">Different tasks, one simple workflow. Choose the edit you need and get started with a suggested prompt.</p></div>
      <div className="grid gap-5 md:grid-cols-3">{PHOTO_TOOLS.map(tool =>
        <Link key={tool.slug} href={'/tools/' + tool.slug} className="group rounded-2xl border border-slate-200 bg-white p-7 hover:border-blue-300 hover:shadow-lg">
          <WandSparkles className="mb-6 size-8 text-blue-600"/><p className="mb-3 text-xs text-slate-500">{tool.category}</p>
          <h2 className="text-xl font-semibold">{tool.title}</h2><p className="mt-3 min-h-24 text-sm leading-6 text-slate-500">{tool.description}</p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">Open tool <ArrowRight className="size-4"/></span>
        </Link>)}</div>
    </main><Footer/></div>;
}
