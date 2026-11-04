
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

UNTRUSTED SOURCE backend/src/app.ts
Git blob: c337c6c8e3a778228746c9699f9ed4b78e1f835b
Full SHA256: 3a33e8e1493bcaa7900fbf8c10527c18d9de355b1050b8099bba8b13da494951
Full bytes: 14724; contiguous range [0,14724)
---BEGIN EXACT SOURCE---
import cors from 'cors';
import express from 'express';
import { adminRouter as adminRoomsRouter, patientAssignmentRouter } from './routes/admin-rooms.js';
import patientRoomOptionsRouter from './routes/patient-room-options.js';
import patientTherapiesRouter from './routes/patient-therapies.js';
import patientsRouter from './routes/patients.js';
import { meRosterOrderRouter, adminRosterOrderRouter } from './routes/roster-order.js';
import appointmentsRouter from './routes/appointments.js';
import therapyRouter from './routes/therapy.js';
import patientIntakeRouter from './routes/patient-intake.js';
import patientDiaryRouter from './routes/patient-diary.js';
import narrativeSectionsRouter from './routes/narrative-sections.js';
import patientDocumentsRouter from './routes/patient-documents.js';
import patientAssessmentsRouter from './routes/patient-assessments.js';
import consegneRouter from './routes/consegne.js';
import operatorsRouter from './routes/operators.js';
import noteRouter from './routes/note.js';
import aiExtractionRouter from './routes/ai-extraction.js';
import aiJobsRouter from './routes/ai-jobs.js';
import intakeDraftsRouter from './routes/intake-drafts.js';
import internalAiRouter from './routes/internal-ai.js';
import assistantPublicRouter from './routes/ai-assistant-public.js';
import voiceRouter from './routes/ai-voice.js';
import aiActionsRouter from './routes/ai-actions.js';
import aiAuditRouter from './routes/ai-audit.js';
import farmaciRouter from './routes/farmaci.js';
import { createToolRouter, isLargeBodyToolInvoke } from './tools/http.js';
import { authzRouter, simulatorRouter } from './routes/authz.js';
import { capabilityRouteGate } from './authz/route-gate.js';
import { authzOf, requireAuthorizationContext } from './authz/request-context.js';
import { effectiveCapabilities, roleDefinition } from './authz/decision.js';
import { simulatorEnabled } from './authz/simulator.js';
import { defaultToolRegistry } from './tools/index.js';
import { createSkillRouter } from './skills/http.js';
import { defaultProactiveDeps, defaultSkillDeps } from './skills/index.js';
import { metricsHandler, requestObservability } from './lib/observability.js';
import { readinessHandler } from './lib/readiness.js';
import {
  operatorAuthMode,
  productionDemoAuthEnabled,
  requireOperator,
  type AuthedRequest,
} from './ai/auth.js';

const app = express();
app.disable('x-powered-by');
// Phase 9: correlation id (X-Request-Id) + access log + HTTP metrics, before everything else so
// rejected origins, parser errors and denials are measured and correlated too.
app.use(requestObservability);

export function trustedProxyHops(env: NodeJS.ProcessEnv = process.env): number {
  const fallback = env.NODE_ENV === 'production' ? 1 : 0;
  if (env.TRUST_PROXY_HOPS === undefined) return fallback;
  const configured = Number(env.TRUST_PROXY_HOPS);
  return Number.isInteger(configured) && configured >= 0 && configured <= 10
    ? configured
    : fallback;
}

// Railway terminates public traffic at one reverse proxy. Trust exactly that hop in production so
// IP-based abuse controls do not collapse every user into the proxy's address. Direct deployments
// can explicitly set TRUST_PROXY_HOPS=0; deeper trusted proxy chains must opt in deliberately.
const proxyHops = trustedProxyHops();
if (proxyHops > 0) app.set('trust proxy', proxyHops);

// Apply hardening before CORS and body parsing so rejected origins and oversized payloads receive
// the same non-renderable API policy as successful JSON responses.
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── CORS configuration ─────────────────────────────────────────────────────
//
// Allowed origins:
//  1. Localhost variants for local development
//  2. FRONTEND_URL env var (single URL)
//  3. FRONTEND_URLS env var (comma-separated list)
// Preview origins must be listed explicitly: substring matching would allow an
// attacker-controlled project such as clinicos-evil.vercel.app.
//
// In Railway, set:
//   FRONTEND_URL=https://clinicos-eosin.vercel.app
//   FRONTEND_URLS=https://clinicos-eosin.vercel.app,https://clinicos-el91lyszt-lucalavia-2482s-projects.vercel.app

