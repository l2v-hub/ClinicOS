
UNTRUSTED SOURCE backend/src/ai/auth.ts
Git blob: 3de884c7f60d7dfdcc22dd703fbaca11b55c2174
Full SHA256: 754bf995a67497ac98712599e94de2f6c269eb671c116a2d09348a716db6b720
Full bytes: 7660; contiguous range [0,7660)
---BEGIN EXACT SOURCE---
// Authorization for the AI import flow (REQ-019).
//
// Production identity is verified through Entra/OIDC and resolved server-side.
// Self-declared operator headers remain available only in explicit/non-production
// demo mode so local fixtures keep working without becoming a production bypass.

import type { NextFunction, Request, Response } from 'express';
import { entraConfig, requireEntraOperator } from '../lib/entra-auth.js';
import {
  SIMULATOR_TOKEN_PREFIX,
  simulatedIdentity,
  simulatorEnabled,
  verifySimulatorToken,
} from '../authz/simulator.js';
import type { ResolvedIdentity } from '../authz/types.js';
import { isRealProduction } from '../lib/deployment.js';

export interface Operator {
  id: string;
  /**
   * Compat role string read by the pre-existing services (data scope: admin|manager = facility).
   * Resolved server-side from the active policy (assigned role) or kept as verified (legacy).
   */
  role: string;
  name?: string;
  /** Role of the Identity → Role → Capability policy (e.g. doctor, nurse). Server-resolved. */
  appRole?: string;
}

// Accept the app's role values plus canonical names; everything else is forbidden.
const ALLOWED_ROLES = new Set(['operatore', 'admin', 'operator', 'manager']);

interface DemoIdentity extends Operator {
  aliases: readonly string[];
}

// Production demo access is intentionally limited to two synthetic seed identities. The role is
// server-owned: changing X-Operator-Role cannot promote the operator profile to administrator.
const DEMO_IDENTITIES: readonly DemoIdentity[] = [
  {
    id: 'SEED-OP-001',
    role: 'operatore',
    name: 'Laura Bianchi',
    aliases: ['op1', 'SEED-OP-001'],
  },
  {
    id: 'SEED-OP-004',
    role: 'admin',
    name: 'Admin Demo',
    aliases: ['admin1', 'SEED-OP-004'],
  },
];

const DEMO_IDENTITY_BY_ALIAS = new Map(
  DEMO_IDENTITIES.flatMap((identity) =>
    identity.aliases.map((alias) => [alias, identity] as const),
  ),
);

function explicitTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function productionDemoAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const expiresAt = Date.parse(env.DEMO_AUTH_EXPIRES_AT || '');
  return (
    env.NODE_ENV === 'production' &&
    !isRealProduction(env) &&
    (env.AUTH_MODE || '').trim().toLowerCase() === 'demo' &&
    explicitTrue(env.ALLOW_PRODUCTION_DEMO_AUTH) &&
    env.DEMO_DATASET_ID === 'synthetic-v1' &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now()
  );
}

// Augment Express Request with the resolved operator (no global d.ts needed).
export interface AuthedRequest extends Request {
  operator?: Operator;
  /** Which identity source established `operator` (read by authz/request-context). */
  identitySource?: ResolvedIdentity['identitySource'];
}

export type OperatorAuthMode = 'entra' | 'demo' | 'disabled';

export function operatorAuthMode(env: NodeJS.ProcessEnv = process.env): OperatorAuthMode {
  const configured = (env.AUTH_MODE || '').trim().toLowerCase();
  if (configured === 'entra') return 'entra';
  if (configured === 'demo') {
    // Phase 9: demo identities never exist on a real production deployment (fail closed).
    if (isRealProduction(env)) return 'disabled';
    return env.NODE_ENV === 'development' ||
      env.NODE_ENV === 'test' ||
      productionDemoAuthEnabled(env)
      ? 'demo'
      : 'disabled';
  }
  // Missing, misspelled, and unsupported modes always fail closed. Synthetic
  // operator headers are accepted only after explicit local/test opt-in.
  return 'disabled';
}

