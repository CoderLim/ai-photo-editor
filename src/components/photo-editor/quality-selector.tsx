import { useEffect, useRef, useState } from 'react';
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = PHOTO_EDIT_QUALITIES.find((item) => item.id === value)!;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <label
        htmlFor="photo-edit-quality"
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        Quality
      </label>
      <button
        id="photo-edit-quality"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
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
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {selected.credits} credits
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-labelledby="photo-edit-quality"
          className="absolute top-full left-0 z-50 mt-1.5 w-full space-y-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_-18px_rgba(15,23,42,.35)] ring-1 ring-slate-900/5"
        >
          {PHOTO_EDIT_QUALITIES.map((option) => {
            const isSelected = value === option.id;
            return (
              <li key={option.id} role="option" aria-selected={isSelected}>
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
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                          isSelected
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {option.credits} credits
                      </span>
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
      )}
    </div>
  );
}