export function developmentOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV === 'production') return [];
  return ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
}

const staticAllowed = developmentOrigins();

export function configuredOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  return [env.FRONTEND_URL, env.FRONTEND_URLS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const envAllowed = configuredOrigins();

export const allowedOrigins = Array.from(new Set([...staticAllowed, ...envAllowed]));

console.log('CORS allowed origins:', allowedOrigins);

export function isAllowedOrigin(origin: string, allowlist = allowedOrigins): boolean {
  return allowlist.includes(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

// Public AI routes can return patient names, clinical summaries, source references and action
// previews. Apply privacy before body parsing and route authentication so successes, denials and
// parser failures cannot be stored by a browser or intermediary cache.
app.use('/ai', (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

export const STANDARD_JSON_LIMIT = '512kb';
const standardJsonParser = express.json({ limit: STANDARD_JSON_LIMIT });
app.use((req, res, next) => {
  // The deprecated base64 intake path owns a larger parser behind auth + RBAC in its router.
  // Skipping it here prevents anonymous 8 MB parsing while all current JSON APIs stay bounded.
  // Same for Tool Layer invocations that declare a larger body (base64 uploads): parsed by the
  // tool router after requireOperator.
  if (
    req.path === '/patient-intake' ||
    req.path.startsWith('/patient-intake/') ||
    (req.method === 'POST' && isLargeBodyToolInvoke(defaultToolRegistry, req.path))
  ) {
    next();
    return;
  }
  standardJsonParser(req, res, next);
});

// Liveness: the process answers. No DB, no AI — a degraded dependency must not get it restarted.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
// Readiness: DB + active policy reachable (AI reported, never required, never called).
app.get('/ready', readinessHandler);
// Phase 9 metrics (token-gated, see lib/observability.ts).
app.get('/metrics', metricsHandler);

app.get('/auth/status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    mode: operatorAuthMode(),
    simulator: simulatorEnabled(operatorAuthMode()),
    temporaryDemo: productionDemoAuthEnabled(),
    syntheticOnly: process.env.DEMO_DATASET_ID === 'synthetic-v1',
    expiresAt: process.env.DEMO_AUTH_EXPIRES_AT || null,
  });
});

app.get('/auth/me', requireOperator, requireAuthorizationContext, (req, res) => {
  const operator = (req as AuthedRequest).operator;
  const authz = authzOf(req)!;
  const role = roleDefinition(authz.policy.document, authz.identity.roleId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({
    id: operator!.id,
    // Compat role (admin|manager|operatore|operator) kept for existing clients.
    role: operator!.role,
    name: operator!.name,
    // Identity → Role → Capability policy (server-resolved; the client cannot assert any of it).
    appRole: authz.identity.roleId,
    roleLabel: role?.label ?? authz.identity.roleId,
    roleSource: authz.identity.roleSource,
    identitySource: authz.identity.identitySource,
    uiShell:
      role?.uiShell ?? (['admin', 'manager'].includes(operator!.role) ? 'admin' : 'operator'),
    policyVersion: authz.policy.version,
    capabilities: Object.fromEntries(
      effectiveCapabilities(authz.policy.document, authz.identity.roleId).map((cap) => [
        cap.id,
        {
          effect: cap.effect,
          allowed: cap.allowed,
          requiresConfirmation: cap.requiresConfirmation,
        },
      ]),
    ),
    authMode: operatorAuthMode(),
    temporaryDemo: productionDemoAuthEnabled(),
    syntheticOnly: process.env.DEMO_DATASET_ID === 'synthetic-v1',
    expiresAt: process.env.DEMO_AUTH_EXPIRES_AT || null,
  });
});

// Phase 2: Role Simulator (dev identity source) and the Role & Capability policy API.
app.use('/auth/simulator', simulatorRouter);
app.use('/authz', authzRouter);
// Backend enforcement of the capability policy for every catalogued route, before any router.
app.use(capabilityRouteGate);

app.use('/admin', adminRoomsRouter);
app.use('/admin', adminRosterOrderRouter);
app.use('/me', meRosterOrderRouter);
// patientDocumentsRouter va montato PRIMA degli altri router /patients ora protetti da
// `router.use(requireOperator)`: quel middleware, essendo montato senza path, intercetta
// OGNI richiesta sotto /patients (anche quelle che non hanno una route corrispondente in quel
// router), non solo le proprie — esattamente il meccanismo descritto nel commento in cima a
// patient-documents.ts, ma nella direzione opposta. patientDocumentsRouter usa il proprio gate
// (demo/entra) per-route, distinto dal requireOperator header-based degli altri: se venisse
// dopo, una richiesta in modalita' entra (Bearer JWT, senza header X-Operator-Id) prenderebbe
// 401 dal gate generico di un router precedente prima di raggiungere il proprio gate corretto.
app.use('/patients', patientDocumentsRouter);
app.use('/patients', patientAssessmentsRouter);
app.use('/patients', patientRoomOptionsRouter);
app.use('/patients', patientAssignmentRouter);
app.use('/patients', patientTherapiesRouter);
app.use('/patients', patientDiaryRouter);
app.use('/patients', narrativeSectionsRouter);
app.use('/patients', patientsRouter);
// SPEC-015 (US4): real agenda appointments — same service as the Agnos AI actions; DELETE = UI only.
app.use('/appointments', appointmentsRouter);
app.use('/therapy-slots', therapyRouter);
app.use('/patient-intake', patientIntakeRouter);
app.use('/consegne', consegneRouter);
// Fase 1b: real operator CRUD for the admin "Gestione Operatori" screen.
app.use('/operators', operatorsRouter);
// Anagrafica farmaci AIFA (pubblica, nessun dato di paziente): stato, ricerca, ricaricamento.
app.use('/farmaci', farmaciRouter);
app.use('/notes', noteRouter);
app.use('/intake/drafts', intakeDraftsRouter);
app.use('/ai/extraction/jobs', aiJobsRouter);
app.use('/ai/extraction', aiExtractionRouter);
// REQ-040: public operator-facing assistant (operator-auth; runs the gateway in-process, no token).
app.use('/ai/assistant', assistantPublicRouter);
// REQ-041: operator-facing voice write-actions (transcript-only; audio stays client-side).
app.use('/ai/voice', voiceRouter);
// SPEC-015: unified Agnos orchestrator — text + voice commands, CRU-only allowlist (no delete).
app.use('/ai/actions', aiActionsRouter);
// SPEC-015 (US2): persistent AI audit consultation — admin/manager only.
app.use('/ai/audit', aiAuditRouter);
// Phase 1 Tool Layer: catalogued capabilities invocable by an orchestrator (Agno) through the
// same services as the GUI routes, behind requireOperator + authorization/audit hooks.
app.use('/tools', createToolRouter(defaultToolRegistry));
// Phase 3 Skill layer: natural language → skill → workflow → Tool Layer (see .ai-architecture/phase-3-skills).
app.use('/skills', createSkillRouter(defaultSkillDeps, defaultProactiveDeps));
// REQ-039: internal AI Data Gateway (service-token gated; the model's only data path).
app.use('/internal/ai', internalAiRouter);

interface JsonParserError extends SyntaxError {
  status?: number;
  type?: string;
  body?: unknown;
}

app.use(
  (error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parserError = error as JsonParserError;
    if (parserError?.status === 413 || parserError?.type === 'entity.too.large') {
      res.status(413).json({ error: 'Payload JSON troppo grande', code: 'payload_too_large' });
      return;
    }
    if (parserError instanceof SyntaxError && parserError.status === 400 && 'body' in parserError) {
      res.status(400).json({ error: 'JSON non valido', code: 'invalid_json' });
      return;
    }
    next(error);
  },
);

// Phase 6 (error disclosure): last-resort handler. Clients never receive stack traces, internal
// messages, provider details or prompts — only a generic error; diagnostics stay server-side.
app.use(
  (error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('CORS:')) {
      res.status(403).json({ error: 'Origine non consentita', code: 'cors_forbidden' });
      return;
    }
    // Client errors raised by middleware (malformed URI, unsupported charset, payload too large…)
    // keep their 4xx status, still with a generic body.
    const status = Number(
      (error as { status?: unknown; statusCode?: unknown })?.status ??
        (error as { statusCode?: unknown })?.statusCode,
    );
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      res.status(status).json({ error: 'Richiesta non valida', code: 'bad_request' });
      return;
    }
    console.error(
      `[unhandled] ${req.method} ${req.path}: ${error instanceof Error ? error.name : typeof error}: ${message.slice(0, 200)}`,
    );
    res.status(500).json({ error: 'Errore interno del servizio', code: 'internal_error' });
  },
);

export default app;

---END EXACT SOURCE---

UNTRUSTED SOURCE backend/src/routes/authz.ts
Git blob: 6c0945c553bc069fb5a9b3aa12c3f4f1da5d60b3
Full SHA256: 1165ef8876eaba50a9cb1024ace2badd7b35e24debf7486ddcca97296e9e5c41
Full bytes: 10291; contiguous range [0,10291)
---BEGIN EXACT SOURCE---
// Identity → Role → Capability policy API (Phase 2).
//
//   /auth/simulator/identities   GET   public only while the Role Simulator is enabled
//   /auth/simulator/session      POST  { identityId } → server-signed session (no role inside)
//   /auth/simulator/logout       POST  Bearer session → revoked server-side (Phase 9)
//   /authz/policy                GET   authz.view_policy   active document + registry + identities
//   /authz/policy/versions       GET   authz.view_policy   history
//   /authz/policy/versions/:v    GET   authz.view_policy   one version (document + before/after)
//   /authz/policy/impact         POST  authz.manage_policy impact preview of a proposed document
//   /authz/policy/versions       POST  authz.manage_policy Save (draft) or Save+Apply
//   /authz/policy/versions/:v/apply POST authz.manage_policy Apply a draft

import { Router, type Response } from 'express';
import { operatorAuthMode, requireOperator, type AuthedRequest } from '../ai/auth.js';
import { recordAuditEvent } from '../ai/audit-store.js';
import { governedCapabilities, allCapabilities } from '../authz/registry.js';
import { authzOf, requireAuthorizationContext } from '../authz/request-context.js';
import { requireCapability } from '../authz/require-capability.js';
import { roleDefinition } from '../authz/decision.js';
import { policyImpact } from '../authz/impact.js';
import { PolicyValidationError } from '../authz/policy-document.js';
import { loadActivePolicyCached } from '../authz/policy-cache.js';
import {
  applyPolicyVersion,
  getPolicyVersion,
  listPolicyVersions,
  PolicyStoreError,
  savePolicyVersion,
  type PolicyActor,
} from '../authz/policy-store.js';
import {
  ensureSimulatedIdentity,
  issueSimulatorToken,
  revokeSimulatorToken,
  SIMULATED_IDENTITIES,
  simulatedIdentity,
  simulatorEnabled,
} from '../authz/simulator.js';
import { prisma } from '../lib/prisma.js';
import { allToolDefinitions } from '../tools/index.js';

export const simulatorRouter = Router();
export const authzRouter = Router();

for (const router of [simulatorRouter, authzRouter]) {
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
}

function simulatorGuard(res: Response): boolean {
  if (simulatorEnabled(operatorAuthMode())) return true;
  res.status(404).json({ error: 'Simulatore ruoli non attivo', code: 'simulator_disabled' });
  return false;
}

simulatorRouter.get('/identities', async (_req, res) => {
  if (!simulatorGuard(res)) return;
  try {
    const policy = await loadActivePolicyCached();
    res.status(200).json({
      policyVersion: policy.version,
      identities: SIMULATED_IDENTITIES.map((identity) => {
        const roleId = policy.document.assignments[identity.id] ?? null;
        const role = roleId ? roleDefinition(policy.document, roleId) : undefined;
        return {
          id: identity.id,
          name: identity.name,
          ruolo: identity.ruolo,
          roleId,
          roleLabel: role?.label ?? null,
          roleDescription: role?.description ?? null,
        };
      }),
    });
  } catch {
    res.status(503).json({ error: 'Simulatore non disponibile', code: 'simulator_unavailable' });
  }
});

simulatorRouter.post('/session', async (req, res) => {
  if (!simulatorGuard(res)) return;
  const identityId = typeof req.body?.identityId === 'string' ? req.body.identityId : '';
  const identity = simulatedIdentity(identityId);
  if (!identity) {
    res.status(400).json({ error: 'Profilo simulato sconosciuto', code: 'unknown_identity' });
    return;
  }
  try {
    await ensureSimulatedIdentity(identity);
    const session = issueSimulatorToken(identity.id);
    res.status(201).json({ ...session, identity: { id: identity.id, name: identity.name } });
  } catch {
    res.status(503).json({ error: 'Simulatore non disponibile', code: 'simulator_unavailable' });
  }
});

// Phase 9: server-side logout — the presented session is revoked, so a copied token stops working.
// Answers 204 even for an unknown/expired token (logout is idempotent and never enumerates).
simulatorRouter.post('/logout', (req, res) => {
  if (!simulatorGuard(res)) return;
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token) revokeSimulatorToken(token);
  res.status(204).end();
});

