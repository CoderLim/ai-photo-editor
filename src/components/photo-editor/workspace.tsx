import { useEffect, useState } from 'react';
import { Download, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';

import { PHOTO_EDIT_MODEL_LABEL } from '@/modules/photo-editor/config';
import { cn } from '@/lib/utils';
import { CreditGateDialog } from '@/components/photo-editor/credit-gate-dialog';
import { ImageUploadField } from '@/components/photo-editor/image-upload-field';
import { QualitySelector } from '@/components/photo-editor/quality-selector';
import { usePhotoEditSession } from '@/components/photo-editor/use-photo-edit-session';
import { Button } from '@/components/ui/button';

const QUICK_PROMPTS = [
  {
    id: 'change-background',
    label: 'Change Background',
    caption: 'Background change',
    image: '/images/ai-photo-editor/remove-background.jpg',
    alt: 'Before and after placing a portrait on a beach background',
    text: 'Replace the background with a clean professional studio backdrop while preserving the original subject and details.',
  },
  {
    id: 'remove-object',
    label: 'Remove Object',
    caption: 'Object removal',
    image: '/images/ai-photo-editor/remove-object.jpg',
    alt: 'Before and after removing a trash bin from a beach photo',
    text: 'Remove the unwanted object from the background. Reconstruct the area naturally and keep everything else unchanged.',
  },
  {
    id: 'enhance-photo',
    label: 'Enhance Photo',
    caption: 'Clarity and color',
    image: '/images/ai-photo-editor/enhance-photo.jpg',
    alt: 'Before and after sharpening a soft mountain lake into a clear landscape',
    text: 'Improve lighting, sharpness and colors naturally without changing the subject.',
  },
  {
    id: 'change-style',
    label: 'Change Style',
    caption: 'Style change',
    image: '/images/ai-photo-editor/restyle-photo.jpg',
    alt: 'Before and after restyling a portrait with cinematic sunset colors',
    text: 'Give this photo a cinematic look with refined lighting and colors. Preserve the main subject and composition.',
  },
] as const;

type ExampleId = (typeof QUICK_PROMPTS)[number]['id'];

/** Homepage general editor shell — prompt, chips, and example carousel. */
export function PhotoEditorWorkspace() {
  const edit = usePhotoEditSession({ toolSlug: 'general' });
  const [exampleId, setExampleId] = useState<ExampleId>('change-background');
  const [examplePaused, setExamplePaused] = useState(false);
  const example =
    QUICK_PROMPTS.find((item) => item.id === exampleId) ?? QUICK_PROMPTS[0];

  useEffect(() => {
    for (const item of QUICK_PROMPTS) {
      const img = new Image();
      img.src = item.image;
    }
  }, []);

  useEffect(() => {
    if (edit.preview || examplePaused) return;
    const timer = window.setInterval(() => {
      setExampleId((current) => {
        const index = QUICK_PROMPTS.findIndex((item) => item.id === current);
        return QUICK_PROMPTS[(index + 1) % QUICK_PROMPTS.length].id;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [edit.preview, examplePaused, exampleId]);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-stretch">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,.4)] sm:p-5">
          <ImageUploadField
            preview={edit.result ? undefined : edit.preview}
            fileName={edit.file?.name}
            showPreviewThumb={Boolean(edit.preview && !edit.result)}
            onFile={edit.chooseFile}
          />
          <div className="mt-3.5">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="photo-prompt"
                className="text-sm font-semibold text-slate-800"
              >
                Describe your edit
              </label>
              <span className="text-xs text-slate-400">
                {edit.prompt.length}/2000
              </span>
            </div>
            <textarea
              id="photo-prompt"
              rows={3}
              value={edit.prompt}
              maxLength={2000}
              onChange={(e) => edit.changePrompt(e.target.value)}
              placeholder="What would you like to change? e.g. Remove the person in the background while keeping the main subject unchanged."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    edit.changePrompt(item.text);
                    setExampleId(item.id);
                  }}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs leading-none font-medium whitespace-nowrap text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
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
          <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
            {!edit.session?.user
              ? '10 free trial credits · '
              : edit.creditBalance !== null
                ? String(edit.creditBalance) + ' credits available · '
                : ''}
            Model: {PHOTO_EDIT_MODEL_LABEL} · {edit.selectedQuality.label} ·
            original aspect ratio
          </p>
        </div>

        <div
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_50px_-24px_rgba(15,23,42,.55)]"
          onMouseEnter={() => {
            if (!edit.preview) setExamplePaused(true);
          }}
          onMouseLeave={() => setExamplePaused(false)}
        >
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-900">
                Workspace
              </span>
            </div>
            {!edit.preview && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Example · {example.caption}
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
                      ? 'AI edited photo'
                      : 'Original photo'
                  }
                  className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                />
              </div>
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-slate-950">
                <img
                  src={example.image}
                  alt={example.alt}
                  width={1672}
                  height={941}
                  data-example-id={example.id}
                  className="size-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-between px-3">
                  <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
                    Before
                  </span>
                  <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
                    After
                  </span>
                </div>
              </div>
            )}
            {edit.loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
                <LoaderCircle className="mb-4 size-9 animate-spin text-blue-600" />
                <p className="font-medium text-slate-900">Editing your photo</p>
                <p className="mt-1 text-sm text-slate-500">
                  You can leave this page. Check My Creations later.
                </p>
              </div>
            )}
          </div>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-4">
            <p className="text-xs text-slate-500">
              {edit.result
                ? 'Edit complete — review every detail.'
                : edit.preview
                  ? 'Ready to generate your first edit.'
                  : 'Upload your photo to replace this example.'}
            </p>
            <div className="flex items-center gap-2">
              {!edit.preview && (
                <div
                  className="flex items-center gap-1.5"
                  role="tablist"
                  aria-label="Example edits"
                >
                  {QUICK_PROMPTS.map((item) => {
                    const current = item.id === example.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={current}
                        aria-label={item.caption}
                        data-example-dot={item.id}
                        onClick={() => setExampleId(item.id)}
                        className="group flex size-4 items-center justify-center"
                      >
                        <span
                          className={cn(
                            'pointer-events-none rounded-full',
                            current
                              ? 'h-1.5 w-4 bg-blue-600'
                              : 'size-1.5 bg-slate-300 group-hover:bg-slate-400'
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
              {edit.result && (
                <>
                  <Button
                    variant="outline"
                    onClick={edit.editAgain}
                    className="rounded-lg"
                  >
                    <RotateCcw className="size-4" />
                    Edit Again
                  </Button>
                  <a
                    href={edit.result}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Download className="size-4" />
                    Download
                  </a>
                </>
              )}
            </div>
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
