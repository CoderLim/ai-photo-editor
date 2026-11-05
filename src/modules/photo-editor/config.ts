export const EDIT_CREDITS = 10;
export const REPLICATE_EDIT_MODEL = 'google/nano-banana-2.1';
export const FAL_EDIT_MODEL = 'google/nano-banana-2.1/edit';
/** Public display name for the underlying image model (compliance / UI). */
export const PHOTO_EDIT_MODEL_LABEL = 'Nano Banana (Gemini)';

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
    title: 'AI Background Changer',
    heading: 'Change Your Photo Background with AI',
    description:
      'Change portrait or product backgrounds with AI. Describe a studio, outdoor scene, or clean backdrop while keeping the main subject recognizable.',
    category: 'Replace & Transform',
    examplePrompt:
      'Replace the background with a clean, softly lit professional studio. Preserve the main subject, face, pose and clothing.',
    limitations:
      'Fine hair, transparent objects and complex lighting can change during editing.',
    steps: [
      'Upload the image.',
      'Describe the replacement background.',
      'Inspect subject edges and lighting before downloading.',
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
      'Choose the enhancement prompt or customize it.',
      'Compare the output carefully before downloading.',
    ],
  },
];
export function getPhotoTool(slug: string) {
  return PHOTO_TOOLS.find((t) => t.slug === slug);
}
