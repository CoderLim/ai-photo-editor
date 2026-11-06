import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';

const directory = await mkdtemp(join(tmpdir(), 'photo-guest-trial-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: 'file:' + directory + '/guest.db',
  AUTH_SECRET: 'test-only-do-not-use-in-production-guest-credits',
  NODE_ENV: 'test',
  ANONYMOUS_TRIAL_ENABLED: 'true',
  VITE_APP_URL: 'http://localhost:3000',
});
execFileSync(process.execPath, [
  'node_modules/drizzle-kit/bin.cjs', 'push', '--dialect=sqlite',
  '--schema=./src/config/db/schema.sqlite.ts',
  '--url=' + process.env.DATABASE_URL, '--force',
], { env: process.env, stdio: 'pipe' });

const { db } = await import('../src/core/db');
const { credit, aiTask, freeCreditClaim, user } = await import('../src/config/db/schema');
const { getBalance, revoke } = await import('../src/modules/credits/service');
const { createTask, findTask } = await import('../src/modules/ai-tasks/service');
const { claimGuestTrial, grantSignupBonus, linkAnonymousCredits, GuestTrialLimitError } =
  await import('../src/modules/guest-credits/service');

after(async () => { await rm(directory, { recursive: true, force: true }); });

async function addUser(id: string, guest: boolean) {
  await db().insert(user).values({
    id, name: id, email: id + '@example.test', isAnonymous: guest,
  });
}
function claim(id: string, ip = '203.0.113.9') {
  return claimGuestTrial({
    request: new Request('https://getaiphotoeditor.com/api/guest/trial', {
      headers: { 'cf-connecting-ip': ip },
    }),
    userId: id, userEmail: id + '@example.test',
  });
}

test('claim is idempotent and sliding IP limit blocks third guest without a partial grant', async () => {
  await addUser('guestA', true);
  await addUser('guestB', true);
  await addUser('guestC', true);
  assert.equal((await claim('guestA')).granted, true);
  assert.equal((await claim('guestA')).granted, false);
  assert.equal(await getBalance('guestA'), 10);
  assert.equal((await claim('guestB')).granted, true);
  await assert.rejects(() => claim('guestC'), (error: any) =>
    error instanceof GuestTrialLimitError && error.message === 'GUEST_TRIAL_RATE_LIMITED');
  assert.equal(await getBalance('guestC'), 0);
  const claimRows = await db().select().from(freeCreditClaim);
  assert.equal(claimRows.filter((row: any) => row.kind === 'guest_trial').length, 2);
});

test('concurrent claims from one public IP never grant more than two trial credits', async () => {
  const ip = '198.51.100.77';
  const ids = Array.from({ length: 16 }, (_, i) => 'concurrentGuest' + i);
  for (const id of ids) await addUser(id, true);

  // Different anonymous users race for the same global two-claim IP quota.
  // Assert persisted results, not only response status: some SQLite drivers
  // may surface a transient writer contention error under heavy concurrency.
  const outcomes = await Promise.allSettled(ids.map((id) => claim(id, ip)));
  const granted = outcomes.filter((outcome) =>
    outcome.status === 'fulfilled' && outcome.value.granted
  ).length;
  const balances = await Promise.all(ids.map((id) => getBalance(id)));
  const minted = balances.filter((value) => value === 10).length;
  assert.ok(granted <= 2, 'only two simultaneous claims may succeed');
  assert.equal(minted, granted, 'every response must match the committed credit ledger');
  assert.ok(balances.every((value) => value === 0 || value === 10));
  const ledger = (await db().select().from(freeCreditClaim))
    .filter((row: any) => row.kind === 'guest_trial' && ids.includes(row.userId));
  assert.equal(ledger.length, granted, 'no orphan claims or partial grants');

  // Ensure the remaining capacity is consumed, then confirm a new guest fails.
  for (let i = 0; i < 2 - granted; i++) {
    const next = 'concurrentFill' + i;
    await addUser(next, true);
    assert.equal((await claim(next, ip)).granted, true);
  }
  await addUser('concurrentThird', true);
  await assert.rejects(() => claim('concurrentThird', ip),
    (error: any) => error instanceof GuestTrialLimitError &&
      error.message === 'GUEST_TRIAL_RATE_LIMITED');
  assert.equal(await getBalance('concurrentThird'), 0);
});

