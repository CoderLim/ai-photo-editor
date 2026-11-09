import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  createHash,
  createHmac,
  sign as cryptoSign,
  generateKeyPairSync,
} from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';

const directory = await mkdtemp(join(tmpdir(), 'shipany-photo-webhook-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-photo-webhook-test-secret-not-a-real-credential',
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
const { aiTask, user } = await import('../src/config/db/schema');
const { AITaskStatus, createTask, findTask, updateTask } =
  await import('../src/modules/ai-tasks/service');
const { getBalance, grant } = await import('../src/modules/credits/service');
const {
  attachPhotoEditProviderTaskId,
  PhotoEditProviderIdError,
  reconcilePhotoEditTask,
} = await import('../src/modules/photo-editor/reconcile');
const {
  handlePhotoEditWebhook,
  setReplicateWebhookSecretForTests,
  setFalJwksForTests,
  PhotoEditWebhookError,
} = await import('../src/modules/photo-editor/webhook');
const { photoEditWebhookCallbackUrl, signPhotoEditWebhookJob } =
  await import('../src/modules/photo-editor/webhook-sign');
const { isDefiniteProviderReject } =
  await import('../src/routes/api/photo-editor/edits');

after(async () => {
  setReplicateWebhookSecretForTests(null);
  setFalJwksForTests(null);
  await rm(directory, { recursive: true, force: true });
});

const WHSEC =
  'whsec_' + Buffer.from('webhook-test-secret-bytes!!').toString('base64');

function signReplicate(
  rawBody: string,
  id = 'msg_1',
  timestamp = String(Math.floor(Date.now() / 1000))
) {
  const key = Buffer.from(WHSEC.slice('whsec_'.length), 'base64');
  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64');
  return {
    headers: new Headers({
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${expected}`,
    }),
  };
}

async function seedUser(id: string) {
  await db()
    .insert(user)
    .values({ id, name: id, email: `${id}@example.test` });
  await grant({ userId: id, credits: 20, description: 'test' });
}

async function seedPendingEdit(params: {
  userId: string;
  id: string;
  taskId?: string | null;
  provider?: string;
}) {
  const task = await createTask({
    id: params.id,
    userId: params.userId,
    mediaType: 'image',
    provider: params.provider || 'replicate',
    model: 'openai/gpt-image-2.6-flare',
    prompt: 'Change the background',
    costCredits: 10,
    options: { imageUrl: 'https://cdn.example/a.jpg', tool: 'general' },
  });
  if (params.taskId !== undefined) {
    await db()
      .update(aiTask)
      .set({
        taskId: params.taskId,
        status: AITaskStatus.PENDING,
      })
      .where(eq(aiTask.id, task.id));
  } else {
    await db()
      .update(aiTask)
      .set({ taskId: null, status: AITaskStatus.PENDING })
      .where(eq(aiTask.id, task.id));
  }
  return (await findTask(task.id))!;
}

async function deliverReplicate(params: {
  jobId: string;
  body: Record<string, unknown>;
  persistOutput?: (url: string, taskId: string) => Promise<string>;
  queryProvider?: any;
  badSig?: boolean;
  skipProviderSig?: boolean;
}) {
  setReplicateWebhookSecretForTests(WHSEC);
  const rawBody = JSON.stringify(params.body);
  const { headers } = params.skipProviderSig
    ? { headers: new Headers() }
    : signReplicate(rawBody);
  if (params.badSig)
    headers.set('webhook-signature', 'v1,not-a-real-signature====');
  const sig = await signPhotoEditWebhookJob('replicate', params.jobId);
  return handlePhotoEditWebhook({
    provider: 'replicate',
    jobId: params.jobId,
    sig: params.badSig ? '0'.repeat(64) : sig,
    rawBody: Buffer.from(rawBody),
    headers,
    deps: {
      persistOutput: params.persistOutput ?? (async (url) => url + '?r2=1'),
      queryProvider: params.queryProvider,
    },
  });
}

test('callback URL embeds signed job id and skips localhost', async () => {
  const url = await photoEditWebhookCallbackUrl(
    'https://getaiphotoeditor.com',
    'replicate',
    'edit_abc'
  );
  assert.ok(url?.includes('/api/photo-editor/webhook/replicate'));
  assert.ok(url?.includes('job=edit_abc'));
  assert.ok(url?.includes('sig='));
  assert.equal(
    await photoEditWebhookCallbackUrl(
      'http://localhost:3000',
      'replicate',
      'edit_abc'
    ),
    undefined
  );
});

test('rejects invalid job or provider signatures', async () => {
  await seedUser('wh-bad-sig');
  const pending = await seedPendingEdit({
    userId: 'wh-bad-sig',
    id: 'edit_webhook_bad_sig',
    taskId: 'pred_bad',
  });

  await assert.rejects(
    () =>
      deliverReplicate({
        jobId: pending.id,
        body: {
          id: 'pred_bad',
          status: 'succeeded',
          output: 'https://cdn.example/out.png',
        },
        badSig: true,
      }),
    (err: unknown) => err instanceof PhotoEditWebhookError && err.status === 401
  );

  await assert.rejects(
    () =>
      deliverReplicate({
        jobId: pending.id,
        body: {
          id: 'pred_bad',
          status: 'succeeded',
          output: 'https://cdn.example/out.png',
        },
        skipProviderSig: true,
      }),
    (err: unknown) => err instanceof PhotoEditWebhookError && err.status === 401
  );

  assert.equal((await findTask(pending.id))!.status, AITaskStatus.PENDING);
});

test('valid webhook settles success and persists via R2 helper', async () => {
  await seedUser('wh-ok');
  const pending = await seedPendingEdit({
    userId: 'wh-ok',
    id: 'edit_webhook_ok',
    taskId: 'pred_ok',
  });
  assert.equal(await getBalance('wh-ok'), 10);

  const result = await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_ok',
      status: 'succeeded',
      output: ['https://cdn.example/out.png'],
    },
  });
  assert.equal(result.status, AITaskStatus.SUCCESS);
  const settled = (await findTask(pending.id))!;
  assert.equal(settled.status, AITaskStatus.SUCCESS);
  assert.equal(
    JSON.parse(settled.taskResult || '{}').images[0].imageUrl,
    'https://cdn.example/out.png?r2=1'
  );
  assert.equal(await getBalance('wh-ok'), 10);
});

test('duplicate webhook is idempotent', async () => {
  await seedUser('wh-dup');
  const pending = await seedPendingEdit({
    userId: 'wh-dup',
    id: 'edit_webhook_dup',
    taskId: 'pred_dup',
  });
  const body = {
    id: 'pred_dup',
    status: 'succeeded',
    output: 'https://cdn.example/dup.png',
  };
  await deliverReplicate({ jobId: pending.id, body });
  const second = await deliverReplicate({ jobId: pending.id, body });
  assert.equal(second.status, AITaskStatus.SUCCESS);
  assert.equal(await getBalance('wh-dup'), 10);
});

test('R2 failure surfaces as retryable and leaves task pending', async () => {
  await seedUser('wh-r2');
  const pending = await seedPendingEdit({
    userId: 'wh-r2',
    id: 'edit_webhook_r2',
    taskId: 'pred_r2',
  });

  await assert.rejects(
    () =>
      deliverReplicate({
        jobId: pending.id,
        body: {
          id: 'pred_r2',
          status: 'succeeded',
          output: 'https://cdn.example/r2.png',
        },
        persistOutput: async () => {
          throw new Error('Failed to store edited photo');
        },
      }),
    /Failed to store edited photo/
  );
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.PENDING);
  assert.equal(await getBalance('wh-r2'), 10);

  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_r2',
      status: 'succeeded',
      output: 'https://cdn.example/r2.png',
    },
  });
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.SUCCESS);
});

test('webhook before task_id write claims provider id and settles', async () => {
  await seedUser('wh-race');
  const pending = await seedPendingEdit({
    userId: 'wh-race',
    id: 'edit_webhook_race',
    taskId: null,
  });
  assert.equal(pending.taskId, null);

  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_race_1',
      status: 'succeeded',
      output: 'https://cdn.example/race.png',
    },
  });
  const settled = (await findTask(pending.id))!;
  assert.equal(settled.taskId, 'pred_race_1');
  assert.equal(settled.status, AITaskStatus.SUCCESS);
});

test('webhook and poll concurrent settle once', async () => {
  await seedUser('wh-concurrent');
  const pending = await seedPendingEdit({
    userId: 'wh-concurrent',
    id: 'edit_webhook_concurrent',
    taskId: 'pred_concurrent',
  });

  const remote = {
    taskId: 'pred_concurrent',
    taskStatus: AITaskStatus.SUCCESS,
    taskInfo: {
      images: [
        {
          id: '',
          createTime: new Date(),
          imageUrl: 'https://cdn.example/c.png',
        },
      ],
    },
  };

  const [fromWebhook, fromPoll] = await Promise.all([
    deliverReplicate({
      jobId: pending.id,
      body: {
        id: 'pred_concurrent',
        status: 'succeeded',
        output: 'https://cdn.example/c.png',
      },
      persistOutput: async (url) => url + '?wh=1',
    }),
    reconcilePhotoEditTask(pending, {
      remote,
      persistOutput: async (url) => url + '?poll=1',
    }),
  ]);

  assert.equal(fromWebhook.status, AITaskStatus.SUCCESS);
  assert.equal(fromPoll.status, AITaskStatus.SUCCESS);
  assert.equal(await getBalance('wh-concurrent'), 10);
  const stored = JSON.parse((await findTask(pending.id))!.taskResult || '{}');
  assert.ok(
    stored.images[0].imageUrl === 'https://cdn.example/c.png?wh=1' ||
      stored.images[0].imageUrl === 'https://cdn.example/c.png?poll=1'
  );
});

test('provider failure refunds credits', async () => {
  await seedUser('wh-fail');
  const pending = await seedPendingEdit({
    userId: 'wh-fail',
    id: 'edit_webhook_fail',
    taskId: 'pred_fail',
  });
  assert.equal(await getBalance('wh-fail'), 10);

  const result = await deliverReplicate({
    jobId: pending.id,
    body: { id: 'pred_fail', status: 'failed', error: 'NSFW', output: null },
  });
  assert.equal(result.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('wh-fail'), 20);
});

test('ensureTaskRefund recovers interrupted refund after failed status', async () => {
  await seedUser('wh-refund-gap');
  const pending = await seedPendingEdit({
    userId: 'wh-refund-gap',
    id: 'edit_webhook_refund_gap',
    taskId: 'pred_gap',
  });
  // Simulate old path: status failed without revoke.
  const { credit } = await import('../src/config/db/schema');
  const info = JSON.parse(pending.taskInfo || '{}');
  await db()
    .update(aiTask)
    .set({ status: AITaskStatus.FAILED })
    .where(eq(aiTask.id, pending.id));
  // consume still active
  const [consume] = await db()
    .select()
    .from(credit)
    .where(eq(credit.id, info.creditId));
  assert.equal(consume.status, 'active');
  assert.equal(await getBalance('wh-refund-gap'), 10);

  const settled = await reconcilePhotoEditTask((await findTask(pending.id))!);
  assert.equal(settled.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('wh-refund-gap'), 20);
});

test('late failure cannot overwrite success', async () => {
  await seedUser('wh-late');
  const pending = await seedPendingEdit({
    userId: 'wh-late',
    id: 'edit_webhook_late',
    taskId: 'pred_late',
  });
  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_late',
      status: 'succeeded',
      output: 'https://cdn.example/late.png',
    },
  });
  await deliverReplicate({
    jobId: pending.id,
    body: { id: 'pred_late', status: 'failed', error: 'late', output: null },
  });
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.SUCCESS);
  assert.equal(await getBalance('wh-late'), 10);
});

test('success without recoverable image fails and refunds with 200-path status', async () => {
  await seedUser('wh-noimg');
  const pending = await seedPendingEdit({
    userId: 'wh-noimg',
    id: 'edit_webhook_noimg',
    taskId: 'pred_noimg',
  });
  const result = await deliverReplicate({
    jobId: pending.id,
    body: { id: 'pred_noimg', status: 'succeeded', output: null },
    queryProvider: async () => ({
      taskId: 'pred_noimg',
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: { images: undefined },
    }),
  });
  assert.equal(result.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('wh-noimg'), 20);
});

test('throwOnError rethrows transient poll errors for webhook callers', async () => {
  await seedUser('wh-throw');
  const pending = await seedPendingEdit({
    userId: 'wh-throw',
    id: 'edit_webhook_throw',
    taskId: 'pred_throw',
  });
  await assert.rejects(
    () =>
      reconcilePhotoEditTask(pending, {
        throwOnError: true,
        queryProvider: async () => {
          throw new Error('502 from provider');
        },
      }),
    /502 from provider/
  );
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.PENDING);
});

test('Fal webhook signature verifies with JWKS key', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  setFalJwksForTests([publicKey]);

  await seedUser('wh-fal');
  const pending = await seedPendingEdit({
    userId: 'wh-fal',
    id: 'edit_webhook_fal',
    taskId: null,
    provider: 'fal',
  });

  const body = {
    request_id: 'fal_req_1',
    status: 'OK',
    payload: { images: [{ url: 'https://cdn.example/fal.png' }] },
  };
  const rawBody = Buffer.from(JSON.stringify(body));
  const requestId = 'fal_req_1';
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
  const sig = await signPhotoEditWebhookJob('fal', pending.id);
  const result = await handlePhotoEditWebhook({
    provider: 'fal',
    jobId: pending.id,
    sig,
    rawBody,
    headers,
    deps: { persistOutput: async (url) => url + '?fal=1' },
  });
  assert.equal(result.status, AITaskStatus.SUCCESS);
  assert.equal((await findTask(pending.id))!.taskId, 'fal_req_1');
});

test('updateTask failure refunds atomically with status change', async () => {
  await seedUser('wh-atomic-fail');
  const pending = await seedPendingEdit({
    userId: 'wh-atomic-fail',
    id: 'edit_webhook_atomic_fail',
    taskId: 'pred_atomic',
  });
  assert.equal(await getBalance('wh-atomic-fail'), 10);
  await updateTask({ taskId: pending.id, status: AITaskStatus.FAILED });
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('wh-atomic-fail'), 20);
});

test('submit attach after webhook success keeps success and matching taskId', async () => {
  await seedUser('wh-submit-after-ok');
  const pending = await seedPendingEdit({
    userId: 'wh-submit-after-ok',
    id: 'edit_webhook_submit_after_ok',
    taskId: null,
  });
  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_submit_after_ok',
      status: 'succeeded',
      output: 'https://cdn.example/after-ok.png',
    },
  });
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.SUCCESS);

  const attached = await attachPhotoEditProviderTaskId(
    pending.id,
    'pred_submit_after_ok'
  );
  assert.equal(attached.status, AITaskStatus.SUCCESS);
  assert.equal(attached.taskId, 'pred_submit_after_ok');
  assert.equal(await getBalance('wh-submit-after-ok'), 10);
});

test('submit attach after webhook failure cannot reopen pending', async () => {
  await seedUser('wh-submit-after-fail');
  const pending = await seedPendingEdit({
    userId: 'wh-submit-after-fail',
    id: 'edit_webhook_submit_after_fail',
    taskId: null,
  });
  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_submit_after_fail',
      status: 'failed',
      error: 'boom',
      output: null,
    },
  });
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.FAILED);

  const attached = await attachPhotoEditProviderTaskId(
    pending.id,
    'pred_submit_after_fail'
  );
  assert.equal(attached.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('wh-submit-after-fail'), 20);
});

test('attach rejects a second conflicting provider id', async () => {
  await seedUser('wh-attach-fail');
  const pending = await seedPendingEdit({
    userId: 'wh-attach-fail',
    id: 'edit_webhook_attach_fail',
    taskId: null,
  });
  await attachPhotoEditProviderTaskId(pending.id, 'pred_attach_a');
  await assert.rejects(
    () => attachPhotoEditProviderTaskId(pending.id, 'pred_attach_b'),
    (err: unknown) =>
      err instanceof PhotoEditProviderIdError && err.code === 'mismatch'
  );
  assert.equal((await findTask(pending.id))!.taskId, 'pred_attach_a');
});

test('terminal webhook with incomplete settle returns retryable 503', async () => {
  await seedUser('wh-incomplete');
  const pending = await seedPendingEdit({
    userId: 'wh-incomplete',
    id: 'edit_webhook_incomplete',
    taskId: 'pred_incomplete',
  });
  await assert.rejects(
    () =>
      deliverReplicate({
        jobId: pending.id,
        body: {
          id: 'pred_incomplete',
          status: 'succeeded',
          output: null,
        },
        queryProvider: async () => ({
          taskId: 'pred_incomplete',
          taskStatus: AITaskStatus.PENDING,
          taskInfo: {},
        }),
      }),
    (err: unknown) =>
      err instanceof PhotoEditWebhookError &&
      err.status === 503 &&
      /Settle incomplete/i.test(err.message)
  );
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.PENDING);
});

test('lost submit response still settles via webhook on pending row', async () => {
  await seedUser('wh-lost-submit');
  // Mimic generate accepted but local attach never ran.
  const pending = await seedPendingEdit({
    userId: 'wh-lost-submit',
    id: 'edit_webhook_lost_submit',
    taskId: null,
  });
  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_lost_submit',
      status: 'succeeded',
      output: 'https://cdn.example/lost.png',
    },
  });
  const settled = (await findTask(pending.id))!;
  assert.equal(settled.status, AITaskStatus.SUCCESS);
  assert.equal(settled.taskId, 'pred_lost_submit');
  assert.equal(await getBalance('wh-lost-submit'), 10);
});

test('conflicting provider ids from webhook then submit are rejected', async () => {
  await seedUser('wh-conflict');
  const pending = await seedPendingEdit({
    userId: 'wh-conflict',
    id: 'edit_webhook_conflict',
    taskId: null,
  });
  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_conflict_a',
      status: 'succeeded',
      output: 'https://cdn.example/conflict.png',
    },
  });
  await assert.rejects(
    () => attachPhotoEditProviderTaskId(pending.id, 'pred_conflict_b'),
    (err: unknown) =>
      err instanceof PhotoEditProviderIdError && err.code === 'mismatch'
  );
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.SUCCESS);
  assert.equal((await findTask(pending.id))!.taskId, 'pred_conflict_a');
});

test('isDefiniteProviderReject distinguishes 4xx from uncertain errors', () => {
  assert.equal(
    isDefiniteProviderReject(new Error('request failed with status: 422')),
    true
  );
  assert.equal(
    isDefiniteProviderReject(new Error('request failed with status: 502')),
    false
  );
  assert.equal(
    isDefiniteProviderReject(new Error('request failed with status: 408')),
    false
  );
  assert.equal(isDefiniteProviderReject(new Error('fetch failed')), false);
  assert.equal(
    isDefiniteProviderReject(
      new Error('Replicate API token is not configured')
    ),
    true
  );
});

test('uncertain submit leaves pending so webhook can finish', async () => {
  await seedUser('wh-uncertain');
  const pending = await seedPendingEdit({
    userId: 'wh-uncertain',
    id: 'edit_webhook_uncertain',
    taskId: null,
  });
  // Do not mark failed — same posture as isDefiniteProviderReject=false path.
  assert.equal(isDefiniteProviderReject(new Error('network timeout')), false);
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.PENDING);
  await deliverReplicate({
    jobId: pending.id,
    body: {
      id: 'pred_uncertain',
      status: 'succeeded',
      output: 'https://cdn.example/uncertain.png',
    },
  });
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.SUCCESS);
  assert.equal(await getBalance('wh-uncertain'), 10);
});

test('duplicate webhook plus poll does not double-refund a failure', async () => {
  await seedUser('wh-multi-fail');
  const pending = await seedPendingEdit({
    userId: 'wh-multi-fail',
    id: 'edit_webhook_multi_fail',
    taskId: 'pred_multi_fail',
  });
  const body = {
    id: 'pred_multi_fail',
    status: 'failed',
    error: 'nope',
    output: null,
  };
  await deliverReplicate({ jobId: pending.id, body });
  await deliverReplicate({ jobId: pending.id, body });
  await reconcilePhotoEditTask((await findTask(pending.id))!, {
    remote: {
      taskId: 'pred_multi_fail',
      taskStatus: AITaskStatus.FAILED,
      taskInfo: {},
    },
  });
  assert.equal((await findTask(pending.id))!.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('wh-multi-fail'), 20);
});
