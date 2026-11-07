import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Layers3,
  Palette,
  ShieldCheck,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { BACKGROUND_REMOVAL_CREDITS } from '@/modules/photo-editor/config';
import { absoluteUrl, pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { BackgroundChangeComparison } from '@/components/photo-editor/background-change-comparison';
import { BackgroundRemoverWorkspace } from '@/components/photo-editor/background-remover-workspace';

const PATH = '/photo-background-changer';
const TITLE = 'Free Photo Background Changer: Change Photo Background Online';
const DESCRIPTION =
  'Photo Background Change online for free. Replace backgrounds with white or custom colors, preset scenes, or your own image.';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Keep your original subject',
    description:
      'AI isolates the original person, product or pet as a transparent cutout instead of generating a new subject. Review delicate edges before downloading.',
  },
  {
    icon: Palette,
    title: 'Choose any background color',
    description:
      'Pick white, beige, blue or another preset, or choose your own solid color. Try several colors with the same cutout.',
  },
  {
    icon: ImagePlus,
    title: 'Use a photo background',
    description:
      'Select one of our background photos or upload your own JPG, PNG or WebP. A new background choice does not trigger another AI edit.',
  },
] as const;

const SCENARIOS = [
  {
    eyebrow: 'For online shops',
    title: 'Change Product Photo Backgrounds',
    intro:
      'Give product images a cleaner, more consistent look without reshooting each item. Remove a distracting table, room or shelf and place your cutout against a neutral studio background.',
    detail:
      'A white or softly colored background can keep the focus on the item for an online listing, catalog or promotional graphic. You can compare several backgrounds using one prepared cutout, and download the option that suits your store.',
    tip: 'Check the outline of handles, straps, reflective surfaces and any original shadows before using the result in a product listing.',
    comparisonImage:
      '/images/ai-photo-editor/core-benefits/handbag-background-compare.jpg',
    comparisonAlt:
      'Before and after comparison of the same beige handbag, from a furnished room to a clean beige studio background',
    beforeLabel: 'Room backdrop',
    afterLabel: 'Clean studio',
  },
  {
    eyebrow: 'For profile pictures and travel memories',
    title: 'Change Portrait Backgrounds',
    intro:
      'Replace a busy location behind a portrait with a softer outdoor setting, an office-style background or your own photograph. Keep the person in the foreground from your original image.',
    detail:
      'This is useful for profile pictures, personal graphics and social posts when the background distracts from the subject. Choose a preset scene, or upload a photo that fits the context you want.',
    tip: 'Loose hair, transparent clothing and differences in lighting may look less natural after compositing. Review those areas before sharing.',
    comparisonImage: '/images/ai-photo-editor/remove-background.jpg',
    comparisonAlt:
      'Same smiling woman in a white top with a transparent background on the left and a beach scene on the right',
    beforeLabel: 'Transparent cutout',
    afterLabel: 'Beach backdrop',
  },
] as const;

const COLOR_SWATCHES = [
  { label: 'Studio white', color: '#ffffff', border: true },
  { label: 'Soft blue', color: '#cfe5ff', border: false },
  { label: 'Warm beige', color: '#ead7c4', border: false },
  { label: 'Blush pink', color: '#f8dbe1', border: false },
  { label: 'Mint green', color: '#d2eee3', border: false },
  {
    label: 'Custom color',
    color:
      'conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)',
    border: false,
  },
] as const;

const WHITE_STEPS = [
  {
    title: 'Upload your photo',
    description:
      'Choose a JPG, PNG or WebP image up to 10 MB with a clearly visible subject.',
  },
  {
    title: 'Prepare the cutout',
    description:
      'Click Prepare Background. The AI isolates the subject for ' +
      BACKGROUND_REMOVAL_CREDITS +
      ' credits.',
  },
  {
    title: 'Pick a white background',
    description:
      'Select Studio white, or dial in a custom off-white with the color picker. Preview and download the PNG.',
  },
] as const;

const STEPS = [
  {
    title: 'Upload your photo',
    description:
      'Choose a JPG, PNG or WebP image up to 10 MB. A clearly visible subject works best.',
  },
  {
    title: 'Prepare the cutout',
    description:
      'Click Prepare Background. The AI removes the original background for ' +
      BACKGROUND_REMOVAL_CREDITS +
      ' credits.',
  },
  {
    title: 'Add a new background',
    description:
      'Select a solid color, photo preset, or your own background image. Preview and download the PNG.',
  },
] as const;

