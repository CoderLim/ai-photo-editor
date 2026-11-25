import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import {
  DEFAULT_PHOTO_EDIT_QUALITY,
  DEFAULT_PHOTO_IMAGE_SIZE,
  DEFAULT_PHOTO_RESOLUTION,
  isPhotoEditQuality,
  MAX_PHOTO_INPUT_IMAGES,
  PHOTO_EDIT_QUALITIES,
  photoEditCharge,
  type PhotoEditQuality,
  type PhotoImageSize,
  type PhotoResolution,
} from '@/modules/photo-editor/config';
import { track } from '@/lib/track';
import type { CreditGate } from '@/components/photo-editor/credit-gate-dialog';

export type SessionImage = {
  id: string;
  preview: string;
  fileName?: string;
  file?: File;
  upload?: { url: string; token: string };
};

type Draft = {
  files: File[];
  /** Legacy single-file drafts from older clients. */
  file?: File;
  prompt: string;
  quality?: PhotoEditQuality;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

/** Decode the result URL before we flip the UI off "loading" / onto Edited. */
function preloadImage(url: string, timeoutMs = 20_000): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
    window.setTimeout(finish, timeoutMs);
  });
}

function newImageId() {
  return crypto.randomUUID().replaceAll('-', '');
}

function revokeBlob(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}

type UsePhotoEditSessionOptions = {
  /** Built-in prompt when the surface does not expose a textarea. */
  fixedPrompt?: string;
  /** Tool slug sent with the edit request. */
  toolSlug?: string;
  /** When false, restored drafts keep the fixed/built-in prompt. */
  restoreDraftPrompt?: boolean;
  /** Override the quality-table credit charge (e.g. background removal). */
  creditCost?: number;
  /**
   * When true (default), submit requires a source image. Homepage text-to-image
   * sets this false and POSTs without imageUrl.
   */
  requireImage?: boolean;
  /** Cap on source photos (default 1 for dedicated tools). */
  maxImages?: number;
  /**
   * Optional precision-edit mask (PNG). Return null when empty.
   * Uploaded with the source in one FormData when both are new.
   */
  getMaskFile?: () => Promise<Blob | null>;
};

