import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { EDIT_CREDITS } from '@/modules/photo-editor/config';
import { absoluteUrl, pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ImageToImageWorkspace } from '@/components/photo-editor/image-to-image-workspace';

const PATH = '/image-to-image/';
const TITLE =
  'Image to Image: Free AI Image to Image Editor Online, No Sign-Up';
const DESCRIPTION =
  'Image to image editing: upload a photo, describe the new look, and AI redraws it while the composition stays put. Free credits, no sign-up, no presets.';

const BEFORE_AFTER = [
  {
    title: 'Portrait to illustration',
    description:
      'A phone portrait of a woman outdoors, redrawn as a soft painterly illustration with golden-hour colour. Same pose, same framing; the style, light and backdrop change while she stays put.',
    image: '/images/ai-photo-editor/restyle-photo.jpg',
    alt: 'Outdoor portrait before and after painterly illustration restyle',
  },
  {
    title: 'Product in a new setting',
    description:
      'A metal wristwatch on a studio surface, restyled with a matte white case and bracelet. The dial, crown and framing stay put — only the material and finish change.',
    image: '/images/ai-photo-editor/image-to-image/i2i-watch-setting.webp',
    alt: 'Watch product photo before and after material restyle',
  },
  {
    title: 'Old photo restyle',
    description:
      'A soft portrait with a dated warm colour cast, cleaned up to a cooler film grade. Face and framing unchanged.',
    image: '/images/ai-photo-editor/image-to-image/i2i-family-film.webp',
    alt: 'Portrait before and after film colour restyle',
  },
] as const;

const STEPS = [
  {
    number: '01',
    title: 'Step 1 — Upload the image you want to change',
    description:
      'JPG, PNG or WebP up to 10 MB. Phone shots, product photos, screenshots and scanned pictures all work — as long as it is already a flat image file.',
  },
  {
    number: '02',
    title: 'Step 2 — Describe the new look, not the whole picture',
    description:
      'Say what should change and what must stay. The more concrete the style, the more consistent the result:',
    examples: [
      'Turn this into a soft watercolour illustration — keep the pose and the framing.',
      'Put the same product on wet stone in morning light, keep the label text readable.',
      'Make it look like a 1990s film photo, keep the faces the same.',
    ],
  },
  {
    number: '03',
    title: 'Step 3 — Generate, compare, then refine',
    description: `A medium-quality edit uses ${EDIT_CREDITS} credits. Open the before and after side by side at full size and check faces, hands, edges and any text in the picture. If one area is off, run a follow-up edit on the same image instead of starting over.`,
  },
] as const;

const COMPARE_ROWS = [
  {
    need: 'You already have a photo and want a new style, setting or texture without changing the composition',
    tool: 'this-page' as const,
  },
  {
    need: 'You already have a photo and want a general edit — hair, clothes, background, product look, and similar changes',
    tool: 'home' as const,
  },
  {
    need: 'You only want to remove or replace one thing in the frame',
    tool: 'remove' as const,
  },
  {
    need: 'You want to change text that is already baked into the picture',
    tool: 'text' as const,
  },
] as const;

const USE_CASES = [
  'Illustration and anime versions of real photos — avatars, thumbnails and profile pictures that still look like the original person.',
  'Product photos in a new setting — seasonal or campaign scenes without booking a shoot again.',
  'One character, many images — a mascot or a consistent look across a set of posts.',
  'Old and ordinary photos, restyled — clean up a flat phone snap and give it a film, studio or painterly look.',
  'Room and interior mood variants — the same room in warm evening light or a bright daytime palette.',
  'More content from one shoot — ten different looks out of a set you already paid for.',
] as const;

const TIPS = [
  'Start from the sharpest copy you have. A blurry original gives a blurry restyle — the model is not recovering detail that is not there.',
  'Say what must stay. Naming the subject, the product and the framing explicitly is the single biggest factor in not losing them.',
  'Name the style concretely. "Soft watercolour, muted palette, visible paper texture" beats "make it artistic".',
  'Change one thing per pass. Style first, then setting. Two big changes at once is where faces start to drift.',
  'Inspect at 100%. Faces, hands, thin edges, and any lettering in the photo are the four places to check before you download.',
] as const;

