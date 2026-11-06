import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  Focus,
  Palette,
  ShieldCheck,
  Sparkles,
  SunMedium,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { EDIT_CREDITS, getPhotoTool } from '@/modules/photo-editor/config';
import { absoluteUrl, pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PhotoEditorWorkspace } from '@/components/photo-editor/workspace';

const TITLE = 'AI Photo Enhancer: Improve Photo Quality Online';
const DESCRIPTION =
  'Enhance photos online with GPT Image 2.6. Improve lighting, clarity and colors from a prompt. Start with 10 free credits, no sign-up.';

const ENHANCEMENTS = [
  {
    icon: Focus,
    title: 'Improve apparent sharpness',
    description:
      'Bring out definition in slightly soft photos and ask for clearer-looking details, without an exaggerated sharpened effect.',
  },
  {
    icon: SunMedium,
    title: 'Balance lighting',
    description:
      'Brighten dim photos, soften harsh contrast and make the subject easier to see while keeping the mood of the original.',
  },
  {
    icon: Palette,
    title: 'Refine colors naturally',
    description:
      'Correct dull or uneven colors, adjust white balance and keep skin tones and product colors as faithful as possible.',
  },
] as const;

const USE_CASES = [
  {
    title: 'Portraits and headshots',
    description:
      'Make lighting more flattering and improve clarity while asking AI to preserve the person’s identity, expression and natural skin texture.',
  },
  {
    title: 'Product photos',
    description:
      'Improve visual clarity, exposure and color for listings without intentionally changing the shape, branding or design of the product.',
  },
  {
    title: 'Travel and everyday photos',
    description:
      'Give landscapes, indoor scenes and casual snapshots a cleaner, more balanced look without rebuilding the whole scene.',
  },
] as const;

const WHY_USE: readonly {
  icon: typeof Sparkles;
  title: string;
  description: string;
  linkHref?: string;
  linkLabel?: string;
}[] = [
  {
    icon: Sparkles,
    title: 'Edits through GPT Image 2.6',
    description:
      'Describe the improvement in everyday language: clearer details, softer light, or more natural color. The same GPT Image 2.6 model runs in the editor on this page.',
    linkHref: '/blog/what-is-chatgpt-images-2-6',
    linkLabel: 'What Is ChatGPT Images 2.6',
  },
  {
    icon: CheckCircle2,
    title: 'One medium-quality enhancement to start',
    description:
      'You get 10 guest credits, enough for one medium-quality enhancement. Sign in for 10 more. Compare the original and the result, then download or refine the prompt.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality improvements you can review',
    description:
      'This page improves lighting, clarity and color. It is not a 2x, 4x or 4K upscaler, and output resolution follows the model and quality setting you choose. Your original file stays available so you can check the change.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Upload your photo',
    description: 'Choose a JPG, PNG or WebP image up to 10 MB.',
  },
  {
    number: '02',
    title: 'Describe the improvement',
    description:
      'Start with our photo enhancement prompt, or ask for clearer details, softer lighting or natural color correction.',
  },
  {
    number: '03',
    title: 'Generate, compare and download',
    description:
      'Use your credits to enhance the image, inspect the original and result, then download or refine your edit.',
  },
] as const;

const FAQS = [
  [
    'What AI model does this photo enhancer use?',
    'This page uses GPT Image 2.6 for prompt-based photo enhancement. That is the image model inside this editor, not the ChatGPT Images 2.6 interface in ChatGPT.',
  ],
  [
    'Can AI enhance a blurry photo?',
    'AI can sometimes make a slightly blurry image look clearer, but it cannot reliably recover details that were never captured. Very blurry faces, text or fine patterns may be changed or invented.',
  ],
  [
    'Will the enhancer change people or objects in my photo?',
    'The suggested prompt asks AI to preserve faces, objects and composition. Because this is generative editing, small details can still change. Always compare the result with your original.',
  ],
  [
    'Can I enhance a photo for free without signing up?',
    `Yes. You can start with 10 free guest credits, which covers one medium-quality enhancement. Signing in gives you another 10 credits. Medium costs ${EDIT_CREDITS} credits, and other quality levels use different amounts.`,
  ],
  [
    'Does this tool upscale images to 4K or 4× resolution?',
    'Not specifically. This is a prompt-based AI photo enhancer rather than a fixed 2×, 4× or 4K upscaler. Output resolution depends on the image generation model and chosen quality settings.',
  ],
  [
    'What image formats can I upload?',
    'You can upload JPG, PNG and WebP files up to 10 MB using your browser on a phone or computer.',
  ],
  [
    'Are my photos uploaded immediately?',
    'Your selected file stays in your browser until you start generation. When you generate, the image is uploaded for processing. See the Privacy Policy for details about storage and data handling.',
  ],
] as const;

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'AI Photo Enhancer',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      url: absoluteUrl('/ai-photo-enhancer'),
      image: absoluteUrl('/images/ai-photo-editor/enhance-photo.jpg'),
      description: DESCRIPTION,
      featureList: [
        'Improve apparent sharpness',
        'Balance lighting',
        'Refine colors',
        'GPT Image 2.6 photo enhancement',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: '10 free guest credits; 10 more credits when signing in',
      },
      provider: {
        '@type': 'Organization',
        name: envConfigs.app_name,
        url: envConfigs.app_url,
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
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: absoluteUrl('/'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'AI Tools',
          item: absoluteUrl('/tools'),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'AI Photo Enhancer',
          item: absoluteUrl('/ai-photo-enhancer'),
        },
      ],
    },
  ],
});

