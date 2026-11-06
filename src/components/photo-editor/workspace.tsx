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
  WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
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
    label: 'Remove Object',
    text: 'Remove the unwanted object from the background. Reconstruct the area naturally and keep everything else unchanged.',
  },
  {
    label: 'Change Background',
    text: 'Replace the background with a clean professional studio backdrop while preserving the original subject and details.',
  },
  {
    label: 'Enhance Photo',
    text: 'Improve lighting, sharpness and colors naturally without changing the subject.',
  },
  {
    label: 'Change Style',
    text: 'Give this photo a cinematic look with refined lighting and colors. Preserve the main subject and composition.',
  },
];

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
  const qualityMenuRef = useRef<HTMLDivElement | null>(null);

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
    if (!session?.user) {
      if (file) saveDraft(file, prompt, quality);
      toast.message('Sign in to generate — new accounts get free credits.');
      window.setTimeout(() => {
        window.location.href =
          '/sign-in?callbackUrl=' +
          encodeURIComponent(
            window.location.pathname +
              window.location.search +
              window.location.hash
          );
      }, 600);
      return;
    }
    setStatus('submitting');
    try {
      let imageUrl = upload?.url || preview;
      let uploadToken = upload?.token || '';
      if (file && !upload) {
        const data = new FormData();
        data.append('files', file);
        const stored = await dataOrThrow(
          await fetch('/api/storage/upload-image', {
            method: 'POST',
            body: data,
          })
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
            imageUrl,
            uploadToken,
            sourceJobId,
            prompt,
            tool: tool?.slug || 'general',
            quality,
            requestId: requestId.current,
          }),
        })
      );
      setJobId(created.jobId);
      setStatus('pending');
    } catch (err: any) {
      setStatus('idle');
      const message = err?.message || 'Unable to start editing';
      if (/insufficient credits/i.test(message)) {
        toast.error('Not enough credits to generate an edit.', {
          action: {
            label: 'Get credits',
            onClick: () => {
              window.location.href = '/pricing';
            },
          },
        });
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-stretch">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_45px_-32px_rgba(15,23,42,.28)] sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <WandSparkles className="size-5 text-blue-600" />
            <h2 className="font-semibold tracking-tight text-slate-900">
              AI Photo Editor
            </h2>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Image editing
          </span>
        </div>
        <div className="mb-5">
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
              'relative flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors ' +
              (dragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40')
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
                  Your photo stays in your browser until you sign in and
                  generate.
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
            rows={4}
            value={prompt}
            maxLength={2000}
            onChange={(e) => {
              setPrompt(e.target.value);
              requestId.current = null;
            }}
            placeholder="What would you like to change? e.g. Remove the person in the background while keeping the main subject unchanged."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setPrompt(item.text);
                  requestId.current = null;
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-5" ref={qualityMenuRef}>
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
              className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_-18px_rgba(15,23,42,.35)] ring-1 ring-slate-900/5"
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
          className="mt-6 h-12 w-full gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
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
        <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
          Model: {PHOTO_EDIT_MODEL_LABEL} · {selectedQuality.label} · original
          aspect ratio
        </p>
      </div>

      <div className="flex min-h-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_45px_-32px_rgba(15,23,42,.28)]">
        <div className="flex min-h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-slate-900">
              Workspace
            </span>
          </div>
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
        <div className="relative flex min-h-[355px] flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,#f8fafc,#eef2f7)] p-6 sm:p-9">
          {preview ? (
            <img
              src={result && !showOriginal ? result : preview}
              alt={
                result && !showOriginal ? 'AI edited photo' : 'Original photo'
              }
              className="max-h-[460px] max-w-full rounded-lg object-contain shadow-lg"
            />
          ) : (
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-5 flex size-24 items-center justify-center rounded-3xl border border-white bg-white/80 shadow-xl shadow-slate-200">
                <ImagePlus
                  className="size-10 text-blue-400"
                  strokeWidth={1.3}
                />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">
                Your image, reimagined
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Upload your photo to see it here. Every edit happens in this
                workspace, with an easy before-and-after comparison.
              </p>
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
        <div className="flex min-h-18 items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">
            {result
              ? 'Edit complete — review every detail.'
              : preview
                ? 'Ready to generate your first edit.'
                : 'Upload a photo to get started.'}
          </p>
          <div className="flex items-center gap-2">
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
  );
}