const LIMITS = [
  'The style is described in words. There is no separate style-reference image upload yet — if you want to copy a look, describe it (medium, palette, light, era).',
  'Heavy restyles drift on people first: faces, hands and small accessories are the weak points.',
  'Text inside the photo can smear on strong restyles. If words matter, keep them out of the prompt and fix them afterwards.',
  'This is a generative edit, not a layered editor — there is no per-object undo history, so keep your original file.',
  'Extreme aspect ratios and very small crops give the model less to work with; crop loosely.',
] as const;

const FAQS = [
  [
    'Is this image to image editor free?',
    `Yes to start. 10 free credits without signing in cover one medium-quality edit (${EDIT_CREDITS} credits). Sign in for 10 more, and one-time packs start at $4.99 for 200 credits — no subscription.`,
  ],
  [
    'Do I need an account to try image to image?',
    'No. The first edit runs without signing up; an account only exists so you can reopen your results in My Creations.',
  ],
  [
    'What is the difference between image to image and text to image?',
    "Text to image invents the whole picture from a description. Image to image keeps your photo's composition, subject and proportions and changes the look — style, light, material, setting. If you need a specific pose or a real product angle preserved, image to image is the one that can do it.",
  ],
  [
    'Can I upload a second image as a style reference?',
    'Not yet. Style is described in words rather than supplied as a reference picture. Naming the medium, palette, light and era in your prompt is the closest equivalent today.',
  ],
  [
    'Can I use it on photos of people?',
    'Yes for your own photos and for material you have the right to use. Not for identity documents, or for making a real person appear to do something they did not.',
  ],
  [
    'Are there filters, presets or limits on what I can ask for?',
    'There is no preset list and no filter count — you describe the change, so the range of looks is open. The only limits are the standard content rules in our Acceptable Use Policy.',
  ],
  [
    'Which files work, and what happens to my photos?',
    'JPG, PNG and WebP up to 10 MB. Your file stays in the browser until you generate; afterwards it is stored so you can reopen results, it is not used to train models, and you can request deletion at any time.',
  ],
] as const;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
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
          name: 'AI Photo Editing Tools',
          item: absoluteUrl('/tools'),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Image to Image',
          item: absoluteUrl(PATH),
        },
      ],
    },
  ],
};

function CompareTool({
  tool,
}: {
  tool: (typeof COMPARE_ROWS)[number]['tool'];
}) {
  if (tool === 'this-page') {
    return <>This page — image to image</>;
  }
  if (tool === 'home') {
    return (
      <>
        <Link href="/" className="font-semibold text-blue-600 hover:underline">
          AI photo editor
        </Link>{' '}
        homepage
      </>
    );
  }
  if (tool === 'remove') {
    return (
      <>
        <Link
          href="/#editor"
          className="font-semibold text-blue-600 hover:underline"
        >
          Object remover
        </Link>
        {' / '}
        <Link
          href="/ai-background-remover"
          className="font-semibold text-blue-600 hover:underline"
        >
          AI background remover
        </Link>
      </>
    );
  }
  return (
    <Link
      href="/photo-text-editor"
      className="font-semibold text-blue-600 hover:underline"
    >
      Photo text editor
    </Link>
  );
}

function FaqAnswer({ question, answer }: { question: string; answer: string }) {
  if (
    question === 'Are there filters, presets or limits on what I can ask for?'
  ) {
    const label = 'Acceptable Use Policy';
    const index = answer.lastIndexOf(label);
    if (index < 0) return answer;
    return (
      <>
        {answer.slice(0, index)}
        <Link
          href="/acceptable-use-policy"
          className="font-semibold text-blue-600 hover:underline"
        >
          {label}
        </Link>
        {answer.slice(index + label.length)}
      </>
    );
  }
  return answer;
}

