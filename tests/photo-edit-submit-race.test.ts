import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  createHash,
  sign as cryptoSign,
  generateKeyPairSync,
} from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';

const directory = await mkdtemp(join(tmpdir(), 'shipany-photo-submit-race-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-photo-submit-race-secret-not-a-real-credential',
  NODE_ENV: 'test',
  VITE_APP_URL: 'https://example.test',
  VITE_APP_NAME: 'GetAIPhotoEditor',
});
execFileSync(
  process.execPath,
  [
    'node_modules/drizzle-kit/bin.cjs',
    'push',
    '--dialect=sqlite',
    '--schema=./src/config/db/schema.sqlite.ts',
    `--url=${process.env.DATABASE_URL}`,
    '--force',
  ],
  { stdio: 'pipe', env: process.env }
);

const { db } = await import('../src/core/db');
const { aiTask, config, credit } = await import('../src/config/db/schema');
const { getAuth } = await import('../src/core/auth');
const { AITaskStatus, findTask } =
  await import('../src/modules/ai-tasks/service');
const { getBalance, grant } = await import('../src/modules/credits/service');
const {
  PHOTO_EDIT_MISSING_PROVIDER_ID_MS,
  PHOTO_EDIT_STALE_MS,
  PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES,
} = await import('../src/modules/photo-editor/config');
const { reconcilePhotoEditTask } =
  await import('../src/modules/photo-editor/reconcile');
const { issueUploadToken } =
  await import('../src/modules/photo-editor/upload-token');
const { handlePhotoEditWebhook, setFalJwksForTests, PhotoEditWebhookError } =
  await import('../src/modules/photo-editor/webhook');
const { signPhotoEditWebhookJob } =
  await import('../src/modules/photo-editor/webhook-sign');
const { POST } = await import('../src/routes/api/photo-editor/edits');
const { readWebhookBodyLimited, POST: webhookPost } =
  await import('../src/routes/api/photo-editor/webhook/$provider');
const { md5 } = await import('../src/lib/hash');

after(async () => {
  setFalJwksForTests(null);
  await rm(directory, { recursive: true, force: true });
});

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
setFalJwksForTests([publicKey]);

async function signup(email: string) {
  for (const row of [
    { name: 'r2_domain', value: 'https://cdn.example.test' },
    { name: 'fal_api_key', value: 'test-only-fal-key' },
    { name: 'replicate_api_token', value: 'test-only-replicate-token' },
    { name: 'photo_editor_provider', value: 'fal' },
  ]) {
    const existing = await db()
      .select()
      .from(config)
      .where(eq(config.name, row.name))
      .limit(1);
    if (existing.length === 0) {
      await db().insert(config).values(row);
    } else {
      await db()
        .update(config)
        .set({ value: row.value })
        .where(eq(config.name, row.name));
    }
  }

  const auth = getAuth();
  const response = await auth.handler(
    new Request('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'Race',
        email,
        password: 'test-password-1',
      }),
    })
  );
  const body = await response.text();
  assert.equal(response.status, 200, body);
  const userId = JSON.parse(body).user.id as string;
  await db().delete(credit).where(eq(credit.userId, userId));
  const lines: string[] = response.headers.getSetCookie?.() ?? [];
  const cookie = lines
    .map((line) => line.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
  await grant({ userId, credits: 50, description: 'test' });
  return { userId, cookie };
}

async function deliverFalWebhook(params: {
  jobId: string;
  requestId: string;
  status: 'OK' | 'ERROR';
  imageUrl?: string;
}) {
  const body =
    params.status === 'OK'
      ? {
          request_id: params.requestId,
          status: 'OK',
          payload: {
            images: [{ url: params.imageUrl || 'https://cdn.example/out.png' }],
          },
        }
      : {
          request_id: params.requestId,
          status: 'ERROR',
          error: 'Invalid status code: 422',
          payload: { detail: 'provider failed' },
        };
  const rawBody = Buffer.from(JSON.stringify(body));
  const requestId = params.requestId;
  const userId = 'fal_user';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const hash = createHash('sha256').update(rawBody).digest('hex');
  const message = Buffer.from(
    [requestId, userId, timestamp, hash].join('\n'),
    'utf8'
  );
  const signature = cryptoSign(null, message, privateKey).toString('hex');
  const headers = new Headers({
    'x-fal-webhook-request-id': requestId,
    'x-fal-webhook-user-id': userId,
    'x-fal-webhook-timestamp': timestamp,
    'x-fal-webhook-signature': signature,
  });
  const sig = await signPhotoEditWebhookJob('fal', params.jobId);
  return handlePhotoEditWebhook({
    provider: 'fal',
    jobId: params.jobId,
    sig,
    rawBody,
    headers,
    deps: { persistOutput: async (url) => url + '?r2=1' },
  });
}

async function waitForTask(id: string, timeoutMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = await findTask(id);
    if (task) return task;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('task not created in time');
}

test('missing-provider-id timeout matches stale window', () => {
  assert.equal(PHOTO_EDIT_STALE_MS, 15 * 60_000);
  assert.equal(PHOTO_EDIT_MISSING_PROVIDER_ID_MS, PHOTO_EDIT_STALE_MS);
});

