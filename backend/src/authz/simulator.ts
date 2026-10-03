// Development Role Simulator — a temporary IDENTITY SOURCE, not an authorization shortcut.
//
// It issues a server-signed session token that names one of five server-owned identities. The
// token carries NO role: the role is resolved from the active policy on every request, so a policy
// change or revocation hits already-open sessions at their next protected call. When the real login
// arrives, only this identity source is replaced (requireOperator keeps resolving roles the same way).
//
// Enabled only with ROLE_SIMULATOR_ENABLED=true in AUTH_MODE=demo, never in production unless
// ROLE_SIMULATOR_ALLOW_PRODUCTION=true is set explicitly — and NEVER on a real production deployment
// (lib/deployment.ts tier 'production'), whatever the flags say. While enabled, self-declared
// X-Operator-* headers are refused.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isRealProduction } from '../lib/deployment.js';

export interface SimulatedIdentity {
  id: string;
  name: string;
  email: string;
  /** Professional title (Operator.ruolo): drives e.g. the diary author type. */
  ruolo: string;
  /** Legacy User.role used only if the policy assignment is ever removed. */
  userRole: 'OPERATOR' | 'MANAGER';
  /** Role assigned in the baseline policy (informative; the active policy decides). */
  baselineRole: string;
}

export const SIMULATED_IDENTITIES: readonly SimulatedIdentity[] = [
  {
    id: 'SIM-ADMIN',
    name: 'Amministratore',
    email: 'sim-admin@clinicos.local',
    ruolo: 'altro',
    userRole: 'MANAGER',
    baselineRole: 'administrator',
  },
  {
    id: 'SIM-SUPERVISOR-1',
    name: 'Supervisore 1',
    email: 'sim-supervisor-1@clinicos.local',
    ruolo: 'coordinatore',
    userRole: 'MANAGER',
    baselineRole: 'supervisor',
  },
  {
    id: 'SIM-DOCTOR-1',
    name: 'Medico 1',
    email: 'sim-doctor-1@clinicos.local',
    ruolo: 'medico',
    userRole: 'OPERATOR',
    baselineRole: 'doctor',
  },
  {
    id: 'SIM-NURSE-1',
    name: 'Infermiere 1',
    email: 'sim-nurse-1@clinicos.local',
    ruolo: 'infermiere',
    userRole: 'OPERATOR',
    baselineRole: 'nurse',
  },
  {
    id: 'SIM-OSS-1',
    name: 'OSS 1',
    email: 'sim-oss-1@clinicos.local',
    ruolo: 'oss',
    userRole: 'OPERATOR',
    baselineRole: 'oss',
  },
];

const BY_ID = new Map(SIMULATED_IDENTITIES.map((identity) => [identity.id, identity]));
export const SIMULATOR_TOKEN_PREFIX = 'sim.';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export function simulatedIdentity(id: string): SimulatedIdentity | undefined {
  return BY_ID.get(id);
}

export function simulatorEnabled(authMode: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if ((env.ROLE_SIMULATOR_ENABLED || '').trim().toLowerCase() !== 'true') return false;
  if (authMode !== 'demo') return false;
  // Phase 9: no flag combination re-enables the simulator on a real production deployment.
  if (isRealProduction(env)) return false;
  if (env.NODE_ENV === 'production') {
    return (env.ROLE_SIMULATOR_ALLOW_PRODUCTION || '').trim().toLowerCase() === 'true';
  }
  return true;
}

