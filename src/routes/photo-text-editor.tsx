import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { EDIT_CREDITS } from '@/modules/photo-editor/config';
import { absoluteUrl, pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PhotoEditorWorkspace } from '@/components/photo-editor/workspace';

const PATH = '/photo-text-editor';
const TITLE = 'Photo Text Editor: Edit Text in Image Online Free (AI)';
const DESCRIPTION =
  'Edit text in an image by describing the change. AI redraws the words in your picture while keeping the layout. Compare before and after. Free credits, no sign-up.';

const STEPS = [
  {
    number: '01',
    title: 'Step 1 — Upload the picture',
    description:
      'Choose a JPG, PNG or WebP file up to 10 MB. Screenshots, product shots, menu photos and phone pictures all work, as long as the text is already part of the image rather than a separate text layer.',
  },
  {
    number: '02',
    title: 'Step 2 — Write the change in plain words',
    description:
      'Quote the new words exactly and say what should not move. Putting the new words in quotation marks matters — it tells the model exactly what to letter, instead of paraphrasing it.',
    examples: [
      'Replace the text on the label with "Fresh Roast Coffee" and keep the same font and layout.',
      'Change the price tag from $19 to $24, keep the handwriting style and the shadow.',
      'Rewrite the sign in the photo as "OPEN SUNDAY" using the same red lettering.',
    ],
  },
  {
    number: '03',
    title: 'Step 3 — Generate and check the lettering',
    description: `Run the edit (a medium-quality edit uses ${EDIT_CREDITS} credits), then zoom in on the text before you download. Look at three things: letter shapes, spacing, and whether the background behind the words was rebuilt cleanly. If something is off, run a follow-up edit on the same image rather than starting over.`,
  },
] as const;

const USE_CASES = [
  {
    title: 'Product labels and packaging',
    description:
      'Update a flavour name, a size, a net weight or a model number on a packaging shot without reshooting the product.',
    image: '/images/ai-photo-editor/photo-text-editor/use-product-label.svg',
    alt: 'edit text on image – product label',
  },
  {
    title: 'Signs, menus and posters',
    description:
      'Fix a typo on a printed menu, translate a storefront sign for another market, or move a date on an event poster.',
    image: '/images/ai-photo-editor/photo-text-editor/use-storefront-sign.svg',
    alt: 'edit text on image – storefront sign',
  },
  {
    title: 'Social posts and thumbnails',
    description:
      'Refresh the headline baked into an old thumbnail or story graphic instead of rebuilding the whole layout.',
    image: '/images/ai-photo-editor/photo-text-editor/use-social-thumbnail.svg',
    alt: 'edit text on image – social thumbnail',
  },
  {
    title: 'Screenshots and app mockups',
    description:
      'Change button labels or sample values in a product screenshot for a landing page or app store listing.',
    image: '/images/ai-photo-editor/photo-text-editor/use-app-screenshot.svg',
    alt: 'edit text on image – app screenshot',
  },
  {
    title: 'Reusing old marketing photos',
    description:
      'Take a photo shot for one campaign, swap the wording, and run it again — same image, new message.',
    image: '/images/ai-photo-editor/photo-text-editor/use-event-poster.svg',
    alt: 'edit text on image – event poster',
  },
] as const;

const BEFORE_AFTER = [
  {
    title: 'Menu board',
    description:
      'Soup of the Day → Pumpkin Soup, same chalk-style lettering and board texture.',
    image: '/images/ai-photo-editor/photo-text-editor/before-after-menu.svg',
    alt: 'Menu board before and after text edit',
  },
  {
    title: 'Coffee bag',
    description:
      'Roast name changed, front label untouched apart from the words.',
    image: '/images/ai-photo-editor/photo-text-editor/before-after-coffee.svg',
    alt: 'Coffee bag label before and after text edit',
  },
  {
    title: 'Storefront',
    description:
      'Opening hours updated on the glass decal, reflections and street behind unchanged.',
    image:
      '/images/ai-photo-editor/photo-text-editor/before-after-storefront.svg',
    alt: 'Storefront hours before and after text edit',
  },
] as const;

