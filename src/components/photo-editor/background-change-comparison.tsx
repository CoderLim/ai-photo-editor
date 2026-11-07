/**
 * Display a complete, purpose-made comparison image rather than placing a
 * decorative "before/after" collage on top of two other backgrounds.
 * Both views are already part of the same original comparison asset.
 */
type BackgroundChangeComparisonProps = {
  comparisonSrc: string;
  comparisonAlt: string;
  beforeLabel: string;
  afterLabel: string;
};

export function BackgroundChangeComparison({
  comparisonSrc,
  comparisonAlt,
  beforeLabel,
  afterLabel,
}: BackgroundChangeComparisonProps) {
  return (
    <figure>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] sm:p-4">
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={comparisonSrc}
            alt={comparisonAlt}
            width={512}
            height={384}
            loading="lazy"
            decoding="async"
            className="block aspect-[4/3] w-full object-cover"
          />
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
            Before
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            After
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-center text-xs font-medium text-slate-500 sm:text-sm">
          <span>{beforeLabel}</span>
          <span>{afterLabel}</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs leading-5 text-slate-500">
        Illustrative before-and-after comparison. Check the actual result for
        cutout edges, shadows and lighting.
      </figcaption>
    </figure>
  );
}
