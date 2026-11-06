import {
  Layers3,
  MessageSquareText,
  RefreshCcw,
  ScanLine,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';

type Benefit = {
  id: string;
  category: string;
  title: string;
  description: string;
  image: string;
  beforeAlt: string;
  afterAlt: string;
  icon: LucideIcon;
};

const BENEFITS: Benefit[] = [
  {
    id: 'preserve-subject',
    category: 'SUBJECT CONSISTENCY',
    title: 'Change What You Want, Keep What Matters',
    description:
      "Change the background or other details while keeping the main subject's shape, colors, and defining features as close to the original as possible.",
    image: '/images/ai-photo-editor/core-benefits/product-background.jpg',
    beforeAlt: 'Original photo before a targeted background change',
    afterAlt: 'Edited background with the main subject preserved',
    icon: Layers3,
  },
  {
    id: 'precision-editing',
    category: 'PRECISION EDITING',
    title: 'Edit Small Details, Not the Whole Photo',
    description:
      'Remove distractions, smooth clothing wrinkles, or adjust specific details without unnecessarily changing everything else.',
    image: '/images/ai-photo-editor/remove-clothing-wrinkles.jpg',
    beforeAlt: 'Clothing with visible wrinkles before AI editing',
    afterAlt: 'Clothing with wrinkles reduced while retaining its overall look',
    icon: ScanLine,
  },
  {
    id: 'natural-language',
    category: 'NATURAL LANGUAGE',
    title: 'Just Describe It, AI Handles the Rest',
    description:
      'Skip complicated selections and layers. Simply describe the change in everyday language and see the edit take shape.',
    image: '/images/ai-photo-editor/remove-object.jpg',
    beforeAlt: 'Outdoor photo before removing an unwanted object',
    afterAlt: 'Outdoor photo with the unwanted object removed',
    icon: MessageSquareText,
  },
  {
    id: 'creative-transformation',
    category: 'CREATIVE TRANSFORMATION',
    title: 'Give Your Photos a Whole New Look',
    description:
      'Explore new backgrounds, lighting, colors, and styles while keeping your original subject recognizable.',
    image: '/images/ai-photo-editor/restyle-photo.jpg',
    beforeAlt: 'Original photo before a cinematic restyle',
    afterAlt: 'Photo after a cinematic style and lighting change',
    icon: WandSparkles,
  },
  {
    id: 'iterative-editing',
    category: 'ITERATIVE EDITING',
    title: 'Refine Your Edits, Step by Step',
    description:
      'Make another change to a generated result. Fine-tune details and build on previous edits without re-uploading the original.',
    image: '/images/ai-photo-editor/portrait-retouch.jpg',
    beforeAlt: 'Portrait before an AI retouching pass',
    afterAlt: 'Portrait after a refined retouching pass',
    icon: RefreshCcw,
  },
];

/**
 * Feature imagery contains two side-by-side scenes in one image.
 * Render its left and right halves as separate, responsive panels.
 * Each photo is a visual example, not a pixel-perfect preservation guarantee.
 */
function ComparisonPanel({
  image,
  side,
  alt,
}: {
  image: string;
  side: 'before' | 'after';
  alt: string;
}) {
  return (
    <div className="relative aspect-[5/4] min-w-0 overflow-hidden rounded-xl bg-slate-100">
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={1672}
        height={941}
        className={`absolute top-0 h-full w-[200%] max-w-none object-cover ${side === 'before' ? 'left-0 object-left' : 'right-0 object-right'}`}
      />
      <span
        className={`absolute bottom-2 left-2 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${side === 'before' ? 'bg-slate-900/70' : 'bg-blue-600'}`}
      >
        {side === 'before' ? 'Before' : 'After'}
      </span>
    </div>
  );
}

export function CoreBenefits() {
  return (
    <section
      id="core-benefits"
      aria-labelledby="core-benefits-heading"
      className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20"
    >
      <div className="mb-9 text-center sm:mb-12">
        <h2
          id="core-benefits-heading"
          className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
        >
          Powerful AI Photo Editing, Made Simple
        </h2>
        <p className="mx-auto mt-4 max-w-3xl leading-7 text-slate-600">
          Make targeted edits, preserve important details, and transform your
          photos with simple instructions.
        </p>
      </div>
      <div className="space-y-4 sm:space-y-5">
        {BENEFITS.map((benefit, index) => {
          const Icon = benefit.icon;
          const picture = (
            <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3">
              <ComparisonPanel
                image={benefit.image}
                side="before"
                alt={benefit.beforeAlt}
              />
              <ComparisonPanel
                image={benefit.image}
                side="after"
                alt={benefit.afterAlt}
              />
            </div>
          );
          const copy = (
            <div className="flex min-w-0 flex-col justify-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon aria-hidden="true" className="size-6" />
              </div>
              <p className="text-xs font-bold tracking-wide text-blue-600">
                {String(index + 1).padStart(2, '0')} · {benefit.category}
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                {benefit.title}
              </h3>
              <p className="mt-3 max-w-xl leading-7 text-slate-600">
                {benefit.description}
              </p>
            </div>
          );
          return (
            <article
              key={benefit.id}
              className="grid items-center gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-2 lg:gap-10"
            >
              <div className={index % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}>
                {picture}
              </div>
              <div className={index % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}>
                {copy}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