authzRouter.use(requireOperator, requireAuthorizationContext);

function actorOf(req: AuthedRequest): PolicyActor {
  const identity = authzOf(req)!.identity;
  return { operatorId: identity.operatorId, name: identity.name, roleId: identity.roleId };
}

function sendError(res: Response, error: unknown, label: string): void {
  if (error instanceof PolicyValidationError) {
    res.status(400).json({ error: error.message, code: error.code, ...error.details });
    return;
  }
  if (error instanceof PolicyStoreError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error(`${label} error:`, error instanceof Error ? error.name : 'unknown');
  res.status(500).json({ error: 'Errore nella gestione dei permessi', code: 'authz_error' });
}

authzRouter.get('/policy', requireCapability('authz.view_policy'), async (_req, res) => {
  try {
    const policy = await loadActivePolicyCached();
    const operators = await prisma.operator.findMany({
      take: 500,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        ruolo: true,
        user: { select: { fullName: true, role: true, isActive: true } },
      },
    });
    res.status(200).json({
      active: {
        version: policy.version,
        source: policy.source,
        appliedAt: policy.appliedAt,
        document: policy.document,
      },
      capabilities: governedCapabilities().map((cap) => ({
        id: cap.id,
        name: cap.name,
        domain: cap.domain,
        type: cap.type,
        sensitivity: cap.sensitivity,
        exposure: cap.exposure,
        legacyRoles: cap.legacyRoles,
        tool: allToolDefinitions.some((tool) => tool.name === cap.id),
      })),
      derived: allCapabilities()
        .filter((cap) => cap.governedBy)
        .map((cap) => ({
          id: cap.id,
          name: cap.name,
          domain: cap.domain,
          governedBy: cap.governedBy,
        })),
      identities: operators.map((operator) => ({
        id: operator.id,
        name: operator.user.fullName,
        ruolo: operator.ruolo,
        legacyRole: operator.user.role.toLowerCase(),
        active: operator.user.isActive,
        simulated: Boolean(simulatedIdentity(operator.id)),
      })),
    });
  } catch (error) {
    sendError(res, error, 'GET /authz/policy');
  }
});