/**
 * The single identity gate: establishes WHO the caller is (Entra token, Role Simulator session or
 * the legacy demo headers). The ROLE is resolved afterwards from the active policy by
 * authz/request-context.ts#ensureAuthorization (route gate, Tool Layer, /authz, /auth/me).
 * Idempotent within one request.
 */
export function requireOperator(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.operator && req.identitySource) {
    next();
    return;
  }
  const finish = (source: ResolvedIdentity['identitySource']) => {
    req.identitySource = source;
    next();
  };
  const mode = operatorAuthMode();
  if (mode === 'entra') {
    const config = entraConfig();
    if (!config) {
      res.status(503).json({
        error: 'Autenticazione Entra non configurata',
        code: 'auth_configuration_missing',
      });
      return;
    }
    requireEntraOperator(config)(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      finish('entra');
    });
    return;
  }
  if (mode === 'disabled') {
    res.status(503).json({
      error: 'Endpoint clinici disabilitati: configurare esplicitamente AUTH_MODE',
      code: 'auth_disabled',
    });
    return;
  }

  if (simulatorEnabled(mode)) {
    // Role Simulator: only a server-signed session names the identity; X-Operator-* are ignored,
    // so a client can never self-assign identity or role.
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const identityId = token.startsWith(SIMULATOR_TOKEN_PREFIX)
      ? verifySimulatorToken(token)
      : null;
    const identity = identityId ? simulatedIdentity(identityId) : undefined;
    if (!identity) {
      res.status(401).json({
        error: 'Sessione non valida: scegli un profilo dal simulatore',
        code: 'simulator_session_required',
      });
      return;
    }
    req.operator = {
      id: identity.id,
      role: identity.userRole === 'MANAGER' ? 'manager' : 'operator',
      name: identity.name,
    };
    res.setHeader('X-ClinicOS-Auth-Mode', 'demo-simulator');
    finish('simulator');
    return;
  }

  const id = (req.header('X-Operator-Id') || '').trim();
  const role = (req.header('X-Operator-Role') || '').trim().toLowerCase();

  if (!id || !role) {
    res.status(401).json({ error: 'Autenticazione richiesta: operatore non identificato' });
    return;
  }
  if (!ALLOWED_ROLES.has(role)) {
    res.status(403).json({ error: 'Ruolo non autorizzato per l’importazione' });
    return;
  }
  const boundedId = id.slice(0, 64);
  const demoIdentity = DEMO_IDENTITY_BY_ALIAS.get(boundedId);
  if (productionDemoAuthEnabled()) {
    if (!demoIdentity) {
      res.status(403).json({
        error: 'Identità non disponibile nella modalità demo temporanea',
        code: 'demo_identity_forbidden',
      });
      return;
    }
    if (role !== demoIdentity.role) {
      res.status(403).json({
        error: 'Il ruolo demo è assegnato dal server e non può essere modificato',
        code: 'demo_role_mismatch',
      });
      return;
    }
    req.operator = {
      id: demoIdentity.id,
      role: demoIdentity.role,
      name: demoIdentity.name,
    };
  } else {
    req.operator = {
      id: demoIdentity?.id ?? boundedId,
      role,
      name: demoIdentity?.name,
    };
  }
  res.setHeader('X-ClinicOS-Auth-Mode', 'demo');
  finish(productionDemoAuthEnabled() ? 'demo-production' : 'demo-header');
}

export function requireRole(...allowedRoles: string[]) {
  const allowed = new Set(allowedRoles.map((role) => role.toLowerCase()));
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.operator) {
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
      return;
    }
    if (!allowed.has(req.operator.role.toLowerCase())) {
      res.status(403).json({ error: 'Ruolo non autorizzato', code: 'role_forbidden' });
      return;
    }
    next();
  };
}

