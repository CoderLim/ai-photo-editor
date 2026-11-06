import { Download, LoaderCircle, Sparkles, UploadCloud } from 'lucide-react';

import {
  BACKGROUND_REMOVAL_CREDITS,
  getPhotoTool,
} from '@/modules/photo-editor/config';
import { cn } from '@/lib/utils';
import { CreditGateDialog } from '@/components/photo-editor/credit-gate-dialog';
import { usePhotoEditSession } from '@/components/photo-editor/use-photo-edit-session';
import { Button } from '@/components/ui/button';

const removerTool = getPhotoTool('remove-background');

/** Single-column upload/preview shell for transparent PNG cutouts. */
export function BackgroundRemoverWorkspace() {
  const edit = usePhotoEditSession({
    fixedPrompt: removerTool?.examplePrompt,
    toolSlug: 'remove-background',
    restoreDraftPrompt: false,
    creditCost: BACKGROUND_REMOVAL_CREDITS,
  });

  const previewSrc =
    edit.result && !edit.showOriginal ? edit.result : edit.preview;
  const checkerPreview = Boolean(edit.result) && !edit.showOriginal;

  return (
    <>
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,.4)] sm:p-5">
          <div className="mb-3.5">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="photo-file"
                className="text-sm font-semibold text-slate-800"
              >
                Upload & preview
              </label>
              <span className="text-xs text-slate-400">
                JPG, PNG, WebP · 10 MB
              </span>
            </div>
            <input
              id="photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                edit.chooseFile(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => document.getElementById('photo-file')?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  document.getElementById('photo-file')?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                edit.chooseFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'relative flex min-h-[28rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors sm:min-h-[34rem]',
                checkerPreview
                  ? 'border-slate-200 bg-[conic-gradient(#e2e8f0_25%,white_0_50%,#e2e8f0_0_75%,white_0)] bg-[length:20px_20px] hover:border-blue-400'
                  : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50'
              )}
            >
              {previewSrc ? (
                <>
                  {edit.result && (
                    <div
                      className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-white/95 p-1 text-xs shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => edit.setShowOriginal(true)}
                        className={cn(
                          'rounded-md px-2.5 py-1.5',
                          edit.showOriginal
                            ? 'bg-slate-900 font-semibold text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        )}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() => edit.setShowOriginal(false)}
                        className={cn(
                          'rounded-md px-2.5 py-1.5',
                          !edit.showOriginal
                            ? 'bg-slate-900 font-semibold text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        )}
                      >
                        Cutout
                      </button>
                    </div>
                  )}
                  <img
                    src={previewSrc}
                    alt={
                      edit.result && !edit.showOriginal
                        ? 'Photo with a transparent background'
                        : 'Selected photo'
                    }
                    className="max-h-[24rem] max-w-full rounded-lg object-contain sm:max-h-[30rem]"
                  />
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    Click or drop to replace photo
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <UploadCloud className="size-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to upload or drag your image here
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Preview appears here. Checkered areas show transparency.
                  </p>
                </>
              )}
              {edit.loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
                  <LoaderCircle className="mb-3 size-8 animate-spin text-blue-600" />
                  <p className="font-medium text-slate-900">
                    Removing background…
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    You can leave this page. Check My Creations later.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={edit.submit}
              disabled={edit.loading}
              className="h-11 flex-1 gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              {edit.loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {edit.status === 'submitting'
                ? 'Submitting edit...'
                : edit.status === 'pending'
                  ? 'Generating...'
                  : 'Remove Background'}
              {!edit.loading && (
                <span
                  className="rounded-md bg-white/15 px-2 py-1 text-xs"
                  aria-live="polite"
                >
                  {BACKGROUND_REMOVAL_CREDITS} credits
                </span>
              )}
            </Button>
            {edit.result && edit.jobId && (
              <a
                href={`/api/photo-editor/edits/${edit.jobId}/download`}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <Download className="size-4" />
                Download PNG
              </a>
            )}
          </div>
          <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
            {!edit.session?.user
              ? '10 free trial credits · '
              : edit.creditBalance !== null
                ? String(edit.creditBalance) + ' credits available · '
                : ''}
            Model: Bria RMBG 2.0 · transparent PNG
          </p>
        </div>
      </div>
      <CreditGateDialog
        mode={edit.creditGate}
        onClose={() => edit.setCreditGate(null)}
      />
    </>
  );
}
