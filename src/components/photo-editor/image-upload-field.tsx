import { useRef, useState, type RefObject } from 'react';
import { ImagePlus, UploadCloud } from 'lucide-react';

import { cn } from '@/lib/utils';

type ImageUploadFieldProps = {
  preview?: string;
  fileName?: string;
  showPreviewThumb?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onFile: (file?: File) => void;
  className?: string;
};

/** Shared image dropzone used by homepage and tool workspaces. */
export function ImageUploadField({
  preview,
  fileName,
  showPreviewThumb = true,
  inputRef: externalRef,
  onFile,
  className,
}: ImageUploadFieldProps) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalRef ?? localRef;
  const [dragging, setDragging] = useState(false);
  const openPicker = () => inputRef.current?.click();

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="photo-file"
          className="text-sm font-semibold text-slate-800"
        >
          Upload image
        </label>
        <span className="text-xs text-slate-400">JPG, PNG, WebP · 10 MB</span>
      </div>
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
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'relative flex min-h-[6.75rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-4 py-3 text-center transition-colors',
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50'
        )}
      >
        {showPreviewThumb && preview ? (
          <div className="flex w-full items-center gap-4 text-left">
            <img
              src={preview}
              alt="Selected photo"
              className="size-24 rounded-lg object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {fileName || 'Edited photo'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Click to replace photo
              </p>
            </div>
            <ImagePlus className="size-5 text-slate-500" />
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <UploadCloud className="size-6 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Click to upload or drag your image here
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Your photo stays in your browser until you generate.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
