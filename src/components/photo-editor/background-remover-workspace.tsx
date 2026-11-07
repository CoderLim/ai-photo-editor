import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Download, LoaderCircle, Sparkles, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

import {
  BACKGROUND_REMOVAL_CREDITS,
  getPhotoTool,
} from '@/modules/photo-editor/config';
import {
  compositeCutout,
  downloadBlob,
  revokePhotoUrl,
  type CutoutFill,
} from '@/lib/composite-cutout';
import { cn } from '@/lib/utils';
import { BackgroundFillPanel } from '@/components/photo-editor/background-fill-panel';
import { CreditGateDialog } from '@/components/photo-editor/credit-gate-dialog';
import { usePhotoEditSession } from '@/components/photo-editor/use-photo-edit-session';
import { Button } from '@/components/ui/button';

const removerTool = getPhotoTool('remove-background');

/** High-contrast checker so transparent PNG alpha is obvious in the preview. */
const CHECKER_BG =
  'bg-[conic-gradient(#cbd5e1_25%,#f8fafc_0_50%,#cbd5e1_0_75%,#f8fafc_0)] bg-[length:24px_24px]';

const TRANSPARENT_FILL: CutoutFill = { mode: 'transparent' };

type CutoutPreviewProps = {
  previewSrc: string;
  showingCutout: boolean;
  fill: CutoutFill;
  toggle: ReactNode;
};

/**
 * Full-bleed preview stage after cutout: fill paints the stage, subject sits
 * on top with object-contain so color/photo stays visible through alpha.
 */
