import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import {
  DEFAULT_PHOTO_EDIT_QUALITY,
  DEFAULT_PHOTO_IMAGE_SIZE,
  DEFAULT_PHOTO_RESOLUTION,
  isPhotoEditQuality,
  PHOTO_EDIT_QUALITIES,
  photoEditCharge,
  type PhotoEditQuality,
  type PhotoImageSize,
  type PhotoResolution,
} from '@/modules/photo-editor/config';
import { track } from '@/lib/track';
import type { CreditGate } from '@/components/photo-editor/credit-gate-dialog';

type Draft = { file: File; prompt: string; quality?: PhotoEditQuality };

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
  /**
   * Optional precision-edit mask (PNG). Return null when empty.
   * Uploaded with the source in one FormData when both are new.
   */
  getMaskFile?: () => Promise<Blob | null>;
};

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
  getMaskFile,
}: UsePhotoEditSessionOptions = {}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [creditGate, setCreditGate] = useState<CreditGate>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const previewRef = useRef<string | null>(null);
  const requestId = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
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
    if (file) saveDraft(file, prompt, quality);
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
        const draft = value.result as Draft | undefined;
        if (draft?.file instanceof File) {
          setFile(draft.file);
          const restoredUrl = URL.createObjectURL(draft.file);
          previewRef.current = restoredUrl;
          setPreview(restoredUrl);
          if (restoreDraftPrompt) setPrompt(draft.prompt || '');
          if (isPhotoEditQuality(draft.quality)) setQuality(draft.quality);
        }
      };
      tx.oncomplete = () => request.result.close();
    };
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [restoreDraftPrompt]);

  useEffect(() => {
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
          // Keep the loading overlay until the bytes are in cache, otherwise
          // Edited briefly still shows the original and looks like a no-op.
          await preloadImage(job.imageUrl);
          setResult(job.imageUrl);
          setStatus('success');
          setShowOriginal(false);
          clearDraft();
        } else if (job.status === 'failed' || job.status === 'canceled') {
          setStatus('failed');
          requestId.current = null;
          const detail = typeof job.error === 'string' ? job.error.trim() : '';
          toast.error(
            detail
              ? `${detail} Credits were restored.`
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
    saveDraft(selected, fixedPrompt || prompt, quality);
  };

  const clearFile = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setFile(null);
    setPreview('');
    setUpload(null);
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
    if (file) saveDraft(file, fixedPrompt || prompt, next);
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
    if (file) saveDraft(file, next, quality);
  };

  /** Call when the precision mask changes so idempotent edit ids stay fresh. */
  const invalidateRequest = () => {
    requestId.current = null;
  };

  const submit = async () => {
    if (requireImage && !preview) return toast.error('Upload a photo first.');
    const editPrompt = (fixedPrompt || prompt).trim();
    if (!editPrompt) {
      return toast.error(
        requireImage
          ? 'Describe your edit first.'
          : 'Describe what to generate first.'
      );
    }
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

      let imageUrl = '';
      let uploadToken = '';
      let maskUrl = '';
      let maskUploadToken = '';

      if (requireImage) {
        imageUrl = upload?.url || preview;
        uploadToken = upload?.token || '';
        const maskFile = maskBlob
          ? new File([maskBlob], 'precision-mask.png', { type: 'image/png' })
          : null;

        step = 'upload';
        if (file && !upload && maskFile) {
          // One request for source + mask — upload-image rate-limits to 1s.
          const data = new FormData();
          data.append('files', file);
          data.append('files', maskFile);
          const stored = await dataOrThrow(
            await fetch('/api/storage/upload-image', {
              method: 'POST',
              body: data,
            })
          );
          const source = stored.results?.[0];
          const mask = stored.results?.[1];
          if (!source?.url || !source?.token)
            throw new Error('Image upload did not return authorization');
          if (!mask?.url || !mask?.token)
            throw new Error('Mask upload did not return authorization');
          imageUrl = source.url;
          uploadToken = source.token;
          maskUrl = mask.url;
          maskUploadToken = mask.token;
          setUpload({ url: imageUrl, token: uploadToken });
        } else if (file && !upload) {
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
        } else if (maskFile) {
          // Source already uploaded or from a prior job — mask only.
          const data = new FormData();
          data.append('files', maskFile);
          const stored = await dataOrThrow(
            await fetch('/api/storage/upload-image', {
              method: 'POST',
              body: data,
            })
          );
          const mask = stored.results?.[0];
          if (!mask?.url || !mask?.token)
            throw new Error('Mask upload did not return authorization');
          maskUrl = mask.url;
          maskUploadToken = mask.token;
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
                  imageUrl,
                  uploadToken,
                  sourceJobId,
                  ...(maskUrl ? { maskUrl, maskUploadToken } : {}),
                }
              : { imageUrl: '' }),
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
      track('photo_edit_submit_failed', {
        step,
        error: String(message).slice(0, 200),
        tool: toolSlug,
        quality,
        ...(file ? { fileKb: Math.round(file.size / 1024) } : {}),
      });
      toast.error(PROMPT_SAFETY_TOAST[message] || message);
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
    if (fixedPrompt) setPrompt(fixedPrompt);
    else setPrompt('');
    setStatus('idle');
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
    file,
    preview,
    prompt,
    quality,
    imageSize,
    resolution,
    jobId,
    status,
    result,
    showOriginal,
    setShowOriginal,
    selectedQuality,
    loading,
    chooseFile,
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