authzRouter.get('/policy/versions', requireCapability('authz.view_policy'), async (_req, res) => {
  try {
    res.status(200).json({ versions: await listPolicyVersions() });
  } catch (error) {
    sendError(res, error, 'GET /authz/policy/versions');
  }
});

authzRouter.get(
  '/policy/versions/:version',
  requireCapability('authz.view_policy'),
  async (req, res) => {
    const version = Number(req.params.version);
    if (!Number.isInteger(version) || version < 0) {
      res.status(400).json({ error: 'Versione non valida', code: 'invalid_version' });
      return;
    }
    try {
      res.status(200).json(await getPolicyVersion(version));
    } catch (error) {
      sendError(res, error, 'GET /authz/policy/versions/:version');
    }
  },
);

authzRouter.post('/policy/impact', requireCapability('authz.manage_policy'), async (req, res) => {
  try {
    const current = await loadActivePolicyCached();
    const operators = await prisma.operator.findMany({
      take: 500,
      select: { id: true, user: { select: { role: true } } },
    });
    const legacyRoles = new Map(operators.map((o) => [o.id, o.user.role.toLowerCase()]));
    res.status(200).json({
      basedOnVersion: current.version,
      ...policyImpact(
        current.document,
        req.body?.document,
        allToolDefinitions.map((tool) => tool.name),
        (operatorId) => legacyRoles.get(operatorId),
      ),
    });
  } catch (error) {
    sendError(res, error, 'POST /authz/policy/impact');
  }
});