test('POST: webhook success during generate keeps success after attach', async () => {
  const { userId, cookie } = await signup('race-success@example.test');
  const imageUrl = 'https://cdn.example.test/race-success.png';
  const uploadToken = await issueUploadToken(userId, imageUrl);
  const requestId = 'request-race-success-01';
  const quality = 'medium';
  const jobId = 'edit_' + md5(`${userId}:${requestId}:${quality}`);

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('queue.fal.run')) {
      await gate;
      return new Response(JSON.stringify({ request_id: 'fal_race_ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };

  try {
    (
      globalThis as { __minIntervalRateLimitStore?: Map<string, number> }
    ).__minIntervalRateLimitStore?.clear();
    const pendingPost = POST({
      request: new Request('http://localhost:3000/api/photo-editor/edits', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          imageUrl,
          uploadToken,
          prompt: 'Change the background',
          tool: 'general',
          quality,
          requestId,
        }),
      }),
    });

    await waitForTask(jobId);
    await deliverFalWebhook({
      jobId,
      requestId: 'fal_race_ok',
      status: 'OK',
      imageUrl: 'https://cdn.example/race-ok.png',
    });
    assert.equal((await findTask(jobId))!.status, AITaskStatus.SUCCESS);

    release();
    const response = await pendingPost;
    const payload = await response.json();
    assert.equal(payload.code, 0, JSON.stringify(payload));
    assert.equal(payload.data.status, 'success');
    assert.equal((await findTask(jobId))!.status, AITaskStatus.SUCCESS);
    assert.equal((await findTask(jobId))!.taskId, 'fal_race_ok');
    assert.equal(await getBalance(userId), 40);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST: webhook failure during generate stays failed', async () => {
  const { userId, cookie } = await signup('race-fail@example.test');
  const imageUrl = 'https://cdn.example.test/race-fail.png';
  const uploadToken = await issueUploadToken(userId, imageUrl);
  const requestId = 'request-race-fail-01';
  const quality = 'medium';
  const jobId = 'edit_' + md5(`${userId}:${requestId}:${quality}`);

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('queue.fal.run')) {
      await gate;
      return new Response(JSON.stringify({ request_id: 'fal_race_fail' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };

  try {
    (
      globalThis as { __minIntervalRateLimitStore?: Map<string, number> }
    ).__minIntervalRateLimitStore?.clear();
    const pendingPost = POST({
      request: new Request('http://localhost:3000/api/photo-editor/edits', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          imageUrl,
          uploadToken,
          prompt: 'Change the background',
          tool: 'general',
          quality,
          requestId,
        }),
      }),
    });

    await waitForTask(jobId);
    await deliverFalWebhook({
      jobId,
      requestId: 'fal_race_fail',
      status: 'ERROR',
    });
    assert.equal((await findTask(jobId))!.status, AITaskStatus.FAILED);

    release();
    const response = await pendingPost;
    const payload = await response.json();
    assert.equal(payload.code, 0, JSON.stringify(payload));
    assert.equal(payload.data.status, 'failed');
    const failed = (await findTask(jobId))!;
    assert.equal(failed.status, AITaskStatus.FAILED);
    assert.match(failed.taskResult || '', /Invalid status code: 422/);
    assert.equal(await getBalance(userId), 50);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST: network timeout keeps pending; webhook later settles', async () => {
  const { userId, cookie } = await signup('race-timeout@example.test');
  const imageUrl = 'https://cdn.example.test/race-timeout.png';
  const uploadToken = await issueUploadToken(userId, imageUrl);
  const requestId = 'request-race-timeout-01';
  const quality = 'medium';
  const jobId = 'edit_' + md5(`${userId}:${requestId}:${quality}`);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('queue.fal.run')) {
      throw new Error('fetch failed');
    }
    return originalFetch(input, init);
  };

  try {
    (
      globalThis as { __minIntervalRateLimitStore?: Map<string, number> }
    ).__minIntervalRateLimitStore?.clear();
    const response = await POST({
      request: new Request('http://localhost:3000/api/photo-editor/edits', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          imageUrl,
          uploadToken,
          prompt: 'Change the background',
          tool: 'general',
          quality,
          requestId,
        }),
      }),
    });
    const payload = await response.json();
    assert.equal(payload.code, 0, JSON.stringify(payload));
    assert.equal(payload.data.status, 'pending');
    assert.equal((await findTask(jobId))!.taskId, null);
    assert.equal(await getBalance(userId), 40);

    await deliverFalWebhook({
      jobId,
      requestId: 'fal_after_timeout',
      status: 'OK',
      imageUrl: 'https://cdn.example/after-timeout.png',
    });
    assert.equal((await findTask(jobId))!.status, AITaskStatus.SUCCESS);
    assert.equal(await getBalance(userId), 40);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST: definite 4xx fails and refunds', async () => {
  const { userId, cookie } = await signup('race-4xx@example.test');
  const imageUrl = 'https://cdn.example.test/race-4xx.png';
  const uploadToken = await issueUploadToken(userId, imageUrl);
  const requestId = 'request-race-4xx-0001';
  const quality = 'medium';
  const jobId = 'edit_' + md5(`${userId}:${requestId}:${quality}`);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('queue.fal.run')) {
      return new Response('bad request', { status: 422 });
    }
    return originalFetch(input, init);
  };

  try {
    (
      globalThis as { __minIntervalRateLimitStore?: Map<string, number> }
    ).__minIntervalRateLimitStore?.clear();
    const response = await POST({
      request: new Request('http://localhost:3000/api/photo-editor/edits', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          imageUrl,
          uploadToken,
          prompt: 'Change the background',
          tool: 'general',
          quality,
          requestId,
        }),
      }),
    });
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.match(payload.message, /Credits were restored/i);
    assert.equal((await findTask(jobId))!.status, AITaskStatus.FAILED);
    assert.equal(await getBalance(userId), 50);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST: accepted generate then conflicting webhook id keeps webhook settlement', async () => {
  const { userId, cookie } = await signup('race-conflict@example.test');
  const imageUrl = 'https://cdn.example.test/race-conflict.png';
  const uploadToken = await issueUploadToken(userId, imageUrl);
  const requestId = 'request-race-conflict-01';
  const quality = 'medium';
  const jobId = 'edit_' + md5(`${userId}:${requestId}:${quality}`);

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('queue.fal.run')) {
      await gate;
      return new Response(JSON.stringify({ request_id: 'fal_submit_id' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };

  try {
    (
      globalThis as { __minIntervalRateLimitStore?: Map<string, number> }
    ).__minIntervalRateLimitStore?.clear();
    const pendingPost = POST({
      request: new Request('http://localhost:3000/api/photo-editor/edits', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          imageUrl,
          uploadToken,
          prompt: 'Change the background',
          tool: 'general',
          quality,
          requestId,
        }),
      }),
    });

    await waitForTask(jobId);
    await deliverFalWebhook({
      jobId,
      requestId: 'fal_webhook_id',
      status: 'OK',
      imageUrl: 'https://cdn.example/conflict-win.png',
    });
    assert.equal((await findTask(jobId))!.taskId, 'fal_webhook_id');
    assert.equal((await findTask(jobId))!.status, AITaskStatus.SUCCESS);

    release();
    const response = await pendingPost;
    const payload = await response.json();
    assert.equal(payload.code, 0, JSON.stringify(payload));
    // Attach mismatch must not reopen; client sees the settled status.
    assert.equal(payload.data.status, 'success');
    assert.equal((await findTask(jobId))!.taskId, 'fal_webhook_id');
    assert.equal((await findTask(jobId))!.status, AITaskStatus.SUCCESS);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('missing taskId past shared stale window fails and refunds via reconcile', async () => {
  const { userId } = await signup('race-stale-noid@example.test');
  const { createTask } = await import('../src/modules/ai-tasks/service');
  const task = await createTask({
    id: 'edit_stale_missing_provider_id',
    userId,
    mediaType: 'image',
    provider: 'fal',
    model: 'openai/gpt-image-2.6/flare/edit',
    prompt: 'wait forever',
    costCredits: 10,
    options: { imageUrl: 'https://cdn.example/a.png', tool: 'general' },
  });
  await db()
    .update(aiTask)
    .set({
      taskId: null,
      status: AITaskStatus.PENDING,
      createdAt: new Date(
        Date.now() - PHOTO_EDIT_MISSING_PROVIDER_ID_MS - 1000
      ),
    })
    .where(eq(aiTask.id, task.id));

  const settled = await reconcilePhotoEditTask((await findTask(task.id))!, {
    now: Date.now(),
  });
  assert.equal(settled.status, AITaskStatus.FAILED);
  assert.equal(await getBalance(userId), 50);
});

test('webhook route rejects oversized bodies with 413', async () => {
  const oversized = Buffer.alloc(PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES + 1, 0x61);
  await assert.rejects(
    () =>
      readWebhookBodyLimited(
        new Request('https://example.test/hook', {
          method: 'POST',
          body: oversized,
          duplex: 'half',
        } as RequestInit),
        PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES
      ),
    (err: unknown) => err instanceof PhotoEditWebhookError && err.status === 413
  );

  // Declared Content-Length above the cap is rejected without reading.
  await assert.rejects(
    () =>
      readWebhookBodyLimited(
        new Request('https://example.test/hook', {
          method: 'POST',
          headers: {
            'content-length': String(PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES + 10),
          },
          body: 'x',
        }),
        PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES
      ),
    (err: unknown) => err instanceof PhotoEditWebhookError && err.status === 413
  );

  const sig = 'a'.repeat(64);
  const response = await webhookPost({
    request: new Request(
      `https://example.test/api/photo-editor/webhook/fal?job=edit_abc&sig=${sig}`,
      {
        method: 'POST',
        headers: {
          'content-length': String(PHOTO_EDIT_WEBHOOK_MAX_BODY_BYTES + 1),
        },
        body: 'x',
      }
    ),
    params: { provider: 'fal' },
  });
  assert.equal(response.status, 413);
});
