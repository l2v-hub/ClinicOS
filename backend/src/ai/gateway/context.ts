// REQ-039: authenticated + signed authorization context for the AI Data Gateway.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { GatewayError, type UserContext } from './types.js';

const CONTEXT_VERSION = 1;
const CONTEXT_HEADER = 'x-ai-context';
const SIGNATURE_HEADER = 'x-ai-context-signature';
const MAX_ENVELOPE_CHARS = 4096;
const MAX_CONTEXT_SECONDS = 60;
const MAX_CLOCK_SKEW_SECONDS = 30;
const MAX_PERMITTED_PATIENTS = 100;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;
const SAFE_TENANT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ALLOWED_ROLES = new Set(['operator', 'operatore', 'manager', 'admin']);

interface SignedContextPayload extends UserContext {
  v: typeof CONTEXT_VERSION;
  issuedAt: number;
  expiresAt: number;
}

type HeaderMap = Record<string, string | string[] | undefined>;

export function defaultTenant(env: NodeJS.ProcessEnv = process.env): string {
  return (env.AI_DEFAULT_TENANT || 'clinicos').trim() || 'clinicos';
}

function configuredSecret(env: NodeJS.ProcessEnv): string {
  const secret = (env.AI_GATEWAY_CONTEXT_SECRET || '').trim();
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new GatewayError('unauthorized', 'Signed user context required');
  }
  return secret;
}

function secureEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkServiceToken(
  authorization: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const token = (env.AI_RUNTIME_SERVICE_TOKEN || '').trim();
  if (!token || !authorization?.startsWith('Bearer ')) return false;
  return secureEquals(authorization.slice(7), token);
}

function header(headers: HeaderMap, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value);
}

function invalidContext(): never {
  throw new GatewayError('unauthorized', 'Invalid or expired user context');
}

function validatePayload(value: unknown, nowSeconds: number): SignedContextPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidContext();
  const p = value as Partial<SignedContextPayload>;
  if (p.v !== CONTEXT_VERSION || !isSafeId(p.userId) || !isSafeId(p.requestId)) invalidContext();
  if (typeof p.tenantId !== 'string' || !SAFE_TENANT.test(p.tenantId)) invalidContext();
  if (!Array.isArray(p.roles) || p.roles.length < 1 || p.roles.length > 4) invalidContext();
  const roles = p.roles.map((role) => (typeof role === 'string' ? role.toLowerCase() : ''));
  if (new Set(roles).size !== roles.length || roles.some((role) => !ALLOWED_ROLES.has(role))) {
    invalidContext();
  }
  if (p.permittedPatientIds !== null && !Array.isArray(p.permittedPatientIds)) invalidContext();
  const patientIds = p.permittedPatientIds;
  if (
    Array.isArray(patientIds) &&
    (patientIds.length > MAX_PERMITTED_PATIENTS ||
      new Set(patientIds).size !== patientIds.length ||
      patientIds.some((id) => !isSafeId(id)))
  ) {
    invalidContext();
  }
  if (!Number.isInteger(p.issuedAt) || !Number.isInteger(p.expiresAt)) invalidContext();
  const issuedAt = p.issuedAt as number;
  const expiresAt = p.expiresAt as number;
  if (
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > MAX_CONTEXT_SECONDS ||
    issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS ||
    expiresAt <= nowSeconds
  ) {
    invalidContext();
  }
  return {
    v: CONTEXT_VERSION,
    userId: p.userId,
    tenantId: p.tenantId,
    roles,
    permittedPatientIds: patientIds === null ? null : [...(patientIds as string[])],
    requestId: p.requestId,
    issuedAt,
    expiresAt,
  };
}

export function signUserContext(
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now(),
  ttlSeconds = 60,
): Record<string, string> {
  const nowSeconds = Math.floor(nowMs / 1000);
  const ttl = Math.min(MAX_CONTEXT_SECONDS, Math.max(1, Math.floor(ttlSeconds)));
  const payload = validatePayload(
    { ...ctx, v: CONTEXT_VERSION, issuedAt: nowSeconds, expiresAt: nowSeconds + ttl },
    nowSeconds,
  );
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  if (encoded.length > MAX_ENVELOPE_CHARS) invalidContext();
  const signature = createHmac('sha256', configuredSecret(env)).update(encoded).digest('base64url');
  return { [CONTEXT_HEADER]: encoded, [SIGNATURE_HEADER]: signature };
}

/** Parse and verify the signed context. Independent legacy X-AI role/scope headers are ignored. */
export function parseUserContext(
  headers: HeaderMap,
  env: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now(),
): UserContext {
  const encoded = header(headers, CONTEXT_HEADER);
  const signature = header(headers, SIGNATURE_HEADER);
  if (!encoded || encoded.length > MAX_ENVELOPE_CHARS || !signature) invalidContext();
  const expected = createHmac('sha256', configuredSecret(env)).update(encoded).digest('base64url');
  if (!secureEquals(signature, expected)) invalidContext();
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    invalidContext();
  }
  const payload = validatePayload(decoded, Math.floor(nowMs / 1000));
  return {
    userId: payload.userId,
    tenantId: payload.tenantId,
    roles: payload.roles,
    permittedPatientIds: payload.permittedPatientIds,
    requestId: payload.requestId,
  };
}

export function assertTenant(ctx: UserContext, env: NodeJS.ProcessEnv = process.env): void {
  if (ctx.tenantId !== defaultTenant(env)) {
    throw new GatewayError('tenant_isolation', 'Tenant not accessible');
  }
}

export function isPatientAllowed(ctx: UserContext, patientId: string): boolean {
  if (ctx.permittedPatientIds === null) return true;
  return ctx.permittedPatientIds.includes(patientId);
}

export function assertPatientAllowed(ctx: UserContext, patientId: string): void {
  if (!isPatientAllowed(ctx, patientId))
    throw new GatewayError('forbidden', 'Patient not accessible');
}

export function canCrossPatientSearch(
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const enabled = (env.AI_CROSS_PATIENT_SEARCH_ENABLED || 'false').trim() === 'true';
  const privileged = ctx.roles.some((r) => r === 'manager' || r === 'admin');
  return enabled && privileged;
}

export function canFacilityRead(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AI_FACILITY_QUERIES_ENABLED || 'false').trim() === 'true';
}

export function filterAllowedPatients(ctx: UserContext, ids: string[]): string[] {
  return ids.filter((id) => isPatientAllowed(ctx, id));
}