function auditPolicyChange(req: AuthedRequest, version: number, action: string): void {
  const identity = authzOf(req)!.identity;
  recordAuditEvent({
    requestId: `authz-${action}-v${version}`,
    operatorId: identity.operatorId,
    operatorRole: identity.roleId,
    patientId: null,
    actionType: action,
    kind: 'update',
    channel: 'gui',
    fields: [`policy:v${version}`],
    outcome: 'ok',
  });
}

authzRouter.post('/policy/versions', requireCapability('authz.manage_policy'), async (req, res) => {
  const body = req.body as
    { document?: unknown; basedOnVersion?: unknown; note?: unknown; apply?: unknown } | undefined;
  if (!body || typeof body !== 'object' || !Number.isInteger(body.basedOnVersion)) {
    res
      .status(400)
      .json({ error: 'Richiesta non valida: basedOnVersion obbligatorio', code: 'invalid_body' });
    return;
  }
  try {
    const saved = await savePolicyVersion({
      document: body.document,
      basedOnVersion: body.basedOnVersion as number,
      note: typeof body.note === 'string' ? body.note : undefined,
      apply: body.apply === true,
      actor: actorOf(req),
    });
    auditPolicyChange(
      req,
      saved.version,
      body.apply === true ? 'authz.policy_save_apply' : 'authz.policy_save_draft',
    );
    res.status(201).json(saved);
  } catch (error) {
    sendError(res, error, 'POST /authz/policy/versions');
  }
});