function ImageToImagePage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="border-b border-slate-200 bg-gradient-to-b from-[#edf4ff] via-[#f8fbff] to-[#f7f9fc] px-4 pt-4 pb-10 sm:px-6 sm:pt-5 sm:pb-12">
          <div className="mx-auto max-w-[1320px]">
            <nav
              aria-label="Breadcrumb"
              className="mb-3 text-sm text-slate-500"
            >
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-blue-600">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/tools" className="hover:text-blue-600">
                    AI Photo Editing Tools
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="font-medium text-slate-700">Image to Image</li>
              </ol>
            </nav>
            <div className="mx-auto mb-5 max-w-3xl text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                Image to Image Online
              </h1>
            </div>
            <div id="editor" className="scroll-mt-24">
              <ImageToImageWorkspace />
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
                Composition stays put
              </span>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
              Overview
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What Is Image to Image?
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
              Image to image editing starts from a photo you already have, not
              from a blank prompt. Upload the picture, describe what should
              change — the style, the setting, the light — and the AI redraws it
              while your subject, framing and composition stay where they are.
              Start with 10 free credits, no sign-up.
            </p>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f7f9fc] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Before and After
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Same picture, new look — the composition is inherited from your
              file, not invented.
            </p>
            <div className="mt-10 grid gap-10 sm:gap-12 md:grid-cols-3">
              {BEFORE_AFTER.map((item, index) => (
                <article key={item.title} className="min-w-0">
                  <img
                    src={item.image}
                    alt={item.alt}
                    width={1254}
                    height={1254}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full rounded-2xl object-contain"
                  />
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold tracking-widest text-blue-600 uppercase">
                      Example {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Three simple steps
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Image to Image in Three Steps
          </h2>
          <div className="mt-9 space-y-5">
            {STEPS.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-bold text-blue-600">{step.number}</p>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.description}
                </p>
                {'examples' in step && step.examples ? (
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                    {step.examples.map((example) => (
                      <li
                        key={example}
                        className="rounded-xl bg-slate-50 px-4 py-3"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              What Image to Image Actually Changes
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Only the pixels are regenerated; the structure comes from your
              file. Subject placement, perspective, proportions and the number
              of objects are all inherited from the photo you uploaded — what
              you are steering is style, light, material and setting. That is
              the whole difference from text to image, where the model invents
              the composition from nothing and you cannot keep a specific pose
              or product angle.
            </p>
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-5 py-4 font-semibold">What you need</th>
                    <th className="px-5 py-4 font-semibold">Which tool</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.need}>
                      <td className="px-5 py-4 leading-7">{row.need}</td>
                      <td className="px-5 py-4 leading-7">
                        <CompareTool tool={row.tool} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Everyday use cases
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What People Use It For
          </h2>
          <ul className="mt-9 grid gap-5 sm:grid-cols-2">
            {USE_CASES.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-600 shadow-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Image to Image Without Filters or Presets
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              A filter applies one fixed recipe to the whole frame, and every
              photo comes out looking like the same photo. Here there is no
              preset menu to pick from: you state the style in words —
              &quot;matte film look, warm shadow, no glow&quot; — so the change
              follows your picture instead of a template. No preset limit, no
              watermark, no fixed set of looks.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Five Things That Make a Restyle Come Out Clean
          </h2>
          <ol className="mt-8 list-decimal space-y-4 pl-5 text-sm leading-7 text-slate-600 sm:text-base">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Limits Worth Knowing
            </h2>
            <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
              {LIMITS.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-[#f7f9fc] px-5 py-4"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Use It Responsibly
          </h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Use this for personal photos, product images, mockups and marketing
            material. Do not use it to alter identity documents, receipts,
            invoices, tickets or number plates, or to make a real person appear
            to say or do something they did not. See our{' '}
            <Link
              href="/acceptable-use-policy"
              className="font-semibold text-blue-600 hover:underline"
            >
              Acceptable Use Policy
            </Link>
            .
          </p>
        </section>

        <section
          id="faq"
          className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
          <div className="mt-6">
            {FAQS.map(([question, answer]) => (
              <div key={question} className="border-b border-slate-200 py-6">
                <h3 className="text-lg font-semibold">{question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  <FaqAnswer question={question} answer={answer} />
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Try image to image on a photo of your own
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Upload it, describe the look you want, and compare before and
                after. 10 free credits, no sign-up, your original file kept.
              </p>
            </div>
            <a
              href="#editor"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Start image to image <ArrowRight className="size-4" />
            </a>
          </div>
          <p className="mx-auto mt-5 max-w-6xl text-center text-sm text-slate-500">
            Looking for a different edit? Open the{' '}
            <Link
              href="/"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editor
            </Link>
            , browse{' '}
            <Link
              href="/tools"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editing tools
            </Link>
            , or read{' '}
            <Link
              href="/blog/how-to-edit-photos-with-ai"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editing tools
            </Link>{' '}
            on the blog.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/image-to-image/')({
  head: () => ({
    ...pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      image: '/images/ai-photo-editor/restyle-photo.jpg',
    }),
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(jsonLd),
      },
    ],
  }),
  component: ImageToImagePage,
});
