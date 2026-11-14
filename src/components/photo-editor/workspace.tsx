import { useEffect, useRef, useState } from 'react';
import {
  Download,
  LoaderCircle,
  Redo2,
  RotateCcw,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { downloadPhotoResult } from '@/lib/download';
import { cn } from '@/lib/utils';
import { AspectRatioSelector } from '@/components/photo-editor/aspect-ratio-selector';
import { CreditGateDialog } from '@/components/photo-editor/credit-gate-dialog';
import { ImageUploadField } from '@/components/photo-editor/image-upload-field';
import {
  MaskBrushCanvas,
  type MaskBrushHandle,
  type MaskBrushState,
} from '@/components/photo-editor/mask-brush-canvas';
import { PromptField } from '@/components/photo-editor/prompt-field';
import { QualitySelector } from '@/components/photo-editor/quality-selector';
import { ResolutionSelector } from '@/components/photo-editor/resolution-selector';
import { usePhotoEditSession } from '@/components/photo-editor/use-photo-edit-session';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type WorkspaceMode = 'edit' | 't2i';

const QUICK_PROMPTS = [
  {
    id: 'change-clothes',
    label: 'Change Clothes',
    caption: 'Outfit change',
    image: '/images/ai-photo-editor/change-clothes-outfits.jpg',
    alt: 'Before and after changing a white top into a rose satin dress',
    text: 'Change her outfit to a deep rose satin dress with a soft draped neckline. Keep her face, hair, pose, body shape, and pink background unchanged.',
  },
  {
    id: 'change-style',
    label: 'Change Style',
    caption: 'Style change',
    image: '/images/ai-photo-editor/restyle-photo.jpg',
    alt: 'Before and after restyling a portrait with cinematic sunset colors',
    text: 'Give this photo a cinematic look with refined lighting and colors. Preserve the main subject and composition.',
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
] as const;

type ExampleId = (typeof QUICK_PROMPTS)[number]['id'];

const BRUSH_MIN = 8;
const BRUSH_MAX = 80;
const BRUSH_DEFAULT = 28;
/**
 * Temporarily hide the precision-edit switch/toolbar; brush + API stay in place.
 *
 * GPT Image / Fal `mask_url` is guidance only: even with a painted mask the model
 * often regenerates areas outside the mask, so the UI is off until that behavior
 * is good enough to ship.
 */
const PRECISION_EDIT_UI_ENABLED = false;

/** Homepage general editor shell — prompt, chips, and example carousel. */
export function PhotoEditorWorkspace() {
  const brushRef = useRef<MaskBrushHandle | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>('edit');
  const [precision, setPrecision] = useState(false);
  const [brushSize, setBrushSize] = useState(BRUSH_DEFAULT);
  const [brushState, setBrushState] = useState<MaskBrushState>({
    canUndo: false,
    canRedo: false,
    hasMask: false,
  });
  const isT2i = mode === 't2i';
  const edit = usePhotoEditSession({
    toolSlug: 'general',
    requireImage: !isT2i,
    getMaskFile: async () => {
      if (isT2i || !PRECISION_EDIT_UI_ENABLED || !precision) return null;
      return (await brushRef.current?.exportMaskBlob()) ?? null;
    },
  });
  const [exampleId, setExampleId] = useState<ExampleId>('change-clothes');
  const [examplePaused, setExamplePaused] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const example =
    QUICK_PROMPTS.find((item) => item.id === exampleId) ?? QUICK_PROMPTS[0];

  // P1: only paint on the input image — never while a result is shown.
  const canPrecision =
    !isT2i &&
    PRECISION_EDIT_UI_ENABLED &&
    Boolean(edit.preview && !edit.result);

  function switchMode(next: WorkspaceMode) {
    if (next === mode) return;
    setMode(next);
    edit.resetMedia();
    setPrecision(false);
  }

  useEffect(() => {
    if (!canPrecision && precision) setPrecision(false);
  }, [canPrecision, precision]);

  // A new source (including Edit Again) always starts with a fresh mask.
  useEffect(() => {
    setPrecision(false);
  }, [edit.preview]);

  useEffect(() => {
    if (!precision) {
      brushRef.current?.clear();
      setBrushState({ canUndo: false, canRedo: false, hasMask: false });
    }
  }, [precision]);

  async function handleDownload() {
    if (!edit.result) return;
    setDownloading(true);
    try {
      await downloadPhotoResult({
        resultUrl: edit.result,
        jobId: edit.jobId,
        filename: isT2i ? 'generated-photo.png' : 'edited-photo.png',
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Download failed. Try again.'
      );
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    for (const item of QUICK_PROMPTS) {
      const img = new Image();
      img.src = item.image;
    }
  }, []);

  const showExamples = !edit.preview && !edit.result;

  useEffect(() => {
    if (!showExamples || examplePaused) return;
    const timer = window.setInterval(() => {
      setExampleId((current) => {
        const index = QUICK_PROMPTS.findIndex((item) => item.id === current);
        return QUICK_PROMPTS[(index + 1) % QUICK_PROMPTS.length].id;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [showExamples, examplePaused, exampleId]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-stretch">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,.4)] sm:p-5">
          <Tabs
            value={mode}
            onValueChange={(value) => {
              if (value === 'edit' || value === 't2i') switchMode(value);
            }}
            className="mb-3.5"
          >
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-slate-500 shadow-none">
              <TabsTrigger
                value="edit"
                className="rounded-lg text-xs font-semibold text-slate-500 shadow-none transition-colors hover:text-slate-800 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm sm:text-sm dark:text-slate-500 dark:hover:text-slate-800 dark:data-active:border-transparent dark:data-active:bg-white dark:data-active:text-slate-900"
              >
                Photo Editor
              </TabsTrigger>
              <TabsTrigger
                value="t2i"
                className="rounded-lg text-xs font-semibold text-slate-500 shadow-none transition-colors hover:text-slate-800 data-active:bg-white data-active:text-slate-900 data-active:shadow-sm sm:text-sm dark:text-slate-500 dark:hover:text-slate-800 dark:data-active:border-transparent dark:data-active:bg-white dark:data-active:text-slate-900"
              >
                Text to Image
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {!isT2i && (
            <ImageUploadField
              preview={edit.result ? undefined : edit.preview}
              fileName={edit.file?.name}
              showPreviewThumb={Boolean(edit.preview && !edit.result)}
              onFile={edit.chooseFile}
              onClear={edit.clearFile}
            />
          )}
          <PromptField
            className={isT2i ? undefined : 'mt-3.5'}
            id="photo-prompt"
            value={edit.prompt}
            onChange={edit.changePrompt}
            rows={isT2i ? 5 : 4}
            placeholder={
              isT2i
                ? "Describe what you want to create, such as 'A cinematic portrait of a red fox in snowy woods at golden hour'."
                : "Describe what you want to change in the image, such as 'Change the background to a blue sky'."
            }
            footer={
              !isT2i ? (
                <div className="mt-2 flex [scrollbar-width:none] flex-nowrap gap-1.5 overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        edit.changePrompt(item.text);
                        setExampleId(item.id);
                      }}
                      className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs leading-none font-medium whitespace-nowrap text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          />
          <AspectRatioSelector
            className="mt-3.5"
            value={edit.imageSize}
            disabled={edit.loading}
            onChange={edit.changeImageSize}
          />
          <ResolutionSelector
            className="mt-3.5"
            value={edit.resolution}
            disabled={edit.loading}
            onChange={edit.changeResolution}
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
              ? isT2i
                ? 'Submitting...'
                : 'Submitting edit...'
              : edit.status === 'pending'
                ? 'Generating...'
                : isT2i
                  ? 'Generate'
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
        </div>

        <div
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_50px_-24px_rgba(15,23,42,.55)]"
          onMouseEnter={() => {
            if (showExamples) setExamplePaused(true);
          }}
          onMouseLeave={() => setExamplePaused(false)}
        >
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-900">
                Workspace
              </span>
            </div>
            {showExamples && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Example · {example.caption}
              </span>
            )}
            {edit.result && !isT2i && (
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
            {canPrecision && !edit.loading && (
              <div className="flex h-8 items-center rounded-lg bg-slate-100 p-0.5 text-xs">
                <label className="flex h-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium text-slate-700">
                  Precision
                  <Switch
                    size="sm"
                    checked={precision}
                    onCheckedChange={(checked) => setPrecision(checked)}
                    aria-label="Precision edit"
                    className="data-checked:bg-slate-900 data-unchecked:bg-slate-300"
                  />
                </label>
                {precision && (
                  <>
                    <span
                      aria-hidden
                      className="mx-0.5 h-4 w-px shrink-0 bg-slate-200"
                    />
                    <label className="flex h-full items-center gap-2 px-2">
                      <span
                        aria-hidden
                        className="rounded-full border border-red-400/70 bg-red-400/40"
                        style={{
                          width:
                            6 +
                            ((brushSize - BRUSH_MIN) /
                              (BRUSH_MAX - BRUSH_MIN)) *
                              10,
                          height:
                            6 +
                            ((brushSize - BRUSH_MIN) /
                              (BRUSH_MAX - BRUSH_MIN)) *
                              10,
                        }}
                      />
                      <input
                        type="range"
                        min={BRUSH_MIN}
                        max={BRUSH_MAX}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        aria-label="Brush size"
                        className={cn(
                          'h-1 w-[72px] cursor-pointer appearance-none rounded-full bg-slate-200',
                          '[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none',
                          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-700',
                          '[&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:ring-0',
                          '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full',
                          '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-slate-700',
                          '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full',
                          '[&::-moz-range-track]:bg-slate-200'
                        )}
                      />
                    </label>
                    <span
                      aria-hidden
                      className="mx-0.5 h-4 w-px shrink-0 bg-slate-200"
                    />
                    <div className="flex h-full items-center">
                      <button
                        type="button"
                        disabled={!brushState.canUndo}
                        onClick={() => {
                          brushRef.current?.undo();
                          edit.invalidateRequest();
                        }}
                        aria-label="Undo brush stroke"
                        className="flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35"
                      >
                        <Undo2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!brushState.canRedo}
                        onClick={() => {
                          brushRef.current?.redo();
                          edit.invalidateRequest();
                        }}
                        aria-label="Redo brush stroke"
                        className="flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35"
                      >
                        <Redo2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!brushState.hasMask}
                        onClick={() => {
                          brushRef.current?.clear();
                          edit.invalidateRequest();
                        }}
                        className="flex h-7 items-center rounded-md px-2 font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35"
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative min-h-[min(70vh,560px)] flex-1 lg:min-h-[520px]">
            {edit.result ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#f8fafc,#eef2f7)] p-3 sm:p-4">
                <img
                  src={
                    !isT2i && edit.showOriginal && edit.preview
                      ? edit.preview
                      : edit.result
                  }
                  alt={
                    !isT2i && edit.showOriginal
                      ? 'Original photo'
                      : isT2i
                        ? 'AI generated photo'
                        : 'AI edited photo'
                  }
                  className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                />
              </div>
            ) : edit.preview ? (
              PRECISION_EDIT_UI_ENABLED ? (
                <MaskBrushCanvas
                  imageSrc={edit.preview}
                  enabled={precision && !edit.loading}
                  brushSize={brushSize}
                  handleRef={brushRef}
                  onStateChange={setBrushState}
                  onMaskChange={edit.invalidateRequest}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#f8fafc,#eef2f7)] p-3 sm:p-4">
                  <img
                    src={edit.preview}
                    alt="Original photo"
                    className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                  />
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#f8fafc,#eef2f7)] p-3 sm:p-4">
                <img
                  src={example.image}
                  alt={example.alt}
                  width={1774}
                  height={887}
                  data-example-id={example.id}
                  className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                />
                {!isT2i && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-between px-3 sm:px-4">
                    <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
                      Before
                    </span>
                    <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
                      After
                    </span>
                  </div>
                )}
              </div>
            )}
            {edit.loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
                <LoaderCircle className="mb-4 size-9 animate-spin text-blue-600" />
                <p className="font-medium text-slate-900">
                  {isT2i ? 'Generating your image' : 'Editing your photo'}
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
                ? isT2i
                  ? 'Generation complete — review every detail.'
                  : 'Edit complete — review every detail.'
                : edit.preview
                  ? precision
                    ? 'Paint the area to change, then generate.'
                    : 'Ready to generate your first edit.'
                  : isT2i
                    ? 'Write a prompt to generate an image.'
                    : 'Upload your photo to replace this example.'}
            </p>
            <div className="flex items-center gap-2">
              {showExamples && (
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
                    onClick={isT2i ? edit.clearResult : edit.editAgain}
                    className="rounded-lg border-slate-200 bg-white text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-200 dark:bg-white dark:text-slate-700 dark:hover:bg-slate-50 dark:hover:text-slate-900"
                  >
                    <RotateCcw className="size-4" />
                    {isT2i ? 'Generate Again' : 'Edit Again'}
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
