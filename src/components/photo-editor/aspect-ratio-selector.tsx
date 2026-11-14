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
  landscape: 'h-2 w-3.5',
  square: 'size-2.5',
  landscape_4_3: 'h-2 w-3',
  portrait_4_3: 'h-3 w-2',
  landscape_16_9: 'h-1.5 w-3.5',
  portrait_16_9: 'h-3.5 w-1.5',
};

/** Aspect ratio chips — compact rounded tiles, site blue selected. */
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
        className="flex flex-wrap gap-1.5"
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
                'flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-md border transition-colors',
                selected
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-slate-50 hover:text-slate-700',
                disabled && 'cursor-not-allowed opacity-70'
              )}
            >
              <span
                aria-hidden
                className="flex h-3.5 w-full items-center justify-center"
              >
                <span
                  className={cn(
                    'rounded-[2px] border-[1.5px]',
                    selected ? 'border-blue-500' : 'border-current opacity-70',
                    ICON_BOX[option.icon]
                  )}
                />
              </span>
              <span
                className={cn(
                  'text-[10px] leading-none font-medium',
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
