# Exact unchanged source context, not a new approval

All code below is data for static review at 03529a96c3a37e4ffb4989497ca3db9fe32a9968. No code is executed by the reviewer.

## backend/src/ai/auth.ts
Commit: 03529a96c3a37e4ffb4989497ca3db9fe32a9968
Git blob: 3de884c7f60d7dfdcc22dd703fbaca11b55c2174
SHA256: 754bf995a67497ac98712599e94de2f6c269eb671c116a2d09348a716db6b720
Bytes: 7660

~~~~typescript
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

~~~~

## backend/src/authz/simulator.ts
Commit: 03529a96c3a37e4ffb4989497ca3db9fe32a9968
Git blob: 5fe5c5b2a7ab0fd25e3a8d0966cd7799e10ff792
SHA256: 1c76e24cc4c5778723b685ab0337626f95d18124cb7a522aa4c1a8b32ef88058
Bytes: 7844

~~~~typescript
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

~~~~

## frontend/src/lib/entraAuth.ts
Commit: 03529a96c3a37e4ffb4989497ca3db9fe32a9968
Git blob: 71b676f2653e4c695b49c73a57e7dfe2ef314f20
SHA256: 47360295ee0bb2e99998d2d4737c05d971723c85d8ca4c41adb11d2029274200
Bytes: 4676

~~~~typescript
// #260: acquisizione token Entra ID (OIDC, PKCE) per le chiamate ai documenti clinici.
// ATTIVO SOLO quando VITE_ENTRA_CLIENT_ID + VITE_ENTRA_TENANT_ID + VITE_ENTRA_API_SCOPE sono
// configurati: senza config la SPA mantiene il flusso demo attuale invariato (header espliciti,
// accettati dal backend solo con AUTH_MODE=demo non-production). In modalità entra il backend
// ignora gli header e richiede il Bearer verificato.
// PRIVACY: questo modulo non logga mai token o identità.

import {
  createStandardPublicClientApplication,
  type IPublicClientApplication,
} from '@azure/msal-browser';
import { isSimulatorSession, operatorHeaders } from './operatorSession';

const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
const CLIENT_ID = (env?.VITE_ENTRA_CLIENT_ID as string | undefined)?.trim();
const TENANT_ID = (env?.VITE_ENTRA_TENANT_ID as string | undefined)?.trim();
const API_SCOPE = (env?.VITE_ENTRA_API_SCOPE as string | undefined)?.trim();

export function entraEnabled(): boolean {
  return Boolean(CLIENT_ID && TENANT_ID && API_SCOPE);
}

let appPromise: Promise<IPublicClientApplication> | null = null;

