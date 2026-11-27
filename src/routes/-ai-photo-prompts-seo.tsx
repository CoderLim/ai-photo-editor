import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { EDIT_CREDITS } from '@/modules/photo-editor/config';
import { absoluteUrl } from '@/lib/seo';

const PROMPT_CATEGORIES = [
  {
    title: 'Portrait & Headshot Prompts',
    intro:
      'Clean up a portrait without turning the person into a different person.',
    prompts: [
      'Clean up acne and uneven skin tone while keeping the real skin texture, pores and facial features unchanged.',
      'Soften the harsh flash on the face, keep the same expression and eye color, natural shadows only.',
      'Turn this casual phone selfie into a professional headshot: plain light-grey background, even soft light, same face, same hair, same clothing.',
      'Straighten the posture slightly and smooth the shirt, keep the face and the background exactly as they are.',
      'Remove the flyaway hairs around the head and soften the double chin shadow, keep the smile and the earrings.',
      'Brighten the eyes and whiten the teeth a little, keep everything else in the photo untouched.',
    ],
  },
  {
    title: 'Background Change Prompts',
    intro: (
      <>
        For cutouts that must not touch the subject, use the{' '}
        <Link
          href="/photo-background-changer"
          className="font-semibold text-blue-600 hover:underline"
        >
          background changer
        </Link>
        ; for prompts that rebuild the scene, paste these:
      </>
    ),
    prompts: [
      "Replace the grey studio backdrop with a sunlit kitchen window, keep the person's face, hair, outfit and pose identical, add a natural shadow under the chin.",
      'Put this product on wet dark stone in morning light, keep the label text readable and the camera angle unchanged.',
      'Change the background to a plain warm beige wall with soft shadow, keep the chair and the plant where they are.',
      "Swap the cloudy sky for a clear blue sky at golden hour, keep the building's edges and the roofline identical.",
      'Turn the messy room behind the subject into a tidy blurred living room, keep the subject sharp and correctly lit.',
      'Remove the crowd behind the couple and rebuild the beach and horizon naturally, keep the couple exactly as they are.',
    ],
  },
  {
    title: 'Outfit & Clothing Prompts',
    intro: null,
    prompts: [
      'Change the outfit to a navy blazer over a white shirt, keep the face, pose, hands and background unchanged.',
      'Smooth the wrinkles in this shirt while keeping the fabric texture, buttons and fit natural.',
      'Swap the dress color from black to deep green, keep the cut, the folds and the lighting the same.',
      "Add a light beige trench coat over the current outfit, keep the person's proportions and the original lighting.",
      'Change the shoes to white sneakers, keep the stance, the trousers and the shadow under the feet.',
      'Remove the crease lines across the sweater and restore the knit texture, do not change the shape of the shoulders.',
    ],
  },
  {
    title: 'Object Removal Prompts',
    intro: null,
    prompts: [
      'Remove the trash can on the left and rebuild the pavement and the shadow naturally, keep the rest of the street untouched.',
      'Erase the passerby behind the subject and continue the wall and the railing, keep the subject’s edges clean.',
      'Remove the power lines across the sky and fill with the same blue gradient and light cloud.',
      'Delete the cars in the background and extend the road markings and the curb, keep the main car sharp.',
      'Remove the price tag sticker from the product and reconstruct the label underneath, keep the packaging text.',
      'Take out the empty cups and the receipt on the table, keep the laptop, the plate and the table grain.',
    ],
  },
  {
    title: 'Retouch & Restoration Prompts',
    intro: null,
    prompts: [
      'Reduce the noise and improve apparent clarity, keep the faces natural and do not add detail that is not there.',
      'Restore contrast and color in this faded 1990s family photo, keep the faces, clothing and composition recognizable.',
      'Remove the scratches and dust marks on the scanned print, keep the original grain and the paper texture.',
      'Fix the red-eye and the color cast from the indoor lamp, keep the skin tone realistic.',
      'Balance the exposure so the window is not blown out and the room is not black, keep the furniture arrangement.',
      'Sharpen the product logo on the packaging so it reads clearly, keep the packaging shape.',
    ],
  },
  {
    title: 'Style & Restyle Prompts',
    intro: (
      <>
        Best run through{' '}
        <Link
          href="/image-to-image/"
          className="font-semibold text-blue-600 hover:underline"
        >
          image to image
        </Link>
        , where framing and composition stay where they are.
      </>
    ),
    prompts: [
      'Turn this into a soft watercolor illustration, keep the pose, the outfit silhouette and the framing.',
      'Make it look like a 1990s film photo: cooler grade, visible grain, keep the faces the same.',
      "Give this a cinematic golden-hour editorial look, warm rim light on the left, keep the subject's features.",
      'Convert to a clean anime style avatar, keep the hairstyle, the smile and the clothing colors.',
      'Apply a matte black-and-white look with deep shadows, keep the skin detail and the eyes.',
      'Move the mood from bright daylight to warm evening lamplight, keep the furniture layout and the camera angle.',
    ],
  },
  {
    title: 'Hair Color Prompts',
    intro: null,
    prompts: [
      'Change the hair color to copper brown, keep the hairstyle, the part line, the face and the background.',
      'Give the hair a cool platinum blonde tone, keep the roots natural and the lighting on the face unchanged.',
      'Add subtle balayage highlights, keep the hair length and the curl pattern.',
      'Darken the hair to natural black, keep the eyebrows and the skin tone as they are.',
      'Fix the faded brassy ends to an even ash brown, keep the shine and the hair texture.',
    ],
  },
  {
    title: 'Text-in-Photo Prompts',
    intro: (
      <>
        For words already baked into the picture, the{' '}
        <Link
          href="/photo-text-editor"
          className="font-semibold text-blue-600 hover:underline"
        >
          photo text editor
        </Link>{' '}
        redraws the lettering. Exact font matching is not guaranteed.
      </>
    ),
    prompts: [
      'Change the sign text to "OPEN 9–6", keep the same lettering style, the sign shape and the background.',
      'Replace the menu heading with "WEEKEND BRUNCH", keep the layout, the paper texture and the lighting.',
      'Correct the spelling on the label and keep every other line of packaging text unchanged.',
      'Change the poster headline to "SOLD OUT" and keep the subline, the colors and the frame.',
    ],
  },
  {
    title: 'Product Photo Prompts',
    intro: null,
    prompts: [
      'Put the same bottle on a clean marble surface with a soft gradient backdrop, keep the label, the cap and the branding sharp.',
      'Add a natural reflection under the watch, keep the dial, the bracelet and the light direction.',
      'Remove the dust and fingerprints from the shoe, keep the stitching, the logo and the material texture.',
      'Place the coffee bag in a cozy cafe scene, keep the packaging text and the proportions.',
      'Even out the lighting on the white background so the product edges are clean, do not change the product itself.',
      'Add a soft studio shadow to the right of the product, keep the original exposure on the label.',
    ],
  },
  {
    title: 'ChatGPT-Style Prompts for Photos',
    intro:
      'The same idea written the way people phrase it when they hand a photo to ChatGPT — a plain instruction plus an explicit "don\'t change" clause. Both work in our editor; the second half is what actually protects the photo.',
    prompts: [
      '"Edit this photo for me: [change]. Do not change my face, my skin tone, my body shape or the background."',
      '"Make this look more professional, but keep it looking like me."',
      '"Improve the lighting on my face only, leave the room exactly as it is."',
      '"Remove [object] from the picture, everything else stays the same."',
      '"Make the background a plain white studio, keep the product label perfectly readable."',
      '"Give me two versions: one warm, one cool — same framing."',
    ],
  },
] as const;