authzRouter.post(
  '/policy/versions/:version/apply',
  requireCapability('authz.manage_policy'),
  async (req, res) => {
    const version = Number(req.params.version);
    if (!Number.isInteger(version) || version < 1) {
      res.status(400).json({ error: 'Versione non valida', code: 'invalid_version' });
      return;
    }
    try {
      const applied = await applyPolicyVersion(version, actorOf(req));
      auditPolicyChange(req, version, 'authz.policy_apply');
      res.status(200).json(applied);
    } catch (error) {
      sendError(res, error, 'POST /authz/policy/versions/:version/apply');
    }
  },
);

---END EXACT SOURCE---

UNTRUSTED SOURCE frontend/src/components/Login.tsx
Git blob: 7ff91468b61308458100a0fbcae76c1333ff12ec
Full SHA256: 9e74ff73276aa7b4ad4c5b55101c6ec9711512209c0d5a86776731be352c1783
Full bytes: 8226; contiguous range [0,8226)
---BEGIN EXACT SOURCE---
import { useEffect, useState } from 'react';
import type { SimulatorIdentity, UtenteApp } from '../types';
import { UTENTE_ADMIN, UTENTE_OPERATORE } from '../mockData';
import { IcoAdmin, IcoUser } from '../icons';
import { API_URL } from '../config';
import type { AuthAvailability, AuthStatus } from '../lib/authAvailability';
import './Login.css';

interface LoginProps {
  availability: AuthAvailability;
  authMode: AuthStatus['mode'] | null;
  onRetryAuth: () => void;
  onLogin: (utente: UtenteApp) => void;
  demoMode?: boolean;
  loading?: boolean;
  error?: string | null;
  /** Simulatore ruoli attivo (GET /auth/status → simulator): mostra i profili del server. */
  simulator?: boolean;
  onSimulatorLogin?: (identity: SimulatorIdentity) => void;
}

type SimulatorList =
  | { state: 'loading' }
  | { state: 'ready'; identities: SimulatorIdentity[] }
  | { state: 'error'; message: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?';
}

