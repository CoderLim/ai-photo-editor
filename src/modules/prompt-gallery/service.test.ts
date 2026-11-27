import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { distributeMasonry } from '../../components/prompt-gallery/masonry';
import { createRepository, parseRow, type GalleryDatabase } from './repository';
import {
  getGalleryPage,
  mediaKey,
  readGalleryMedia,
  selectCover,
  toCard,
} from './service';
import type { PromptMedia, RawPrompt } from './types';

const key = 'images/originals/' + 'a'.repeat(64) + '.png';
const thumb = 'images/thumbnails/v1/' + 'b'.repeat(64) + '.webp';
const output: PromptMedia = {
  type: 'image',
  role: 'output',
  originalUrl: 'https://example.com/a.png',
  key,
  thumbnailKey: thumb,
  width: 640,
  height: 800,
};

function makeDb(sqlite: DatabaseSync): GalleryDatabase {
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...values) {
          return {
            async all<T>() {
              return { results: statement.all(...values) as unknown as T[] };
            },
            async first<T>() {
              return (statement.get(...values) ?? null) as T | null;
            },
          };
        },
      };
    },
  };
}

function seedTable(sqlite: DatabaseSync) {
  sqlite.exec(`CREATE TABLE prompts (
    id TEXT PRIMARY KEY, media_type TEXT, slug TEXT, title TEXT, description TEXT,
    prompt TEXT, category TEXT, tags TEXT, input_mode TEXT, model TEXT, media TEXT,
    author TEXT, source_url TEXT, featured INTEGER, featured_rank INTEGER, updated_at INTEGER
  )`);
}

