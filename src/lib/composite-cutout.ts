/** Background fill applied under a transparent cutout PNG. */
export type CutoutFill =
  | { mode: 'transparent' }
  | { mode: 'color'; color: string }
  | { mode: 'photo'; photoUrl: string };

const MAX_BG_BYTES = 10 * 1024 * 1024;

export function isAllowedBackgroundFile(file: File): boolean {
  if (file.size > MAX_BG_BYTES) return false;
  return (
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'image/webp'
  );
}

/** Only blob: object URLs need revoke — preset paths must stay. */
export function revokePhotoUrl(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}

/** Built-in fill photos for the background remover Photo tab. */
export const PRESET_FILL_PHOTOS = [
  {
    id: 'studio-white',
    label: 'Studio white',
    src: '/images/ai-photo-editor/background-remover/fills/studio-white.png',
  },
  {
    id: 'studio-gray',
    label: 'Studio gray',
    src: '/images/ai-photo-editor/background-remover/fills/studio-gray.png',
  },
  {
    id: 'studio-beige',
    label: 'Studio beige',
    src: '/images/ai-photo-editor/background-remover/fills/studio-beige.png',
  },
  {
    id: 'soft-blue',
    label: 'Soft blue',
    src: '/images/ai-photo-editor/background-remover/fills/soft-blue.png',
  },
  {
    id: 'park-bokeh',
    label: 'Park',
    src: '/images/ai-photo-editor/background-remover/fills/park-bokeh.png',
  },
  {
    id: 'sunset-sky',
    label: 'Sunset',
    src: '/images/ai-photo-editor/background-remover/fills/sunset-sky.png',
  },
  {
    id: 'office-bokeh',
    label: 'Office',
    src: '/images/ai-photo-editor/background-remover/fills/office-bokeh.png',
  },
] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/** Draw `bg` into `destW×destH` with CSS object-fit: cover, centered. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  bg: HTMLImageElement,
  destW: number,
  destH: number
) {
  const scale = Math.max(destW / bg.naturalWidth, destH / bg.naturalHeight);
  const w = bg.naturalWidth * scale;
  const h = bg.naturalHeight * scale;
  const x = (destW - w) / 2;
  const y = (destH - h) / 2;
  ctx.drawImage(bg, x, y, w, h);
}

/**
 * Composite a transparent cutout over the chosen fill into a PNG blob.
 * Requires CORS on remote cutout URLs (R2); blob: photo URLs are fine.
 */
export async function compositeCutout(
  cutoutUrl: string,
  fill: CutoutFill
): Promise<Blob> {
  const cutout = await loadImage(cutoutUrl);
  const width = cutout.naturalWidth;
  const height = cutout.naturalHeight;
  if (!width || !height) throw new Error('Invalid cutout image');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  if (fill.mode === 'color') {
    ctx.fillStyle = fill.color;
    ctx.fillRect(0, 0, width, height);
  } else if (fill.mode === 'photo') {
    const bg = await loadImage(fill.photoUrl);
    drawCover(ctx, bg, width, height);
  }

  ctx.drawImage(cutout, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(
          new Error(
            'Export failed. The image host may block canvas access (CORS).'
          )
        );
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export { downloadBlob } from '@/lib/download';
