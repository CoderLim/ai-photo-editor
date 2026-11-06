'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import { CreditGateDialog, type CreditGate } from '@/components/photo-editor/credit-gate-dialog';
import {
  DEFAULT_PHOTO_EDIT_QUALITY,
  isPhotoEditQuality,
  PHOTO_EDIT_MODEL_LABEL,
  PHOTO_EDIT_QUALITIES,
  type PhotoEditQuality,
  type ToolConfig,
} from '@/modules/photo-editor/config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Draft = { file: File; prompt: string; quality?: PhotoEditQuality };
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

function saveDraft(file: File, prompt: string, quality: PhotoEditQuality) {
  if (typeof indexedDB === 'undefined') return;
  const req = indexedDB.open('getaiphotoeditor-draft', 1);
  req.onupgradeneeded = () => {
    if (!req.result.objectStoreNames.contains('files'))
      req.result.createObjectStore('files');
  };
  req.onsuccess = () => {
    const tx = req.result.transaction('files', 'readwrite');
    tx.objectStore('files').put(
      { file, prompt, quality } satisfies Draft,
      'current'
    );
    tx.oncomplete = () => req.result.close();
    tx.onerror = () => req.result.close();
  };
}
function clearDraft() {
  if (typeof indexedDB === 'undefined') return;
  const req = indexedDB.open('getaiphotoeditor-draft', 1);
  req.onsuccess = () => {
    const tx = req.result.transaction('files', 'readwrite');
    tx.objectStore('files').delete('current');
    tx.oncomplete = () => req.result.close();
  };
}
async function dataOrThrow(response: Response) {
  const payload = await response.json();
  if (!response.ok || payload.code !== 0)
    throw new Error(payload.message || 'Request failed');
  return payload.data;
}
export function PhotoEditorWorkspace({ tool }: { tool?: ToolConfig }) {
  const { data: session } = useSession();
  const [creditGate, setCreditGate] = useState<CreditGate>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<string | null>(null);
  const requestId = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [prompt, setPrompt] = useState(tool?.examplePrompt || '');
  const [quality, setQuality] = useState<PhotoEditQuality>(
    DEFAULT_PHOTO_EDIT_QUALITY
  );
  const [upload, setUpload] = useState<{ url: string; token: string } | null>(
    null
  );
  const [sourceJobId, setSourceJobId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'pending' | 'success' | 'failed'
  >('idle');
  const [result, setResult] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [exampleId, setExampleId] = useState<ExampleId>('change-background');
  const [examplePaused, setExamplePaused] = useState(false);
  const qualityMenuRef = useRef<HTMLDivElement | null>(null);
  const showCreditGate = (mode: CreditGate) => {
    if (file) saveDraft(file, prompt, quality);
    setCreditGate(mode);
  };
  useEffect(() => {
    let canceled = false;
    fetch('/api/credits').then(dataOrThrow)
      .then((data) => { if (!canceled) setCreditBalance(data.balance); })
      .catch(() => undefined);
    return () => { canceled = true; };
  }, [session?.user?.id]);
  const example =
    QUICK_PROMPTS.find((item) => item.id === exampleId) ?? QUICK_PROMPTS[0];

  useEffect(() => {
    const request = indexedDB.open('getaiphotoeditor-draft', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('files'))
        request.result.createObjectStore('files');
    };
    request.onsuccess = () => {
      const tx = request.result.transaction('files', 'readonly');
      const value = tx.objectStore('files').get('current');
      value.onsuccess = () => {
        const draft = value.result as Draft | undefined;
        if (draft?.file instanceof File) {
          setFile(draft.file);
          const restoredUrl = URL.createObjectURL(draft.file);
          previewRef.current = restoredUrl;
          setPreview(restoredUrl);
          if (!tool) setPrompt(draft.prompt || '');
          if (isPhotoEditQuality(draft.quality)) setQuality(draft.quality);
        }
      };
      tx.oncomplete = () => request.result.close();
    };
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  useEffect(() => {
    for (const item of QUICK_PROMPTS) {
      const img = new Image();
      img.src = item.image;
    }
  }, []);

  useEffect(() => {
    if (preview || examplePaused) return;
    const timer = window.setInterval(() => {
      setExampleId((current) => {
        const index = QUICK_PROMPTS.findIndex((item) => item.id === current);
        return QUICK_PROMPTS[(index + 1) % QUICK_PROMPTS.length].id;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [preview, examplePaused, exampleId]);

  useEffect(() => {
    if (!qualityOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!qualityMenuRef.current?.contains(event.target as Node)) {
        setQualityOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQualityOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [qualityOpen]);

  useEffect(() => {
    // Open a previous generated image through My Creations.
    const id = new URLSearchParams(window.location.search).get('sourceJobId');
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return;
    fetch('/api/photo-editor/edits/' + id)
      .then(dataOrThrow)
      .then((job) => {
        if (!job.imageUrl) return;
        setSourceJobId(job.jobId);
        setPreview(job.imageUrl);
        setResult('');
        setFile(null);
        setUpload(null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status !== 'pending' || !jobId) return;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch('/api/photo-editor/edits/' + jobId);
        const job = await dataOrThrow(response);
        if (job.status === 'success' && job.imageUrl) {
          setResult(job.imageUrl);
          setStatus('success');
          setShowOriginal(false);
          clearDraft();
        } else if (job.status === 'failed' || job.status === 'canceled') {
          setStatus('failed');
          requestId.current = null;
          toast.error('Edit failed. Your credits have been restored.');
        }
      } catch {
        /* transient provider status failure: retry */
      } finally {
        busy = false;
      }
    };
    void tick();
    const timer = window.setInterval(tick, 3500);
    return () => window.clearInterval(timer);
  }, [status, jobId]);

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      toast.error('Please choose a JPG, PNG or WebP image.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error('Maximum image size is 10 MB.');
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(selected);
    previewRef.current = url;
    setFile(selected);
    setPreview(url);
    setUpload(null);
    setSourceJobId(null);
    setResult('');
    setJobId(null);
    setStatus('idle');
    requestId.current = null;
    saveDraft(selected, prompt, quality);
  };

  const submit = async () => {
    if (!preview) return toast.error('Upload a photo first.');
    if (!prompt.trim()) return toast.error('Describe your edit first.');
    setStatus('submitting');
    let guest = Boolean(session?.user?.isAnonymous);
    try {
      // No signup wall: create a guest session only for a real generation.
      if (!session?.user) {
        const anonymous = await authClient.signIn.anonymous();
        if (anonymous.error) {
          showCreditGate('signup');
          setStatus('idle');
          return;
        }
        guest = true;
      }
      if (guest) {
        // The anonymous session alone does not grant money. IP checks and
        // account-level idempotency happen in the server claim transaction.
        const response = await fetch('/api/guest/trial', { method: 'POST' });
        if (!response.ok) {
          showCreditGate('signup');
          setStatus('idle');
          return;
        }
        await dataOrThrow(response);
      }

      const credits = await dataOrThrow(await fetch('/api/credits'));
      const cost = PHOTO_EDIT_QUALITIES.find((item) => item.id === quality)!.credits;
      setCreditBalance(credits.balance);
      if (credits.balance < cost) {
        showCreditGate(guest ? 'signup' : 'purchase');
        setStatus('idle');
        return;
      }

      let imageUrl = upload?.url || preview;
      let uploadToken = upload?.token || '';
      if (file && !upload) {
        const data = new FormData();
        data.append('files', file);
        const stored = await dataOrThrow(
          await fetch('/api/storage/upload-image', { method: 'POST', body: data })
        );
        const first = stored.results?.[0];
        if (!first?.url || !first?.token)
          throw new Error('Image upload did not return authorization');
        imageUrl = first.url;
        uploadToken = first.token;
        setUpload({ url: imageUrl, token: uploadToken });
      }

      if (!requestId.current)
        requestId.current = crypto.randomUUID().replaceAll('-', '');
      const created = await dataOrThrow(
        await fetch('/api/photo-editor/edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl, uploadToken, sourceJobId, prompt,
            tool: tool?.slug || 'general', quality, requestId: requestId.current,
          }),
        })
      );
      setCreditBalance(Math.max(0, credits.balance - cost));
      setJobId(created.jobId);
      setStatus('pending');
    } catch (err: any) {
      setStatus('idle');
      const message = err?.message || 'Unable to start editing';
      if (message === 'GUEST_CREDITS_EXHAUSTED' || message === 'GUEST_TRIAL_RATE_LIMITED' ||
          message === 'GUEST_TRIAL_DISABLED') {
        showCreditGate('signup');
        return;
      }
      if (message === 'CREDITS_INSUFFICIENT' || /insufficient credits/i.test(message)) {
        showCreditGate(guest ? 'signup' : 'purchase');
        return;
      }
      toast.error(message);
    }
  };

  const editAgain = () => {
    if (!result || !jobId) return;
    setPreview(result);
    setResult('');
    setFile(null);
    setUpload(null);
    setSourceJobId(jobId);
    setJobId(null);
    setPrompt('');
    setStatus('idle');
    requestId.current = null;
  };

  const loading = status === 'submitting' || status === 'pending';
  const selectedQuality = PHOTO_EDIT_QUALITIES.find(
    (item) => item.id === quality
  )!;
  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,.4)] sm:p-5">
        <div className="mb-3.5">
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="photo-file"
              className="text-sm font-semibold text-slate-800"
            >
              Upload image
            </label>
            <span className="text-xs text-slate-400">
              JPG, PNG, WebP · 10 MB
            </span>
          </div>
          <input
            id="photo-file"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              chooseFile(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              chooseFile(e.dataTransfer.files?.[0]);
            }}
            className={
              'relative flex min-h-[6.75rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-4 py-3 text-center transition-colors ' +
              (dragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50')
            }
          >
            {preview && !result ? (
              <div className="flex w-full items-center gap-4 text-left">
                <img
                  src={preview}
                  alt="Selected photo"
                  className="size-24 rounded-lg object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {file?.name || 'Edited photo'}
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
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="photo-prompt"
              className="text-sm font-semibold text-slate-800"
            >
              Describe your edit
            </label>
            <span className="text-xs text-slate-400">{prompt.length}/2000</span>
          </div>
          <textarea
            id="photo-prompt"
            rows={3}
            value={prompt}
            maxLength={2000}
            onChange={(e) => {
              setPrompt(e.target.value);
              requestId.current = null;
            }}
            placeholder="What would you like to change? e.g. Remove the person in the background while keeping the main subject unchanged."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPrompt(item.text);
                  setExampleId(item.id);
                  requestId.current = null;
                  if (file) saveDraft(file, item.text, quality);
                }}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs leading-none font-medium whitespace-nowrap text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-3.5" ref={qualityMenuRef}>
          <label
            htmlFor="photo-edit-quality"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            Quality
          </label>
          <button
            id="photo-edit-quality"
            type="button"
            disabled={loading}
            aria-haspopup="listbox"
            aria-expanded={qualityOpen}
            onClick={() => setQualityOpen((open) => !open)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left transition-colors',
              qualityOpen
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50',
              loading && 'cursor-not-allowed opacity-70'
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">
                {selectedQuality.label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                {selectedQuality.description}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {selectedQuality.credits} credits
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-slate-400 transition-transform',
                qualityOpen && 'rotate-180'
              )}
            />
          </button>
          {qualityOpen && (
            <ul
              role="listbox"
              aria-labelledby="photo-edit-quality"
              className="absolute top-full left-0 z-50 mt-1.5 w-full space-y-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_-18px_rgba(15,23,42,.35)] ring-1 ring-slate-900/5"
            >
              {PHOTO_EDIT_QUALITIES.map((option) => {
                const selected = quality === option.id;
                return (
                  <li key={option.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setQuality(option.id);
                        requestId.current = null;
                        if (file) saveDraft(file, prompt, option.id);
                        setQualityOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                        selected
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
                              selected
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
                          selected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Button
          onClick={submit}
          disabled={loading}
          className="mt-3.5 h-11 w-full gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {status === 'submitting'
            ? 'Submitting edit...'
            : status === 'pending'
              ? 'Generating...'
              : 'Generate Edit'}
          {!loading && (
            <span
              className="rounded-md bg-white/15 px-2 py-1 text-xs"
              aria-live="polite"
            >
              {selectedQuality.credits} credits
            </span>
          )}
        </Button>
        <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
          {!session?.user
            ? '10 free trial credits · '
            : creditBalance !== null
              ? String(creditBalance) + ' credits available · '
              : ''}
          Model: {PHOTO_EDIT_MODEL_LABEL} · {selectedQuality.label} · original
          aspect ratio
        </p>
      </div>

      <div
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_50px_-24px_rgba(15,23,42,.55)]"
        onMouseEnter={() => {
          if (!preview) setExamplePaused(true);
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
          {!preview && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Example · {example.caption}
            </span>
          )}
          {result && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setShowOriginal(true)}
                className={
                  'rounded-md px-3 py-1.5 ' +
                  (showOriginal
                    ? 'bg-white font-semibold shadow-sm'
                    : 'text-slate-500')
                }
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setShowOriginal(false)}
                className={
                  'rounded-md px-3 py-1.5 ' +
                  (!showOriginal
                    ? 'bg-white font-semibold shadow-sm'
                    : 'text-slate-500')
                }
              >
                Edited
              </button>
            </div>
          )}
        </div>
        <div className="relative min-h-[280px] flex-1">
          {preview ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#f8fafc,#eef2f7)] p-5 sm:p-7">
              <img
                src={result && !showOriginal ? result : preview}
                alt={
                  result && !showOriginal ? 'AI edited photo' : 'Original photo'
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
          {loading && (
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
            {result
              ? 'Edit complete — review every detail.'
              : preview
                ? 'Ready to generate your first edit.'
                : 'Upload your photo to replace this example.'}
          </p>
          <div className="flex items-center gap-2">
            {!preview && (
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
            {result && (
              <>
                <Button
                  variant="outline"
                  onClick={editAgain}
                  className="rounded-lg"
                >
                  <RotateCcw className="size-4" />
                  Edit Again
                </Button>
                <a
                  href={result}
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
    <CreditGateDialog mode={creditGate} onClose={() => setCreditGate(null)} />
    </>
  );
}