export const PROMPT_GALLERY_FAQS = [
  [
    'Can I use these AI photo prompts on my own photo?',
    'Yes. Every prompt is written as an instruction for an existing image. Upload your file, paste the prompt, replace the bracketed parts, and keep the "keep" clause.',
  ],
  [
    'Do these prompts work with ChatGPT?',
    'The plain-instruction ones do, and so do they here — the editor takes everyday language up to 2,000 characters. The difference is that this page runs the photo through an editor built for edits, so you see a before-and-after comparison instead of a chat reply.',
  ],
  [
    'Are AI photo prompts free?',
    `Copying them is free and the first 10 credits are free without an account, which covers one medium-quality edit (${EDIT_CREDITS} credits). Extra credits are one-time packs from $4.99, no subscription.`,
  ],
  [
    'What is the difference between AI photo prompts and Midjourney prompts?',
    'Midjourney prompts invent a new image from words. AI photo prompts edit a picture you already have, so they name what stays as well as what changes.',
  ],
  [
    'Why does my result look different from the example?',
    'Results depend on your photo and your prompt. Different source lighting, angle and resolution all shift the output; the examples here were run on one specific original.',
  ],
  [
    'Can I edit just part of a photo with a prompt?',
    'You can describe the area and ask to preserve everything else, but generative edits may still touch nearby areas. For pixel-precise work, use a masking tool.',
  ],
  [
    'Can I use photos of people?',
    'Your own photos and material you have the right to use, yes — not identity documents, and not to make a real person appear to say or do something they did not.',
  ],
  [
    'Will prompts fix a blurry photo?',
    'They improve apparent clarity and color, but generative edits cannot recover detail that was never captured.',
  ],
] as const;

export function promptsSeoJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: 'AI Photo Prompts: 2000+ Copy-and-Paste Prompts',
        url: absoluteUrl('/ai-photo-prompts'),
        description:
          'Browse 2000+ AI photo prompts you can copy and paste — portraits, backgrounds, outfits, product shots and restyles. Paste one, edit your own photo, no sign-up.',
        isPartOf: {
          '@type': 'WebSite',
          name: envConfigs.app_name,
          url: envConfigs.app_url,
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: PROMPT_GALLERY_FAQS.map(([question, answer]) => ({
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
            name: 'AI Photo Prompts',
            item: absoluteUrl('/ai-photo-prompts'),
          },
        ],
      },
    ],
  };
}

