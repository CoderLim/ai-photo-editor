import { useEffect, useRef, useState, type RefObject } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type UploadImageItem = {
  id: string;
  preview: string;
  fileName?: string;
};

type ImageUploadFieldProps = {
  images: UploadImageItem[];
  maxImages?: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  className?: string;
  label?: string;
};

function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];

  const fromItems: File[] = [];
  for (const item of data.items) {
    if (item.kind !== 'file' || !ACCEPTED_TYPES.has(item.type)) continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
  }
  if (fromItems.length) return fromItems;

  return Array.from(data.files).filter((file) => ACCEPTED_TYPES.has(file.type));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]')
  );
}

/** Shared image dropzone used by homepage and tool workspaces. */
export function ImageUploadField({
  images,
  maxImages = 1,
  inputRef: externalRef,
  onAdd,
  onRemove,
  className,
  label = 'Image Upload',
}: ImageUploadFieldProps) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalRef ?? localRef;
  const onAddRef = useRef(onAdd);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<UploadImageItem | null>(null);
  const remaining = Math.max(0, maxImages - images.length);
  const canAdd = remaining > 0;
  const openPicker = () => {
    if (!canAdd) return;
    inputRef.current?.click();
  };

  useEffect(() => {
    onAddRef.current = onAdd;
  }, [onAdd]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!canAdd) return;
      if (isEditableTarget(e.target)) return;
      const files = filesFromClipboard(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      onAddRef.current(files.slice(0, remaining));
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [canAdd, remaining]);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox]);

  return (
    <div className={className}>
      <label
        htmlFor="photo-file"
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <input
        id="photo-file"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={maxImages > 1}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onAdd(files);
          e.currentTarget.value = '';
        }}
      />
      <div
        onPaste={(e) => {
          if (!canAdd) return;
          const files = filesFromClipboard(e.clipboardData);
          if (!files.length) return;
          e.preventDefault();
          e.stopPropagation();
          onAdd(files.slice(0, remaining));
        }}
        onDragOver={(e) => {
          if (!canAdd) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!canAdd) return;
          const files = Array.from(e.dataTransfer.files || []).filter((file) =>
            ACCEPTED_TYPES.has(file.type)
          );
          if (!files.length) return;
          onAdd(files.slice(0, remaining));
        }}
      >
        <ul
          className={cn(
            'grid gap-2',
            images.length === 0 ? 'grid-cols-1' : 'grid-cols-4'
          )}
        >
          {images.map((image) => (
            <li key={image.id} className="group relative aspect-square">
              <button
                type="button"
                onClick={() => setLightbox(image)}
                className="size-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80 transition hover:ring-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                aria-label={
                  image.fileName
                    ? `View ${image.fileName} fullscreen`
                    : 'View photo fullscreen'
                }
              >
                <img
                  src={image.preview}
                  alt={image.fileName || 'Selected photo'}
                  className="size-full object-cover"
                />
              </button>
              <button
                type="button"
                aria-label="Remove photo"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(image.id);
                }}
                className="absolute top-1 right-1 z-10 inline-flex size-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-red-600 focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
          {canAdd ? (
            <li
              className={images.length === 0 ? 'h-28 w-full' : 'aspect-square'}
            >
              <button
                type="button"
                onClick={openPicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPicker();
                  }
                }}
                aria-label="Add photo"
                className={cn(
                  'flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors',
                  dragging
                    ? 'border-blue-500 bg-blue-100 text-blue-600'
                    : 'border-blue-300 bg-white/70 text-blue-500 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600'
                )}
              >
                <Plus className="size-7" strokeWidth={1.75} />
                {images.length === 0 ? (
                  <span className="px-3 text-center text-xs leading-snug text-slate-500">
                    JPEG, PNG, WEBP up to 10 MB · Max {maxImages}{' '}
                    {maxImages === 1 ? 'image' : 'images'}
                  </span>
                ) : null}
              </button>
            </li>
          ) : null}
        </ul>
      </div>

      {lightbox && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={lightbox.fileName || 'Photo preview'}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              onClick={() => setLightbox(null)}
            >
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setLightbox(null)}
                className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <X className="size-5" />
              </button>
              <img
                src={lightbox.preview}
                alt={lightbox.fileName || 'Photo preview'}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