let processSecret: Buffer | null = null;
function secret(env: NodeJS.ProcessEnv = process.env): Buffer {
  const configured = env.ROLE_SIMULATOR_SECRET;
  if (configured && configured.length >= 32) return Buffer.from(configured, 'utf8');
  // Development default: per-process secret (sessions end when the backend restarts).
  processSecret ??= randomBytes(32);
  return processSecret;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueSimulatorToken(
  identityId: string,
  now = Date.now(),
): { token: string; expiresAt: string } {
  if (!BY_ID.has(identityId)) throw new Error('unknown_simulated_identity');
  const exp = now + TOKEN_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      sub: identityId,
      sid: randomBytes(9).toString('base64url'),
      iat: now,
      exp,
    }),
    'utf8',
  ).toString('base64url');
  return {
    token: `${SIMULATOR_TOKEN_PREFIX}${payload}.${sign(payload)}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

// Phase 9: server-side logout. Revoked session ids are kept until their own expiry (bounded by the
// token TTL), so a copied token stops working at logout instead of living 12 h. In-memory: a
// backend restart already invalidates every session signed with the per-process secret; with a
// configured ROLE_SIMULATOR_SECRET a restart forgets revocations (demo only, synthetic data).
const revokedSessions = new Map<string, number>();
const MAX_REVOKED = 10_000;

function tokenClaims(token: string): { sub: string; sid: string; exp: number } | null {
  if (!token.startsWith(SIMULATOR_TOKEN_PREFIX) || token.length > 512) return null;
  const [payload, signature] = token.slice(SIMULATOR_TOKEN_PREFIX.length).split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: number;
      sub?: string;
      sid?: string;
      exp?: number;
    };
    if (claims.v !== 1 || typeof claims.sub !== 'string' || typeof claims.exp !== 'number')
      return null;
    return { sub: claims.sub, sid: String(claims.sid ?? ''), exp: claims.exp };
  } catch {
    return null;
  }
}

/** Revoke a valid simulator session (logout). Returns false for an invalid/unknown token. */
export function revokeSimulatorToken(token: string, now = Date.now()): boolean {
  const claims = tokenClaims(token);
  if (!claims || !claims.sid || claims.exp <= now) return false;
  if (revokedSessions.size >= MAX_REVOKED) {
    for (const [sid, exp] of revokedSessions) if (exp <= now) revokedSessions.delete(sid);
    // Still full (demo flood): drop the oldest revocation — bounded memory beats a perfect list.
    if (revokedSessions.size >= MAX_REVOKED) {
      const oldest = revokedSessions.keys().next().value;
      if (oldest !== undefined) revokedSessions.delete(oldest);
    }
  }
  revokedSessions.set(claims.sid, claims.exp);
  return true;
}

/** Returns the identity id of a valid, unexpired token; null otherwise (never throws). */
export function verifySimulatorToken(token: string, now = Date.now()): string | null {
  const claims = tokenClaims(token);
  if (!claims) return null;
  if (claims.exp <= now || !BY_ID.has(claims.sub)) return null;
  if (claims.sid && revokedSessions.has(claims.sid)) return null;
  return claims.sub;
}

/** Idempotently provisions the User + Operator rows of a simulated identity (simulator only). */
export async function ensureSimulatedIdentity(identity: SimulatedIdentity): Promise<void> {
  try {
    await upsertSimulatedIdentity(identity);
  } catch (error) {
    // Two first logins at the same time race on the unique email/id: the loser simply re-runs.
    if ((error as { code?: string })?.code !== 'P2002') throw error;
    await upsertSimulatedIdentity(identity);
  }
}

async function upsertSimulatedIdentity(identity: SimulatedIdentity): Promise<void> {
  const { prisma } = await import('../lib/prisma.js');
  const user = await prisma.user.upsert({
    where: { email: identity.email },
    update: { fullName: identity.name, isActive: true },
    create: {
      email: identity.email,
      passwordHash: 'ROLE_SIMULATOR_NO_LOCAL_LOGIN',
      fullName: identity.name,
      role: identity.userRole,
    },
  });
  await prisma.operator.upsert({
    where: { id: identity.id },
    update: { ruolo: identity.ruolo },
    create: { id: identity.id, userId: user.id, ruolo: identity.ruolo, department: 'Simulazione' },
  });
}