---END EXACT SOURCE---

UNTRUSTED SOURCE backend/src/authz/simulator.ts
Git blob: 5fe5c5b2a7ab0fd25e3a8d0966cd7799e10ff792
Full SHA256: 1c76e24cc4c5778723b685ab0337626f95d18124cb7a522aa4c1a8b32ef88058
Full bytes: 7844; contiguous range [0,7844)
---BEGIN EXACT SOURCE---
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

---END EXACT SOURCE---

UNTRUSTED SOURCE backend/src/lib/deployment.ts
Git blob: 4d388c6d4a7bdf7399d157b9e8104d9b79edc1e2
Full SHA256: cbba7914e0168b1ca116d5a982cc394d5caec32f287b2af5b383815f3370cf69
Full bytes: 9130; contiguous range [0,9130)
---BEGIN EXACT SOURCE---
// Phase 9: deployment tier + startup configuration validation.
//
// The tier answers "what kind of deployment is this?" independently from NODE_ENV (the demo runs
// with NODE_ENV=production on synthetic data). A REAL production deployment can never enable the
// Role Simulator or the demo identity headers, whatever the other flags say (fail closed).
//
//   CLINICOS_ENV = development | test | staging | demo | production   (explicit, preferred)
//   unset → derived: NODE_ENV=production + DEMO_DATASET_ID=synthetic-v1 → demo
//                    NODE_ENV=production otherwise                       → production
//                    NODE_ENV=test → test, anything else                  → development
//
// validateDeploymentConfig() never reads or prints secret VALUES — only presence/shape.

export type DeploymentTier = 'development' | 'test' | 'staging' | 'demo' | 'production';

const TIERS: readonly DeploymentTier[] = ['development', 'test', 'staging', 'demo', 'production'];
const SYNTHETIC_DATASET = 'synthetic-v1';

function flag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function deploymentTier(env: NodeJS.ProcessEnv = process.env): DeploymentTier {
  const explicit = (env.CLINICOS_ENV || '').trim().toLowerCase();
  if (explicit) {
    // A misspelled tier must not silently relax anything: treat it as production.
    return (TIERS as readonly string[]).includes(explicit)
      ? (explicit as DeploymentTier)
      : 'production';
  }
  if (env.NODE_ENV === 'production') {
    return env.DEMO_DATASET_ID === SYNTHETIC_DATASET ? 'demo' : 'production';
  }
  return env.NODE_ENV === 'test' ? 'test' : 'development';
}

/** True only on a real production deployment: demo identities and the simulator are forbidden. */
export function isRealProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return deploymentTier(env) === 'production';
}

