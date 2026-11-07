import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const directory = await mkdtemp(join(tmpdir(), 'shipany-photo-reconcile-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-photo-reconcile-test-secret-not-a-real-credential',
  NODE_ENV: 'test',
  VITE_APP_URL: 'http://localhost:3000',
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
const { user } = await import('../src/config/db/schema');
const { AITaskStatus, createTask, findTask } =
  await import('../src/modules/ai-tasks/service');
const { getBalance, grant } = await import('../src/modules/credits/service');
const { PHOTO_EDIT_MISSING_PROVIDER_ID_MS, PHOTO_EDIT_STALE_MS } =
  await import('../src/modules/photo-editor/config');
const {
  PHOTO_EDIT_LIST_PROVIDER_BUDGET,
  reconcilePhotoEditTask,
  reconcileStalePhotoEdits,
  shouldReconcileOnList,
} = await import('../src/modules/photo-editor/reconcile');
const { envConfigs } = await import('../src/config');
const { GET: cronGet } =
  await import('../src/routes/api/cron/reconcile-photo-edits');

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function seedUser(id: string) {
  await db()
    .insert(user)
    .values({
      id,
      name: id,
      email: `${id}@example.test`,
    });
  await grant({ userId: id, credits: 20, description: 'test' });
}

async function seedPendingEdit(params: {
  userId: string;
  id: string;
  taskId?: string | null;
  createdAt: Date;
}) {
  const task = await createTask({
    id: params.id,
    userId: params.userId,
    mediaType: 'image',
    provider: 'replicate',
    model: 'openai/gpt-image-2.6-flare',
    prompt: 'Replace the background',
    costCredits: 10,
    options: { imageUrl: 'https://cdn.example/a.jpg', tool: 'general' },
  });
  const { aiTask } = await import('../src/config/db/schema');
  const { eq } = await import('drizzle-orm');
  await db()
    .update(aiTask)
    .set({
      taskId: params.taskId === undefined ? 'pred_test' : params.taskId,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
      status: AITaskStatus.PENDING,
    })
    .where(eq(aiTask.id, task.id));
  return (await findTask(task.id))!;
}

test('exports stale thresholds for photo edits', () => {
  assert.equal(PHOTO_EDIT_MISSING_PROVIDER_ID_MS, 180_000);
  assert.equal(PHOTO_EDIT_STALE_MS, 15 * 60_000);
  assert.equal(PHOTO_EDIT_LIST_PROVIDER_BUDGET, 3);
});

test('shouldReconcileOnList caps fresh provider polls and always settles stale', () => {
  const now = Date.now();
  const fresh = {
    id: 'edit_list_fresh',
    status: AITaskStatus.PENDING,
    taskId: 'pred',
    createdAt: new Date(now - 5_000),
  } as any;
  const stale = {
    id: 'edit_list_stale',
    status: AITaskStatus.PENDING,
    taskId: 'pred',
    createdAt: new Date(now - PHOTO_EDIT_STALE_MS - 1),
  } as any;
  const missingId = {
    id: 'edit_list_noid',
    status: AITaskStatus.PENDING,
    taskId: null,
    createdAt: new Date(now - PHOTO_EDIT_MISSING_PROVIDER_ID_MS - 1),
  } as any;

  assert.deepEqual(shouldReconcileOnList(fresh, now, 1), {
    reconcile: true,
    consumesProviderBudget: true,
  });
  assert.deepEqual(shouldReconcileOnList(fresh, now, 0), {
    reconcile: false,
    consumesProviderBudget: false,
  });
  assert.deepEqual(shouldReconcileOnList(stale, now, 0), {
    reconcile: true,
    consumesProviderBudget: true,
  });
  assert.deepEqual(shouldReconcileOnList(missingId, now, 0), {
    reconcile: true,
    consumesProviderBudget: false,
  });
});

test('provider success with an image settles the task and keeps the charge', async () => {
  await seedUser('reconcile-ok');
  const createdAt = new Date(Date.now() - 20_000);
  const pending = await seedPendingEdit({
    userId: 'reconcile-ok',
    id: 'edit_reconcile_ok_001',
    createdAt,
  });
  assert.equal(await getBalance('reconcile-ok'), 10);

  const settled = await reconcilePhotoEditTask(pending, {
    now: Date.now(),
    queryProvider: async () => ({
      taskId: 'pred_test',
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: {
        images: [
          {
            id: '',
            createTime: new Date(),
            imageUrl: 'https://cdn.example/out.png',
          },
        ],
      },
    }),
    persistOutput: async (url) => url + '?stored=1',
  });

  assert.equal(settled.status, AITaskStatus.SUCCESS);
  assert.equal(await getBalance('reconcile-ok'), 10);
  const stored = JSON.parse(settled.taskResult || '{}');
  assert.equal(
    stored.images[0].imageUrl,
    'https://cdn.example/out.png?stored=1'
  );
});

test('provider success without a recoverable image fails and refunds', async () => {
  await seedUser('reconcile-gone');
  const pending = await seedPendingEdit({
    userId: 'reconcile-gone',
    id: 'edit_reconcile_gone_001',
    createdAt: new Date(Date.now() - 60_000),
  });
  assert.equal(await getBalance('reconcile-gone'), 10);

  const settled = await reconcilePhotoEditTask(pending, {
    queryProvider: async () => ({
      taskId: 'pred_test',
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: { images: undefined, status: 'succeeded' },
    }),
    persistOutput: async (url) => url,
  });

  assert.equal(settled.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('reconcile-gone'), 20);
});

test('stale pending jobs fail and refund when the provider is still unfinished', async () => {
  await seedUser('reconcile-stale');
  const pending = await seedPendingEdit({
    userId: 'reconcile-stale',
    id: 'edit_reconcile_stale_001',
    createdAt: new Date(Date.now() - PHOTO_EDIT_STALE_MS - 1_000),
  });

  const settled = await reconcilePhotoEditTask(pending, {
    now: Date.now(),
    queryProvider: async () => ({
      taskId: 'pred_test',
      taskStatus: AITaskStatus.PENDING,
      taskInfo: {},
    }),
    persistOutput: async (url) => url,
  });

  assert.equal(settled.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('reconcile-stale'), 20);
});

test('fresh pending jobs stay pending on transient provider errors', async () => {
  await seedUser('reconcile-transient');
  const pending = await seedPendingEdit({
    userId: 'reconcile-transient',
    id: 'edit_reconcile_transient_001',
    createdAt: new Date(Date.now() - 5_000),
  });

  const settled = await reconcilePhotoEditTask(pending, {
    now: Date.now(),
    queryProvider: async () => {
      throw new Error('Photo edit status query failed: 502');
    },
    persistOutput: async (url) => url,
  });

  assert.equal(settled.status, AITaskStatus.PENDING);
  assert.equal(await getBalance('reconcile-transient'), 10);
});

test('stale pending jobs fail when provider queries keep throwing', async () => {
  await seedUser('reconcile-stale-err');
  const pending = await seedPendingEdit({
    userId: 'reconcile-stale-err',
    id: 'edit_reconcile_stale_err_001',
    createdAt: new Date(Date.now() - PHOTO_EDIT_STALE_MS - 5_000),
  });

  const settled = await reconcilePhotoEditTask(pending, {
    now: Date.now(),
    queryProvider: async () => {
      throw new Error('No output image');
    },
    persistOutput: async (url) => url,
  });

  assert.equal(settled.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('reconcile-stale-err'), 20);
});

test('missing provider id past the short window fails without double-charging', async () => {
  await seedUser('reconcile-noid');
  const pending = await seedPendingEdit({
    userId: 'reconcile-noid',
    id: 'edit_reconcile_noid_001',
    taskId: null,
    createdAt: new Date(Date.now() - PHOTO_EDIT_MISSING_PROVIDER_ID_MS - 1_000),
  });

  const settled = await reconcilePhotoEditTask(pending, {
    now: Date.now(),
    queryProvider: async () => {
      throw new Error('should not query');
    },
    persistOutput: async (url) => url,
  });

  assert.equal(settled.status, AITaskStatus.FAILED);
  assert.equal(await getBalance('reconcile-noid'), 20);
});

test('reconcileStalePhotoEdits sweeps old pending photo edits', async () => {
  await seedUser('reconcile-sweep');
  await seedPendingEdit({
    userId: 'reconcile-sweep',
    id: 'edit_reconcile_sweep_old',
    createdAt: new Date(Date.now() - PHOTO_EDIT_STALE_MS - 60_000),
  });
  await seedPendingEdit({
    userId: 'reconcile-sweep',
    id: 'edit_reconcile_sweep_new',
    createdAt: new Date(Date.now() - 10_000),
  });

  const result = await reconcileStalePhotoEdits({
    limit: 10,
    now: Date.now(),
    queryProvider: async () => ({
      taskId: 'pred_test',
      taskStatus: AITaskStatus.PENDING,
      taskInfo: {},
    }),
    persistOutput: async (url) => url,
  });

  assert.equal(result.checked, 1);
  assert.equal(result.failed, 1);
  assert.equal(
    (await findTask('edit_reconcile_sweep_old'))!.status,
    AITaskStatus.FAILED
  );
  assert.equal(
    (await findTask('edit_reconcile_sweep_new'))!.status,
    AITaskStatus.PENDING
  );
  assert.equal(await getBalance('reconcile-sweep'), 10);
});

test('concurrent reconcile of one success settles once without double write', async () => {
  await seedUser('reconcile-race');
  const pending = await seedPendingEdit({
    userId: 'reconcile-race',
    id: 'edit_reconcile_race_001',
    createdAt: new Date(Date.now() - 30_000),
  });
  let queries = 0;
  const deps = {
    now: Date.now(),
    queryProvider: async () => {
      queries += 1;
      return {
        taskId: 'pred_test',
        taskStatus: AITaskStatus.SUCCESS,
        taskInfo: {
          images: [
            {
              id: '',
              createTime: new Date(),
              imageUrl: 'https://cdn.example/race.png',
            },
          ],
        },
      };
    },
    persistOutput: async (url: string) => url,
  };
  const results = await Promise.all([
    reconcilePhotoEditTask(pending, deps),
    reconcilePhotoEditTask(pending, deps),
  ]);
  assert.ok(results.every((row) => row.status === AITaskStatus.SUCCESS));
  assert.equal(await getBalance('reconcile-race'), 10);
  const [final] = await Promise.all([findTask(pending.id)]);
  assert.equal(final!.status, AITaskStatus.SUCCESS);
  assert.ok(queries >= 1);
});

test('cron reconcile rejects missing or wrong secrets and accepts a match', async () => {
  const previous = envConfigs.cron_secret;
  envConfigs.cron_secret = 'test-cron-secret-value-32chars!!';
  try {
    const denied = await cronGet({
      request: new Request(
        'http://localhost:3000/api/cron/reconcile-photo-edits'
      ),
    });
    assert.equal(denied.status, 401);

    const wrong = await cronGet({
      request: new Request(
        'http://localhost:3000/api/cron/reconcile-photo-edits',
        { headers: { authorization: 'Bearer wrong-secret' } }
      ),
    });
    assert.equal(wrong.status, 401);

    const ok = await cronGet({
      request: new Request(
        'http://localhost:3000/api/cron/reconcile-photo-edits',
        {
          headers: {
            authorization: 'Bearer test-cron-secret-value-32chars!!',
          },
        }
      ),
    });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.code, 0);
    assert.equal(typeof body.data.checked, 'number');
  } finally {
    envConfigs.cron_secret = previous;
  }
});
