import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  Layers3,
  Scissors,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { BACKGROUND_REMOVAL_CREDITS } from '@/modules/photo-editor/config';
import { absoluteUrl, pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { BackgroundRemoverWorkspace } from '@/components/photo-editor/background-remover-workspace';

const TITLE = 'AI Background Remover: Transparent PNG Online';
const DESCRIPTION = `AI Background Remover: remove photo backgrounds online and download a transparent PNG. ${BACKGROUND_REMOVAL_CREDITS} credits per image. Start with 10 guest credits, no sign-up.`;

const CAPABILITIES = [
  {
    icon: Layers3,
    title: 'Create a transparent PNG cutout',
    description:
      'Download a PNG with a real alpha channel. Preview it on the checkerboard before you save, so you can see which areas are transparent.',
  },
  {
    icon: ShieldCheck,
    title: 'Keep the original subject',
    description:
      'The model separates foreground from background instead of redrawing the person or product. Hair, glass and sheer fabric can still need a closer look.',
  },
  {
    icon: Scissors,
    title: 'Remove backgrounds in one step',
    description: `No prompt is required. Upload a photo and click Remove Background. Each cutout costs ${BACKGROUND_REMOVAL_CREDITS} credits.`,
  },
] as const;

const USE_CASES = [
  {
    title: 'Product photos',
    description:
      'Create transparent product cutouts for catalogs, marketplaces and marketing graphics.',
  },
  {
    title: 'Portraits and profile pictures',
    description:
      'Isolate a person from a busy background without redrawing their face or clothing.',
  },
  {
    title: 'Designs and presentations',
    description:
      'Place a transparent PNG over your own layouts, thumbnails or slides.',
  },
] as const;

const WHY_USE = [
  {
    icon: Sparkles,
    title: 'A real transparent cutout',
    description:
      'This page returns a transparent PNG with a real alpha channel. It separates the subject from the background rather than generating a new scene. The underlying model may be updated over time.',
  },
  {
    icon: CheckCircle2,
    title: 'Two cutouts from your guest credits',
    description: `You start with 10 guest credits, and each background removal costs ${BACKGROUND_REMOVAL_CREDITS} credits, enough for two cutouts. Sign in for 10 more. No account is required to try.`,
  },
  {
    icon: ShieldCheck,
    title: 'Review the cutout before you use it',
    description:
      'Compare the original and the result on a checkerboard. Fine hair, sheer materials, reflective edges and crowded scenes can still need a second pass.',
  },
] as const;

const STEPS = [
  {
    number: '01',
    title: 'Upload your photo',
    description: 'Choose a JPG, PNG or WebP image up to 10 MB.',
  },
  {
    number: '02',
    title: 'Remove the background',
    description:
      'Click Remove Background. No prompt is needed; the model isolates the main subject automatically.',
  },
  {
    number: '03',
    title: 'Inspect and download a transparent PNG',
    description:
      'Preview the cutout on the checkerboard, then download the PNG.',
  },
] as const;

const FAQS = [
  {
    question: 'How does this background remover work?',
    answer:
      'This page separates the subject from the background and produces a transparent PNG. It does not generate a new background. The underlying model may be updated over time.',
  },
  {
    question: 'Can I remove a photo background without signing up?',
    answer: `Yes. You can start with 10 guest credits without creating an account. Each background removal costs ${BACKGROUND_REMOVAL_CREDITS} credits, enough for two cutouts. Sign in to receive 10 more credits.`,
  },
  {
    question: 'Will the removed background be transparent?',
    answer:
      'Yes. Background removal produces a PNG cutout with transparent areas, not a new white or studio background. Preview it on the checkerboard before downloading.',
  },
  {
    question: 'Does the tool change the person or product?',
    answer:
      'The background removal model separates the foreground from the original pixels rather than generating a different subject. Fine edges can still be imperfect, so check hair, fabric and shadows.',
  },
  {
    question: 'Is this the same as changing a photo background?',
    answer:
      'No. This tool removes the background and leaves transparency so you can place the subject on another design. To describe a new scene instead of a cutout, use the AI photo editor.',
  },
  {
    question: 'Which photo formats are supported?',
    answer:
      'Upload JPG, PNG or WebP files up to 10 MB. Download the processed result as a PNG with transparency.',
  },
  {
    question: 'What happens if background removal fails?',
    answer:
      'If a processing task fails, its reserved credits are restored automatically. See your history in My Creations after signing in.',
  },
  {
    question: 'Are my uploaded images saved?',
    answer:
      'Your selected image stays in the browser before generation. Once you generate, the image is uploaded for processing and the result is stored. See the Privacy Policy for data handling and deletion requests.',
  },
] as const;

const EDITOR_LINK_FAQ = 'Is this the same as changing a photo background?';
const EDITOR_LINK_LABEL = 'AI photo editor';

function FaqAnswer({ question, answer }: { question: string; answer: string }) {
  if (question !== EDITOR_LINK_FAQ) return answer;
  const index = answer.lastIndexOf(EDITOR_LINK_LABEL);
  if (index < 0) return answer;
  return (
    <>
      {answer.slice(0, index)}
      <Link href="/" className="font-semibold text-blue-600 hover:underline">
        {EDITOR_LINK_LABEL}
      </Link>
      {answer.slice(index + EDITOR_LINK_LABEL.length)}
    </>
  );
}

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'AI Background Remover',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      url: absoluteUrl('/ai-background-remover'),
      image: absoluteUrl('/images/ai-photo-editor/remove-background.jpg'),
      description: DESCRIPTION,
      featureList: ['Transparent PNG cutouts', 'Foreground segmentation'],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: `10 guest credits; ${BACKGROUND_REMOVAL_CREDITS} credits per background removal`,
      },
      provider: {
        '@type': 'Organization',
        name: envConfigs.app_name,
        url: envConfigs.app_url,
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ question, answer }) => ({
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
          name: 'AI Background Remover',
          item: absoluteUrl('/ai-background-remover'),
        },
      ],
    },
  ],
});

function BackgroundRemoverPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="border-b border-slate-200 bg-gradient-to-b from-[#edf4ff] via-[#f8fbff] to-[#f7f9fc] px-4 pt-9 pb-12 sm:px-6 sm:pt-12">
          <div className="mx-auto max-w-[1320px]">
            <div className="mx-auto mb-7 max-w-3xl text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                AI Background Remover Online
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Upload a photo and remove the background in one step. Keep the
                original subject and download a transparent PNG you can place on
                another design.
              </p>
            </div>
            <div id="remover" className="scroll-mt-24">
              <BackgroundRemoverWorkspace />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                Transparent PNG output
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                {BACKGROUND_REMOVAL_CREDITS} credits per image
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                10 guest credits to start
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Background removal
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            What Can This AI Background Remover Do?
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            This tool isolates the main subject and leaves a transparent
            background. The person or product stays the original pixels rather
            than a newly generated version.
          </p>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {CAPABILITIES.map((item) => {
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
            Remove Backgrounds from Products, Portraits and Designs
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
              Keep the original subject. This tool uses foreground segmentation,
              not generative background replacement. Inspect delicate edges such
              as loose hair, glass, transparent fabrics and shadows before using
              the cutout professionally.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Why use it
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Why Use This AI Background Remover
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
                  How to Remove a Photo Background with AI
                </h2>
              </div>
              <a
                href="#remover"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Remove my background <ArrowRight className="size-4" />
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
              AI Background Remover FAQ
            </h2>
            <div className="mt-6">
              {FAQS.map(({ question, answer }) => (
                <div key={question} className="border-b border-slate-200 py-6">
                  <h3 className="text-lg font-semibold">{question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    <FaqAnswer question={question} answer={answer} />
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-600">
              Read our{' '}
              <Link
                href="/privacy-policy"
                className="font-semibold text-blue-600 hover:underline"
              >
                Privacy Policy
              </Link>{' '}
              for details about image handling.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-2xl bg-slate-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to remove the background?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Start with 10 guest credits. Each cutout costs{' '}
                {BACKGROUND_REMOVAL_CREDITS} credits, and no account is required
                to try.
              </p>
            </div>
            <a
              href="#remover"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Remove Background <ArrowRight className="size-4" />
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

export const Route = createFileRoute('/ai-background-remover')({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: '/ai-background-remover',
      image: '/images/ai-photo-editor/remove-background.jpg',
    }),
  component: BackgroundRemoverPage,
});