const enhancerTool = getPhotoTool('enhance-photo');

function PhotoEnhancerPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="border-b border-slate-200 bg-gradient-to-b from-[#edf4ff] via-[#f8fbff] to-[#f7f9fc] px-4 pt-9 pb-12 sm:px-6 sm:pt-12">
          <div className="mx-auto max-w-[1320px]">
            <div className="mx-auto mb-7 max-w-3xl text-center">
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <Sparkles className="size-3.5" />
                Powered by GPT Image 2.6
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                AI Photo Enhancer Online
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Improve lighting, clarity and colors with a simple prompt.
                Upload your photo, generate an enhancement, and compare it with
                the original before you download.
              </p>
            </div>
            <div id="enhancer" className="scroll-mt-24">
              <PhotoEditorWorkspace tool={enhancerTool} />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                10 free credits to start
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                No sign-up required to try
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                GPT Image 2.6
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Photo quality enhancement
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            What Can an AI Photo Enhancer Improve?
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Ask for clearer details, more balanced light, or more natural color.
            The editor uses GPT Image 2.6, so results are generative: inspect
            faces and fine details against the original.
          </p>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {ENHANCEMENTS.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Everyday use cases
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Enhance Portraits, Products and Everyday Photos
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {USE_CASES.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-7 text-slate-600">
              Generative enhancement is not lossless restoration. Photos with
              very strong blur, missing pixels or illegible text can gain
              plausible-looking but inaccurate details. Check faces, labels and
              important objects against the original.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Why use it
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Why Use This AI Photo Enhancer
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {WHY_USE.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                  {item.linkHref ? (
                    <p className="mt-3 text-sm leading-7">
                      <Link
                        href={item.linkHref}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {item.linkLabel}
                      </Link>
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
                  Three simple steps
                </p>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  How to Enhance a Photo with AI
                </h2>
              </div>
              <a
                href="#enhancer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Enhance my photo <ArrowRight className="size-4" />
              </a>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {STEPS.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-6"
                >
                  <p className="text-sm font-bold text-blue-600">
                    {step.number}
                  </p>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="border-t border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              AI Photo Enhancer FAQ
            </h2>
            <div className="mt-6">
              {FAQS.map(([question, answer]) => (
                <div key={question} className="border-b border-slate-200 py-6">
                  <h3 className="text-lg font-semibold">{question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {answer}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-600">
              See our{' '}
              <Link
                href="/privacy-policy"
                className="font-semibold text-blue-600 hover:underline"
              >
                Privacy Policy
              </Link>{' '}
              for more on photo processing and storage. Read more about the
              model in{' '}
              <Link
                href="/blog/what-is-chatgpt-images-2-6"
                className="font-semibold text-blue-600 hover:underline"
              >
                What Is ChatGPT Images 2.6
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-2xl bg-slate-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to improve your photo?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Upload a photo, use or edit the enhancement prompt, and preview
                the result. A medium-quality edit costs {EDIT_CREDITS} credits.
              </p>
            </div>
            <a
              href="#enhancer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Enhance photo <ArrowRight className="size-4" />
            </a>
          </div>
          <p className="mx-auto mt-5 max-w-6xl text-center text-sm text-slate-500">
            Looking for a different edit? Open the{' '}
            <Link
              href="/"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editor
            </Link>{' '}
            or browse{' '}
            <Link
              href="/tools"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editing tools
            </Link>
            .
          </p>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/ai-photo-enhancer')({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: '/ai-photo-enhancer',
      image: '/images/ai-photo-editor/enhance-photo.jpg',
    }),
  component: PhotoEnhancerPage,
});
