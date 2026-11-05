import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Layers, Sparkles, WandSparkles } from 'lucide-react';
import { envConfigs } from '@/config';
import { PHOTO_TOOLS } from '@/modules/photo-editor/config';
import { Link } from '@/core/i18n/navigation';
import { Header } from '@/blocks/header';
import { Footer } from '@/blocks/footer';
import { Pricing } from '@/blocks/pricing';
import { PhotoEditorWorkspace } from '@/components/photo-editor/workspace';

function HomePage() {
  return <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
    <Header/>
    <main>
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-[#f1f6ff] via-[#f9fbff] to-[#f7f9fc] px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-10 text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              <Sparkles className="size-3.5"/> AI-powered photo editing
            </p>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.5rem]">
              AI Photo Editor Online
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Edit, remove, retouch and transform your photos. Upload an image, describe the change, and let AI do the work.
            </p>
          </div>
          <PhotoEditorWorkspace/>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-blue-600"/> No design skills needed</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-blue-600"/> One simple prompt</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-blue-600"/> See and refine your result</span>
          </div>
        </div>
      </section>
      <section id="tools" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Explore tools</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Photo edits for every moment</h2>
            <p className="mt-3 max-w-xl text-slate-500">Start with a task-specific prompt, or describe your own edit from scratch.</p></div>
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">All AI tools <ArrowRight className="size-4"/></Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PHOTO_TOOLS.map((tool,i) => <Link key={tool.slug} href={'/tools/' + tool.slug} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
            <span className={'mb-8 inline-flex size-12 items-center justify-center rounded-xl ' + (i===0?'bg-blue-50 text-blue-600':i===1?'bg-indigo-50 text-indigo-600':'bg-sky-50 text-sky-600')}>
              {i===0?<WandSparkles className="size-6"/>:i===1?<Layers className="size-6"/>:<Sparkles className="size-6"/>}
            </span>
            <h3 className="text-lg font-semibold text-slate-900">{tool.title}</h3>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">{tool.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">Open tool <ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></span>
          </Link>)}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center"><h2 className="text-3xl font-bold tracking-tight text-slate-900">How AI photo editing works</h2>
            <p className="mt-3 text-slate-500">From idea to image in three steps.</p></div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['01','Upload a photo','Start with a JPG, PNG, or WebP image.'],
              ['02','Describe your edit','Use plain English or choose a prompt suggestion.'],
              ['03','Review and refine','Inspect the result, download, or continue editing.'],
            ].map(item=><div key={item[0]} className="rounded-2xl border border-slate-100 bg-slate-50 p-7"><span className="text-sm font-bold text-blue-600">{item[0]}</span><h3 className="mt-4 text-lg font-semibold">{item[1]}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item[2]}</p></div>)}
          </div>
        </div>
      </section>
      <Pricing/>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <h2 className="mb-8 text-3xl font-bold tracking-tight text-slate-900">Frequently asked questions</h2>
        {[
          ['How do I edit a photo with AI?','Upload your image, describe what you want changed, and select Generate Edit. You can review the output and refine it with another prompt.'],
          ['Will AI preserve my original photo?','The editor aims to preserve what you did not ask to change, but generative editing can alter small details. Always inspect faces, text, and fine textures.'],
          ['What does an edit cost?','A standard 1K edit uses 10 credits. Credit packs are one-time purchases; there is no automatic subscription.'],
          ['Can I download my edited image?','Yes. The generated image is available in your workspace and in My Creations when signed in.'],
        ].map(([q,a])=><div key={q} className="border-b border-slate-200 py-5"><h3 className="font-semibold text-slate-900">{q}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{a}</p></div>)}
      </section>
    </main>
    <Footer/>
  </div>;
}
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'AI Photo Editor Online — GetAIPhotoEditor' },
      { name: 'description', content: 'Edit photos online with AI. Remove objects, change backgrounds and enhance images with simple prompts.' },
    ],
    links: [{ rel: 'canonical', href: envConfigs.app_url + '/' }],
  }),
  component: HomePage,
});