test('registered sign-up bonus is once only, not for an anonymous identity', async () => {
  await addUser('registered1', false);
  await addUser('registered2', false);
  assert.equal(await grantSignupBonus({ userId: 'registered1' }), true);
  assert.equal(await grantSignupBonus({ userId: 'registered1' }), false);
  assert.equal(await getBalance('registered1'), 10);
  await assert.rejects(() => grantSignupBonus({ userId: 'guestC' }));
  assert.equal(await getBalance('guestC'), 0);
});

test('first guest link transfers the ledger and tasks; failed jobs restore to the registered user', async () => {
  const task = await createTask({
    userId: 'guestA', id: 'edit_guestA_test1', mediaType: 'image',
    provider: 'test', model: 'test', prompt: 'enhance',
    costCredits: 10,
  });
  assert.equal(await getBalance('guestA'), 0);
  await linkAnonymousCredits('guestA', 'registered1');
  assert.equal(await getBalance('guestA'), 0);
  assert.equal(await getBalance('registered1'), 10);
  assert.equal((await findTask(task.id))?.userId, 'registered1');
  await linkAnonymousCredits('guestA', 'registered1'); // idempotent callback
  assert.equal(await getBalance('registered1'), 10);
  const consumed = JSON.parse(task.taskInfo || '{}');
  await revoke(consumed.creditId);
  assert.equal(await getBalance('registered1'), 20);
  await assert.rejects(() => createTask({
    userId: 'guestA', id: 'edit_guestA_test2', mediaType: 'image',
    provider: 'test', model: 'test', prompt: 'retry',
    costCredits: 10,
  }));
});

test('second guest link into the same old account cannot import free credits', async () => {
  const task = await createTask({
    userId: 'guestB', id: 'edit_guestB_test1', mediaType: 'image',
    provider: 'test', model: 'test', prompt: 'enhance',
    costCredits: 10,
  });
  const before = await getBalance('registered1');
  await linkAnonymousCredits('guestB', 'registered1');
  assert.equal(await getBalance('registered1'), before);
  assert.equal((await findTask(task.id))?.userId, 'registered1');
  const ledger = await db().select().from(credit).where(eq(credit.userId, 'guestB'));
  assert.ok(ledger.length > 0, 'the guest keeps its already charged ledger');
  const taskRows = await db().select().from(aiTask).where(eq(aiTask.userId, 'registered1'));
  assert.ok(taskRows.length >= 2);
});

test('Better Auth upgrades a guest to a new signup and transfers the free balance', async () => {
  const { getAuth } = await import('../src/core/auth');
  const auth = getAuth();
  const anon = await auth.handler(new Request('http://localhost:3000/api/auth/sign-in/anonymous', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
    body: '{}',
  }));
  assert.equal(anon.status, 200, anon.statusText);
  const anonymousBody = await anon.clone().json();
  const guestId = anonymousBody.user.id as string;
  const cookie = (anon.headers.getSetCookie?.() || [])
    .map((line: string) => line.split(';')[0]?.trim())
    .filter(Boolean).join('; ');
  assert.ok(cookie.includes('session_token'));
  assert.equal((await claim(guestId, '198.51.100.8')).granted, true);
  const signup = await auth.handler(new Request('http://localhost:3000/api/auth/sign-up/email', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify({
      name: 'Linked User', email: 'linked-user@example.test', password: 'secure-test-password',
    }),
  }));
  const body = await signup.json();
  assert.equal(signup.status, 200, JSON.stringify(body));
  assert.notEqual(body.user.id, guestId);
  assert.equal(await getBalance(body.user.id), 20);
  const [guestRow] = await db().select().from(user).where(eq(user.id, guestId));
  assert.equal(guestRow.linkedUserId, body.user.id);
  assert.equal(await getBalance(guestId), 0);
});