function saveDraft(files: File[], prompt: string, quality: PhotoEditQuality) {
  if (typeof indexedDB === 'undefined' || !files.length) return;
  const req = indexedDB.open('getaiphotoeditor-draft', 1);
  req.onupgradeneeded = () => {
    if (!req.result.objectStoreNames.contains('files'))
      req.result.createObjectStore('files');
  };
  req.onsuccess = () => {
    const tx = req.result.transaction('files', 'readwrite');
    tx.objectStore('files').put(
      { files, prompt, quality } satisfies Draft,
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

function draftFiles(draft: Draft | undefined): File[] {
  if (!draft) return [];
  if (Array.isArray(draft.files) && draft.files.every((f) => f instanceof File))
    return draft.files;
  if (draft.file instanceof File) return [draft.file];
  return [];
}

const PROMPT_SAFETY_TOAST: Record<string, string> = {
  PROMPT_BLOCKED: 'This prompt doesn’t meet our content guidelines.',
  PROMPT_REVIEW: 'This prompt needs a quick review. Please try again later.',
};

async function dataOrThrow(response: Response) {
  const payload = await response.json();
  if (!response.ok || payload.code !== 0)
    throw new Error(payload.message || 'Request failed');
  return payload.data;
}

/** Shared generate / poll / credit-gate session for homepage and tool pages. */
export function usePhotoEditSession({
  fixedPrompt,
  toolSlug = 'general',
  restoreDraftPrompt = true,
  creditCost,
  requireImage = true,
  maxImages = 1,
  getMaskFile,
}: UsePhotoEditSessionOptions = {}) {
  const imageCap = Math.min(Math.max(1, maxImages), MAX_PHOTO_INPUT_IMAGES);
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [creditGate, setCreditGate] = useState<CreditGate>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const imagesRef = useRef<SessionImage[]>([]);
  const requestId = useRef<string | null>(null);
  const [images, setImages] = useState<SessionImage[]>([]);
  const [prompt, setPrompt] = useState(fixedPrompt || '');
  const [quality, setQuality] = useState<PhotoEditQuality>(
    DEFAULT_PHOTO_EDIT_QUALITY
  );
  const [imageSize, setImageSize] = useState<PhotoImageSize>(
    DEFAULT_PHOTO_IMAGE_SIZE
  );
  const [resolution, setResolution] = useState<PhotoResolution>(
    DEFAULT_PHOTO_RESOLUTION
  );
  const [sourceJobId, setSourceJobId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'pending' | 'success' | 'failed'
  >('idle');
  const [result, setResult] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  /** Shown above the generate button (and as a toast) on submit / poll failure. */
  const [error, setError] = useState<string | null>(null);

  const reportError = (message: string) => {
    // Fal may store the same detail once per image; collapse before display.
    const cleaned = [
      ...new Set(
        message
          .split(/\s*;\s*/)
          .map((part) => part.trim())
          .filter(Boolean)
      ),
    ].join('; ');
    setError(cleaned);
    toast.error(cleaned);
  };

  const preview = images[0]?.preview || '';
  const file = images[0]?.file || null;

  const replaceImages = (next: SessionImage[]) => {
    imagesRef.current = next;
    setImages(next);
  };

  const refreshHeaderCredits = (balance: number) => {
    setCreditBalance(balance);
    queryClient.setQueryData(
      ['user-credits', 'balance'],
      (prev: { balance: number } | undefined) => ({
        ...(prev ?? {}),
        balance,
      })
    );
  };

  const showCreditGate = (mode: CreditGate) => {
    const draftable = imagesRef.current
      .map((item) => item.file)
      .filter((f): f is File => Boolean(f));
    if (draftable.length) saveDraft(draftable, prompt, quality);
    setCreditGate(mode);
  };

  useEffect(() => {
    let canceled = false;
    fetch('/api/credits')
      .then(dataOrThrow)
      .then((data) => {
        if (!canceled) setCreditBalance(data.balance);
      })
      .catch(() => undefined);
    return () => {
      canceled = true;
    };
  }, [session?.user?.id]);

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
        const restored = draftFiles(value.result as Draft | undefined).slice(
          0,
          imageCap
        );
        if (!restored.length) return;
        const next = restored.map((item) => ({
          id: newImageId(),
          preview: URL.createObjectURL(item),
          fileName: item.name,
          file: item,
        }));
        replaceImages(next);
        if (restoreDraftPrompt) setPrompt((value.result as Draft).prompt || '');
        if (isPhotoEditQuality((value.result as Draft).quality))
          setQuality((value.result as Draft).quality!);
      };
      tx.oncomplete = () => request.result.close();
    };
    return () => {
      for (const item of imagesRef.current) revokeBlob(item.preview);
    };
    // Restore once on mount; imageCap is fixed per workspace mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreDraftPrompt]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('sourceJobId');
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return;
    fetch('/api/photo-editor/edits/' + id)
      .then(dataOrThrow)
      .then((job) => {
        if (!job.imageUrl) return;
        for (const item of imagesRef.current) revokeBlob(item.preview);
        setSourceJobId(job.jobId);
        replaceImages([
          {
            id: newImageId(),
            preview: job.imageUrl,
            fileName: 'Previous edit',
          },
        ]);
        setResult('');
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
        const jobStatus = String(job.status || '').toLowerCase();
        if (jobStatus === 'success' && job.imageUrl) {
          // Keep the loading overlay until the bytes are in cache, otherwise
          // Edited briefly still shows the original and looks like a no-op.
          await preloadImage(job.imageUrl);
          setResult(job.imageUrl);
          setStatus('success');
          setShowOriginal(false);
          setError(null);
          clearDraft();
        } else if (
          jobStatus === 'failed' ||
          jobStatus === 'canceled' ||
          jobStatus === 'cancelled'
        ) {
          setStatus('failed');
          requestId.current = null;
          const detail = typeof job.error === 'string' ? job.error.trim() : '';
          reportError(
            detail
              ? /credits were restored/i.test(detail)
                ? detail
                : `${detail} Credits were restored.`
              : 'Generation failed. Your credits have been restored.'
          );
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

  const persistDraftFrom = (
    next: SessionImage[],
    nextPrompt = fixedPrompt || prompt,
    nextQuality = quality
  ) => {
    const files = next
      .map((item) => item.file)
      .filter((f): f is File => Boolean(f));
    if (files.length) saveDraft(files, nextPrompt, nextQuality);
    else clearDraft();
  };

  const addFiles = (selected: File[]) => {
    if (!selected.length) return;
    const accepted: File[] = [];
    for (const item of selected) {
      if (!ACCEPTED_TYPES.includes(item.type)) {
        toast.error('Please choose a JPG, PNG or WebP image.');
        continue;
      }
      if (item.size > MAX_BYTES) {
        toast.error('Maximum image size is 10 MB.');
        continue;
      }
      accepted.push(item);
    }
    if (!accepted.length) return;

    const room = imageCap - imagesRef.current.length;
    if (room <= 0) {
      toast.error(`You can upload up to ${imageCap} images.`);
      return;
    }
    const toAdd = accepted.slice(0, room);
    if (accepted.length > room) {
      toast.error(
        `Only ${room} more image${room === 1 ? '' : 's'} can be added.`
      );
    }

    const added = toAdd.map((item) => ({
      id: newImageId(),
      preview: URL.createObjectURL(item),
      fileName: item.name,
      file: item,
    }));
    const next = [...imagesRef.current, ...added];
    replaceImages(next);
    setSourceJobId(null);
    setResult('');
    setJobId(null);
    setStatus('idle');
    requestId.current = null;
    persistDraftFrom(next);
  };

  /** Single-file helper used by older call sites / drop handlers. */
  const chooseFile = (selected?: File) => {
    if (!selected) return;
    if (imageCap === 1) {
      for (const item of imagesRef.current) revokeBlob(item.preview);
      const next = [
        {
          id: newImageId(),
          preview: URL.createObjectURL(selected),
          fileName: selected.name,
          file: selected,
        },
      ];
      if (!ACCEPTED_TYPES.includes(selected.type)) {
        toast.error('Please choose a JPG, PNG or WebP image.');
        revokeBlob(next[0].preview);
        return;
      }
      if (selected.size > MAX_BYTES) {
        toast.error('Maximum image size is 10 MB.');
        revokeBlob(next[0].preview);
        return;
      }
      replaceImages(next);
      setSourceJobId(null);
      setResult('');
      setJobId(null);
      setStatus('idle');
      requestId.current = null;
      persistDraftFrom(next);
      return;
    }
    addFiles([selected]);
  };

  const removeImage = (id: string) => {
    const target = imagesRef.current.find((item) => item.id === id);
    if (!target) return;
    revokeBlob(target.preview);
    const next = imagesRef.current.filter((item) => item.id !== id);
    replaceImages(next);
    if (!next.length) {
      setSourceJobId(null);
      setShowOriginal(false);
    }
    setResult('');
    setJobId(null);
    setStatus('idle');
    requestId.current = null;
    persistDraftFrom(next);
  };

  const clearFile = () => {
    for (const item of imagesRef.current) revokeBlob(item.preview);
    replaceImages([]);
    setSourceJobId(null);
    setResult('');
    setJobId(null);
    setShowOriginal(false);
    setStatus('idle');
    requestId.current = null;
    clearDraft();
  };

  /** Clear media + job when switching homepage Photo Editor / Text to Image tabs. */
  const resetMedia = () => {
    clearFile();
  };

  /** Drop a finished result so the user can generate again (text-to-image). */
  const clearResult = () => {
    setResult('');
    setJobId(null);
    setShowOriginal(false);
    setStatus('idle');
    requestId.current = null;
  };

  const changeQuality = (next: PhotoEditQuality) => {
    setQuality(next);
    requestId.current = null;
    persistDraftFrom(imagesRef.current, fixedPrompt || prompt, next);
  };

  const changeImageSize = (next: PhotoImageSize) => {
    setImageSize(next);
    requestId.current = null;
  };

  const changeResolution = (next: PhotoResolution) => {
    setResolution(next);
    requestId.current = null;
  };

  const changePrompt = (next: string) => {
    setPrompt(next);
    requestId.current = null;
    persistDraftFrom(imagesRef.current, next, quality);
  };

  /** Call when the precision mask changes so idempotent edit ids stay fresh. */
  const invalidateRequest = () => {
    requestId.current = null;
  };

  const submit = async () => {
    if (requireImage && !imagesRef.current.length)
      return reportError('Upload a photo first.');
    const editPrompt = (fixedPrompt || prompt).trim();
    if (!editPrompt) {
      return reportError(
        requireImage
          ? 'Describe your edit first.'
          : 'Describe what to generate first.'
      );
    }
    setError(null);
    setStatus('submitting');
    let guest = Boolean(session?.user?.isAnonymous);
    // Names the failing fetch when submit throws before an ai_task exists.
    let step: 'anonymous' | 'trial' | 'credits' | 'upload' | 'edits' =
      'anonymous';
    try {
      // Snapshot before any async auth / credit checks. Loading must not
      // clear the canvas while we are preparing a precision edit.
      const maskBlob = requireImage && getMaskFile ? await getMaskFile() : null;
      if (!session?.user) {
        step = 'anonymous';
        const anonymous = await authClient.signIn.anonymous();
        if (anonymous.error) {
          showCreditGate('signup');
          setStatus('idle');
          return;
        }
        guest = true;
      }
      if (guest) {
        step = 'trial';
        const response = await fetch('/api/guest/trial', { method: 'POST' });
        if (!response.ok) {
          showCreditGate('signup');
          setStatus('idle');
          return;
        }
        await dataOrThrow(response);
      }

      step = 'credits';
      const credits = await dataOrThrow(await fetch('/api/credits'));
      const cost = creditCost ?? photoEditCharge(quality, resolution).credits;
      refreshHeaderCredits(credits.balance);
      if (credits.balance < cost) {
        showCreditGate(guest ? 'signup' : 'purchase');
        setStatus('idle');
        return;
      }

      let imageUrls: string[] = [];
      let uploadTokens: string[] = [];
      let maskUrl = '';
      let maskUploadToken = '';
      const current = imagesRef.current;

      if (requireImage) {
        const maskFile = maskBlob
          ? new File([maskBlob], 'precision-mask.png', { type: 'image/png' })
          : null;
        const pendingIndexes = current
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.file && !item.upload);

        step = 'upload';
        if (pendingIndexes.length || maskFile) {
          const data = new FormData();
          for (const { item } of pendingIndexes)
            data.append('files', item.file!);
          if (maskFile) data.append('files', maskFile);
          const stored = await dataOrThrow(
            await fetch('/api/storage/upload-image', {
              method: 'POST',
              body: data,
            })
          );
          const results = stored.results || [];
          if (results.length < pendingIndexes.length + (maskFile ? 1 : 0))
            throw new Error('Image upload did not return authorization');

          const next = current.map((item) => ({ ...item }));
          pendingIndexes.forEach(({ index }, resultIndex) => {
            const uploaded = results[resultIndex];
            if (!uploaded?.url || !uploaded?.token)
              throw new Error('Image upload did not return authorization');
            next[index] = {
              ...next[index],
              upload: { url: uploaded.url, token: uploaded.token },
              // Keep blob preview for the canvas; upload URL is for the API.
            };
          });
          if (maskFile) {
            const mask = results[pendingIndexes.length];
            if (!mask?.url || !mask?.token)
              throw new Error('Mask upload did not return authorization');
            maskUrl = mask.url;
            maskUploadToken = mask.token;
          }
          replaceImages(next);
          imageUrls = next.map((item) => item.upload?.url || item.preview);
          uploadTokens = next.map((item) => item.upload?.token || '');
        } else {
          imageUrls = current.map((item) => item.upload?.url || item.preview);
          uploadTokens = current.map((item) => item.upload?.token || '');
        }
      }

      if (!requestId.current)
        requestId.current = crypto.randomUUID().replaceAll('-', '');
      step = 'edits';
      const created = await dataOrThrow(
        await fetch('/api/photo-editor/edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(requireImage
              ? {
                  imageUrl: imageUrls[0] || '',
                  imageUrls,
                  uploadToken: uploadTokens[0] || '',
                  uploadTokens,
                  sourceJobId,
                  ...(maskUrl ? { maskUrl, maskUploadToken } : {}),
                }
              : { imageUrl: '', imageUrls: [] }),
            prompt: editPrompt,
            tool: toolSlug,
            quality,
            imageSize,
            resolution,
            requestId: requestId.current,
          }),
        })
      );
      refreshHeaderCredits(Math.max(0, credits.balance - cost));
      setJobId(created.jobId);
      setStatus('pending');
    } catch (err: any) {
      setStatus('idle');
      const message = err?.message || 'Unable to start editing';
      if (
        message === 'GUEST_CREDITS_EXHAUSTED' ||
        message === 'GUEST_TRIAL_RATE_LIMITED' ||
        message === 'GUEST_TRIAL_DISABLED'
      ) {
        showCreditGate('signup');
        return;
      }
      if (
        message === 'CREDITS_INSUFFICIENT' ||
        /insufficient credits/i.test(message)
      ) {
        showCreditGate(guest ? 'signup' : 'purchase');
        return;
      }
      // No ai_task row in these cases — record for the admin timeline.
      const totalKb = imagesRef.current.reduce(
        (sum, item) => sum + (item.file ? item.file.size : 0),
        0
      );
      track('photo_edit_submit_failed', {
        step,
        error: String(message).slice(0, 200),
        tool: toolSlug,
        quality,
        ...(totalKb ? { fileKb: Math.round(totalKb / 1024) } : {}),
      });
      reportError(PROMPT_SAFETY_TOAST[message] || message);
    }
  };

  const editAgain = () => {
    if (!result || !jobId) return;
    for (const item of imagesRef.current) revokeBlob(item.preview);
    replaceImages([
      {
        id: newImageId(),
        preview: result,
        fileName: 'Previous edit',
      },
    ]);
    setResult('');
    setSourceJobId(jobId);
    setJobId(null);
    if (fixedPrompt) setPrompt(fixedPrompt);
    else setPrompt('');
    setStatus('idle');
    setError(null);
    requestId.current = null;
  };

  const selectedQuality = {
    ...PHOTO_EDIT_QUALITIES.find((item) => item.id === quality)!,
    credits: photoEditCharge(quality, resolution).credits,
  };
  const loading = status === 'submitting' || status === 'pending';

  return {
    session,
    creditGate,
    setCreditGate,
    creditBalance,
    images,
    maxImages: imageCap,
    file,
    preview,
    prompt,
    quality,
    imageSize,
    resolution,
    jobId,
    status,
    result,
    error,
    showOriginal,
    setShowOriginal,
    selectedQuality,
    loading,
    chooseFile,
    addFiles,
    removeImage,
    clearFile,
    resetMedia,
    clearResult,
    changeQuality,
    changeImageSize,
    changeResolution,
    changePrompt,
    invalidateRequest,
    submit,
    editAgain,
  };
}
