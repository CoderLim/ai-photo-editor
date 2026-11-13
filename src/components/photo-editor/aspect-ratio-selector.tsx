import {
  PHOTO_IMAGE_SIZES,
  type PhotoImageSize,
} from '@/modules/photo-editor/config';
import { cn } from '@/lib/utils';

type AspectRatioSelectorProps = {
  value: PhotoImageSize;
  disabled?: boolean;
  onChange: (size: PhotoImageSize) => void;
  className?: string;
};

const ICON_BOX: Record<(typeof PHOTO_IMAGE_SIZES)[number]['icon'], string> = {
  landscape: 'h-3 w-5',
  square: 'size-3.5',
  landscape_4_3: 'h-3 w-4',
  portrait_4_3: 'h-4 w-3',
  landscape_16_9: 'h-2.5 w-5',
  portrait_16_9: 'h-5 w-2.5',
};

/** Text-to-image aspect ratio chips — Fal `image_size` presets, site blue selected. */
export function AspectRatioSelector({
  value,
  disabled,
  onChange,
  className,
}: AspectRatioSelectorProps) {
  return (
    <div className={className}>
      <p
        id="photo-aspect-ratio-label"
        className="mb-2 text-sm font-semibold text-slate-800"
      >
        Aspect Ratio
      </p>
      <div
        role="radiogroup"
        aria-labelledby="photo-aspect-ratio-label"
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {PHOTO_IMAGE_SIZES.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={cn(
                'flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 transition-colors',
                selected
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-slate-50 hover:text-slate-700',
                disabled && 'cursor-not-allowed opacity-70'
              )}
            >
              <span
                aria-hidden
                className="flex h-5 w-full items-center justify-center"
              >
                <span
                  className={cn(
                    'rounded-[3px] border-2',
                    selected ? 'border-blue-500' : 'border-current opacity-70',
                    ICON_BOX[option.icon]
                  )}
                />
              </span>
              <span
                className={cn(
                  'text-[11px] leading-none font-medium',
                  selected ? 'text-blue-700' : 'text-slate-500'
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