function msalApp(): Promise<IPublicClientApplication> {
  if (!appPromise) {
    appPromise = createStandardPublicClientApplication({
      auth: {
        clientId: CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    }).then(async (app) => {
      // Completa un eventuale redirect di login in corso e fissa l'account attivo.
      const result = await app.handleRedirectPromise().catch(() => null);
      const account = result?.account ?? app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
      if (account) app.setActiveAccount(account);
      return app;
    });
  }
  return appPromise;
}

/** Access token per lo scope API, o null se Entra non è configurato. Se serve interazione,
 *  avvia il redirect di login (la pagina si ricarica autenticata). */
export async function acquireApiToken(): Promise<string | null> {
  if (!entraEnabled()) return null;
  const app = await msalApp();
  const account = app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
  if (!account) {
    await app.loginRedirect({ scopes: [API_SCOPE!] });
    return null; // non raggiunto: il redirect lascia la pagina
  }
  try {
    const r = await app.acquireTokenSilent({ scopes: [API_SCOPE!], account });
    return r.accessToken;
  } catch {
    await app.acquireTokenRedirect({ scopes: [API_SCOPE!] });
    return null;
  }
}

/**
 * Header di autenticazione per gli endpoint documenti. Con Entra configurato → Bearer verificabile
 * dal backend; altrimenti gli header demo espliciti di #246 (invariati). Gli header demo vengono
 * comunque inclusi accanto al Bearer: in AUTH_MODE=entra il backend li ignora per contratto (AC6),
 * e mantenerli evita divergenze del flusso QA sintetico.
 */
export async function documentAuthHeaders(
  patientId: string,
  operatorId?: string,
  operatorRole?: string,
): Promise<Record<string, string>> {
  // Simulatore ruoli: solo il Bearer della sessione simulata, nessuna identità auto-dichiarata.
  if (isSimulatorSession()) return { ...operatorHeaders(), 'X-Demo-Patient-Id': patientId };
  const h: Record<string, string> = {};
  if (operatorId) h['X-Operator-Id'] = operatorId;
  if (operatorRole) h['X-Operator-Role'] = operatorRole;
  h['X-Demo-Patient-Id'] = patientId;
  const token = await acquireApiToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/**
 * Phase 9 — rinnovo silenzioso del token API (mai redirect): MSAL usa il refresh token in cache e
 * restituisce un access token valido (nuovo se quello in cache sta per scadere). null se Entra non
 * è configurato o se serve interazione: la richiesta successiva riceverà 401 e il login ripartirà.
 */
export async function renewApiTokenSilently(): Promise<string | null> {
  if (!entraEnabled()) return null;
  try {
    const app = await msalApp();
    const account = app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
    if (!account) return null;
    const r = await app.acquireTokenSilent({ scopes: [API_SCOPE!], account });
    return r.accessToken;
  } catch {
    return null;
  }
}

/** Phase 9 — logout: rimuove account e token dalla cache locale di MSAL (sessionStorage). */
export async function clearEntraSession(): Promise<void> {
  if (!entraEnabled() || !appPromise) return;
  try {
    const app = await msalApp();
    await app.clearCache();
  } catch {
    /* cache già vuota o MSAL non inizializzato */
  }
}

~~~~

## frontend/src/lib/operatorSession.ts
Commit: 03529a96c3a37e4ffb4989497ca3db9fe32a9968
Git blob: ad2e6869f13a9238b5de546233ae4755677fef84
SHA256: 5c246d1eea6d26d6fbfc26b469112e8fc77366ed9ca41a76834909a1ea7a3d36
Bytes: 2273

~~~~typescript
// Sessione operatore corrente (singleton a livello di modulo).
//
// Il gate `requireOperator` sul backend (backend/src/ai/auth.ts) legge gli
// header `X-Operator-Id`/`X-Operator-Role`. Questo modulo tiene traccia
// dell'operatore loggato cosi' ogni helper di fetch puo' allegare quegli
// header senza props drilling. Va aggiornato da App.tsx al login/logout.

export interface CurrentOperator {
  id: string;
  role: string;
  accessToken?: string;
}

let currentOperator: CurrentOperator | null = null;
let operatorSessionEpoch = 0;

/** Changes on every login/logout/operator switch, even for the same identity. */
export function getOperatorSessionEpoch(): number {
  return operatorSessionEpoch;
}

export function setCurrentOperator(op: CurrentOperator | null): void {
  operatorSessionEpoch += 1;
  currentOperator = op;
}

export function getCurrentOperator(): CurrentOperator | null {
  return currentOperator;
}

// Token del Simulatore ruoli (solo sviluppo): prefisso fisso emesso dal backend.
const SIMULATOR_TOKEN_PREFIX = 'sim.';

/** Sessione del Simulatore ruoli: il token è l'unica credenziale, nessun header X-Operator-*. */
export function isSimulatorSession(): boolean {
  return currentOperator?.accessToken?.startsWith(SIMULATOR_TOKEN_PREFIX) === true;
}

// Ogni fetch verso una route dietro `requireOperator` deve allegare questi header,
// altrimenti riceve 401 (vedi il precedente in farmaci.ts). Senza operatore loggato
// non aggiungiamo nulla: meglio un 401 esplicito che una richiesta incompleta.
// Con il Simulatore ruoli si invia SOLO il Bearer: il ruolo lo decide il server.
export function operatorHeaders(): Record<string, string> {
  const op = currentOperator;
  if (!op) return {};
  if (op.accessToken && isSimulatorSession()) {
    return { Authorization: `Bearer ${op.accessToken}` };
  }
  const headers: Record<string, string> = {
    'X-Operator-Id': op.id,
    'X-Operator-Role': op.role,
  };
  if (op.accessToken) headers.Authorization = `Bearer ${op.accessToken}`;
  return headers;
}

/** Phase 9: sostituisce il token della sessione corrente (rinnovo silenzioso Entra). */
export function updateAccessToken(token: string): void {
  if (currentOperator) currentOperator = { ...currentOperator, accessToken: token };
}

~~~~