export interface ConfigReport {
  tier: DeploymentTier;
  errors: string[];
  warnings: string[];
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isLoopbackOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function positiveInt(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') return true;
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/**
 * Validate the configuration for the current tier. `errors` are dangerous combinations: the server
 * refuses to start with them when NODE_ENV=production. `warnings` are degraded-but-safe states.
 */
export function validateDeploymentConfig(env: NodeJS.ProcessEnv = process.env): ConfigReport {
  const tier = deploymentTier(env);
  const errors: string[] = [];
  const warnings: string[] = [];
  const authMode = (env.AUTH_MODE || '').trim().toLowerCase();
  const hosted = tier === 'production' || tier === 'staging' || tier === 'demo';

  const explicitTier = (env.CLINICOS_ENV || '').trim().toLowerCase();
  if (explicitTier && !(TIERS as readonly string[]).includes(explicitTier)) {
    errors.push(`CLINICOS_ENV non valido (${explicitTier.slice(0, 20)}): trattato come production`);
  }

  if (!env.DATABASE_URL) errors.push('DATABASE_URL assente');
  if (!explicitTier && env.NODE_ENV === 'production') {
    // Derived tier: DEMO_DATASET_ID alone would turn a production service into «demo». Set the
    // tier explicitly on every hosted environment (production: CLINICOS_ENV=production).
    warnings.push(
      `CLINICOS_ENV non impostato: tier derivato «${tier}» (impostarlo esplicitamente)`,
    );
  }

  // ── Identity ────────────────────────────────────────────────────────────────────────────────
  if (authMode === 'entra') {
    if (!(env.ENTRA_TENANT_ID || '').trim() || !(env.ENTRA_AUDIENCE || '').trim()) {
      errors.push('AUTH_MODE=entra senza ENTRA_TENANT_ID/ENTRA_AUDIENCE');
    }
    if (hosted && env.ENTRA_JWKS_URL && !isHttpsUrl(env.ENTRA_JWKS_URL)) {
      errors.push('ENTRA_JWKS_URL deve essere https');
    }
  } else if (authMode === 'demo') {
    if (tier === 'production') {
      errors.push('AUTH_MODE=demo in produzione reale: identità demo vietate');
    }
  } else if (authMode) {
    errors.push(`AUTH_MODE non supportato (${authMode.slice(0, 20)})`);
  } else if (hosted) {
    warnings.push('AUTH_MODE non impostato: API cliniche disabilitate (503, fail closed)');
  }

  // ── Role Simulator / demo identities ────────────────────────────────────────────────────────
  if (tier === 'production') {
    for (const name of [
      'ROLE_SIMULATOR_ENABLED',
      'ROLE_SIMULATOR_ALLOW_PRODUCTION',
      'ALLOW_PRODUCTION_DEMO_AUTH',
    ]) {
      if (flag(env[name])) errors.push(`${name}=true in produzione reale`);
    }
    if (env.DEMO_DATASET_ID === SYNTHETIC_DATASET) {
      errors.push('DEMO_DATASET_ID=synthetic-v1 con CLINICOS_ENV=production');
    }
  }
  if (flag(env.ROLE_SIMULATOR_ENABLED) && env.NODE_ENV === 'production') {
    if ((env.ROLE_SIMULATOR_SECRET || '').length < 32) {
      errors.push('Simulatore attivo senza ROLE_SIMULATOR_SECRET (≥32 caratteri)');
    }
  }

  // ── Authorization ───────────────────────────────────────────────────────────────────────────
  if ((env.AUTHZ_ENFORCEMENT || '').trim().toLowerCase() === 'off' && hosted) {
    errors.push('AUTHZ_ENFORCEMENT=off su un ambiente ospitato');
  }
  if ((env.AUTHZ_UNMAPPED_ROUTES || '').trim().toLowerCase() === 'allow' && hosted) {
    errors.push('AUTHZ_UNMAPPED_ROUTES=allow su un ambiente ospitato');
  }

  // ── CORS ────────────────────────────────────────────────────────────────────────────────────
  const origins = [env.FRONTEND_URL, env.FRONTEND_URLS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  if (hosted) {
    if (origins.length === 0) warnings.push('FRONTEND_URL non impostato: nessuna origine browser');
    for (const origin of origins) {
      if (isHttpsUrl(origin)) continue;
      if (isLoopbackOrigin(origin)) {
        // A developer origin on a hosted backend is a smell, not an exposure: every clinical call
        // still needs a verified identity. Flag it for removal without blocking the deploy.
        warnings.push(`Origine CORS di sviluppo su ambiente ospitato: ${origin.slice(0, 60)}`);
      } else {
        errors.push(`Origine CORS non https o jolly: ${origin.slice(0, 60)}`);
      }
    }
  }

  // ── AI runtime / providers (degradation only, never blocking) ───────────────────────────────
  const runtimeUrl = (env.AI_RUNTIME_URL || '').trim();
  if (runtimeUrl && !env.AI_RUNTIME_SERVICE_TOKEN) {
    errors.push('AI_RUNTIME_URL senza AI_RUNTIME_SERVICE_TOKEN');
  }
  if (env.AI_RUNTIME_SERVICE_TOKEN && env.AI_RUNTIME_SERVICE_TOKEN.length < 24 && hosted) {
    warnings.push('AI_RUNTIME_SERVICE_TOKEN corto (<24 caratteri)');
  }
  if (
    runtimeUrl &&
    hosted &&
    !isHttpsUrl(runtimeUrl) &&
    !/\.railway\.internal(:\d+)?/.test(runtimeUrl)
  ) {
    warnings.push('AI_RUNTIME_URL non https (accettato solo su rete privata)');
  }
  if (!runtimeUrl)
    warnings.push('AI runtime non configurato: Assistente in modalità deterministica');

  for (const name of [
    'AI_ASSISTANT_TIMEOUT_MS',
    'PROACTIVE_BRIEFING_TIMEOUT_MS',
    'AI_TIMEOUT_MS',
    'AI_MAX_RETRIES',
  ]) {
    if (!positiveInt(env[name]) && !(name === 'AI_MAX_RETRIES' && env[name] === '0')) {
      errors.push(`${name} non è un intero positivo`);
    }
  }
  const retries = Number(env.AI_MAX_RETRIES ?? '2');
  if (Number.isFinite(retries) && retries > 5) errors.push('AI_MAX_RETRIES > 5 (retry illimitati)');

  // ── Observability ───────────────────────────────────────────────────────────────────────────
  if (env.METRICS_TOKEN !== undefined && env.METRICS_TOKEN.length < 24) {
    errors.push('METRICS_TOKEN troppo corto (≥24 caratteri)');
  }
  if (hosted && !env.METRICS_TOKEN)
    warnings.push('METRICS_TOKEN non impostato: /metrics disattivato');

  return { tier, errors, warnings };
}

---END EXACT SOURCE---

UNTRUSTED SOURCE agent-team/src/bug-pipeline/contracts.mjs
Git blob: 4b2b261933bbbfe30fa43419edb885b766851709
Full SHA256: 084599442394406bd89ee5ae7c4a25417c48da47adbfbc281dc533ad511d1482
Full bytes: 11325; contiguous range [0,11325)
---BEGIN EXACT SOURCE---
import { attemptLimit, validateOperatorContinuations } from './attempt-budget.mjs';
import path from 'node:path';
import { validAutomationHandback, validOperatorTakeover } from './operator-ownership.mjs';
import { createHash } from 'node:crypto';
import { validateAgainstSchema } from '../core/json-schema.mjs';
import { sanitizeText } from '../core/sanitize.mjs';
import { legacyExecution } from './routing.mjs';

const string = { type: 'string' };
const integer = { type: 'integer' };
const list = (items) => ({ type: 'array', items, minItems: 1 });
const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
export const planSchema = object({
  groups: {
    type: 'array',
    items: object({
      title: string,
      feature: string,
      rationale: string,
      analysis: string,
      execution: object({
        difficulty: { type: 'string', enum: ['low', 'medium', 'high'] },
        mode: { type: 'string', enum: ['direct', 'delegate'] },
        reason: string,
      }),
      issues: list(integer),
      scope: list(string),
      fileMap: list(object({ issue: integer, files: list(string) })),
      separationReason: string,
      acceptance: list(object({ issue: integer, criteria: list(string) })),
      tasks: list(object({ title: string, files: list(string), steps: list(string) })),
      verification: list(object({ command: string, args: list(string) })),
      evidence: list(object({ issue: integer, screenshot: string, trace: string, video: string })),
    }),
  },
  blocked: { type: 'array', items: object({ issue: integer, reason: string }) },
});
export const MAX_CYCLES = 4;
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export function safeText(value) {
  if (
    typeof value !== 'string' ||
    value.length > 100_000 ||
    sanitizeText(value) !== value ||
    /(?:sk-ant-|github_pat_|ghp_[a-z0-9]{25}|postgres(?:ql)?:\/\/)/i.test(value)
  )
    throw new Error('unsafe or oversized structured text');
  return value;
}
export function relativeFile(file) {
  if (
    typeof file !== 'string' ||
    !file ||
    file.length > 300 ||
    path.posix.isAbsolute(file) ||
    file.includes('\\') ||
    file.split('/').some((p) => !p || p === '.' || p === '..') ||
    /[\x00-\x1f`$]/.test(file)
  )
    throw new Error('invalid relative path');
  return file;
}
export function editableFile(file) {
  relativeFile(file);
  if (
    /^(?:agent-team)(?:\/|$)/.test(file) ||
    /(?:^|\/)(?:\.git(?:hub)?|\.agents|\.claude|\.codex)(?:\/|$)/.test(file) ||
    /(?:^|\/)(?:AGENTS(?:\.override)?|CLAUDE(?:\.local)?)\.md$/.test(file) ||
    /^scripts\/(?:quality-gate|security)\//.test(file) ||
    /(?:^|\/)\.env(?:\.|$)/.test(file) ||
    /(?:^|\/)(?:credentials|auth)\.json$/.test(file)
  )
    throw new Error('automation control or credential path is outside implementation scope');
  return file;
}
export function validatePlan(
  plan,
  issues,
  { allowLegacyExecution = false, allowLegacyGrouping = false } = {},
) {
  const checked =
    (allowLegacyExecution || allowLegacyGrouping) && Array.isArray(plan?.groups)
      ? {
          ...plan,
          groups: plan.groups.map((group) => ({
            ...group,
            ...(allowLegacyExecution && group.execution === undefined
              ? { execution: legacyExecution }
              : {}),
            ...(allowLegacyGrouping &&
            group.fileMap === undefined &&
            group.separationReason === undefined
              ? {
                  fileMap: group.issues.map((issue) => ({ issue, files: group.scope })),
                  separationReason: '',
                }
              : {}),
          })),
        }
      : plan;
  validateAgainstSchema(checked, planSchema);
  safeText(JSON.stringify(plan));
  if (plan.groups.length > 20 || plan.blocked.length > 100) throw new Error('plan too large');
  const selected = new Set(issues.map((i) => i.number));
  const seen = [];
  for (const group of checked.groups) {
    if (group.execution && !group.execution.reason.trim())
      throw new Error('missing execution rationale');
    if ([group.title, group.feature, group.rationale, group.analysis].some((s) => !s.trim()))
      throw new Error('missing grouping analysis');
    if (group.issues.length > 20 || group.verification.length > 12 || group.tasks.length > 50)
      throw new Error('batch too large');
    seen.push(...group.issues);
    const exactCoverage = (entries) =>
      entries.length === group.issues.length &&
      new Set(entries).size === entries.length &&
      entries.every((n) => group.issues.includes(n));
    if (
      !exactCoverage(group.acceptance.map((a) => a.issue)) ||
      !exactCoverage(group.evidence.map((e) => e.issue))
    )
      throw new Error('per-issue acceptance/evidence coverage is incomplete');
    group.scope.forEach(editableFile);
    if (!exactCoverage(group.fileMap.map((entry) => entry.issue)))
      throw new Error('per-issue file map coverage is incomplete');
    for (const entry of group.fileMap)
      for (const file of entry.files) {
        editableFile(file);
        if (!group.scope.includes(file)) throw new Error('issue file outside declared scope');
      }
    if (group.scope.some((file) => !group.fileMap.some((entry) => entry.files.includes(file))))
      throw new Error('scope file has no source issue');
    for (const task of group.tasks)
      for (const file of task.files) {
        editableFile(file);
        if (!group.scope.includes(file)) throw new Error('task outside declared file scope');
      }
    for (const command of group.verification) {
      if (
        !['node', 'npm', 'python3'].includes(command.command) ||
        command.args.length > 50 ||
        command.args.some((a) => a.length > 1000 || /[\x00-\x1f]/.test(a))
      )
        throw new Error('invalid verification command');
    }
    if (
      !group.verification.some(
        (c) =>
          c.command === 'npm' &&
          JSON.stringify(c.args) === JSON.stringify(['--prefix', 'frontend', 'run', 'build']),
      ) ||
      !group.verification.some((c) =>
        c.args.some((a) => a === 'test' || a === '--test' || /(?:test|spec)\.[cm]?[jt]s$/.test(a)),
      )
    )
      throw new Error('verification requires the frontend build and meaningful regression tests');
    const evidenceRoot = `artifacts/task-validation/bug-batch-${Math.min(...group.issues)}/evidence/`;
    for (const item of group.evidence)
      for (const [kind, extension] of [
        ['screenshot', '.png'],
        ['trace', '.zip'],
        ['video', null],
      ]) {
        const file = item[kind];
        if (kind === 'video' && file === '') continue;
        relativeFile(file);
        if (
          !file.startsWith(evidenceRoot) ||
          (extension && !file.endsWith(extension)) ||
          (kind === 'video' && !/\.(?:webm|mp4)$/.test(file))
        )
          throw new Error('evidence must be inside the batch evidence directory');
      }
  }
  for (let i = 0; i < checked.groups.length; i++)
    for (const other of checked.groups.slice(i + 1)) {
      const group = checked.groups[i];
      if (
        group.scope.some((file) => other.scope.includes(file)) &&
        (!group.separationReason.trim() || !other.separationReason.trim())
      )
        throw new Error('shared-file groups must be consolidated or explicitly justify separation');
    }
  for (const item of plan.blocked) {
    seen.push(item.issue);
    if (!item.reason.trim()) throw new Error('missing blocked reason');
  }
  if (
    seen.length !== selected.size ||
    new Set(seen).size !== seen.length ||
    seen.some((n) => !selected.has(n))
  )
    throw new Error('triage must account for every selected issue exactly once');
  return plan;
}
export function validateState(state, repo) {
  if (
    !state ||
    state.schemaVersion !== 1 ||
    state.repository !== repo ||
    !Array.isArray(state.batches) ||
    state.batches.length > 1000
  )
    throw new Error('invalid durable pipeline state');
  // Legacy takeovers without a handback stay valid and globally paused. A stale
  // well-formed grant is also valid data, but cannot enable the new nonce.
  if (
    state.operatorTakeover?.automation !== undefined &&
    !validAutomationHandback(state.operatorTakeover.automation)
  )
    throw new Error('invalid operator automation handback');
  if (state.operatorTakeover !== undefined && !validOperatorTakeover(state.operatorTakeover))
    throw new Error('invalid operator takeover');
  const issues = new Set();
  for (const b of state.batches) {
    if (
      !/^bug-batch-[1-9][0-9]*$/.test(b.id) ||
      b.branch !== `codex/${b.id}` ||
      !Array.isArray(b.issues) ||
      !b.issues.length ||
      b.id !== `bug-batch-${Math.min(...b.issues)}` ||
      ![
        'planned',
        'implementing',
        'simplifying',
        'validating',
        'publishing',
        'reviewing',
        'waiting-review',
        'waiting-checks',
        'ready',
        'blocked',
      ].includes(b.phase)
    )
      throw new Error('invalid durable batch identity');
    for (const n of b.issues) {
      if (!Number.isSafeInteger(n) || n < 1 || issues.has(n))
        throw new Error('duplicate durable issue');
      issues.add(n);
    }
    for (const key of ['implementation', 'reviews']) {
      if (
        !Array.isArray(b[key]) ||
        b[key].length > attemptLimit(b, key) ||
        b[key].some(
          (a, i) =>
            a.round !== i + 1 ||
            !['running', 'passed', 'failed', 'approved', 'changes-requested', 'blocked'].includes(
              a.status,
            ),
        )
      )
        throw new Error('invalid durable attempt budget');
    }
    if (b.sha && !/^[a-f0-9]{40}$/.test(b.sha)) throw new Error('invalid durable revision');
    if (b.pr && (!Number.isSafeInteger(b.pr.number) || b.pr.number < 1))
      throw new Error('invalid PR coordinates');
    if (b.phase !== 'blocked')
      validatePlan(
        {
          groups: [
            b.grouping === undefined
              ? b.plan
              : {
                  ...b.plan,
                  fileMap: b.grouping?.fileMap,
                  separationReason: b.grouping?.separationReason,
                },
          ],
          blocked: [],
        },
        b.issues.map((number) => ({ number })),
        { allowLegacyExecution: true, allowLegacyGrouping: b.grouping === undefined },
      );
  }
  if (state.triageQueue) {
    const queue = state.triageQueue;
    if (
      !Array.isArray(queue.issues) ||
      !queue.issues.length ||
      new Set(queue.issues).size !== queue.issues.length ||
      queue.issues.some((n) => !Number.isSafeInteger(n) || n < 1 || issues.has(n)) ||
      !Number.isSafeInteger(queue.openedAt) ||
      !Number.isSafeInteger(queue.changedAt) ||
      queue.openedAt < 0 ||
      queue.changedAt < queue.openedAt
    )
      throw new Error('invalid triage collection window');
  }
  validateOperatorContinuations(state);
  return state;
}
export function feedbackFingerprint(feedback) {
  return sha256(
    JSON.stringify({
      comments: feedback.comments,
      unresolved: feedback.unresolved,
      changesRequested: feedback.changesRequested,
    }),
  );
}

---END EXACT SOURCE---

UNTRUSTED SOURCE agent-team/src/core/sanitize.mjs
Git blob: 6520e5e5f57029e9d25dc71e37bc8813a5f98485
Full SHA256: 1a4d2b9565663b3ed5a593cdecf7cbadbd6f9cd6ef296a4b8c1c426b08ca042b
Full bytes: 1012; contiguous range [0,1012)
---BEGIN EXACT SOURCE---
const RULES = [
  // Header-style credentials: swallow the optional auth scheme so the token value never survives.
  [
    /((?:authorization|cookie|set-cookie)\s*[:=]\s*)((?:bearer|basic|token)\s+)?([^\s,;]+)/gi,
    '$1[REDACTED]',
  ],
  [/\b(?:sk|ghp|github_pat|gho|xoxb|xoxp)[_-][A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]'],
  [
    /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|CODEX_ACCESS_TOKEN|DATABASE_URL|GITHUB_TOKEN|GH_TOKEN)=([^\s]+)/g,
    (match) => `${match.split('=')[0]}=[REDACTED]`,
  ],
  [
    /\b(?:patientId|patient_id|operatorId|operator_id)=([A-Za-z0-9_-]+)/gi,
    (match) => `${match.split('=')[0]}=[REDACTED]`,
  ],
];

export function sanitizeText(text = '') {
  const redacted = RULES.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    String(text),
  );
  // Deterministic hygiene: captured evidence must pass `git diff --check` (no trailing whitespace).
  return redacted.replace(/[ \t]+(\r?\n)/g, '$1').replace(/[ \t]+$/, '');
}

---END EXACT SOURCE---

UNTRUSTED SOURCE agent-team/src/bug-pipeline/evidence-limits.mjs
Git blob: 826ae616cc159e2168740d5efcf4e24e58326ba3
Full SHA256: 78ddc3908b941ef895aeef8e6416b68e1e110d0852b57f0f331b42fe127d237b
Full bytes: 186; contiguous range [0,186)
---BEGIN EXACT SOURCE---
// Binary evidence and its bounded GitHub base64 JSON transport budget.
export const MAX_EVIDENCE_BYTES = 32 * 1024 * 1024;
export const MAX_EVIDENCE_TRANSPORT_BYTES = 48 * 1024 * 1024;

---END EXACT SOURCE---