function CutoutPreview({
  previewSrc,
  showingCutout,
  fill,
  toggle,
}: CutoutPreviewProps) {
  const fillStyle =
    fill.mode === 'color' ? { backgroundColor: fill.color } : undefined;

  return (
    <div
      className={cn(
        'relative flex min-h-[24rem] w-full items-center justify-center overflow-hidden rounded-xl sm:min-h-[30rem]',
        fill.mode === 'transparent' && CHECKER_BG,
        fill.mode === 'color' && 'bg-slate-100',
        fill.mode === 'photo' && 'bg-slate-900'
      )}
      style={fillStyle}
    >
      {toggle}
      {fill.mode === 'photo' && (
        <img
          src={fill.photoUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <img
        src={previewSrc}
        alt={showingCutout ? 'Photo with background removed' : 'Selected photo'}
        className="relative z-[1] max-h-[22rem] max-w-full object-contain sm:max-h-[28rem]"
      />
    </div>
  );
}

/** Upload / cutout shell; fill panel appears only after background removal. */
export function BackgroundRemoverWorkspace() {
  const edit = usePhotoEditSession({
    fixedPrompt: removerTool?.examplePrompt,
    toolSlug: 'remove-background',
    restoreDraftPrompt: false,
    creditCost: BACKGROUND_REMOVAL_CREDITS,
  });

  const [fill, setFill] = useState<CutoutFill>(TRANSPARENT_FILL);
  const [downloading, setDownloading] = useState(false);
  const fillRef = useRef(fill);
  fillRef.current = fill;

  // Reset fill when the source photo changes.
  useEffect(() => {
    const prev = fillRef.current;
    if (prev.mode === 'photo') revokePhotoUrl(prev.photoUrl);
    setFill(TRANSPARENT_FILL);
  }, [edit.preview]);

  useEffect(() => {
    return () => {
      const current = fillRef.current;
      if (current.mode === 'photo') revokePhotoUrl(current.photoUrl);
    };
  }, []);

  const previewSrc =
    edit.result && !edit.showOriginal ? edit.result : edit.preview;
  const showingCutout = Boolean(edit.result && !edit.showOriginal);
  const hasResult = Boolean(edit.result);

  async function handleDownload() {
    if (!edit.result) return;
    setDownloading(true);
    try {
      const blob = await compositeCutout(edit.result, fill);
      const name =
        fill.mode === 'transparent'
          ? 'background-removed.png'
          : 'background-filled.png';
      downloadBlob(blob, name);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Download failed. Try again.';
      if (fill.mode === 'transparent' && edit.jobId && edit.session?.user) {
        toast.error(message + ' Opening the server download instead.');
        window.open(
          `/api/photo-editor/edits/${edit.jobId}/download`,
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        toast.error(message);
      }
    } finally {
      setDownloading(false);
    }
  }

  function chooseSourceFile(file: File | undefined) {
    edit.chooseFile(file);
  }

  const originalCutoutToggle = edit.result ? (
    <div
      className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg bg-white/95 p-1 text-xs shadow-sm"
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
  ) : null;

  const actionRow = (
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
      {edit.result && (
        <Button
          type="button"
          variant="outline"
          disabled={downloading}
          onClick={handleDownload}
          className="h-11 shrink-0 gap-2 rounded-xl border-slate-200 px-5"
        >
          {downloading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {fill.mode === 'transparent' ? 'Download PNG' : 'Download'}
        </Button>
      )}
    </div>
  );

  const creditLine = (
    <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
      {!edit.session?.user
        ? '10 free trial credits · '
        : edit.creditBalance !== null
          ? String(edit.creditBalance) + ' credits available · '
          : ''}
      Model: Bria RMBG 2.0 · transparent PNG
    </p>
  );

  const loadingOverlay = edit.loading ? (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
      <LoaderCircle className="mb-3 size-8 animate-spin text-blue-600" />
      <p className="font-medium text-slate-900">Removing background…</p>
      <p className="mt-1 text-sm text-slate-500">
        You can leave this page. Check My Creations later.
      </p>
    </div>
  ) : null;

  const fileInput = (
    <input
      id="photo-file"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      onChange={(e) => {
        chooseSourceFile(e.target.files?.[0]);
        e.currentTarget.value = '';
      }}
    />
  );

  if (hasResult) {
    return (
      <>
        {fileInput}
        <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,.4)] sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                Preview
              </span>
              <button
                type="button"
                onClick={() => document.getElementById('photo-file')?.click()}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Replace photo
              </button>
            </div>
            <div className="relative">
              {previewSrc && (
                <CutoutPreview
                  previewSrc={previewSrc}
                  showingCutout={showingCutout}
                  fill={fill}
                  toggle={originalCutoutToggle}
                />
              )}
              {loadingOverlay}
            </div>
            <p className="mt-2 text-center text-xs font-medium text-slate-500">
              {showingCutout
                ? fill.mode === 'transparent'
                  ? 'Checkered areas are transparent · download matches preview'
                  : 'Download will bake in this background'
                : 'Showing the original photo'}
            </p>
            {actionRow}
            {creditLine}
          </div>
          <BackgroundFillPanel value={fill} onChange={setFill} />
        </div>
        <CreditGateDialog
          mode={edit.creditGate}
          onClose={() => edit.setCreditGate(null)}
        />
      </>
    );
  }

  return (
    <>
      {fileInput}
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
                chooseSourceFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-200 text-center transition-colors hover:border-blue-400',
                previewSrc
                  ? cn('mx-auto w-fit max-w-full border-solid', CHECKER_BG)
                  : 'flex min-h-[28rem] w-full flex-col items-center justify-center bg-white px-4 py-5 hover:bg-blue-50/50 sm:min-h-[34rem]'
              )}
            >
              {previewSrc ? (
                <div className="relative max-w-full">
                  <img
                    src={previewSrc}
                    alt="Selected photo"
                    className="block h-auto max-h-[24rem] w-auto max-w-full sm:max-h-[30rem]"
                  />
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
                    Preview appears here. After removal you can add a
                    background.
                  </p>
                </>
              )}
              {loadingOverlay}
            </div>
            {previewSrc && (
              <p className="mt-2 text-center text-xs font-medium text-slate-500">
                Click or drop to replace
              </p>
            )}
          </div>
          {actionRow}
          {creditLine}
        </div>
      </div>
      <CreditGateDialog
        mode={edit.creditGate}
        onClose={() => edit.setCreditGate(null)}
      />
    </>
  );
}
