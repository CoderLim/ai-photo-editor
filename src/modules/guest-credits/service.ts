import { and, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { envConfigs } from '@/config';
import { aiTask, credit, freeCreditClaim, guestTrialIpQuota, user } from '@/config/db/schema';
import { db } from '@/core/db';
import { atomic, AtomicGuardError, guard } from '@/core/db/atomic';
import { getSnowId, getUuid } from '@/lib/hash';

export const GUEST_TRIAL_CREDITS = 10;
export const SIGNUP_BONUS_CREDITS = 10;

export class GuestTrialLimitError extends Error {
  constructor(message = 'GUEST_TRIAL_RATE_LIMITED') { super(message); }
}
export function guestTrialEnabled() {
  // Rollout off until schema migration is deployed.
  return envConfigs.anonymous_trial_enabled === 'true';
}

function grantRecord(userId: string, userEmail: string, amount: number, label: string) {
  return {
    id: getUuid(), userId, userEmail, transactionNo: getSnowId(),
    transactionType: 'grant', transactionScene: 'gift', credits: amount,
    remainingCredits: amount, status: 'active', description: label,
  } satisfies typeof credit.$inferInsert;
}

async function claimExists(id: string): Promise<boolean> {
  const rows = await db().select({ id: freeCreditClaim.id })
    .from(freeCreditClaim).where(eq(freeCreditClaim.id, id)).limit(1);
  return rows.length > 0;
}

function getTrustedIp(request: Request): string | null {
  const ip = request.headers.get('cf-connecting-ip')?.trim() || '';
  if (ip && ip.length <= 45 && /^[0-9a-fA-F:.]+$/.test(ip)) return ip;
  if (process.env.NODE_ENV !== 'production') return 'local-development';
  return null; // Never trust browser-supplied X-Forwarded-For.
}

async function hashIp(ip: string): Promise<string> {
  const secret = envConfigs.auth_secret;
  if (!secret) throw new Error('AUTH_SECRET is required for trial claims');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('trial-ip:' + ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function insertQuotaIfMissing(q: any, key: string) {
  const insert = q.insert(guestTrialIpQuota).values({ id: key });
  return envConfigs.database_provider === 'mysql'
    ? insert.onDuplicateKeyUpdate({ set: { id: sql`${guestTrialIpQuota.id}` } })
    : insert.onConflictDoNothing();
}

/**
 * One guest grant per account, two per trusted public IP over any rolling 24h.
 * All quota, claim and credit writes are one atomic D1 batch / SQL transaction.
 */
export async function claimGuestTrial(params: {
  request: Request; userId: string; userEmail: string;
}) {
  const claimId = 'guest:' + params.userId;
  if (await claimExists(claimId)) return { granted: false };
  if (!guestTrialEnabled()) throw new GuestTrialLimitError('GUEST_TRIAL_DISABLED');
  const ip = getTrustedIp(params.request);
  if (!ip) throw new GuestTrialLimitError();
  const key = await hashIp(ip);
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    await atomic((q) => [
      guard({ table: user, column: 'id', where: eq(user.id, params.userId),
        require: and(eq(user.isAnonymous, true), isNull(user.linkedUserId))!,
        message: 'Anonymous session is no longer valid' }),
      insertQuotaIfMissing(q, key),
      guard({ table: guestTrialIpQuota, column: 'id', where: eq(guestTrialIpQuota.id, key),
        require: or(isNull(guestTrialIpQuota.previousAt), lte(guestTrialIpQuota.previousAt, cutoff))!,
        message: 'GUEST_TRIAL_RATE_LIMITED' }),
      q.update(guestTrialIpQuota).set({
        previousAt: sql`case when ${gt(guestTrialIpQuota.latestAt, cutoff)} then ${guestTrialIpQuota.latestAt} else null end`,
        latestAt: now,
      }).where(eq(guestTrialIpQuota.id, key)),
      q.insert(freeCreditClaim).values({ id: claimId, userId: params.userId, kind: 'guest_trial' }),
      q.insert(credit).values(grantRecord(
        params.userId, params.userEmail, GUEST_TRIAL_CREDITS, 'Anonymous trial credits'
      )),
    ]);
    return { granted: true };
  } catch (error) {
    if (await claimExists(claimId)) return { granted: false };
    if (error instanceof AtomicGuardError && error.message === 'GUEST_TRIAL_RATE_LIMITED')
      throw new GuestTrialLimitError();
    throw error;
  }
}

/** One signup gift per registered account; never call for anonymous creation. */
export async function grantSignupBonus(params: { userId: string; userEmail?: string }) {
  const id = 'signup:' + params.userId;
  if (await claimExists(id)) return false;
  try {
    await atomic((q) => [
      guard({ table: user, column: 'id', where: eq(user.id, params.userId),
        require: eq(user.isAnonymous, false), message: 'Not a registered account' }),
      q.insert(freeCreditClaim).values({ id, userId: params.userId, kind: 'signup_bonus' }),
      q.insert(credit).values(grantRecord(
        params.userId, params.userEmail || '', SIGNUP_BONUS_CREDITS, 'Signup bonus'
      )),
    ]);
    return true;
  } catch (error) {
    if (await claimExists(id)) return false;
    throw error;
  }
}

/**
 * Keep the source guest (plugin disableDeleteAnonymousUser=true) to retain
 * foreign keys. Mark it linked before moving anything: createTask also guards
 * this flag so concurrent guest submissions cannot race the migration.
 * Only the first merge per target account includes credits; later merges move
 * history alone, preventing anonymous re-claims from funding an old account.
 */
export async function linkAnonymousCredits(guestId: string, targetId: string) {
  if (!guestId || !targetId || guestId === targetId) return;
  const mergeId = 'merge:' + targetId;
  const guest = await db().select({ id: user.id, isAnonymous: user.isAnonymous, linkedUserId: user.linkedUserId })
    .from(user).where(eq(user.id, guestId)).limit(1);
  if (!guest.length || !guest[0].isAnonymous || guest[0].linkedUserId) {
    if (guest[0]?.linkedUserId === targetId) return;
    throw new Error('Anonymous account already linked');
  }
  const move = (q: any, withCredits: boolean) => [
    guard({ table: user, column: 'id', where: eq(user.id, guestId),
      require: and(eq(user.isAnonymous, true), isNull(user.linkedUserId))!,
      message: 'Anonymous account already linked' }),
    q.update(user).set({ linkedUserId: targetId }).where(eq(user.id, guestId)),
    ...(withCredits ? [
      q.insert(freeCreditClaim).values({
        id: mergeId, userId: targetId, kind: 'guest_merge', sourceGuestId: guestId,
      }),
      q.update(credit).set({ userId: targetId }).where(eq(credit.userId, guestId)),
    ] : []),
    q.update(aiTask).set({ userId: targetId }).where(eq(aiTask.userId, guestId)),
  ];
  const firstMerge = !(await claimExists(mergeId));
  try {
    await atomic((q) => move(q, firstMerge));
  } catch (error) {
    if (firstMerge && await claimExists(mergeId)) {
      await atomic((q) => move(q, false));
      return;
    }
    throw error;
  }
}
