import { useId, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Check, ChevronDown } from 'lucide-react';

import {
  PHOTO_EDIT_QUALITIES,
  type PhotoEditQuality,
} from '@/modules/photo-editor/config';
import { cn } from '@/lib/utils';

type QualitySelectorProps = {
  value: PhotoEditQuality;
  disabled?: boolean;
  onChange: (quality: PhotoEditQuality) => void;
  className?: string;
};

/** Shared quality dropdown used by homepage and tool workspaces. */
export function QualitySelector({
  value,
  disabled,
  onChange,
  className,
}: QualitySelectorProps) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const selected = PHOTO_EDIT_QUALITIES.find((item) => item.id === value)!;

  return (
    <div className={className}>
      <label
        htmlFor={triggerId}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        Quality
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left transition-colors',
            open
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50',
            disabled && 'cursor-not-allowed opacity-70'
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              {selected.label}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {selected.description}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-slate-400 transition-transform',
              open && 'rotate-180'
            )}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="start" className="z-50">
            <Popover.Popup className="max-h-(--available-height) w-(--anchor-width) overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg outline-none">
              <ul
                role="listbox"
                aria-labelledby={triggerId}
                className="space-y-1"
              >
                {PHOTO_EDIT_QUALITIES.map((option) => {
                  const isSelected = value === option.id;
                  return (
                    <li
                      key={option.id}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onChange(option.id);
                          setOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-blue-50'
                            : 'hover:bg-slate-50 focus-visible:bg-slate-50'
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                            {option.description}
                          </span>
                        </span>
                        <Check
                          className={cn(
                            'mt-0.5 size-4 shrink-0 text-blue-600',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
