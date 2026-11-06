import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, ImagePlus, Layers3, Scissors, ShieldCheck } from 'lucide-react';

import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Link } from '@/core/i18n/navigation';
import { pageHead } from '@/lib/seo';
import {
  BACKGROUND_REMOVAL_CREDITS,
  getPhotoTool,
} from '@/modules/photo-editor/config';
import { PhotoEditorWorkspace } from '@/components/photo-editor/workspace';

const TOOL = getPhotoTool('remove-background')!;

const FAQS = [
  {
    question: 'Can I remove a photo background without signing up?',
    answer:
      'Yes. You can start with 10 guest credits without creating an account. Each background removal costs 4 credits. Sign in to receive 10 more credits.',
  },
  {
    question: 'Will the removed background be transparent?',
    answer:
      'Yes. Background removal produces a PNG cutout with transparent areas, not a new white or studio background. Preview it on the checkerboard before downloading.',
  },
  {
    question: 'Does the tool change the person or product?',
    answer:
      'The background removal model separates the foreground from the original pixels rather than generating a different subject. Fine edges can still be imperfect, so check hair, fabric, and shadows.',
  },
  {
    question: 'Which photo formats are supported?',
    answer:
      'Upload JPG, PNG, or WebP files up to 10 MB. Download the processed result as a PNG with transparency.',
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

const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'AI Background Remover — GetAIPhotoEditor',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      url: 'https://getaiphotoeditor.com/ai-background-remover',
      description: 'Remove image backgrounds and download transparent PNG cutouts online.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Start with 10 guest credits; ' + BACKGROUND_REMOVAL_CREDITS + ' credits per background removal.',
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
  ],
});

const USE_CASES = [
  {
    icon: ImagePlus,
    title: 'Product photos',
    description:
      'Create transparent product cutouts for catalogs, marketplaces, and marketing graphics.',
  },
  {
    icon: Scissors,
    title: 'Portraits & profile pictures',
    description:
      'Isolate a person from a busy background without redrawing their face or clothing.',
  },
  {
    icon: Layers3,
    title: 'Designs & presentations',
    description:
      'Place a transparent PNG over your own layouts, thumbnails, or slides.',
  },
];

function BackgroundRemoverPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-[#f0f6ff] via-[#fafcff] to-[#f7f9fc] px-4 pt-10 pb-14 sm:px-6 sm:pt-14">
          <div className="mx-auto max-w-[1320px]">
            <div className="mx-auto mb-8 max-w-3xl text-center">
              <p className="mb-3 text-xs font-bold tracking-[0.16em] text-blue-600 uppercase">
                Online background remover
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                AI Background Remover
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Remove photo backgrounds in one click. Keep the main subject and
                download a transparent PNG — no manual masking or design software.
              </p>
            </div>
            <div id="remover" className="scroll-mt-24">
              <PhotoEditorWorkspace tool={TOOL} />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> Transparent PNG output
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> {BACKGROUND_REMOVAL_CREDITS} credits per image
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" /> 10 guest credits to start
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
              How it works
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Remove the background in three steps
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TOOL.steps.map((step, i) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <span className="text-sm font-bold text-blue-600">0{i + 1}</span>
                <h3 className="mt-4 text-base font-semibold">{['Upload your image', 'Remove the background', 'Download transparent PNG'][i]}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
                Made for your photos
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                One transparent cutout, many uses
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Remove backgrounds from portraits, products, and everyday photos.
                Download a PNG cutout you can place on another design.
              </p>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {USE_CASES.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
                  <div className="mb-5 inline-flex rounded-xl bg-blue-100 p-3 text-blue-600">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
            <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-6 shrink-0 text-blue-600" />
                <p className="text-sm leading-7 text-slate-700">
                  <strong>Keep the original subject.</strong> This tool uses foreground
                  segmentation, not a generative background replacement. Inspect
                  delicate edges such as loose hair, glass, transparent fabrics, and
                  shadows before using the cutout professionally.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI Background Remover FAQs
          </h2>
          <div className="mt-7 divide-y divide-slate-200 border-t border-slate-200">
            {FAQS.map(({ question, answer }) => (
              <div key={question} className="py-6">
                <h3 className="font-semibold text-slate-900">{question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-600">
            Read our{' '}
            <Link href="/privacy-policy" className="font-semibold text-blue-600 hover:underline">
              Privacy Policy
            </Link>{' '}
            for details about image handling.
          </p>
        </section>

        <section className="bg-[#eaf2ff] px-4 py-14 text-center sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight">Ready to remove the background?</h2>
            <p className="mt-3 text-slate-600">Start with your 10 guest credits. No account required to try.</p>
            <a href="#remover" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Remove Background <ArrowRight className="size-4" />
            </a>
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/ai-background-remover')({
  head: () =>
    pageHead({
      title: 'AI Background Remover — Transparent PNG Online | GetAIPhotoEditor',
      description:
        'Remove image backgrounds online with AI. Keep people and products intact and download a transparent PNG. 10 guest credits to start, no signup.',
      path: '/ai-background-remover',
    }),
  component: BackgroundRemoverPage,
});
