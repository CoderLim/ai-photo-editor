import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { PHOTO_TOOLS } from '@/modules/photo-editor/config';
import { pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Pricing } from '@/blocks/pricing';
import { PhotoEditorWorkspace } from '@/components/photo-editor/workspace';

const FAQS = [
  [
    'Is this AI photo editor really free?',
    'Preparing a photo and prompt is free. Each standard 1K AI edit uses 10 credits. New accounts may receive welcome credits when the offer is enabled; one-time credit packs are also available.',
  ],
  [
    'Can I use it without signing up?',
    'You can select and preview a photo and write your prompt without an account. You must sign in before the photo is uploaded for AI generation or you can download an AI-generated result.',
  ],
  [
    'Does it work on iPhone or Android without an app?',
    'Yes. Use a modern browser on iPhone, Android, Mac, or Windows. No additional app installation is needed.',
  ],
  [
    'What happens to my photos after editing?',
    'Before generation, your selected photo stays in your browser. When you generate, it is uploaded for processing and the result is stored so you can access My Creations. We do not promise automatic deletion; see the Privacy Policy for data-handling information.',
  ],
  [
    'How is AI photo editing different from Photoshop?',
    'AI editing lets you describe changes in words instead of manually handling masks and layers. It is convenient for quick creative edits, while traditional desktop tools provide more exact control. Always inspect generated details.',
  ],
  [
    'What is the best resolution to upload?',
    'Choose a clear, well-lit JPG, PNG or WebP image up to 10 MB. Standard edits generate a 1K output, which may not preserve your upload’s original resolution.',
  ],
] as const;

const HOME_TITLE = 'AI Photo Editor — Edit Photos Online, No App Needed';
const HOME_DESCRIPTION =
  'Edit and enhance photos online with AI — remove backgrounds, retouch portraits, erase objects, and swap skies. No app to install. Start in your browser on any device.';

const structuredDataJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: envConfigs.app_name,
      url: envConfigs.app_url,
      description: HOME_DESCRIPTION,
    },
    {
      '@type': 'SoftwareApplication',
      name: envConfigs.app_name,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      url: envConfigs.app_url,
      description: HOME_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Prepare edits free; AI generation uses credits',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
});

const FEATURES = [
  [
    'Remove and Replace Backgrounds',
    'Change a distracting backdrop to a clean studio, outdoor scene, or brighter sky. Review fine edges after generation.',
  ],
  [
    'Retouch Portraits and Skin',
    'Ask for subtle skin cleanup, softer lighting, or a polished headshot while keeping the person recognizable.',
  ],
  [
    'Enhance Blurry or Low-Quality Photos',
    'Improve apparent clarity, lighting, and colors. Generative edits cannot guarantee recovery of lost image details.',
  ],
  [
    'Erase Objects and People',
    'Remove an unwanted item or passerby and ask AI to reconstruct the surrounding background naturally.',
  ],
  [
    'Restyle Photos With Text Prompts',
    'Describe cinematic light, a golden-hour mood, vintage color, or another creative look using plain words.',
  ],
  [
    'Remove Clothing Wrinkles',
    'Smooth creases and wrinkles in shirts, dresses, or other garments while keeping the fabric texture, fit, and overall look natural.',
  ],
] as const;

const FEATURE_IMAGES = [
  '/images/ai-photo-editor/remove-background.jpg',
  '/images/ai-photo-editor/portrait-retouch.jpg',
  '/images/ai-photo-editor/enhance-photo.jpg',
  '/images/ai-photo-editor/remove-object.jpg',
  '/images/ai-photo-editor/restyle-photo.jpg',
  '/images/ai-photo-editor/remove-clothing-wrinkles.jpg',
] as const;

const USE_CASES = [
  [
    'E-commerce and Product Sellers',
    'Prepare cleaner product backgrounds and more consistent-looking listing images with a simple description.',
  ],
  [
    'Social Creators',
    'Refresh profile photos, social posts, and thumbnails without installing another app.',
  ],
  [
    'Photographers',
    'Experiment with object cleanup, skin retouching, and creative lighting, then review every detail.',
  ],
  [
    'Real Estate',
    'Explore brighter interiors and sky changes. Keep listing images accurate and disclose material changes as required.',
  ],
] as const;

