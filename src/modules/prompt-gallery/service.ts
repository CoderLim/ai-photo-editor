import {
  createRepository,
  type GalleryDatabase,
  type PromptOptions,
} from './repository';
import type {
  GalleryCard,
  GalleryPage,
  GalleryPrompt,
  MediaType,
  PromptMedia,
} from './types';

interface MediaObject {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
}
interface MediaBucket {
  get(key: string): Promise<MediaObject | null>;
}
interface GalleryBindings {
  PROMPTS_DB?: GalleryDatabase;
  PROMPT_MEDIA?: MediaBucket;
}

function bindings(): GalleryBindings {
  const g = globalThis as typeof globalThis & {
    __CF_ENV__?: GalleryBindings;
    __env__?: GalleryBindings;
  };
  return g.__CF_ENV__ ?? g.__env__ ?? {};
}

export function galleryRepository() {
  const db = bindings().PROMPTS_DB;
  if (!db) throw new Error('PROMPTS_DB binding is not configured');
  return createRepository(db);
}

export const getPrompts = (options?: PromptOptions) =>
  galleryRepository().getPrompts(options);
export const getPromptById = (id: string) =>
  galleryRepository().getPromptById(id);
export const getPromptBySlug = (slug: string, type?: MediaType) =>
  galleryRepository().getPromptBySlug(slug, type);
export const getFeaturedPrompts = (options?: PromptOptions) =>
  galleryRepository().getFeaturedPrompts(options);
export const getCategories = (options?: PromptOptions) =>
  galleryRepository().getCategories(options);
export const getPromptCount = (options?: PromptOptions) =>
  galleryRepository().getPromptCount(options);

const THUMB_RE = /^images\/thumbnails\/v1\/[a-f0-9]{64}\.webp$/;
const ORIGINAL_RE =
  /^images\/originals\/[a-f0-9]{64}\.(jpg|jpeg|png|webp|gif)$/;

export function mediaKey(media: PromptMedia, thumbnail = true): string | null {
  if (
    media.type !== 'image' ||
    !['output', 'source-media'].includes(media.role)
  ) {
    return null;
  }
  if (
    thumbnail &&
    typeof media.thumbnailKey === 'string' &&
    THUMB_RE.test(media.thumbnailKey)
  ) {
    return media.thumbnailKey;
  }
  if (typeof media.key === 'string' && ORIGINAL_RE.test(media.key)) {
    return media.key;
  }
  return null;
}

export function selectCover(media: PromptMedia[]) {
  for (const role of ['output', 'source-media'] as const) {
    const index = media.findIndex(
      (item) => item.role === role && mediaKey(item)
    );
    if (index !== -1) return { index, item: media[index] };
  }
  return null;
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function dimension(value: unknown) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 100000
    ? value
    : undefined;
}

export function toCard(row: Omit<GalleryPrompt, 'prompt'>): GalleryCard | null {
  const cover = selectCover(row.media);
  if (!cover) return null;
  return {
    id: row.id,
    title: row.title,
    imageUrl:
      '/api/prompt-gallery/media?' +
      new URLSearchParams({ id: row.id, index: String(cover.index) }),
    width: dimension(cover.item.width),
    height: dimension(cover.item.height),
    author: row.author?.name ?? null,
    sourceUrl:
      safeUrl(row.author?.sourceUrl || '') || safeUrl(row.sourceUrl || ''),
    license: row.author?.rights?.media ?? null,
    modifications: row.author?.modifications ?? null,
  };
}

export async function getGalleryPage(
  offset: number,
  limit = 24
): Promise<GalleryPage> {
  const safeOffset = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  const safeLimit = Number.isSafeInteger(limit)
    ? Math.min(60, Math.max(1, limit))
    : 24;
  // Fetch one extra to detect a following page without a separate COUNT.
  const rows = await galleryRepository().getPrompts(
    { mediaType: 'image', limit: safeLimit + 1, offset: safeOffset },
    true
  );
  const pageRows = rows.slice(0, safeLimit);
  const items = pageRows
    .map(toCard)
    .filter((x): x is GalleryCard => x !== null);
  return {
    items,
    // Advance by SQL page size so offsets stay aligned with the displayable set,
    // even if a rare row fails mediaKey after the SQL prefilter.
    nextOffset: rows.length > safeLimit ? safeOffset + safeLimit : null,
  };
}

export const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

export async function readGalleryMedia(
  id: string,
  index: number,
  thumbnail: boolean,
  request: Request
) {
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index > 9999 ||
    !id ||
    id.length > 256
  ) {
    return new Response(null, { status: 404, headers: NO_STORE });
  }
  // Clearance is re-checked on every request (including If-None-Match).
  const media = (await galleryRepository().getMediaById(id))[index];
  const key = media && mediaKey(media, thumbnail);
  if (!key) return new Response(null, { status: 404, headers: NO_STORE });
  const bucket = bindings().PROMPT_MEDIA;
  if (!bucket) throw new Error('PROMPT_MEDIA binding is not configured');
  const object = await bucket.get(key);
  if (!object) return new Response(null, { status: 404, headers: NO_STORE });
  const ext = key.split('.').pop();
  const contentType =
    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/' + ext;
  const headers = {
    ...NO_STORE,
    'Content-Type': contentType,
    ETag: object.httpEtag,
  };
  if (request.headers.get('If-None-Match') === object.httpEtag) {
    await object.body.cancel();
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}
