/** Trigger a same-tab file download from a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

async function downloadViaFetch(url: string, filename: string) {
  const response = await fetch(url, {
    credentials: url.startsWith('/') ? 'same-origin' : 'omit',
  });
  if (!response.ok) throw new Error('Download failed. Try again.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('Download failed. Try again.');
  downloadBlob(blob, filename);
}

/**
 * Mobile Safari ignores the HTML download attribute on cross-origin URLs
 * (R2) and just opens the image. Prefer the same-origin attachment proxy,
 * then fall back to fetching the result URL when CORS allows it.
 */
export async function downloadPhotoResult(options: {
  resultUrl: string;
  filename: string;
  jobId?: string | null;
}) {
  if (options.jobId) {
    try {
      await downloadViaFetch(
        `/api/photo-editor/edits/${options.jobId}/download`,
        options.filename
      );
      return;
    } catch {
      /* Fall through to the direct result URL. */
    }
  }
  await downloadViaFetch(options.resultUrl, options.filename);
}
