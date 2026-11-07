/**
 * SEO case-study graphic: both halves render the exact same foreground image.
 * Unlike two independent generated "before/after" photos, this cannot redraw
 * the person or product when the background changes.
 */
type BackgroundChangeComparisonProps = {
  subjectSrc: string;
  subjectAlt: string;
  beforeBackground: string;
  afterBackground?: string;
  afterColor?: string;
  beforeLabel: string;
  afterLabel: string;
  subjectClassName?: string;
};

export function BackgroundChangeComparison({
  subjectSrc,
  subjectAlt,
  beforeBackground,
  afterBackground,
  afterColor,
  beforeLabel,
  afterLabel,
  subjectClassName = '',
}: BackgroundChangeComparisonProps) {
  return (
    <figure>
      <div
        className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-3 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] sm:gap-4 sm:p-4"
        role="group"
        aria-label={subjectAlt + ' with its background replaced'}
      >
        {[
          {
            label: 'Before',
            caption: beforeLabel,
            background: beforeBackground,
            color: undefined,
          },
          {
            label: 'After',
            caption: afterLabel,
            background: afterBackground,
            color: afterColor,
          },
        ].map((panel) => (
          <div key={panel.label} className="min-w-0">
            <div
              className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              style={panel.color ? { backgroundColor: panel.color } : undefined}
            >
              {panel.background && (
                <img
                  src={panel.background}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <img
                src={subjectSrc}
                alt={panel.label + ': ' + subjectAlt}
                loading="lazy"
                decoding="async"
                className={'relative z-10 h-[96%] max-w-full object-contain ' + subjectClassName}
              />
              <span
                className={
                  'absolute top-3 left-3 z-20 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ' +
                  (panel.label === 'After'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/95 text-slate-900')
                }
              >
                {panel.label}
              </span>
            </div>
            <p className="mt-2 text-center text-xs font-medium text-slate-500 sm:text-sm">
              {panel.caption}
            </p>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-center text-xs leading-5 text-slate-500">
        Illustrative background swap using the same foreground cutout in both images.
        Actual cutout edges may vary by photo.
      </figcaption>
    </figure>
  );
}