function SimulatorPicker({
  loading,
  onPick,
}: {
  loading: boolean;
  onPick: (identity: SimulatorIdentity) => void;
}) {
  const [list, setList] = useState<SimulatorList>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/auth/simulator/identities`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('simulator_unavailable');
        return (await response.json()) as { identities?: SimulatorIdentity[] };
      })
      .then((payload) => setList({ state: 'ready', identities: payload.identities ?? [] }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setList({ state: 'error', message: 'Profili del simulatore non disponibili' });
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className="login-sim" aria-labelledby="login-sim-title">
      <div className="login-sim__banner" role="note">
        <strong id="login-sim-title">Simulatore ruoli — solo sviluppo</strong>
        <span>
          Profili simulati definiti dal server. Il ruolo e i permessi li decide il server.
        </span>
      </div>

      {list.state === 'loading' && <p className="login-note">Caricamento profili…</p>}
      {list.state === 'error' && (
        <p className="login-error" role="alert">
          {list.message}{' '}
          <button
            type="button"
            className="login-sim__retry"
            onClick={() => {
              setList({ state: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            Riprova
          </button>
        </p>
      )}
      {list.state === 'ready' && (
        <ul className="login-sim__list">
          {list.identities.map((identity) => (
            <li key={identity.id}>
              <button
                type="button"
                className="login-sim__item"
                onClick={() => onPick(identity)}
                disabled={loading}
              >
                <span className="login-sim__avatar" aria-hidden="true">
                  {initials(identity.name)}
                </span>
                <span className="login-sim__text">
                  <span className="login-sim__name">{identity.name}</span>
                  <span className="login-sim__role">{identity.roleLabel}</span>
                  {identity.roleDescription && (
                    <span className="login-sim__desc">{identity.roleDescription}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Login({
  availability,
  authMode,
  onRetryAuth,
  onLogin,
  demoMode = false,
  loading = false,
  error,
  simulator = false,
  onSimulatorLogin,
}: LoginProps) {
  const accessReady = availability === 'ready';
  const showSimulator = accessReady && simulator && onSimulatorLogin != null;
  const availabilityMessage = {
    checking: { title: 'Verifica accesso…', detail: 'Controllo della disponibilità dei profili.' },
    expired: {
      title: 'Accesso demo scaduto',
      detail:
        'La finestra di accesso dimostrativo è terminata. L’amministratore deve rinnovarla sul servizio demo.',
    },
    disabled: {
      title: 'Accesso non disponibile',
      detail:
        'Il servizio di autenticazione non è abilitato. Contatta l’amministratore della struttura.',
    },
    unavailable: {
      title: 'Verifica accesso non riuscita',
      detail: 'Non è stato possibile verificare il servizio di autenticazione. Riprova tra poco.',
    },
  };
  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-brand">
          <div className="login-brand-icon">✚</div>
          <h1 className="login-brand-name">ClinicOS</h1>
          <p className="login-brand-sub">Sistema di Gestione Clinica</p>
        </div>

        {accessReady && demoMode && (
          <div className="login-demo-warning" role="status">
            <strong>Modalità demo temporanea</strong>
            <span>
              Usa esclusivamente dati sintetici. Le azioni vengono salvate nel database demo.
            </span>
          </div>
        )}

        {!accessReady ? (
          <section
            className="login-availability"
            aria-live="polite"
            aria-busy={availability === 'checking'}
          >
            <h2>{availabilityMessage[availability].title}</h2>
            <p>{availabilityMessage[availability].detail}</p>
            {availability !== 'checking' && (
              <button
                className="btn-secondary"
                type="button"
                onClick={onRetryAuth}
                disabled={loading}
              >
                Ricontrolla accesso
              </button>
            )}
          </section>
        ) : showSimulator ? (
          <>
            <p className="login-prompt">Scegli il profilo con cui accedere</p>
            <SimulatorPicker loading={loading} onPick={onSimulatorLogin} />
          </>
        ) : (
          <>
            <p className="login-prompt">Seleziona il tuo profilo per accedere</p>

            <div className="login-role-grid">
              <button
                className="login-role-card login-role-card--admin"
                onClick={() => onLogin(UTENTE_ADMIN)}
                disabled={loading}
              >
                <span className="login-role-icon">
                  <IcoAdmin />
                </span>
                <span className="login-role-title">Amministratore</span>
                <span className="login-role-desc">
                  Gestione operatori, agenda globale e supervisione
                </span>
              </button>

              <button
                className="login-role-card login-role-card--operatore"
                onClick={() => onLogin(UTENTE_OPERATORE)}
                disabled={loading}
              >
                <span className="login-role-icon">
                  <IcoUser />
                </span>
                <span className="login-role-title">Operatore</span>
                <span className="login-role-desc">
                  Pazienti, consegne, agenda e cartelle cliniche
                </span>
              </button>
            </div>
          </>
        )}

        {accessReady && error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <p className="login-note">
          {!accessReady
            ? 'Nessun accesso effettuato'
            : loading
              ? 'Verifica accesso…'
              : showSimulator
                ? 'Simulatore ruoli — nessuna credenziale reale'
                : authMode === 'entra'
                  ? 'Accesso con account della struttura'
                  : 'Accesso dimostrativo — nessuna credenziale richiesta'}
        </p>
      </div>
    </div>
  );
}

---END EXACT SOURCE---