/** Long-form SEO body placed below the prompt gallery waterfall. */
export function AiPhotoPromptsSeo() {
  return (
    <div className="border-t border-slate-200 bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="text-sm leading-7 text-slate-600 sm:text-base">
          Two thousand-plus copy-and-paste AI photo prompts you can run on your
          own picture. Every prompt below is written for editing an existing
          photo — not for inventing one — so it names the change you want and
          the things that must stay the same. Pick a prompt, paste it into the{' '}
          <Link
            href="/"
            className="font-semibold text-blue-600 hover:underline"
          >
            editor
          </Link>
          , swap in your own photo, and compare the before and after before you
          download.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          These are free to copy. No sign-up is needed to try the first one.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-[#f7f9fc] px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How to Use a Prompt on Your Own Photo
          </h2>
          <ol className="mt-6 list-decimal space-y-4 pl-5 text-sm leading-7 text-slate-600 sm:text-base">
            <li>
              Start from the sharpest copy you have. A blurry original gives a
              blurry edit — the model does not recover detail that was never
              there.
            </li>
            <li>
              Paste the prompt, then edit two things. Replace the bracketed
              parts with what is actually in your photo, and keep the
              &quot;keep&quot; clause. That clause is what stops the AI from
              redrawing the face, the product label or the framing.
            </li>
            <li>
              Change one thing per pass. Style first, then setting. Two big
              changes in one prompt is where faces start to drift.
            </li>
          </ol>
          <p className="mt-6 text-sm leading-7 text-slate-600 sm:text-base">
            A medium-quality edit uses {EDIT_CREDITS} credits, and the first 10
            are free without an account.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          What Makes a Photo Prompt Work
        </h2>
        <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
          Photo prompts fail for boring reasons, and every one of them is
          fixable in the wording:
        </p>
        <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
          <li>
            <span className="font-semibold text-slate-900">
              Name the subject.
            </span>{' '}
            &quot;The woman in the red coat&quot; beats &quot;the person&quot; —
            the model needs to know what not to touch.
          </li>
          <li>
            <span className="font-semibold text-slate-900">
              Say what must stay.
            </span>{' '}
            Pose, framing, face, label text, shadows. Naming them explicitly is
            the single biggest factor in keeping them.
          </li>
          <li>
            <span className="font-semibold text-slate-900">
              Be concrete about style.
            </span>{' '}
            &quot;Soft watercolor, muted palette, visible paper texture&quot;
            beats &quot;make it artistic.&quot;
          </li>
          <li>
            <span className="font-semibold text-slate-900">
              One change per prompt.
            </span>{' '}
            Restyle and replace are two different jobs.
          </li>
          <li>
            <span className="font-semibold text-slate-900">
              Inspect at 100%.
            </span>{' '}
            Faces, hands, thin edges and any lettering are the four places where
            generative edits show.
          </li>
        </ul>
      </section>

      {PROMPT_CATEGORIES.map((category) => (
        <section
          key={category.title}
          className="border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-14"
        >
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {category.title}
            </h2>
            {category.intro ? (
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {category.intro}
              </p>
            ) : null}
            <ul className="mt-6 space-y-3">
              {category.prompts.map((prompt) => (
                <li
                  key={prompt}
                  className="rounded-xl border border-slate-200 bg-[#f7f9fc] px-4 py-3 text-sm leading-7 text-slate-700"
                >
                  {prompt}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="border-t border-slate-200 bg-[#f7f9fc] px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How to Turn One Prompt Into Twenty
          </h2>
          <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
            Take any prompt above and change one variable at a time: the
            material (marble, wood, linen, wet stone), the light (overcast,
            golden hour, single lamp, softbox), the setting (cafe, studio,
            street, home), and the era or medium (film, digital, watercolor,
            3D). Four variables with five options each is a hundred usable photo
            prompts, all of which you have actually tested on your own image —
            which is what separates this list from a scraped one. Browse the
            gallery above for more AI photo prompts you can copy as a starting
            point.
          </p>
        </div>
      </section>

      <section
        id="faq"
        className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16"
      >
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">FAQ</h2>
        <div className="mt-6">
          {PROMPT_GALLERY_FAQS.map(([question, answer]) => (
            <div key={question} className="border-b border-slate-200 py-6">
              <h3 className="text-lg font-semibold">{question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm leading-7 text-slate-600 sm:text-base">
          Ready to try more AI photo prompts? Copy one from the gallery, open
          the{' '}
          <Link
            href="/"
            className="font-semibold text-blue-600 hover:underline"
          >
            AI photo editor
          </Link>
          , or restyle with{' '}
          <Link
            href="/image-to-image/"
            className="font-semibold text-blue-600 hover:underline"
          >
            image to image
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