function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-[#f1f6ff] via-[#f9fbff] to-[#f7f9fc] px-4 pt-14 pb-16 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-[1320px]">
            <div className="mb-10 text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-[0.15em] text-blue-600 uppercase">
                <Sparkles className="size-3.5" /> AI-powered photo editing
              </p>
              <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.5rem]">
                AI Photo Editor Online
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Upload a photo and tell the AI what to change in plain words.
                Our AI photo editor can remove backgrounds, retouch portraits,
                enhance blurry shots, erase objects, and swap skies. No
                Photoshop or app to install — start in your browser on iPhone,
                Android, Mac, or Windows.
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                Choose your photo and write a prompt without signing in. Sign in
                to generate a 1K edit using credits, then review and download
                your result. Your original photo is not overwritten.
              </p>
            </div>
            <div id="editor">
              <PhotoEditorWorkspace />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> No design
                skills needed
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> One simple
                prompt
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> See and refine
                your result
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10">
            <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
              No app to install
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Edit Photos With AI Right in Your Browser
            </h2>
            <p className="mt-4 max-w-3xl leading-8 text-slate-600">
              Choose a JPG, PNG or WebP photo and describe your edit in everyday
              language. No desktop software is required. You can prepare the
              image and prompt before signing in, then generate a change to the
              background, portrait, lighting, or overall style.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              AI generation requires sign-in and uses 10 credits for a standard
              1K image. The upload limit is 10 MB. Review faces and details
              before using generated photos.
            </p>
          </div>
        </section>
        <section id="features" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            AI photo editing features
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What You Can Do With Our AI Photo Editor
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Use a task-specific tool or write your own instruction for a quick
            fix or creative transformation.
          </p>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([title, description], index) => (
              <article
                key={title}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
              >
                <img
                  src={FEATURE_IMAGES[index]}
                  alt={`Before and after AI photo edit: ${title}`}
                  width={1672}
                  height={941}
                  loading="lazy"
                  decoding="async"
                  className="mb-5 aspect-[1672/941] w-full rounded-xl bg-slate-100 object-cover"
                />
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="border-y border-slate-200 bg-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              How to Edit a Photo With AI
            </h2>
            <p className="mt-3 text-center text-slate-500">
              Three steps to your edited image.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                [
                  '01',
                  'Upload your photo',
                  'Choose a JPG, PNG or WebP image up to 10 MB. You can choose it before signing in.',
                ],
                [
                  '02',
                  'Describe the change',
                  'Try “remove the background”, “make it look like golden hour”, or “clear acne while keeping the face natural”.',
                ],
                [
                  '03',
                  'Generate and download',
                  'Sign in, generate a 1K edit using credits, inspect the result, and download or refine it.',
                ],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-7"
                >
                  <span className="text-sm font-bold text-blue-600">
                    {number}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Use cases
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Who Uses It
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {USE_CASES.map(([title, description]) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-7"
              >
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="border-y border-slate-200 bg-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              AI Photo Editor vs Desktop Software
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">
              For quick retouching and creative changes, browser-based AI
              editing can be simpler than learning Photoshop. Desktop software
              still offers greater manual precision.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-7">
                <h3 className="text-lg font-semibold">
                  Browser-based AI photo editing
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Describe a change instead of learning selections and masks. No
                  installation; standard results are generated at 1K and may
                  vary.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
                <h3 className="text-lg font-semibold">
                  Traditional desktop editing
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Work with layers, precise masks, and pixel-level adjustments
                  for highly controlled edits and repeatable exports.
                </p>
              </div>
            </div>
          </div>
        </section>
        <Pricing />
        <section id="faq" className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
          <p className="mt-3 text-slate-500">
            Questions about AI photo editing online.
          </p>
          <div className="mt-7">
            {FAQS.map(([question, answer]) => (
              <div key={question} className="border-b border-slate-200 py-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  {question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {answer}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-500">
            See our{' '}
            <Link
              href="/privacy-policy"
              className="font-semibold text-blue-600 hover:underline"
            >
              Privacy Policy
            </Link>{' '}
            for additional information about data handling.
          </p>
        </section>
        <section
          id="tools"
          className="border-t border-slate-200 bg-white px-4 py-20 sm:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
                  Explore tools
                </p>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  More AI Photo Tools
                </h2>
                <p className="mt-3 max-w-xl text-slate-500">
                  Open a task-focused editor. Preparing your edit is free; AI
                  generation uses credits.
                </p>
              </div>
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
              >
                All AI tools <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {PHOTO_TOOLS.map((tool, i) => (
                <Link
                  key={tool.slug}
                  href={'/tools/' + tool.slug}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <span
                    className={
                      'mb-8 inline-flex size-12 items-center justify-center rounded-xl ' +
                      (i === 0
                        ? 'bg-blue-50 text-blue-600'
                        : i === 1
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-sky-50 text-sky-600')
                    }
                  >
                    {i === 0 ? (
                      <WandSparkles className="size-6" />
                    ) : i === 1 ? (
                      <Layers className="size-6" />
                    ) : (
                      <Sparkles className="size-6" />
                    )}
                  </span>
                  <h3 className="text-lg font-semibold">{tool.title}</h3>
                  <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">
                    {tool.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                    Open tool{' '}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJsonLd }}
        />
      </main>
      <Footer />
    </div>
  );
}
export const Route = createFileRoute('/')({
  head: () =>
    pageHead({
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      path: '/',
      image: '/og.png',
    }),
  component: HomePage,
});