const TIPS = [
  'Quote the new text. "OPEN SUNDAY" gives a far more reliable result than change it to open on sunday.',
  'Name the style you want kept. "Same bold sans-serif", "same gold foil effect", "same handwriting" all help the model match what is already there.',
  'Keep the length similar. Swapping two words for two words is far cleaner than replacing a three-word headline with a full sentence.',
  'Say what must stay. Mentioning the product, the logo and the background explicitly reduces unwanted changes elsewhere.',
  'Generate one variation and inspect it at 200%. Small type and thin fonts are the first things to go soft.',
] as const;

const LIMITS = [
  'Very small text is hard. Labels under roughly 20 pixels tall often lose sharpness; crop closer to the words if you can.',
  'Long paragraphs are not the job. Short strings — names, prices, dates, headlines, one or two lines — work far better than a full block of body copy.',
  'The typeface is a close match, not an exact one. If you need the identical licensed font, edit the source file instead.',
  'Complex scripts need checking. Short strings in most languages come out well; dense Chinese, Arabic or Indic lettering should be checked character by character.',
  'This is a generative edit, not a layered editor. There is no undo history of individual objects — keep your original file.',
] as const;

const FAQS = [
  [
    'Is this photo text editor free?',
    `Yes to start. You get 10 free credits without signing in, which covers one medium-quality edit (${EDIT_CREDITS} credits). Sign in for 10 more, and one-time credit packs start at $4.99 for 200 credits — no subscription.`,
  ],
  [
    'Can I edit text in an image without Photoshop?',
    'Yes. Everything runs in a modern browser on Mac, Windows, iPhone or Android. There is nothing to install and no masking or layer work.',
  ],
  [
    'Will the new text match the original font exactly?',
    'It gets close, not identical. The model reads the style in the photo — weight, colour, slant, shadow — and redraws the words to match. For pixel-exact type you need the original design file.',
  ],
  [
    'Can I edit a PDF or a scanned document?',
    'If the page is a flat image, the text can be edited the same way as a photo, but we do not edit PDF text layers. And as above, documents such as IDs, receipts and invoices are not permitted.',
  ],
  [
    'Does it work with non-English text?',
    'Short strings usually do. Describe the language in your instruction (for example same menu, in Spanish) and check every character afterwards — dense scripts are the most common place for errors.',
  ],
  [
    'Can I add new text instead of replacing it?',
    'Yes, you can ask for words to be added (add the words "New" in the top-left corner), but position and size are described rather than dragged, so it suits rough placement more than layout work.',
  ],
  [
    'What happens to my photos?',
    'Your file stays in the browser until you generate. After that it is stored so you can reopen results in My Creations, it is not used to train models, and you can request deletion at any time. Details are in the Privacy Policy.',
  ],
] as const;

const FAQ_JSON_LD = [
  {
    question: 'Is this photo text editor free?',
    answer:
      'Yes to start. You get 10 free credits without signing in, enough for one medium-quality edit. Sign in for 10 more, and one-time packs start at $4.99.',
  },
  {
    question: 'Can I edit text in an image without Photoshop?',
    answer:
      'Yes. It runs in a browser on desktop and mobile with nothing to install and no masking or layer work.',
  },
  {
    question: 'Will the new text match the original font exactly?',
    answer:
      'It gets close but not identical. The model matches weight, colour and style from the photo; pixel-exact type needs the original design file.',
  },
  {
    question: 'Does it work with non-English text?',
    answer:
      'Short strings in most languages work well. Name the language in your instruction and check every character afterwards.',
  },
] as const;

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Photo Text Editor',
      url: absoluteUrl(PATH),
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web browser (Windows, macOS, iOS, Android)',
      description:
        'Edit text in an image by describing the change. AI redraws existing lettering while keeping the layout, subject and background.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: '10 free credits, no sign-up',
      },
      provider: {
        '@type': 'Organization',
        name: envConfigs.app_name,
        url: envConfigs.app_url,
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ_JSON_LD.map(({ question, answer }) => ({
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
          name: 'Photo Text Editor',
          item: absoluteUrl(PATH),
        },
      ],
    },
  ],
});

function PhotoTextEditorPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="border-b border-slate-200 bg-gradient-to-b from-[#edf4ff] via-[#f8fbff] to-[#f7f9fc] px-4 pt-9 pb-12 sm:px-6 sm:pt-12">
          <div className="mx-auto max-w-[1320px]">
            <div className="mx-auto mb-7 max-w-3xl text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                Photo Text Editor Online
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Change the words already inside your picture. Upload a photo,
                write what the new text should say, and AI redraws that
                lettering while the rest of the image stays as it is. Start with
                10 free credits — no sign-up.
              </p>
            </div>
            <div id="editor" className="scroll-mt-24">
              <PhotoEditorWorkspace />
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
                Compare before and after
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Three simple steps
          </p>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Edit Text in Image: Three Steps
          </h2>
          <div className="mt-9 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              {STEPS.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-bold text-blue-600">
                    {step.number}
                  </p>
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
            <img
              src="/images/ai-photo-editor/photo-text-editor/prompt-quote-example.svg"
              alt="describing a text replacement with the new words in quotation marks"
              width={1100}
              height={640}
              loading="lazy"
              decoding="async"
              className="h-fit w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
            />
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Edit Text on Image Without Rebuilding the Picture
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              The point of editing text this way is that nothing else should
              change. The subject, the lighting, the perspective and the
              surrounding product all stay where they were, because only the
              region around the words is regenerated.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              That is what separates this from painting over text in a photo
              editor: there is no patch of flat colour left behind, no
              mismatched rectangle over a curved label, and no separate layer to
              keep track of. You describe the change, the model reconstructs the
              area behind and around the new lettering.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Everyday use cases
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What People Use It For
          </h2>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((item) => (
              <article
                key={item.title}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <img
                  src={item.image}
                  alt={item.alt}
                  width={900}
                  height={700}
                  loading="lazy"
                  decoding="async"
                  className="mb-5 aspect-[9/7] w-full rounded-xl bg-slate-100 object-cover"
                />
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Before and After
            </h2>
            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {BEFORE_AFTER.map((item) => (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <img
                    src={item.image}
                    alt={item.alt}
                    width={1100}
                    height={560}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[11/5.6] w-full rounded-xl bg-white object-cover"
                  />
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Photo Text Editor vs a Text Box
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            These solve two different problems, and it is worth knowing which
            one you have:
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-5 py-4 font-semibold">You want to</th>
                  <th className="px-5 py-4 font-semibold">Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                <tr>
                  <td className="px-5 py-4 leading-7">
                    Change words that are already part of the picture (printed
                    on a label, painted on a sign, baked into a screenshot)
                  </td>
                  <td className="px-5 py-4 leading-7">
                    This page — describe the change
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 leading-7">
                    Lay new words on top of a photo (caption, watermark,
                    headline over an image)
                  </td>
                  <td className="px-5 py-4 leading-7">
                    A design tool with a text layer, where you control font,
                    size and position exactly
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            If your text sits on its own layer in a design file, keep editing it
            there — you will get pixel-exact control. Use this tool when the
            words are already flattened into the pixels and you have no source
            file.
          </p>
          <img
            src="/images/ai-photo-editor/photo-text-editor/text-layer-vs-in-image.svg"
            alt="adding a text layer compared with editing text inside the photo"
            width={1200}
            height={640}
            loading="lazy"
            decoding="async"
            className="mt-8 w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
          />
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Five Things That Make Lettering Come Out Clean
            </h2>
            <ol className="mt-8 list-decimal space-y-4 pl-5 text-sm leading-7 text-slate-600 sm:text-base">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Limits Worth Knowing
          </h2>
          <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
            {LIMITS.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Use It Responsibly
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Use this tool for product photos, marketing material, mockups and
              personal pictures. Do not use it to alter identity documents,
              receipts, invoices, licences, tickets or number plates, or to
              misrepresent what a product or document says. See our{' '}
              <Link
                href="/acceptable-use-policy"
                className="font-semibold text-blue-600 hover:underline"
              >
                Acceptable Use Policy
              </Link>{' '}
              for the full list.
            </p>
          </div>
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
                  {question === 'What happens to my photos?' ? (
                    <>
                      Your file stays in the browser until you generate. After
                      that it is stored so you can reopen results in My
                      Creations, it is not used to train models, and you can
                      request deletion at any time. Details are in the{' '}
                      <Link
                        href="/privacy-policy"
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </>
                  ) : (
                    answer
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Try the photo text editor
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Upload a picture with text in it, describe the words you want
                instead, and compare before and after. 10 free credits, no
                sign-up, original file kept.
              </p>
            </div>
            <a
              href="#editor"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Edit text in image <ArrowRight className="size-4" />
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

export const Route = createFileRoute('/photo-text-editor')({
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: PATH,
      image: '/images/ai-photo-editor/photo-text-editor/hero-menu-board.svg',
    }),
  component: PhotoTextEditorPage,
});
