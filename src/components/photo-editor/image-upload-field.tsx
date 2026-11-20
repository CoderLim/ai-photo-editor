import { useEffect, useRef, useState, type RefObject } from 'react';
import { Trash2, UploadCloud } from 'lucide-react';

import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type ImageUploadFieldProps = {
  preview?: string;
  fileName?: string;
  showPreviewThumb?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onFile: (file?: File) => void;
  onClear?: () => void;
  className?: string;
};

function fileFromClipboard(data: DataTransfer | null): File | undefined {
  if (!data) return undefined;

  for (const item of data.items) {
    if (item.kind !== 'file' || !ACCEPTED_TYPES.has(item.type)) continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  for (const file of data.files) {
    if (ACCEPTED_TYPES.has(file.type)) return file;
  }

  return undefined;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]')
  );
}

/** Shared image dropzone used by homepage and tool workspaces. */
export function ImageUploadField({
  preview,
  fileName,
  showPreviewThumb = true,
  inputRef: externalRef,
  onFile,
  onClear,
  className,
}: ImageUploadFieldProps) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalRef ?? localRef;
  const onFileRef = useRef(onFile);
  const [dragging, setDragging] = useState(false);
  const openPicker = () => inputRef.current?.click();
  const hasPreview = Boolean(showPreviewThumb && preview);

  useEffect(() => {
    onFileRef.current = onFile;
  }, [onFile]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const file = fileFromClipboard(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      onFileRef.current(file);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  return (
    <div className={className}>
      <label
        htmlFor="photo-file"
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        Image Upload
      </label>
      <input
        id="photo-file"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.currentTarget.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') openPicker();
        }}
        onPaste={(e) => {
          const file = fileFromClipboard(e.clipboardData);
          if (!file) return;
          e.preventDefault();
          e.stopPropagation();
          onFile(file);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !ACCEPTED_TYPES.has(file.type)) return;
          onFile(file);
        }}
        className={cn(
          'relative flex min-h-[10.5rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-4 py-6 text-center transition-colors',
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50/70'
        )}
      >
        {hasPreview ? (
          <div className="flex w-full items-center gap-4 text-left">
            <img
              src={preview}
              alt="Selected photo"
              className="size-24 rounded-xl object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {fileName || 'Edited photo'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Click or paste to replace
              </p>
            </div>
            {onClear ? (
              <button
                type="button"
                aria-label="Remove photo"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-5" />
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <UploadCloud className="size-8 text-blue-500" strokeWidth={1.75} />
            <span className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/25">
              Upload Image
            </span>
            <p className="mt-2.5 text-xs text-slate-500">
              Click, paste, or drag · JPEG, PNG, WEBP up to 10 MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
