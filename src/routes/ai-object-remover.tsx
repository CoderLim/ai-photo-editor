import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  Eraser,
  Eye,
  ImageIcon,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { EDIT_CREDITS } from '@/modules/photo-editor/config';
import { absoluteUrl, pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ObjectRemoverWorkspace } from '@/components/photo-editor/object-remover-workspace';

const PATH = '/ai-object-remover';
const TITLE = 'AI Object Remover: Remove Unwanted Objects From Photos';
const DESCRIPTION =
  'Remove unwanted objects with this AI Object Remover. Describe people, clutter, or text to erase and the background fills in. Try free, no sign-up.';

const BEFORE_AFTER = [
  {
    title: 'Remove a held object',
    description:
      'Ask to remove the flower from the hand and keep the person, pose, and lighting the same.',
    beforeSrc: '/images/examples/gpt-image-2.6/remove-object/before.png',
    afterSrc: '/images/examples/gpt-image-2.6/remove-object/after.png',
    beforeAlt: 'Man holding a flower before AI object removal',
    afterAlt: 'Same photo after the flower was removed with AI',
  },
] as const;

const CAPABILITIES = [
  {
    icon: Eraser,
    title: 'Erase objects, not the whole background',
    description:
      'Describe a trash bin, a parked car, a sign, or a cable. The prompt asks the model to erase that object and rebuild what sits behind it while keeping the subject and scene looking the same — always compare the result with your original.',
  },
  {
    icon: UserRound,
    title: 'Remove people from group and travel photos',
    description:
      'Ask to remove a stranger who walked into your shot, or a person who is the only thing you do not want. Mention their shadow if you want that gone too.',
  },
  {
    icon: Sparkles,
    title: 'Clean up small distractions',
    description:
      'Timestamps, small text labels, price tags, watermarks on your own images, crumbs on a product shot — small marks are the easiest kind of object to remove, because there is plenty of neighbouring texture to rebuild from.',
  },
  {
    icon: ImageIcon,
    title: 'Rebuild what was behind the object',
    description:
      'Instead of a flat clone stamp, the model invents a fill that matches nearby patterns — floorboards, sky, grass, wall, fabric. Simple backgrounds usually look cleaner; busy or reflective ones may need a second pass.',
  },
] as const;

const USE_CASES = [
  {
    title: 'Product and e-commerce photos',
    description:
      'Take the spare cable, the dust, or the second sample out of the frame without re-shooting. Common for marketplace listings and ad creative where the product has to sit alone.',
    image: '/images/ai-photo-editor/remove-object.jpg',
    alt: 'Product photo cleaned up by removing a distracting object with AI',
  },
  {
    title: 'Travel and street photos',
    description:
      'Remove tourists, bins, and parked scooters from a landmark shot so the composition reads the way you saw it.',
    image: '/images/examples/gpt-image-2.6/remove-object/after.png',
    alt: 'Travel photo after removing an unwanted object with AI',
  },
  {
    title: 'Real estate and interiors',
    description:
      'Erase a stray bin, a personal photo frame, or clutter from a room photo before a listing goes live. Keep it honest: remove distractions, not the features of the property.',
    image: '/images/examples/gpt-image-2.6/remove-object/before.png',
    alt: 'Interior photo prepared for object removal with AI',
  },
  {
    title: 'Social posts and thumbnails',
    description:
      'Clean the frame before it becomes a cover image. Small removals at thumbnail size are usually invisible even when they are obvious at 100%.',
    image: '/images/ai-photo-editor/remove-object.jpg',
    alt: 'Social thumbnail cleaned by removing clutter with an AI object remover',
  },
] as const;

const WHY_USE = [
  {
    icon: Sparkles,
    title: 'Describe only what should disappear',
    description:
      'Name the object in plain language and say what must stay. Generate, then check faces, edges, and the filled area against the original.',
  },
  {
    icon: CheckCircle2,
    title: 'Try it without an account',
    description: `You can start with guest credits before signing up. A medium-quality edit costs ${EDIT_CREDITS} credits. Sign in when you want to keep your edit history.`,
  },
  {
    icon: Eye,
    title: 'Compare before you download',
    description:
      'Put the original and the result side by side, zoom to 100%, and look at the filled area before you save it.',
  },
  {
    icon: ImageIcon,
    title: 'Keep your resolution',
    description:
      'Choose 1K, 2K, or 4K output. The tool does not re-crop your upload; pick a resolution and review the full frame after generation.',
  },
] as const;

