import { EDIT_CREDITS } from '@/modules/photo-editor/config';

const ASSET = '/images/examples/gpt-image-2.6';

export type ExampleEdit = {
  id: string;
  title: string;
  /** Display name for the demo author card (curated, not a real account). */
  userName: string;
  userAvatar: string;
  prompt: string;
  credits: number;
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  sourceLabel: string;
  sourceUrl: string;
  toolHref?: string;
};

const AVATAR = '/images/examples/avatars';

/**
 * Curated GPT Image edit examples mirrored from public demos (SugarCube /
 * OpenAI Cookbook). Not live user generations. Credits match product medium
 * quality pricing.
 */
export const EXAMPLE_EDITS: ExampleEdit[] = [
  {
    id: 'recolor-vase',
    title: 'Recolor a marked object',
    userName: 'Maya Chen',
    userAvatar: `${AVATAR}/maya-chen.svg`,
    prompt:
      'Recolor the striped vase inside the red circle to solid cobalt blue ceramic. Keep its shape, the dried stems, and the rest of the kitchen unchanged. Remove the red circle from the finished photo.',
    credits: EDIT_CREDITS,
    beforeSrc: `${ASSET}/recolor-vase/before.webp`,
    afterSrc: `${ASSET}/recolor-vase/after.webp`,
    beforeAlt:
      'Kitchen table with a striped vase and dried stems before the edit',
    afterAlt:
      'Same kitchen scene after the vase was recolored to solid cobalt blue',
    sourceLabel: 'OpenAI GPT Image 2.6 markup edit (SugarCube mirror)',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/image-prompting',
    toolHref: '/#editor',
  },
  {
    id: 'product-cutout',
    title: 'Transparent product cutout',
    userName: 'Jordan Lee',
    userAvatar: `${AVATAR}/jordan-lee.svg`,
    prompt:
      'Extract the product from the input image and isolate it on a fully transparent background.\nOutput: centered product, crisp silhouette, no halos/fringing.\nPreserve product geometry and label legibility exactly.\nAdd only light polishing. Do not add a solid backdrop, checkerboard, scenery, or shadow.\nDo not restyle the product; remove the background and preserve clean alpha transparency.',
    credits: EDIT_CREDITS,
    beforeSrc: `${ASSET}/product-cutout/before.png`,
    afterSrc: `${ASSET}/product-cutout/after.webp`,
    beforeAlt: 'Shampoo bottle product photo on a studio background',
    afterAlt: 'Same shampoo bottle isolated on a transparent background',
    sourceLabel: 'OpenAI GPT Image product cutout (SugarCube / Cookbook)',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/image-prompting',
    toolHref: '/ai-background-remover',
  },
  {
    id: 'remove-object',
    title: 'Remove an object',
    userName: 'Samir Patel',
    userAvatar: `${AVATAR}/samir-patel.svg`,
    prompt: "Remove the flower from man's hand. Do not change anything else.",
    credits: EDIT_CREDITS,
    beforeSrc: `${ASSET}/remove-object/before.png`,
    afterSrc: `${ASSET}/remove-object/after.png`,
    beforeAlt: 'Man holding a flower in his hand before object removal',
    afterAlt: 'Same man after the flower was removed from his hand',
    sourceLabel: 'OpenAI Cookbook image edit example',
    sourceUrl:
      'https://github.com/openai/openai-cookbook/tree/main/images/output_images',
    toolHref: '/#editor',
  },
  {
    id: 'change-furniture',
    title: 'Change furniture in a room',
    userName: 'Elena Rossi',
    userAvatar: `${AVATAR}/elena-rossi.svg`,
    prompt:
      'In this room photo, replace ONLY the white chairs with chairs made of wood.\nPreserve camera angle, room lighting, floor shadows, and surrounding objects.\nKeep all other aspects of the image unchanged.\nPhotorealistic contact shadows and fabric texture.',
    credits: EDIT_CREDITS,
    beforeSrc: `${ASSET}/change-furniture/before.jpeg`,
    afterSrc: `${ASSET}/change-furniture/after.png`,
    beforeAlt: 'Room interior with white chairs before the furniture edit',
    afterAlt: 'Same room after the white chairs were replaced with wood chairs',
    sourceLabel: 'OpenAI Cookbook image edit example',
    sourceUrl: 'https://github.com/openai/openai-cookbook/tree/main/images',
    toolHref: '/#editor',
  },
  {
    id: 'change-clothing',
    title: 'Change clothing, keep identity',
    userName: 'Noah Kim',
    userAvatar: `${AVATAR}/noah-kim.svg`,
    prompt:
      'Edit the image to dress the woman using the provided clothing images. Do not change her face, facial features, skin tone, body shape, pose, or identity in any way. Preserve her exact likeness, expression, hairstyle, and proportions. Replace only the clothing, fitting the garments naturally to her existing pose and body geometry with realistic fabric behavior. Match lighting, shadows, and color temperature to the original photo so the outfit integrates photorealistically, without looking pasted on. Do not change the background, camera angle, framing, or image quality, and do not add accessories, text, logos, or watermarks.',
    credits: EDIT_CREDITS,
    beforeSrc: `${ASSET}/change-clothing/before.png`,
    afterSrc: `${ASSET}/change-clothing/after.png`,
    beforeAlt: 'Portrait of a woman before a clothing swap edit',
    afterAlt:
      'Same woman after clothing was replaced while identity and pose stayed fixed',
    sourceLabel: 'OpenAI Cookbook image edit example',
    sourceUrl: 'https://github.com/openai/openai-cookbook/tree/main/images',
    toolHref: '/#editor',
  },
  {
    id: 'combine-dog',
    title: 'Combine reference subjects',
    userName: 'Priya Nair',
    userAvatar: `${AVATAR}/priya-nair.svg`,
    prompt:
      'Place the dog from the second image into the setting of image 1, right next to the woman, use the same style of lighting, composition and background. Do not change anything else.',
    credits: EDIT_CREDITS,
    beforeSrc: `${ASSET}/combine-dog/before.png`,
    afterSrc: `${ASSET}/combine-dog/after.png`,
    beforeAlt: 'Woman in a scene before a dog was composited into the frame',
    afterAlt: 'Same scene after a dog was placed next to the woman',
    sourceLabel: 'OpenAI Cookbook image edit example',
    sourceUrl:
      'https://github.com/openai/openai-cookbook/tree/main/images/output_images',
    toolHref: '/#editor',
  },
  {
    id: 'billboard-winter',
    title: 'Iterate: change weather',
    userName: 'Alex Morgan',
    userAvatar: `${AVATAR}/alex-morgan.svg`,
    prompt: 'Make it look like a winter evening with snowfall.',
    credits: EDIT_CREDITS,
    beforeSrc: `${ASSET}/billboard-winter/before.png`,
    afterSrc: `${ASSET}/billboard-winter/after.png`,
    beforeAlt: 'Highway billboard scene before a weather change',
    afterAlt: 'Same billboard scene restyled as a winter evening with snowfall',
    sourceLabel: 'OpenAI Cookbook iterative edit example',
    sourceUrl:
      'https://github.com/openai/openai-cookbook/tree/main/images/output_images',
    toolHref: '/#editor',
  },
];
