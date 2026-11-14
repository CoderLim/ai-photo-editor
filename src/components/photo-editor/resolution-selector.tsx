import {
  PHOTO_RESOLUTIONS,
  type PhotoResolution,
} from '@/modules/photo-editor/config';
import { cn } from '@/lib/utils';

type ResolutionSelectorProps = {
  value: PhotoResolution;
  disabled?: boolean;
  onChange: (resolution: PhotoResolution) => void;
  className?: string;
};

/** 1K / 2K / 4K — fixed-width rounded squares, not full-row bars. */
export function ResolutionSelector({
  value,
  disabled,
  onChange,
  className,
}: ResolutionSelectorProps) {
  return (
    <div className={className}>
      <p
        id="photo-resolution-label"
        className="mb-2 text-sm font-semibold text-slate-800"
      >
        Image Resolution
      </p>
      <div
        role="radiogroup"
        aria-labelledby="photo-resolution-label"
        className="flex flex-wrap gap-2"
      >
        {PHOTO_RESOLUTIONS.map((option) => {
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
                'flex size-12 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition-colors',
                selected
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50 hover:text-slate-800',
                disabled && 'cursor-not-allowed opacity-70'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
