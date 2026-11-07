import { useRef, useState } from 'react';
import { Ban, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  isAllowedBackgroundFile,
  PRESET_FILL_PHOTOS,
  revokePhotoUrl,
  type CutoutFill,
} from '@/lib/composite-cutout';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#ffffff',
  '#4a3728',
  '#8b5a2b',
  '#d2b48c',
  '#f5d0c5',
  '#fadadd',
  '#e6e6fa',
  '#e0f0e9',
  '#e0f7fa',
  '#e3f2fd',
  '#fff8e7',
  '#fffacd',
  '#f0fff0',
] as const;

type Tab = 'color' | 'photo';

type BackgroundFillPanelProps = {
  value: CutoutFill;
  onChange: (next: CutoutFill) => void;
};

/** Post-cutout fill controls: solid colors, presets, or a custom photo. */
export function BackgroundFillPanel({
  value,
  onChange,
}: BackgroundFillPanelProps) {
  const [tab, setTab] = useState<Tab>(
    value.mode === 'photo' ? 'photo' : 'color'
  );
  const colorInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const selectedColor =
    value.mode === 'color' ? value.color.toLowerCase() : null;
  const customSelected =
    value.mode === 'color' &&
    !PRESET_COLORS.some((c) => c.toLowerCase() === selectedColor);
  const selectedPhoto = value.mode === 'photo' ? value.photoUrl : null;
  const isCustomPhoto =
    Boolean(selectedPhoto) &&
    !PRESET_FILL_PHOTOS.some((p) => p.src === selectedPhoto);

  function pickColor(color: string) {
    if (value.mode === 'photo') revokePhotoUrl(value.photoUrl);
    onChange({ mode: 'color', color });
  }

  function pickTransparent() {
    if (value.mode === 'photo') revokePhotoUrl(value.photoUrl);
    onChange({ mode: 'transparent' });
  }

  function pickPresetPhoto(src: string) {
    if (value.mode === 'photo') revokePhotoUrl(value.photoUrl);
    onChange({ mode: 'photo', photoUrl: src });
  }

  function onPhotoFile(file: File | undefined) {
    if (!file) return;
    if (!isAllowedBackgroundFile(file)) {
      toast.error('Use JPG, PNG or WebP up to 10 MB');
      return;
    }
    const url = URL.createObjectURL(file);
    if (value.mode === 'photo') revokePhotoUrl(value.photoUrl);
    onChange({ mode: 'photo', photoUrl: url });
  }

  function clearPhoto() {
    if (value.mode === 'photo') revokePhotoUrl(value.photoUrl);
    onChange({ mode: 'transparent' });
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,.4)]">
      <div
        className="flex gap-1 rounded-xl bg-slate-100 p-1"
        role="tablist"
        aria-label="Background fill"
      >
        {(
          [
            { id: 'color', label: 'Color' },
            { id: 'photo', label: 'Photo' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === item.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1">
        {tab === 'color' ? (
          <div
            className="grid grid-cols-3 gap-2.5"
            role="listbox"
            aria-label="Background color"
          >
            <button
              type="button"
              role="option"
              aria-selected={value.mode === 'transparent'}
              aria-label="Transparent"
              onClick={pickTransparent}
              className={cn(
                'relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white',
                value.mode === 'transparent' &&
                  'ring-2 ring-slate-900 ring-offset-2'
              )}
            >
              <span className="absolute inset-0 bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-[length:12px_12px]" />
              <Ban className="absolute inset-0 m-auto size-7 text-slate-400" />
            </button>

            <button
              type="button"
              role="option"
              aria-selected={customSelected}
              aria-label="Custom color"
              onClick={() => colorInputRef.current?.click()}
              className={cn(
                'relative aspect-square overflow-hidden rounded-2xl border border-slate-200',
                customSelected && 'ring-2 ring-slate-900 ring-offset-2'
              )}
              style={
                customSelected && selectedColor
                  ? { backgroundColor: selectedColor }
                  : undefined
              }
            >
              {!customSelected && (
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      'conic-gradient(from 180deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)',
                  }}
                />
              )}
              <input
                ref={colorInputRef}
                type="color"
                value={selectedColor ?? '#805b4c'}
                onChange={(e) => pickColor(e.target.value)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
              />
            </button>

            {PRESET_COLORS.map((color) => {
              const active =
                value.mode === 'color' &&
                value.color.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={`Color ${color}`}
                  onClick={() => pickColor(color)}
                  className={cn(
                    'aspect-square rounded-2xl border border-slate-200/80',
                    color.toLowerCase() === '#ffffff' && 'border-slate-300',
                    active && 'ring-2 ring-slate-900 ring-offset-2'
                  )}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                onPhotoFile(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />

            <div
              className="grid grid-cols-3 gap-2.5"
              role="listbox"
              aria-label="Background photo"
            >
              <button
                type="button"
                role="option"
                aria-selected={false}
                aria-label="Upload a background photo"
                onClick={() => photoInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-600"
              >
                <ImagePlus className="size-5" />
                <span className="text-[10px] font-medium">Upload</span>
              </button>

              {PRESET_FILL_PHOTOS.map((preset) => {
                const active = selectedPhoto === preset.src;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-label={preset.label}
                    onClick={() => pickPresetPhoto(preset.src)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-2xl border border-slate-200',
                      active && 'ring-2 ring-slate-900 ring-offset-2'
                    )}
                  >
                    <img
                      src={preset.src}
                      alt=""
                      className="size-full object-cover"
                    />
                  </button>
                );
              })}
            </div>

            {isCustomPhoto && selectedPhoto && (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <img
                  src={selectedPhoto}
                  alt="Custom background"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex gap-2 border-t border-slate-100 p-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
