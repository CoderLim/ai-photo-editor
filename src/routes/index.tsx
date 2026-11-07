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
import { EDIT_CREDITS, PHOTO_TOOLS } from '@/modules/photo-editor/config';
import { pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Pricing } from '@/blocks/pricing';
import { CoreBenefits } from '@/components/photo-editor/core-benefits';
import { PhotoEditorWorkspace } from '@/components/photo-editor/workspace';

const FAQS = [
  [
    'Is this AI photo editor really free?',
    `Yes to start. You get 10 free credits without signing in (enough for one medium-quality edit). Sign in and you get 10 more. A medium-quality edit uses ${EDIT_CREDITS} credits; other qualities use more or fewer. One-time credit packs are available when you need more.`,
  ],
  [
    'Can I use it without signing up?',
    'Yes. Upload a photo, write a prompt, and generate with your 10 guest credits — no account required. Sign in anytime for 10 more credits and to keep results in My Creations.',
  ],
  [
    'Does it work on iPhone or Android without an app?',
    'Yes. Use a modern browser on iPhone, Android, Mac, or Windows. No additional app installation is needed.',
  ],
  [
    'What happens to my photos after editing?',
    'Before generation, your selected photo stays in your browser. When you generate, it is uploaded for processing and the result is stored so you can access My Creations after signing in. We do not promise automatic deletion; see the Privacy Policy for data-handling information.',
  ],
  [
    'Are my uploaded photos private and secure?',
    'Before you generate, your selected photo stays in your browser. When you generate, it is sent securely for processing so we can return your edit. We use encryption in transit and access controls; see the Privacy Policy for details.',
  ],
  [
    'How long do you store my photos?',
    'After generation, uploads and results are stored so signed-in users can reopen them in My Creations. We do not promise automatic deletion after a fixed period. Contact us if you want data removed sooner.',
  ],
  [
    'Are my photos used to train AI models?',
    'No. We use your photos only to generate the edits you request. We do not use your uploads or results to train AI models.',
  ],
  [
    'Can I delete my uploaded and generated photos?',
    'Yes. You can request deletion of your personal data, including uploaded and generated photos, through your account settings or by emailing support@getaiphotoeditor.com.',
  ],
  [
    'Will my credits be refunded if generation fails?',
    'Yes. If an edit fails or is canceled, the credits used for that job are restored to your balance automatically.',
  ],
] as const;

const HOME_TITLE = 'AI Photo Editor: Free AI Image Editor Online, No Sign-Up';
const HOME_DESCRIPTION =
  'Free AI photo editor online. Remove objects, retouch portraits, enhance photos, and restyle images with text prompts — No Sign-Up.';

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
        description: `10 free credits without signing in; 10 more after sign-in. A medium-quality edit uses ${EDIT_CREDITS} credits; credits vary by quality`,
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
  {
    title: 'Remove and Replace Backgrounds',
    description:
      'Create a subject cutout, then choose a studio color, preset scene, or your own background photo.',
    href: '/photo-background-changer',
    cta: 'Open Photo Background Changer',
  },
  {
    title: 'Retouch Portraits and Skin',
    description:
      'Ask for subtle skin cleanup, softer lighting, or a polished headshot while keeping the person recognizable.',
  },
  {
    title: 'Enhance Blurry or Low-Quality Photos',
    description:
      'Improve apparent clarity, lighting, and colors. Generative edits cannot guarantee recovery of lost image details.',
    href: '/ai-photo-enhancer',
    cta: 'Open AI Photo Enhancer',
  },
  {
    title: 'Erase Objects and People',
    description:
      'Remove an unwanted item or passerby and ask AI to reconstruct the surrounding background naturally.',
  },
  {
    title: 'Restyle Photos With Text Prompts',
    description:
      'Describe cinematic light, a golden-hour mood, vintage color, or another creative look using plain words.',
  },
  {
    title: 'Remove Clothing Wrinkles',
    description:
      'Smooth creases and wrinkles in shirts, dresses, or other garments while keeping the fabric texture, fit, and overall look natural.',
  },
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
    '/images/ai-photo-editor/who-uses/ecommerce.png',
  ],
  [
    'Social Creators',
    'Refresh profile photos, social posts, and thumbnails without installing another app.',
    '/images/ai-photo-editor/who-uses/social-creators.png',
  ],
  [
    'Photographers',
    'Experiment with object cleanup, skin retouching, and creative lighting, then review every detail.',
    '/images/ai-photo-editor/who-uses/photographers.png',
  ],
  [
    'Real Estate',
    'Explore brighter interiors and sky changes. Keep listing images accurate and disclose material changes as required.',
    '/images/ai-photo-editor/who-uses/real-estate.png',
  ],
] as const;