const FAQS = [
  {
    question: 'How do I change the background of a photo?',
    answer:
      'Upload your original photo, prepare the transparent subject cutout, and then select a color, preset scene or custom background image. Download the composition as PNG.',
  },
  {
    question: 'Can I change a photo background to white?',
    answer:
      'Yes. You can make the background white with the Studio white preset, or change the background to white with a custom hex near pure white. That covers clean product shots, softer off-white looks, and simple profile graphics—inspect edges and contrast before you download.',
  },
  {
    question: 'Can I use my own image as the new background?',
    answer:
      'Yes. After preparing the cutout, select the Photo tab and upload a JPG, PNG or WebP background image up to 10 MB.',
  },
  {
    question: 'Is the photo background changer free to try?',
    answer:
      'Yes. You start with 10 guest credits without signing up. The AI subject cutout costs ' +
      BACKGROUND_REMOVAL_CREDITS +
      ' credits. Once the cutout is ready, switching among available colors and backgrounds does not cost additional credits.',
  },
  {
    question: 'Will the subject in my photo stay the same?',
    answer:
      'The original foreground pixels are composited over the new background instead of redrawing the subject. Fine hair, glass, transparent fabric and shadows may still need review. Lighting on the subject is not automatically changed to match the new scene.',
  },
  {
    question: 'Can I describe a new AI-generated background in words?',
    answer:
      'Not on this page. Here you can choose a color, a preset photo, or upload your own background. For prompt-based scene generation, use the main AI Photo Editor.',
  },
  {
    question: 'Can I also download a transparent PNG?',
    answer:
      'Yes. Select the Transparent option in the Color tab. For a dedicated transparent-cutout workflow, use our transparent background maker.',
  },
  {
    question: 'Which formats can I upload and download?',
    answer:
      'The source image and custom background upload support JPG, PNG and WebP up to 10 MB. Download the finished composition as a PNG.',
  },
  {
    question: 'What if the AI cutout fails?',
    answer:
      'Reserved credits are automatically returned if the background-removal task fails. Check the Privacy Policy for details about how uploaded images are handled.',
  },
] as const;

const REMOVER_LINK_FAQ = 'Can I also download a transparent PNG?';
const REMOVER_LINK_LABEL = 'transparent background maker';

function FaqAnswer({ question, answer }: { question: string; answer: string }) {
  if (question !== REMOVER_LINK_FAQ) return answer;
  const index = answer.lastIndexOf(REMOVER_LINK_LABEL);
  if (index < 0) return answer;
  return (
    <>
      {answer.slice(0, index)}
      <Link
        href="/ai-background-remover"
        className="font-semibold text-blue-600 hover:underline"
      >
        {REMOVER_LINK_LABEL}
      </Link>
      {answer.slice(index + REMOVER_LINK_LABEL.length)}
    </>
  );
}

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Photo Background Changer',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      url: absoluteUrl(PATH),
      description: DESCRIPTION,
      image: absoluteUrl(
        '/images/ai-photo-editor/core-benefits/handbag-background-compare.jpg'
      ),
      featureList: [
        'AI foreground cutout',
        'Solid color background replacement',
        'Preset background photographs',
        'Upload a custom background photo',
        'Download finished PNG',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description:
          '10 guest credits; ' +
          BACKGROUND_REMOVAL_CREDITS +
          ' credits per cutout',
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
          name: 'Photo Background Changer',
          item: absoluteUrl(PATH),
        },
      ],
    },
  ],
});

function PhotoBackgroundChangerPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-200 bg-gradient-to-b from-[#edf4ff] via-[#f8fbff] to-[#f7f9fc] px-4 pt-2 pb-16 sm:px-6 sm:pt-3 sm:pb-20">
          <img
            src="/images/ai-photo-editor/background-changer/hero-compare-card.webp"
            alt=""
            aria-hidden="true"
            width={720}
            height={966}
            className="pointer-events-none absolute top-4 left-4 hidden h-auto max-h-[70vh] w-[20vw] max-w-[280px] object-contain xl:block 2xl:left-8 2xl:max-w-[320px]"
          />
          <img
            src="/images/ai-photo-editor/background-changer/hero-luxury-accessory.webp"
            alt=""
            aria-hidden="true"
            width={720}
            height={960}
            className="pointer-events-none absolute top-[38%] right-4 hidden h-auto max-h-[min(36rem,52vh)] w-[20vw] max-w-[280px] object-contain xl:block 2xl:right-8 2xl:max-w-[320px]"
          />
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mb-3 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                Photo Background Changer Online
              </h1>
              <p className="mx-auto mt-2 text-sm text-slate-600 sm:text-base">
                Replace the background with a color, preset scene, or your own
                image — keep the original subject.
              </p>
            </div>
            <div id="background-changer" className="scroll-mt-24">
              <BackgroundRemoverWorkspace variant="changer" />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                No sign-up to try
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                {BACKGROUND_REMOVAL_CREDITS} credits per cutout
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-blue-600" />
                Color, preset or your own photo
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            One cutout, many backgrounds
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Change Photo Backgrounds Without Manual Masking
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            First isolate the subject with AI. Then try different colors and
            photo backdrops using the same transparent cutout. Background
            compositing happens in your browser, without generating your subject
            again.
          </p>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {FEATURES.map((item) => {
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

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
              Real-world background ideas
            </p>
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Photo Background Changes for Products and Portraits
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">
              Explore background replacement for product photos and portraits.
              The examples show different backdrops around the same subject
              while keeping the original foreground.
            </p>
            <div className="mt-12 space-y-16 sm:space-y-20">
              {SCENARIOS.map((scenario, index) => (
                <article
                  key={scenario.title}
                  className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
                >
                  <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                    <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
                      {scenario.eyebrow}
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      {scenario.title}
                    </h3>
                    <p className="mt-5 leading-7 text-slate-600">
                      {scenario.intro}
                    </p>
                    <p className="mt-4 leading-7 text-slate-600">
                      {scenario.detail}
                    </p>
                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-6 text-slate-600">
                      <strong className="text-slate-900">
                        Before you download:{' '}
                      </strong>
                      {scenario.tip}
                    </div>
                    <a
                      href="#background-changer"
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Try this background change{' '}
                      <ArrowRight className="size-4" />
                    </a>
                  </div>
                  <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                    <BackgroundChangeComparison
                      comparisonSrc={scenario.comparisonImage}
                      comparisonAlt={scenario.comparisonAlt}
                      beforeLabel={scenario.beforeLabel}
                      afterLabel={scenario.afterLabel}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            White backgrounds
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Make the Background White
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Not every white backdrop is the same. Pure white (#FFFFFF) reads as
            a hard studio cut for marketplaces. Soft off-white or cream looks
            warmer for lifestyle shots. ID-photo style white is usually a
            bright, even field behind a head-and-shoulders crop. E-commerce
            white often favors a clean, high-key look so the product stays
            sharp—without claiming official document compliance.
          </p>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            After you prepare the cutout, pick Studio white or a custom near-
            white hex. Switching colors reuses the same cutout and does not
            charge another AI run. A solid white fill does not relight the
            subject or invent new shadows, so check edges and contrast before
            you download.
          </p>
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Change Background to White in 3 Steps
              </h3>
              <div className="mt-6 space-y-4">
                {WHITE_STEPS.map((step, index) => (
                  <article
                    key={step.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <p className="text-sm font-bold text-blue-600">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h4 className="mt-2 text-base font-semibold">
                      {step.title}
                    </h4>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
              <a
                href="#background-changer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Make my background white <ArrowRight className="size-4" />
              </a>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-950">
                Choose white or another solid color
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with Studio white, or preview other presets and a custom
                color after preparing your cutout.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {COLOR_SWATCHES.map((swatch) => (
                  <div key={swatch.label}>
                    <div
                      role="img"
                      aria-label={swatch.label + ' background color sample'}
                      className={
                        'aspect-square rounded-2xl shadow-inner ' +
                        (swatch.border ? 'border border-slate-200' : '')
                      }
                      style={{ background: swatch.color }}
                    />
                    <p className="mt-2 text-center text-xs font-medium text-slate-600">
                      {swatch.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f1f6ff] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
                Focus on the background
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Keep Your Subject, Change Only the Background
              </h2>
              <p className="mt-5 leading-7 text-slate-600">
                Changing a background should not mean inventing a new face,
                product logo or clothing detail. Our background changer first
                separates the foreground from the uploaded photo, then places
                that same cutout onto a background you select.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-semibold text-slate-950">
                What stays the same—and what may need checking
              </h3>
              <p className="mt-4 leading-7 text-slate-600">
                Switching between preset backgrounds or colors does not rerun
                the image generator or redraw your subject. The cutout pixels
                are reused, so the face, clothing and product features in that
                cutout stay the same across background choices.
              </p>
              <p className="mt-4 leading-7 text-slate-600">
                AI segmentation can still miss fine hair, fuzzy fur, glass or
                transparent fabrics. A new background will not automatically
                recreate matching light or cast shadows. Preview the result
                carefully, especially if you plan to use it professionally.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Need transparency instead of a replacement background? Use our{' '}
                <Link
                  href="/ai-background-remover"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  transparent background maker
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Three steps
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            How to Change the Background of a Photo
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <p className="text-sm font-bold text-blue-600">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto flex max-w-6xl items-start gap-4 rounded-2xl border border-slate-200 bg-[#f7f9fc] p-6 sm:p-8">
            <Layers3 className="mt-1 size-7 shrink-0 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Background Changer vs. Background Remover
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Choose this photo background changer when you want a new color
                or image behind your subject—including when you make the
                background white. For a transparent PNG cutout only, use our{' '}
                <Link
                  href="/ai-background-remover"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  transparent background maker
                </Link>
                . Both tools share the same subject-cutout workflow.
              </p>
              <p className="mt-3 leading-7 text-slate-600">
                Want to describe a brand-new scene in plain words? Use the{' '}
                <Link
                  href="/"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  AI Photo Editor
                </Link>{' '}
                for prompt-based editing instead.
              </p>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Common questions
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Photo Background Changer FAQ
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
            Only edit photos you own or have permission to use. Review the{' '}
            <Link
              href="/privacy-policy"
              className="font-semibold text-blue-600 hover:underline"
            >
              Privacy Policy
            </Link>{' '}
            for information about image handling.
          </p>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to change your photo background?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
                Start with 10 guest credits. Prepare the cutout, select your
                background and download the new image.
              </p>
            </div>
            <a
              href="#background-changer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Change Photo Background <ArrowRight className="size-4" />
            </a>
          </div>
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

export const Route = createFileRoute('/photo-background-changer')({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      image:
        '/images/ai-photo-editor/core-benefits/handbag-background-compare.jpg',
    }),
  component: PhotoBackgroundChangerPage,
});
