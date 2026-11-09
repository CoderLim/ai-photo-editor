/**
 * Credits for one GPT Image 2.6 edit.
 *
 * Fal (speed/default): `openai/gpt-image-2.6/flare/edit`.
 * Replicate equivalent: `openai/gpt-image-2.6-flare`.
 * Flare and Sunburst share token rates. The browser never supplies the price.
 *
 * The old standard edit was 10 credits for a 1K Nano Banana 2.1 edit (~$0.042
 * on fal for one 1K input, excluding thinking). These integers follow official
 * GPT Image 2.6 1024×1024 output-only estimates, with a little headroom for
 * the reference image at $8 / 1M input tokens:
 *   low    ~$0.02469 → 6
 *   medium ~$0.04347 → 10  (default; closest to the old 1K edit)
 *   high   ~$0.05268 → 13
 *   xhigh  ~$0.09366 → 22
 *   max    ~$0.21072 → 50
 *
 * Pricing packs stay 200 / 500 / 1200 credits. `image_size: auto` keeps the
 * source aspect ratio; the table assumes a ~1024px output.
 */
export const PHOTO_EDIT_QUALITIES = [
  {
    id: 'low',
    label: 'Low',
    credits: 6,
    description: 'Fast, cheap previews while you iterate on the prompt.',
  },
  {
    id: 'medium',
    label: 'Medium',
    credits: 10,
    description: 'Everyday edits with a balanced cost.',
  },
  {
    id: 'high',
    label: 'High',
    credits: 13,
    description: 'Sharper detail for portraits and product shots.',
  },
  {
    id: 'xhigh',
    label: 'Extra high',
    credits: 22,
    description: 'Fine text and complex scenes.',
  },
  {
    id: 'max',
    label: 'Max',
    credits: 50,
    description: 'Highest fidelity finals. Slowest and most expensive.',
  },
] as const;

export type PhotoEditQuality = (typeof PHOTO_EDIT_QUALITIES)[number]['id'];

export const DEFAULT_PHOTO_EDIT_QUALITY: PhotoEditQuality = 'medium';

/** Medium / standard edit. Other qualities use `photoEditCharge`. */
export const EDIT_CREDITS = PHOTO_EDIT_QUALITIES.find(
  (item) => item.id === DEFAULT_PHOTO_EDIT_QUALITY
)!.credits;

export const REPLICATE_EDIT_MODEL = 'openai/gpt-image-2.6-flare';
export const FAL_EDIT_MODEL = 'openai/gpt-image-2.6/flare/edit';
/** Dedicated segmentation model: real alpha-channel PNG rather than a generated backdrop. */
export const FAL_BACKGROUND_REMOVAL_MODEL = 'fal-ai/bria/background/remove';
/** Fixed server-side cost (model charges about $0.018 per unprompted image). */
export const BACKGROUND_REMOVAL_CREDITS = 4;
/** Public display name for the underlying image model (compliance / UI). */
export const PHOTO_EDIT_MODEL_LABEL = 'GPT Image 2.6';

/**
 * After this age, pending/processing photo edits are forced to failed (credits
 * refunded) even if the browser stopped polling. GPT Image jobs usually finish
 * in well under a minute; 15 minutes covers provider queues and late webhooks
 * when submit never stored a provider task id (timeout / lost response),
 * without holding credits forever.
 */
export const PHOTO_EDIT_STALE_MS = 15 * 60_000;
/**
 * Same window as stale settle. Unconfirmed submits leave `task_id` null and
 * wait for a webhook; failing them at 3 minutes would race a late success
 * callback. Cron / list reconcile use this too.
 */
export const PHOTO_EDIT_MISSING_PROVIDER_ID_MS = PHOTO_EDIT_STALE_MS;

/** Reject oversized provider webhook bodies (public endpoint). */
export const PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;

export function isPhotoEditQuality(value: unknown): value is PhotoEditQuality {
  return (
    typeof value === 'string' &&
    PHOTO_EDIT_QUALITIES.some((item) => item.id === value)
  );
}

export class PhotoEditQualityError extends Error {
  constructor() {
    super('Choose a valid quality: low, medium, high, xhigh, or max');
    this.name = 'PhotoEditQualityError';
  }
}

/**
 * Credits for a validated quality. The only argument is the quality; a
 * client credit amount, model, or provider cannot change the result.
 */
export function photoEditCharge(quality: unknown): {
  quality: PhotoEditQuality;
  credits: number;
} {
  if (!isPhotoEditQuality(quality)) throw new PhotoEditQualityError();
  const option = PHOTO_EDIT_QUALITIES.find((item) => item.id === quality)!;
  return { quality, credits: option.credits };
}

export type ToolConfig = {
  slug: string;
  title: string;
  heading: string;
  description: string;
  category: string;
  examplePrompt: string;
  limitations: string;
  steps: string[];
};

export const PHOTO_TOOLS: ToolConfig[] = [
  {
    slug: 'remove-background',
    title: 'AI Background Remover',
    heading: 'Remove Image Backgrounds Online',
    description:
      'Remove the background from a portrait or product photo and download a transparent PNG cutout. No manual masking needed.',
    category: 'Remove & Clean Up',
    examplePrompt: 'Remove the background and preserve the original subject.',
    limitations:
      'Fine hair, sheer materials, reflective edges and crowded scenes can need a second pass or manual cleanup.',
    steps: [
      'Upload a JPG, PNG or WebP photo.',
      'Click Remove Background to isolate the main subject.',
      'Inspect the transparent cutout and download it as PNG.',
    ],
  },
  {
    slug: 'remove-object',
    title: 'AI Object Remover',
    heading: 'Remove Objects from Photos with AI',
    description:
      'Remove unwanted objects from photos with a plain-language prompt. Reconstruct backgrounds naturally, then review edges and shadows before you download.',
    category: 'Remove & Clean Up',
    examplePrompt:
      'Remove the unwanted object in the background. Reconstruct the background naturally and keep everything else unchanged.',
    limitations:
      'Crowded backgrounds, shadows, and objects overlapping a subject may require more than one attempt.',
    steps: [
      'Upload a photo with the unwanted object.',
      'Describe which object to remove.',
      'Review the result and download or edit again.',
    ],
  },
  {
    slug: 'change-background',
    title: 'Photo Background Changer',
    heading: 'Change Your Photo Background with AI',
    description:
      'Cut out the original subject with AI, then place it over a solid color, preset scene or your own background photo.',
    category: 'Replace & Transform',
    examplePrompt:
      'Remove the original background and preserve the person or product as a transparent cutout.',
    limitations:
      'Fine hair and transparent edges may need review; compositing does not automatically relight the subject.',
    steps: [
      'Upload the image.',
      'Prepare the cutout, then select a color, preset or your own background photo.',
      'Inspect the result and download a PNG.',
    ],
  },
  {
    slug: 'enhance-photo',
    title: 'AI Photo Enhancer',
    heading: 'Enhance Photos with a Simple AI Prompt',
    description:
      'Enhance lighting, clarity, and colors with a simple AI prompt. Aim for natural-looking results and always compare details before downloading.',
    category: 'Enhance & Retouch',
    examplePrompt:
      'Improve the image lighting, sharpness and colors while keeping the photo natural and preserving all facial and product details.',
    limitations:
      'Generative enhancement can change small details. It is not lossless reconstruction.',
    steps: [
      'Upload your photo.',
      'Choose a quality level and generate the enhancement.',
      'Compare the output carefully before downloading.',
    ],
  },
];
export function getPhotoTool(slug: string) {
  return PHOTO_TOOLS.find((t) => t.slug === slug);
}