test('public read service and private media gate using SQLite', async () => {
  const sqlite = new DatabaseSync(':memory:');
  seedTable(sqlite);
  const insert = sqlite.prepare(
    'INSERT INTO prompts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  function seed(
    id: string,
    status: string | null,
    featured = 0,
    rank: number | null = null,
    type = 'image',
    media: unknown = [output]
  ) {
    insert.run(
      id,
      type,
      id,
      id,
      null,
      'Full prompt\n' + id,
      'portrait',
      '["photo"]',
      'text-to-image',
      null,
      JSON.stringify(media),
      status
        ? JSON.stringify({ name: 'Artist', publicationStatus: status })
        : null,
      'https://example.com/source',
      featured,
      rank,
      1
    );
  }
  seed('z', 'cleared', 1, 1);
  seed('a', 'cleared', 1, 2);
  seed('b', 'cleared');
  seed('hidden', 'pending-review', 1, 0);
  seed('missing', null);
  seed('video', 'cleared', 1, 0, 'video');
  seed('empty', 'cleared', 0, null, 'image', []);
  const db = makeDb(sqlite);
  const repo = createRepository(db);
  let reads = 0;
  const global = globalThis as typeof globalThis & { __CF_ENV__?: unknown };
  const previous = global.__CF_ENV__;
  global.__CF_ENV__ = {
    PROMPTS_DB: db,
    PROMPT_MEDIA: {
      async get(requested: string) {
        reads++;
        assert.equal(requested, thumb);
        return {
          body: new Response('image').body!,
          httpEtag: '"test-etag"',
        };
      },
    },
  };
  try {
    const list = await repo.getPrompts({ limit: 2 });
    assert.deepEqual(
      list.map((row) => row.id),
      ['z', 'a']
    );
    assert.ok(!('prompt' in list[0]));
    assert.deepEqual(
      (await repo.getPrompts({ offset: 2 })).map((row) => row.id),
      ['b', 'empty']
    );
    assert.equal(await repo.getPromptCount(), 4);
    assert.equal((await repo.getCategories())[0].total, 4);
    assert.deepEqual(
      (await repo.getFeaturedPrompts()).map((row) => row.id),
      ['z', 'a']
    );
    assert.equal(await repo.getPromptById('hidden'), null);
    assert.equal(await repo.getPromptBySlug('missing'), null);
    assert.equal((await repo.getPromptById('z'))?.prompt, 'Full prompt\nz');
    assert.equal(
      (await repo.getPrompts({ category: "' OR 1=1 --" })).length,
      0
    );
    const page = await getGalleryPage(0, 2);
    assert.deepEqual(
      page.items.map((card) => card.id),
      ['z', 'a']
    );
    assert.equal(page.nextOffset, 2);
    assert.equal((await getGalleryPage(2, 2)).nextOffset, null);
    assert.equal((await getGalleryPage(2, 2)).items.length, 1);
    assert.equal(
      (
        await readGalleryMedia(
          'hidden',
          0,
          true,
          new Request('https://example.com')
        )
      ).status,
      404
    );
    assert.equal(
      (await readGalleryMedia('z', 2, true, new Request('https://example.com')))
        .status,
      404
    );
    assert.equal(reads, 0);
    const response = await readGalleryMedia(
      'z',
      0,
      true,
      new Request('https://example.com')
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.equal(response.headers.get('etag'), '"test-etag"');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(await response.text(), 'image');
    const conditional = new Request('https://example.com', {
      headers: { 'If-None-Match': '"test-etag"' },
    });
    assert.equal(
      (await readGalleryMedia('z', 0, true, conditional)).status,
      304
    );
    sqlite
      .prepare("UPDATE prompts SET author = ? WHERE id = 'z'")
      .run(JSON.stringify({ publicationStatus: 'pending-review' }));
    assert.equal(
      (await readGalleryMedia('z', 0, true, conditional)).status,
      404
    );
    assert.equal(reads, 2);
  } finally {
    global.__CF_ENV__ = previous;
    sqlite.close();
  }
});

test('select output first, never input or third-party URL or arbitrary key', () => {
  const source: PromptMedia = { ...output, role: 'source-media' };
  assert.equal(
    selectCover([{ ...output, role: 'input' }, source, output])?.index,
    2
  );
  assert.equal(selectCover([source])?.index, 0);
  assert.equal(selectCover([{ ...output, role: 'input' }]), null);
  assert.equal(
    mediaKey({ ...output, key: undefined, thumbnailKey: undefined }),
    null
  );
  assert.equal(
    mediaKey({
      ...output,
      key: 'images/originals/secret.png',
      thumbnailKey: undefined,
    }),
    null
  );
  assert.equal(
    mediaKey({
      ...output,
      key: '../etc/passwd',
      thumbnailKey: undefined,
    }),
    null
  );
  assert.equal(mediaKey(output, false), key);
  assert.equal(mediaKey(output, true), thumb);
});

test('toCard never exposes raw R2 keys or third-party image URLs', () => {
  const card = toCard({
    id: 'x',
    mediaType: 'image',
    slug: 'x',
    title: 'Title',
    description: null,
    category: 'portrait',
    tags: [],
    inputMode: 'text-to-image',
    model: null,
    media: [output],
    author: {
      name: 'Artist',
      sourceUrl: 'javascript:alert(1)',
      rights: { prompt: 'CC0', media: 'CC-BY-4.0' },
      publicationStatus: 'cleared',
    },
    sourceUrl: 'https://example.com/ok',
    featured: false,
    featuredRank: null,
    updatedAt: 1,
  });
  assert.ok(card);
  assert.equal(
    card!.imageUrl,
    '/api/prompt-gallery/media?' + new URLSearchParams({ id: 'x', index: '0' })
  );
  assert.equal(card!.sourceUrl, 'https://example.com/ok');
  assert.equal(card!.width, 640);
  assert.equal(card!.height, 800);
  assert.equal(
    toCard({
      id: 'empty',
      mediaType: 'image',
      slug: 'e',
      title: 'e',
      description: null,
      category: 'c',
      tags: [],
      inputMode: 'text-to-image',
      model: null,
      media: [],
      author: null,
      sourceUrl: '',
      featured: false,
      featuredRank: null,
      updatedAt: 1,
    }),
    null
  );
});

test('JSON parse tolerates corrupt tags/media/author', () => {
  const row = parseRow({
    id: 'bad',
    media_type: 'image',
    slug: 'bad',
    title: 'Bad',
    description: null,
    prompt: 'keep me intact\nline2',
    category: 'c',
    tags: '{not-json',
    input_mode: 'text-to-image',
    model: null,
    media: 'null',
    author: '"oops"',
    source_url: 'https://example.com',
    featured: 0,
    featured_rank: null,
    updated_at: 1,
  } as RawPrompt);
  assert.deepEqual(row.tags, []);
  assert.deepEqual(row.media, []);
  assert.equal(row.author, null);
  assert.equal(row.prompt, 'keep me intact\nline2');
});

test('displayable filter drops rows without authorized R2 keys', async () => {
  const sqlite = new DatabaseSync(':memory:');
  seedTable(sqlite);
  const insert = sqlite.prepare(
    'INSERT INTO prompts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  insert.run(
    'ok',
    'image',
    'ok',
    'ok',
    null,
    'p',
    'c',
    '[]',
    'text-to-image',
    null,
    JSON.stringify([output]),
    JSON.stringify({ publicationStatus: 'cleared' }),
    'https://example.com',
    0,
    null,
    1
  );
  insert.run(
    'no-key',
    'image',
    'no-key',
    'no-key',
    null,
    'p',
    'c',
    '[]',
    'text-to-image',
    null,
    JSON.stringify([
      {
        type: 'image',
        role: 'output',
        originalUrl: 'https://cdn.example.com/x.png',
      },
    ]),
    JSON.stringify({ publicationStatus: 'cleared' }),
    'https://example.com',
    0,
    null,
    1
  );
  const repo = createRepository(makeDb(sqlite));
  const displayable = await repo.getPrompts({ limit: 10 }, true);
  assert.deepEqual(
    displayable.map((row) => row.id),
    ['ok']
  );
  sqlite.close();
});

test('missing R2 object returns 404 without leaking keys', async () => {
  const sqlite = new DatabaseSync(':memory:');
  seedTable(sqlite);
  sqlite
    .prepare('INSERT INTO prompts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(
      'z',
      'image',
      'z',
      'z',
      null,
      'Full',
      'c',
      '[]',
      'text-to-image',
      null,
      JSON.stringify([output]),
      JSON.stringify({ publicationStatus: 'cleared' }),
      'https://example.com',
      0,
      null,
      1
    );
  const global = globalThis as typeof globalThis & { __CF_ENV__?: unknown };
  const previous = global.__CF_ENV__;
  global.__CF_ENV__ = {
    PROMPTS_DB: makeDb(sqlite),
    PROMPT_MEDIA: {
      async get() {
        return null;
      },
    },
  };
  try {
    const response = await readGalleryMedia(
      'z',
      0,
      true,
      new Request('https://example.com')
    );
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  } finally {
    global.__CF_ENV__ = previous;
    sqlite.close();
  }
});

test('pagination boundaries and featured-first ordering stay stable', async () => {
  const sqlite = new DatabaseSync(':memory:');
  seedTable(sqlite);
  const insert = sqlite.prepare(
    'INSERT INTO prompts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  for (const [id, featured, rank] of [
    ['c', 0, null],
    ['a', 1, 2],
    ['b', 1, 1],
    ['d', 0, null],
  ] as const) {
    insert.run(
      id,
      'image',
      id,
      id,
      null,
      'prompt-' + id,
      'c',
      '[]',
      'text-to-image',
      null,
      JSON.stringify([output]),
      JSON.stringify({ publicationStatus: 'cleared' }),
      'https://example.com',
      featured,
      rank,
      1
    );
  }
  const global = globalThis as typeof globalThis & { __CF_ENV__?: unknown };
  const previous = global.__CF_ENV__;
  global.__CF_ENV__ = { PROMPTS_DB: makeDb(sqlite) };
  try {
    const first = await getGalleryPage(0, 2);
    assert.deepEqual(
      first.items.map((item) => item.id),
      ['b', 'a']
    );
    assert.equal(first.nextOffset, 2);
    const second = await getGalleryPage(2, 2);
    assert.deepEqual(
      second.items.map((item) => item.id),
      ['c', 'd']
    );
    assert.equal(second.nextOffset, null);
    const beyond = await getGalleryPage(4, 2);
    assert.deepEqual(beyond.items, []);
    assert.equal(beyond.nextOffset, null);
  } finally {
    global.__CF_ENV__ = previous;
    sqlite.close();
  }
});

test('masonry appending preserves earlier column placements', () => {
  const items = [
    { id: 1, width: 1, height: 2 },
    { id: 2, width: 2, height: 1 },
    { id: 3 },
    { id: 4, width: 1, height: 1 },
  ];
  const initial = distributeMasonry(items.slice(0, 3), 2);
  const next = distributeMasonry(items, 2);
  for (let i = 0; i < initial.length; i++) {
    assert.deepEqual(next[i].slice(0, initial[i].length), initial[i]);
  }
});
