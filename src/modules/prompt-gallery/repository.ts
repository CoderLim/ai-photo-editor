import type { GalleryPrompt, InputMode, MediaType, PromptAuthor, PromptMedia, RawPrompt } from './types';

type Param = string | number;
export interface GalleryDatabase {
  prepare(sql: string): {
    bind(...values: Param[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
    };
  };
}

export interface PromptOptions {
  mediaType?: MediaType;
  category?: string;
  inputMode?: InputMode;
  model?: string;
  featured?: boolean;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export const PUBLIC = "json_extract(author, '$.publicationStatus') = 'cleared'";
const FIELDS = 'id, media_type, slug, title, description, category, tags, input_mode, model, media, author, source_url, featured, featured_rank, updated_at';
const ORDER = 'featured DESC, CASE WHEN featured = 1 THEN COALESCE(featured_rank, 2147483647) ELSE 2147483647 END ASC, id ASC';

function parse<T>(json: string | null, fallback: T): T {
  try { return json ? JSON.parse(json) as T : fallback; } catch { return fallback; }
}

export function parseRow(row: RawPrompt): GalleryPrompt {
  const tags = parse<unknown>(row.tags, []);
  const media = parse<unknown>(row.media, []);
  const author = parse<PromptAuthor | null>(row.author, null);
  return {
    id: row.id, mediaType: row.media_type, slug: row.slug, title: row.title,
    description: row.description, prompt: row.prompt, category: row.category,
    tags: Array.isArray(tags) ? tags.filter((x): x is string => typeof x === 'string') : [],
    inputMode: row.input_mode, model: row.model,
    media: Array.isArray(media) ? media.map(x => x && typeof x === 'object' ? x as PromptMedia : null).map(x => x ?? {type:'image', role:'input', originalUrl:''}) : [],
    author: author && typeof author === 'object' ? author : null,
    sourceUrl: row.source_url, featured: row.featured === 1,
    featuredRank: row.featured_rank, updatedAt: row.updated_at,
  };
}

function where(options: PromptOptions, displayable = false) {
  const clauses = [PUBLIC, 'media_type = ?'];
  const values: Param[] = [options.mediaType ?? 'image'];
  for (const [field, value] of [
    ['category', options.category], ['input_mode', options.inputMode], ['model', options.model],
  ] as const) {
    if (value) { clauses.push(field + ' = ?'); values.push(value); }
  }
  if (options.featured !== undefined) {
    clauses.push('featured = ?'); values.push(options.featured ? 1 : 0);
  }
  if (options.keyword) {
    clauses.push("(instr(lower(title), lower(?)) > 0 OR instr(lower(prompt), lower(?)) > 0 OR instr(lower(tags), lower(?)) > 0)");
    values.push(options.keyword, options.keyword, options.keyword);
  }
  if (displayable) clauses.push("EXISTS (SELECT 1 FROM json_each(media) AS m WHERE json_extract(m.value, '$.type') = 'image' AND json_extract(m.value, '$.role') IN ('output','source-media') AND (json_extract(m.value, '$.thumbnailKey') GLOB 'images/thumbnails/v1/*' OR json_extract(m.value, '$.key') GLOB 'images/originals/*'))");
  return { sql: clauses.join(' AND '), values };
}

export function createRepository(db: GalleryDatabase) {
  async function getPrompts(options: PromptOptions = {}, displayable = false) {
    const { sql, values } = where(options, displayable);
    const limit = Number.isSafeInteger(options.limit) ? Math.min(60, Math.max(1, options.limit!)) : 24;
    const offset = Number.isSafeInteger(options.offset) ? Math.max(0, options.offset!) : 0;
    const result = await db.prepare('SELECT ' + FIELDS + ' FROM prompts WHERE ' + sql + ' ORDER BY ' + ORDER + ' LIMIT ? OFFSET ?')
      .bind(...values, limit, offset).all<Omit<RawPrompt, 'prompt'>>();
    return result.results.map(row => {
      const { prompt: _, ...rest } = parseRow({ ...row, prompt: '' });
      return rest;
    });
  }
  async function detail(field: 'id' | 'slug', value: string, mediaType?: MediaType) {
    const row = await db.prepare('SELECT ' + FIELDS + ', prompt FROM prompts WHERE ' + PUBLIC + ' AND ' + field + ' = ?' + (mediaType ? ' AND media_type = ?' : ''))
      .bind(...(mediaType ? [value, mediaType] : [value])).first<RawPrompt>();
    return row ? parseRow(row) : null;
  }
  async function getPromptCount(options: PromptOptions = {}) {
    const { sql, values } = where(options);
    const row = await db.prepare('SELECT COUNT(*) AS total FROM prompts WHERE ' + sql).bind(...values).first<{total: number}>();
    return row?.total ?? 0;
  }
  async function getCategories(options: PromptOptions = {}) {
    const { sql, values } = where(options);
    return (await db.prepare('SELECT category, COUNT(*) AS total FROM prompts WHERE ' + sql + ' GROUP BY category ORDER BY category').bind(...values).all<{category: string; total: number}>()).results;
  }
  return { getPrompts, getPromptById: (id: string) => detail('id', id),
    getPromptBySlug: (slug: string, mediaType: MediaType = 'image') => detail('slug', slug, mediaType),
    getFeaturedPrompts: (options: PromptOptions = {}) => getPrompts({...options, featured: true}),
    getCategories, getPromptCount };
}