function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="relative overflow-x-clip border-b border-slate-100 bg-gradient-to-b from-[#f1f6ff] via-[#f9fbff] to-[#f7f9fc] px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
          <div className="mx-auto max-w-[1320px]">
            <div className="mb-5 text-center sm:mb-6">
              <h1 className="text-[1.65rem] font-bold tracking-[-0.035em] text-slate-950 sm:text-[2rem] sm:leading-none">
                AI Photo Editor Online
              </h1>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                Upload a photo and describe the edit — 10 free credits, no
                signup.
              </p>
            </div>
            <div id="editor">
              <PhotoEditorWorkspace />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> 10 free
                credits to start
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> No app to
                install
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> Original photo
                kept intact
              </span>
            </div>
          </div>
        </section>

        <CoreBenefits />
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
            {FEATURES.map((feature, index) => {
              const card = (
                <>
                  <img
                    src={FEATURE_IMAGES[index]}
                    alt={`Before and after AI photo edit: ${feature.title}`}
                    width={1672}
                    height={941}
                    loading="lazy"
                    decoding="async"
                    className="mb-5 aspect-[1672/941] w-full rounded-xl bg-slate-100 object-cover"
                  />
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                  {'href' in feature && feature.href ? (
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                      {feature.cta} <ArrowRight className="size-4" />
                    </span>
                  ) : null}
                </>
              );
              const className =
                'flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6' +
                ('href' in feature && feature.href
                  ? ' hover:border-blue-200'
                  : '');
              return 'href' in feature && feature.href ? (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className={className}
                >
                  {card}
                </Link>
              ) : (
                <article key={feature.title} className={className}>
                  {card}
                </article>
              );
            })}
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
                  'Choose a JPG, PNG or WebP image up to 10 MB. No account needed to start.',
                ],
                [
                  '02',
                  'Describe the change',
                  'Try “remove the background”, “make it look like golden hour”, or “clear acne while keeping the face natural”.',
                ],
                [
                  '03',
                  'Generate and download',
                  `Generate an edit with your free credits, inspect the result, then download or refine it. A medium-quality edit uses ${EDIT_CREDITS} credits. Sign in for 10 more credits and My Creations.`,
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
            {USE_CASES.map(([title, description, image]) => (
              <article
                key={title}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
              >
                <img
                  src={image}
                  alt={`AI photo editing for ${title}`}
                  width={1448}
                  height={1086}
                  loading="lazy"
                  decoding="async"
                  className="mb-5 aspect-[1448/1086] w-full rounded-xl bg-slate-100 object-cover"
                />
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
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
                  Open a task-focused editor. Start with free credits. A
                  medium-quality edit uses {EDIT_CREDITS} credits; other
                  qualities cost more or less.
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
                  href={
                    tool.slug === 'remove-background'
                      ? '/ai-background-remover'
                      : tool.slug === 'enhance-photo'
                        ? '/ai-photo-enhancer'
                        : tool.slug === 'change-background'
                           ? '/photo-background-changer'
                           : '#editor'
                  }
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
      socialTitle: 'GetAIPhotoEditor – Edit Photos with a Simple Prompt',
      socialDescription:
        'Remove objects, replace backgrounds, retouch and enhance photos with AI. Just upload, describe the change and generate.',
    }),
  component: HomePage,
});