const STEPS = [
  {
    number: '01',
    title: 'Upload your photo',
    description:
      'Choose a JPG, PNG, or WebP image. The full frame is kept; nothing is cropped.',
  },
  {
    number: '02',
    title: 'Describe the object to remove',
    description:
      'Say what should disappear and what must stay. Mention edges and shadows when they matter. Pick 1K, 2K, or 4K before you generate.',
  },
  {
    number: '03',
    title: 'Generate, compare, download',
    description:
      'Check the result at 100%. If the patch is visible, edit again with a tighter description, then download.',
  },
] as const;

const COMPARE = [
  {
    title: 'Remove one thing from a photo and keep the scene',
    description: 'You are on the right page — this AI object remover.',
  },
  {
    title: 'Cut the subject out and leave transparency',
    description: 'Use the AI Background Remover to get a transparent PNG.',
    href: '/ai-background-remover',
    label: 'AI Background Remover',
  },
  {
    title: 'Swap the background for a colour or another photo',
    description: 'Use the Photo Background Changer.',
    href: '/photo-background-changer',
    label: 'Photo Background Changer',
  },
  {
    title: 'Rewrite text inside the image',
    description: 'Use the Photo Text Editor.',
    href: '/photo-text-editor',
    label: 'Photo Text Editor',
  },
] as const;

const FAQS = [
  [
    'How do I remove an object from a photo for free?',
    `Upload a JPG, PNG, or WebP photo, describe the object you want gone, and generate. You can start with guest credits and no account; a medium-quality edit costs ${EDIT_CREDITS} credits. Sign in when you need more.`,
  ],
  [
    'Can I remove an object from a photo automatically?',
    'You describe the object in a short prompt, and the model rebuilds a fill where that object was. You do not have to select the background or draw a mask by hand. Always compare the result with your original.',
  ],
  [
    'Do I need an account to remove an object from a picture?',
    'No. You can try the tool without creating an account, then sign in to keep your edits and credits.',
  ],
  [
    'Can I remove a person from a photo?',
    'Yes. Name the person in your prompt, including their shadow if you want it gone. People standing against complex patterns or crowds can need a second pass.',
  ],
  [
    'Can I remove text or a logo from a photo?',
    'Small text labels, timestamps, and simple logos can be removed like any other object. Large watermarks across detailed textures are harder to rebuild cleanly.',
  ],
  [
    'What if the filled area looks blurry?',
    'A soft or smeared patch usually means the area was too large or the background behind it had little usable texture. Try a more specific prompt, remove the object in two passes, or edit again with a tighter description.',
  ],
  [
    'Which image formats can I upload?',
    'JPG, PNG, and WebP files are supported. Very large files have an upload limit shown on the editor.',
  ],
  [
    'Does removing an object reduce image quality?',
    'You can pick the output resolution. This is a generative edit, so the model may redraw more than the object you named — compare the full frame with your original before downloading.',
  ],
  [
    'Are my uploaded photos saved?',
    'Your selected image stays in the browser before generation. Once you generate, the image is uploaded for processing and the result is stored. See the Privacy Policy for data handling and deletion requests.',
  ],
  [
    'How is this different from removing the background?',
    'Background removal cuts the whole subject out and returns a transparent PNG. This tool keeps the whole photo and aims to erase the object you described so the scene still looks complete.',
  ],
] as const;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
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
          name: 'AI Object Remover',
          item: absoluteUrl(PATH),
        },
      ],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'AI Object Remover',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web browser',
      url: absoluteUrl(PATH),
      image: absoluteUrl('/images/ai-photo-editor/remove-object.jpg'),
      description:
        'Prompt-based AI object remover that erases unwanted objects, people, and clutter from photos and fills in the background behind them.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: `10 free guest credits; medium edit ${EDIT_CREDITS} credits`,
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
  ],
};

function AiObjectRemoverPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="border-b border-slate-200 bg-gradient-to-b from-[#edf4ff] via-[#f8fbff] to-[#f7f9fc] px-4 pt-9 pb-12 sm:px-6 sm:pt-12">
          <div className="mx-auto max-w-[1320px]">
            <nav
              aria-label="Breadcrumb"
              className="mb-6 text-sm text-slate-500"
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
                <li className="font-medium text-slate-700">
                  AI Object Remover
                </li>
              </ol>
            </nav>
            <div className="mx-auto mb-7 max-w-3xl text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                AI Object Remover Online
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Remove unwanted objects from any photo with a short prompt — the
                AI fills in the background behind them. No sign-up to try.
              </p>
            </div>
            <div id="remover" className="scroll-mt-24">
              <ObjectRemoverWorkspace />
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
                Compare with the original
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Prompt-based eraser
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            What Can This AI Object Remover Do?
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            This is an object eraser, not a background remover. You describe the
            object you want deleted, and the model rebuilds a plausible fill
            from the surrounding scene. Results are generative — always compare
            the full frame with your original.
          </p>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
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
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-7 text-slate-600">
              Set expectations before you start. This is generative editing, not
              a guaranteed local inpaint — very large objects, areas with little
              usable texture, and hard-edged patterns like stripes or brick can
              leave a visible patch or change nearby detail. If that happens,
              edit again in two smaller passes. Check every result at full size
              before using it for a client or a listing.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Before and after
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            See an AI Object Remover Result
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            A short prompt removed the flower from the hand. Zoom in on the
            filled area and the surrounding detail before you download your own
            edit.
          </p>
          <div className="mt-9 grid gap-5">
            {BEFORE_AFTER.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <figure>
                    <img
                      src={item.beforeSrc}
                      alt={item.beforeAlt}
                      width={1024}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full rounded-xl bg-slate-100 object-cover"
                    />
                    <figcaption className="mt-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Before
                    </figcaption>
                  </figure>
                  <figure>
                    <img
                      src={item.afterSrc}
                      alt={item.afterAlt}
                      width={1024}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full rounded-xl bg-slate-100 object-cover"
                    />
                    <figcaption className="mt-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      After
                    </figcaption>
                  </figure>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Everyday use cases
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Remove Objects, People, and Clutter
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {USE_CASES.map((item) => (
              <article
                key={item.title}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <img
                  src={item.image}
                  alt={item.alt}
                  width={1106}
                  height={812}
                  loading="lazy"
                  decoding="async"
                  className="mb-5 aspect-[1106/812] w-full rounded-xl bg-slate-100 object-cover"
                />
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Why use it
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Why Use This AI Object Remover
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
                  How to Remove an Object From a Photo
                </h2>
              </div>
              <a
                href="#remover"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Remove an object <ArrowRight className="size-4" />
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

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Pick the right tool
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Object Remover, Background Remover, or Crop?
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Three different jobs, three different tools on this site:
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {COMPARE.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                  {'href' in item ? (
                    <>
                      {' '}
                      <Link
                        href={item.href}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {item.label}
                      </Link>
                    </>
                  ) : null}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-600">
            Cannot be fixed by erasing at all → crop it out, or describe a new
            version of the scene in the{' '}
            <Link
              href="/"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editor
            </Link>
            .
          </p>
        </section>

        <section
          id="faq"
          className="border-t border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              AI Object Remover FAQ
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
              for more on photo processing and storage.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Ready to remove an object from your photo?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Start with guest credits, no account needed. Describe what you
                do not want and download the cleaned photo.
              </p>
            </div>
            <a
              href="#remover"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Remove Object <ArrowRight className="size-4" />
            </a>
          </div>
          <p className="mx-auto mt-5 max-w-6xl text-center text-sm text-slate-500">
            Looking for a different edit? Browse{' '}
            <Link
              href="/tools"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editing tools
            </Link>{' '}
            or generate a new version of the scene in the{' '}
            <Link
              href="/"
              className="font-semibold text-blue-600 hover:underline"
            >
              AI photo editor
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/ai-object-remover')({
  head: () => ({
    ...pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      image: '/images/ai-photo-editor/remove-object.jpg',
    }),
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(jsonLd),
      },
    ],
  }),
  component: AiObjectRemoverPage,
});
