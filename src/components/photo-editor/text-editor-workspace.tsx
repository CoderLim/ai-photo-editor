import { useState } from 'react';
import { Download, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  PHOTO_EDIT_MODEL_LABEL,
  TEXT_EDIT_USER_PROMPT_MAX,
} from '@/modules/photo-editor/config';
import { downloadPhotoResult } from '@/lib/download';
import { AspectRatioSelector } from '@/components/photo-editor/aspect-ratio-selector';
import { CreditGateDialog } from '@/components/photo-editor/credit-gate-dialog';
import { ImageUploadField } from '@/components/photo-editor/image-upload-field';
import { QualitySelector } from '@/components/photo-editor/quality-selector';
import { ResolutionSelector } from '@/components/photo-editor/resolution-selector';
import { usePhotoEditSession } from '@/components/photo-editor/use-photo-edit-session';
import { Button } from '@/components/ui/button';

const TEXT_EDIT_EXAMPLE = {
  image: '/images/ai-photo-editor/photo-text-editor/workspace-demo.webp',
  alt: 'Before and after cinnamon roll bakery poster text edit',
  caption: 'Poster lettering',
} as const;

/** Dedicated photo-text-editor shell — short user instruction, no homepage chips. */
export function TextEditorWorkspace() {
  const edit = usePhotoEditSession({
    toolSlug: 'edit-text',
  });
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!edit.result) return;
    setDownloading(true);
    try {
      await downloadPhotoResult({
        resultUrl: edit.result,
        jobId: edit.jobId,
        filename: 'photo-text-edit.png',
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Download failed. Try again.'
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,0.68fr)_minmax(0,1.32fr)] lg:items-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,.4)] sm:p-4 lg:sticky lg:top-20">
          <ImageUploadField
            preview={edit.result ? undefined : edit.preview}
            fileName={edit.file?.name}
            showPreviewThumb={Boolean(edit.preview && !edit.result)}
            onFile={edit.chooseFile}
            onClear={edit.clearFile}
          />
          <div className="mt-3.5">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="photo-text-prompt"
                className="text-sm font-semibold text-slate-800"
              >
                Describe the text change
              </label>
              <span className="text-xs text-slate-400">
                {edit.prompt.length}/{TEXT_EDIT_USER_PROMPT_MAX}
              </span>
            </div>
            <textarea
              id="photo-text-prompt"
              rows={3}
              value={edit.prompt}
              maxLength={TEXT_EDIT_USER_PROMPT_MAX}
              onChange={(e) => edit.changePrompt(e.target.value)}
              placeholder='e.g. Replace "Blueberry Muffin" with "Cinnamon Roll".'
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <ResolutionSelector
            className="mt-3.5"
            value={edit.resolution}
            disabled={edit.loading}
            onChange={edit.changeResolution}
          />
          <AspectRatioSelector
            className="mt-3.5"
            value={edit.imageSize}
            disabled={edit.loading}
            onChange={edit.changeImageSize}
          />
          <QualitySelector
            className="mt-3.5"
            value={edit.quality}
            disabled={edit.loading}
            onChange={edit.changeQuality}
          />
          <Button
            onClick={edit.submit}
            disabled={edit.loading}
            className="mt-3.5 h-11 w-full gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
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
                : 'Generate Edit'}
            {!edit.loading && (
              <span
                className="rounded-md bg-white/15 px-2 py-1 text-xs"
                aria-live="polite"
              >
                {edit.selectedQuality.credits} credits
              </span>
            )}
          </Button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
            {!edit.session?.user
              ? '10 free trial credits · '
              : edit.creditBalance !== null
                ? String(edit.creditBalance) + ' credits available · '
                : ''}
            {PHOTO_EDIT_MODEL_LABEL} · {edit.selectedQuality.label}
          </p>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_50px_-24px_rgba(15,23,42,.55)]">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-900">
                Workspace
              </span>
            </div>
            {!edit.preview && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Example · {TEXT_EDIT_EXAMPLE.caption}
              </span>
            )}
            {edit.result && (
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => edit.setShowOriginal(true)}
                  className={
                    'rounded-md px-3 py-1.5 ' +
                    (edit.showOriginal
                      ? 'bg-white font-semibold shadow-sm'
                      : 'text-slate-500')
                  }
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => edit.setShowOriginal(false)}
                  className={
                    'rounded-md px-3 py-1.5 ' +
                    (!edit.showOriginal
                      ? 'bg-white font-semibold shadow-sm'
                      : 'text-slate-500')
                  }
                >
                  Edited
                </button>
              </div>
            )}
          </div>
          <div className="relative min-h-[min(70vh,560px)] flex-1 lg:min-h-[520px]">
            {edit.preview ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#f8fafc,#eef2f7)] p-3 sm:p-4">
                <img
                  src={
                    edit.result && !edit.showOriginal
                      ? edit.result
                      : edit.preview
                  }
                  alt={
                    edit.result && !edit.showOriginal
                      ? 'AI text edit result'
                      : 'Original photo with text'
                  }
                  className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                />
              </div>
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-slate-950">
                <img
                  src={TEXT_EDIT_EXAMPLE.image}
                  alt={TEXT_EDIT_EXAMPLE.alt}
                  width={1586}
                  height={992}
                  className="size-full object-cover object-center"
                />
              </div>
            )}
            {edit.loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
                <LoaderCircle className="mb-4 size-9 animate-spin text-blue-600" />
                <p className="font-medium text-slate-900">
                  Redrawing the lettering
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  You can leave this page. Check My Creations later.
                </p>
              </div>
            )}
          </div>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-4">
            <p className="text-xs text-slate-500">
              {edit.result
                ? 'Edit complete — zoom in on the lettering before you download.'
                : edit.preview
                  ? 'Ready to rewrite the text in your photo.'
                  : 'Upload a photo with text to replace this example.'}
            </p>
            {edit.result && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={edit.editAgain}
                  className="rounded-lg"
                >
                  <RotateCcw className="size-4" />
                  Edit Again
                </Button>
                <Button
                  disabled={downloading}
                  onClick={handleDownload}
                  className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  {downloading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Download
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <CreditGateDialog
        mode={edit.creditGate}
        onClose={() => edit.setCreditGate(null)}
      />
    </>
  );
}
