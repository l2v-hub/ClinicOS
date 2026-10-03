// Phase 9 — production hardening on the REAL app (Express + Postgres). Identity (Entra JWT through a
// local JWKS), Role Simulator isolation, session revocation, config validation, readiness, metrics,
// correlation, AI degradation (Agno stub: 500 / 429 / malformed / down / slow), recovery and
// concurrency. Every write is checked independently in the database.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http, { type Server } from 'node:http';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { prisma } from '../lib/prisma.js';
import { resetJwksCache } from '../lib/entra-auth.js';
import { deploymentTier, validateDeploymentConfig } from '../lib/deployment.js';
import { logEvent, resetMetrics, routeShape } from '../lib/observability.js';
import { setReadinessDeps } from '../lib/readiness.js';
import {
  issueSimulatorToken,
  revokeSimulatorToken,
  simulatorEnabled,
  verifySimulatorToken,
} from '../authz/simulator.js';
import { operatorAuthMode, productionDemoAuthEnabled } from '../ai/auth.js';
import {
  call,
  createPatientOwnedBy,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from '../authz/__tests__/harness-support.js';

const TENANT = 'clinicos-p9-tenant';
const AUDIENCE = 'api://clinicos-p9';
const ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const OID = `p9-oid-${runTag}`;
const METRICS_TOKEN = 'p9-metrics-token-0123456789abcdef';

let base = '';
let close: () => Promise<void>;
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwksServer: Server;
let jwksUrl = '';
let entraUserId = '';
let entraOperatorId = '';
let nurse: Session;
let nursePatientId = '';
const saved: Record<string, string | undefined> = {};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (!(k in saved)) saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}
function restoreEnv(names: string[]) {
  for (const k of names) {
    if (!(k in saved)) continue;
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
    delete saved[k];
  }
}

// ── Agno runtime stub: behaviour switchable per test ─────────────────────────────────────────────
type StubMode = 'ok' | '500' | '429' | 'malformed' | 'slow';
let stubMode: StubMode = 'ok';
const stubSeen: { requestId: string | undefined; path: string; chars: number }[] = [];
let stub: Server;
let stubUrl = '';

before(async () => {
  setEnv({
    AUTH_MODE: 'demo',
    NODE_ENV: 'test',
    SKILLS_INTERPRETER: undefined,
    AI_RUNTIME_SERVICE_TOKEN: 'p9-runtime-token-abcdefghijklmnop',
    SKILLS_AGNO_TIMEOUT_MS: '1000',
    METRICS_TOKEN,
  });
  stub = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      stubSeen.push({
        requestId: req.headers['x-request-id'] as string | undefined,
        path: req.url ?? '',
        chars: body.length,
      });
      if (stubMode === 'slow') return void setTimeout(() => res.end('{}'), 3_000);
      if (stubMode === '500')
        return void res
          .writeHead(500)
          .end('{"detail":{"error":"router error","code":"PROVIDER_UNAVAILABLE"}}');
      if (stubMode === '429') return void res.writeHead(429).end('{"detail":"rate"}');
      res.setHeader('Content-Type', 'application/json');
      if (stubMode === 'malformed') return void res.end('{"route": 42, "garbage"');
      // A plausible router answer: no skill → the deterministic pass decides.
      res.end(
        JSON.stringify({
          route: { skillId: null },
          model: 'test:deterministic',
          // Phase 9: provider-agnostic metadata as returned by the AI runtime gateway.
          ai: {
            provider: 'test',
            model: 'deterministic',
            role: 'command_parser',
            usage: { input_tokens: 700, output_tokens: 20, cached_input_tokens: 100 },
          },
        }),
      );
    });
  });
  await new Promise<void>((r) => stub.listen(0, '127.0.0.1', r));
  const sa = stub.address();
  stubUrl = `http://127.0.0.1:${typeof sa === 'object' && sa ? sa.port : 0}`;
  setEnv({ AI_RUNTIME_URL: stubUrl });

  keys = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'p9-key', alg: 'RS256', use: 'sig' };
  jwksServer = http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((r) => jwksServer.listen(0, '127.0.0.1', r));
  const ja = jwksServer.address();
  jwksUrl = `http://127.0.0.1:${typeof ja === 'object' && ja ? ja.port : 0}/keys`;
  resetJwksCache();

  const user = await prisma.user.create({
    data: {
      email: `p9-entra-${runTag}@synthetic.local`,
      passwordHash: 'ENTRA_ONLY',
      fullName: 'Entra Synthetic P9',
      role: 'OPERATOR',
      entraObjectId: OID,
      operator: { create: { ruolo: 'infermiere' } },
    },
    include: { operator: true },
  });
  entraUserId = user.id;
  entraOperatorId = user.operator!.id;

  ({ base, close } = await startApp());
  nurse = await login(base, 'SIM-NURSE-1');
  nursePatientId = (await createPatientOwnedBy('SIM-NURSE-1', 'p9-nurse')).id;
});

after(async () => {
  setReadinessDeps(null);
  await prisma.patientParameterReading.deleteMany({ where: { patientId: nursePatientId } });
  await prisma.patient.deleteMany({ where: { id: nursePatientId } }).catch(() => {});
  await prisma.operator.deleteMany({ where: { userId: entraUserId } }).catch(() => {});
  await prisma.user.delete({ where: { id: entraUserId } }).catch(() => {});
  await close();
  await new Promise<void>((r) => jwksServer.close(() => r()));
  stub.closeAllConnections?.();
  await new Promise<void>((r) => stub.close(() => r()));
  restoreEnv(Object.keys(saved));
});

async function entraToken(
  claims: Record<string, unknown> = {},
  opts: { exp?: string; aud?: string } = {},
) {
  return new SignJWT({
    oid: OID,
    preferred_username: `p9-entra-${runTag}@synthetic.local`,
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'p9-key' })
    .setIssuer(ISSUER)
    .setAudience(opts.aud ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '10m')
    .sign(keys.privateKey);
}

async function raw(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* text */
  }
  return { status: res.status, body, headers: res.headers };
}

// ── 1. Deployment tier + configuration validation (unit) ─────────────────────────────────────────

const PROD_LIKE = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://x@127.0.0.1:1/db',
  FRONTEND_URL: 'https://clinicos-eosin.vercel.app,http://localhost:5173',
  AI_RUNTIME_URL: 'https://runtime.example.up.railway.app',
  AI_RUNTIME_SERVICE_TOKEN: 'x'.repeat(28),
} as NodeJS.ProcessEnv;
const DEMO_LIKE = {
  ...PROD_LIKE,
  FRONTEND_URL: 'https://clinicos-demo.vercel.app',
  AUTH_MODE: 'demo',
  ALLOW_PRODUCTION_DEMO_AUTH: 'true',
  DEMO_DATASET_ID: 'synthetic-v1',
  DEMO_AUTH_EXPIRES_AT: new Date(Date.now() + 86_400_000).toISOString(),
  ROLE_SIMULATOR_ENABLED: 'true',
  ROLE_SIMULATOR_ALLOW_PRODUCTION: 'true',
  ROLE_SIMULATOR_SECRET: 's'.repeat(64),
} as NodeJS.ProcessEnv;

test('config: current production and demo env shapes start (no errors), tiers derived', () => {
  const prod = validateDeploymentConfig(PROD_LIKE);
  assert.equal(prod.tier, 'production');
  assert.deepEqual(prod.errors, []);
  assert.ok(prod.warnings.some((w) => w.includes('AUTH_MODE non impostato')));
  assert.ok(
    prod.warnings.some((w) => w.includes('sviluppo')),
    'loopback origin flagged',
  );
  assert.ok(
    prod.warnings.some((w) => w.includes('CLINICOS_ENV non impostato')),
    'derived tier flagged',
  );
  assert.ok(
    !validateDeploymentConfig({ ...PROD_LIKE, CLINICOS_ENV: 'production' }).warnings.some((w) =>
      w.includes('CLINICOS_ENV'),
    ),
  );
  const demo = validateDeploymentConfig(DEMO_LIKE);
  assert.equal(demo.tier, 'demo');
  assert.deepEqual(demo.errors, []);
  assert.equal(deploymentTier({ NODE_ENV: 'test' }), 'test');
  assert.equal(deploymentTier({}), 'development');
  assert.equal(
    deploymentTier({ CLINICOS_ENV: 'prod' }),
    'production',
    'misspelled tier fails closed',
  );
});

test('config: dangerous production combinations are errors (fail fast)', () => {
  const cases: [NodeJS.ProcessEnv, RegExp][] = [
    [{ ...PROD_LIKE, AUTH_MODE: 'demo' }, /AUTH_MODE=demo/],
    [{ ...PROD_LIKE, ROLE_SIMULATOR_ENABLED: 'true' }, /ROLE_SIMULATOR_ENABLED/],
    [{ ...PROD_LIKE, ALLOW_PRODUCTION_DEMO_AUTH: 'true' }, /ALLOW_PRODUCTION_DEMO_AUTH/],
    [{ ...DEMO_LIKE, CLINICOS_ENV: 'production' }, /synthetic-v1|ROLE_SIMULATOR/],
    [{ ...PROD_LIKE, AUTH_MODE: 'entra' }, /ENTRA_TENANT_ID/],
    [{ ...PROD_LIKE, AUTH_MODE: 'entra-ish' }, /non supportato/],
    [{ ...PROD_LIKE, AUTHZ_ENFORCEMENT: 'off' }, /AUTHZ_ENFORCEMENT/],
    [{ ...PROD_LIKE, AUTHZ_UNMAPPED_ROUTES: 'allow' }, /UNMAPPED/],
    [{ ...PROD_LIKE, FRONTEND_URL: '*' }, /CORS/],
    [{ ...PROD_LIKE, FRONTEND_URL: 'http://evil.example' }, /CORS/],
    [{ ...PROD_LIKE, AI_RUNTIME_SERVICE_TOKEN: undefined }, /AI_RUNTIME_SERVICE_TOKEN/],
    [{ ...PROD_LIKE, AI_MAX_RETRIES: '50' }, /AI_MAX_RETRIES/],
    [{ ...PROD_LIKE, METRICS_TOKEN: 'short' }, /METRICS_TOKEN/],
    [{ ...DEMO_LIKE, ROLE_SIMULATOR_SECRET: 'short' }, /ROLE_SIMULATOR_SECRET/],
    [{ ...PROD_LIKE, DATABASE_URL: undefined }, /DATABASE_URL/],
  ];
  for (const [env, pattern] of cases) {
    const { errors } = validateDeploymentConfig(env);
    assert.ok(
      errors.some((e) => pattern.test(e)),
      `${pattern}: ${JSON.stringify(errors)}`,
    );
  }
  // Never echoes secret values.
  const leaky = validateDeploymentConfig({ ...PROD_LIKE, METRICS_TOKEN: 'abc123' });
  assert.ok(!JSON.stringify(leaky).includes('abc123'));
});

// ── 2. Role Simulator isolation ──────────────────────────────────────────────────────────────────

test('simulator: no flag combination enables it (or demo headers) on a real production tier', () => {
  const realProd = { ...DEMO_LIKE, CLINICOS_ENV: 'production' };
  assert.equal(simulatorEnabled('demo', realProd), false);
  assert.equal(operatorAuthMode(realProd), 'disabled');
  assert.equal(productionDemoAuthEnabled(realProd), false);
  const noDemoMarker = { ...DEMO_LIKE, DEMO_DATASET_ID: undefined };
  assert.equal(simulatorEnabled('demo', noDemoMarker), false);
  assert.equal(operatorAuthMode(noDemoMarker), 'disabled');
  // The demo environment keeps working.
  assert.equal(operatorAuthMode(DEMO_LIKE), 'demo');
  assert.equal(simulatorEnabled('demo', DEMO_LIKE), true);
});

test('simulator: production config → endpoints unreachable, headers/body identity refused (HTTP)', async () => {
  const names = Object.keys(DEMO_LIKE).concat('CLINICOS_ENV');
  const snapshot = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  Object.assign(process.env, { ...DEMO_LIKE, CLINICOS_ENV: 'production' });
  process.env.DATABASE_URL = snapshot.DATABASE_URL;
  try {
    assert.equal((await raw('/auth/simulator/identities')).status, 404);
    const mint = await raw('/auth/simulator/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityId: 'SIM-ADMIN' }),
    });
    assert.equal(mint.status, 404);
    // A token minted earlier (dev) is not accepted either: no identity source exists.
    const replay = await raw('/auth/me', { headers: { Authorization: `Bearer ${nurse.token}` } });
    assert.equal(replay.status, 503);
    const headers = await raw('/patients/page', {
      headers: { 'X-Operator-Id': 'SEED-OP-004', 'X-Operator-Role': 'admin' },
    });
    assert.equal(headers.status, 503);
    assert.equal(headers.body.code, 'auth_disabled');
    const status = await raw('/auth/status');
    assert.equal(status.body.simulator, false);
    assert.equal(status.body.mode, 'disabled');
    // ?simulator=1 / hidden URLs change nothing.
    assert.equal((await raw('/auth/simulator/identities?simulator=1&debug=true')).status, 404);
  } finally {
    for (const [k, v] of Object.entries(snapshot)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

// ── 3. Real identity: Entra JWT → mapping → same policy/scope ────────────────────────────────────

test('identity: Entra JWT end-to-end; client-declared identity/role ignored; failures fail closed', async () => {
  setEnv({
    AUTH_MODE: 'entra',
    ENTRA_TENANT_ID: TENANT,
    ENTRA_AUDIENCE: AUDIENCE,
    ENTRA_JWKS_URL: jwksUrl,
  });
  try {
    const token = await entraToken();
    const me = await raw('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Operator-Id': 'SIM-ADMIN',
        'X-Operator-Role': 'admin',
      },
    });
    assert.equal(me.status, 200, JSON.stringify(me.body));
    assert.equal(me.body.id, entraOperatorId, 'identity from verified claims only');
    assert.equal(me.body.identitySource, 'entra');
    assert.notEqual(me.body.appRole, 'administrator');
    assert.equal(me.body.capabilities['authz.manage_policy']?.allowed ?? false, false);
    // Clinical list goes through the same route gate + resident scope (own residents only).
    const list = await raw('/patients/page?limit=200', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(list.status, 200);
    const rows = Array.isArray(list.body)
      ? list.body
      : (list.body.items ?? list.body.patients ?? []);
    assert.ok(!rows.some((p: any) => p.id === nursePatientId), 'resident scope applies to Entra');
    // Policy admin API is denied for this identity even with a forged role header.
    const pol = await raw('/authz/policy', {
      headers: { Authorization: `Bearer ${token}`, 'X-Operator-Role': 'admin' },
    });
    assert.equal(pol.status, 403);

    const failures: [string, number][] = [
      ['', 401],
      [await entraToken({}, { aud: 'api://other' }), 401],
      [
        await entraToken({}, { exp: '1s' }).then(
          async (t) => (await new Promise((r) => setTimeout(r, 1500)), t),
        ),
        401,
      ],
      [
        await entraToken({
          oid: `unmapped-${runTag}`,
          preferred_username: `nobody-${runTag}@x.local`,
        }),
        403,
      ],
      [nurse.token, 401], // a simulator token is not an Entra token
    ];
    for (const [t, expected] of failures) {
      const r = await raw('/auth/me', { headers: t ? { Authorization: `Bearer ${t}` } : {} });
      assert.equal(r.status, expected, `${t.slice(0, 12)} → ${r.status}`);
    }
    // Simulator is unavailable in entra mode.
    assert.equal((await raw('/auth/simulator/identities')).status, 404);
    // Deactivated user → 403 at the next request (no permission snapshot at login).
    await prisma.user.update({ where: { id: entraUserId }, data: { isActive: false } });
    assert.equal(
      (await raw('/auth/me', { headers: { Authorization: `Bearer ${token}` } })).status,
      403,
    );
    await prisma.user.update({ where: { id: entraUserId }, data: { isActive: true } });
  } finally {
    restoreEnv(['AUTH_MODE', 'ENTRA_TENANT_ID', 'ENTRA_AUDIENCE', 'ENTRA_JWKS_URL']);
    setEnv({ AUTH_MODE: 'demo' });
  }
});

// ── 4. Sessions ─────────────────────────────────────────────────────────────────────────────────

test('session: simulator logout is enforced server-side; expiry enforced', async () => {
  const s = await login(base, 'SIM-OSS-1');
  assert.equal((await call(base, s, 'GET', '/auth/me')).status, 200);
  const out = await raw('/auth/simulator/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.token}` },
  });
  assert.equal(out.status, 204);
  assert.equal(
    (await call(base, s, 'GET', '/auth/me')).status,
    401,
    'copied token dead after logout',
  );
  // Idempotent, non-enumerating.
  assert.equal((await raw('/auth/simulator/logout', { method: 'POST' })).status, 204);
  // Unit: expired / tampered / revoked.
  const t = issueSimulatorToken('SIM-OSS-1', Date.now() - 13 * 3_600_000).token;
  assert.equal(verifySimulatorToken(t), null);
  const fresh = issueSimulatorToken('SIM-OSS-1').token;
  assert.equal(verifySimulatorToken(fresh.slice(0, -2) + 'xx'), null);
  assert.equal(revokeSimulatorToken(fresh), true);
  assert.equal(verifySimulatorToken(fresh), null);
  assert.equal(revokeSimulatorToken('sim.garbage'), false);
});

test('session: CORS refuses unknown origins; API responses carry security headers', async () => {
  const evil = await raw('/health', { headers: { Origin: 'https://clinicos-evil.vercel.app' } });
  assert.equal(evil.status, 403);
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  const ok = await raw('/health');
  assert.equal(ok.headers.get('x-frame-options'), 'DENY');
  assert.match(ok.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(ok.headers.get('x-powered-by'), null);
});

// ── 5. Health / readiness / metrics / correlation ───────────────────────────────────────────────

test('health/readiness: liveness independent; readiness = DB + policy; AI never decides', async () => {
  const ready = await raw('/ready');
  assert.equal(ready.status, 200, JSON.stringify(ready.body));
  assert.deepEqual(ready.body.checks, { database: 'ok', policy: 'ok' });
  assert.equal(ready.body.ai.runtime, 'configured');
  // Runtime stub is up but it would not matter: point it to a dead port → still ready.
  setEnv({ AI_RUNTIME_URL: 'http://127.0.0.1:1' });
  assert.equal((await raw('/ready')).status, 200);
  setEnv({ AI_RUNTIME_URL: stubUrl });
  const before = stubSeen.length;
  await raw('/ready');
  await raw('/health');
  assert.equal(stubSeen.length, before, 'probes never call the AI runtime');
  // DB down (simulated) → not ready, liveness still OK, clinical API fails closed with no leak.
  setReadinessDeps({
    pingDatabase: () => Promise.reject(new Error('ECONNREFUSED 10.0.0.1:5432 password=x')),
    loadPolicy: () => Promise.resolve(null),
  });
  const down = await raw('/ready');
  assert.equal(down.status, 503);
  assert.equal(down.body.checks.database, 'fail');
  assert.ok(!JSON.stringify(down.body).includes('ECONNREFUSED'));
  assert.equal((await raw('/health')).status, 200);
  // Slow DB → bounded by the 2 s check timeout.
  setReadinessDeps({
    pingDatabase: () => new Promise((r) => setTimeout(r, 10_000)),
    loadPolicy: () => Promise.resolve(null),
  });
  const t0 = Date.now();
  assert.equal((await raw('/ready')).status, 503);
  assert.ok(Date.now() - t0 < 4_000);
  setReadinessDeps(null);
  assert.equal((await raw('/ready')).status, 200, 'recovers when the dependency is back');
});

test('observability: X-Request-Id accepted/minted, metrics token-gated, no clinical data', async () => {
  const mine = await raw('/health', { headers: { 'X-Request-Id': 'p9-corr-0001' } });
  assert.equal(mine.headers.get('x-request-id'), 'p9-corr-0001');
  const bad = await raw('/health', { headers: { 'X-Request-Id': 'bad id\twith spaces' } });
  assert.match(bad.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/);
  assert.equal((await raw('/metrics')).status, 401);
  assert.equal((await raw('/metrics', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  setEnv({ METRICS_TOKEN: undefined });
  assert.equal(
    (await raw('/metrics', { headers: { Authorization: `Bearer ${METRICS_TOKEN}` } })).status,
    404,
  );
  setEnv({ METRICS_TOKEN });
  await call(base, nurse, 'GET', `/patients/${nursePatientId}`);
  await call(base, nurse, 'GET', `/authz/policy`); // nurse → 403 capability_denied
  for (let i = 0; i < 5; i++) await raw(`/zz-scan-${runTag}-${i}`); // anonymous scanner
  const m = await raw('/metrics', { headers: { Authorization: `Bearer ${METRICS_TOKEN}` } });
  assert.equal(m.status, 200);
  assert.match(m.body, /clinicos_http_requests_total\{area="patients",method="GET",status="2xx"\}/);
  assert.match(m.body, /clinicos_http_error_codes_total\{area="authz",code="capability_denied"\}/);
  assert.ok(!m.body.includes(nursePatientId), 'no resident id in metrics');
  assert.ok(!m.body.includes('SIM-NURSE-1'), 'no operator id in metrics');
  assert.ok(!m.body.includes('zz-scan'), 'unknown paths never become label values');
  assert.match(m.body, /area="other"/);
  assert.equal(routeShape(`/patients/${nursePatientId}/vitals?x=Mario`), '/patients/:id/vitals');
  assert.equal(routeShape('/operators/SIM-NURSE-1'), '/operators/:id');
});

test('logging: structured events redact sensitive keys and cap values', () => {
  const lines: string[] = [];
  const orig = console.log;
  setEnv({ ACCESS_LOG: 'true' });
  console.log = (line: string) => lines.push(line);
  try {
    logEvent('x', {
      token: 'sk-secret',
      prompt: 'paziente Rossi',
      transcript: 'audio',
      kind: 'k',
      long: 'y'.repeat(500),
    });
  } finally {
    console.log = orig;
    restoreEnv(['ACCESS_LOG']);
  }
  const evt = JSON.parse(lines[0]);
  assert.equal(evt.token, '[redacted]');
  assert.equal(evt.prompt, '[redacted]');
  assert.equal(evt.transcript, '[redacted]');
  assert.equal(evt.long.length, 120);
  assert.ok(!lines[0].includes('sk-secret') && !lines[0].includes('Rossi'));
});

// ── 6. AI resilience: Agno failures degrade, correlation reaches the runtime ─────────────────────

async function readTurn(mode: StubMode) {
  stubMode = mode;
  const res = await fetch(`${base}/skills/converse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nurse.token}`,
      'X-Request-Id': `p9-${mode}-${runTag}`.slice(0, 64),
    },
    body: JSON.stringify({
      message: 'parametri vitali di questo ospite',
      context: { currentPatientId: nursePatientId },
    }),
  });
  return {
    status: res.status,
    body: (await res.json()) as any,
    rid: res.headers.get('x-request-id'),
  };
}

test('AI resilience: Agno ok/500/429/malformed/slow/down → same safe answer, no false success', async () => {
  resetMetrics();
  const writesBefore = await prisma.patientParameterReading.count({
    where: { patientId: nursePatientId },
  });
  const okTurn = await readTurn('ok');
  assert.equal(okTurn.status, 200, JSON.stringify(okTurn.body));
  const seen = stubSeen.filter((s) => s.path.includes('skill-route')).at(-1);
  assert.equal(seen?.requestId, okTurn.rid, 'correlation id forwarded to the runtime');
  for (const mode of ['500', '429', 'malformed', 'slow'] as StubMode[]) {
    const t0 = Date.now();
    const turn = await readTurn(mode);
    assert.equal(turn.status, 200, `${mode}: ${JSON.stringify(turn.body)}`);
    assert.equal(turn.body.skillId, okTurn.body.skillId, `${mode}: same skill`);
    assert.equal(turn.body.status, okTurn.body.status, `${mode}: deterministic fallback`);
    assert.ok(Date.now() - t0 < 5_000, `${mode}: bounded by the timeout budget`);
  }
  setEnv({ AI_RUNTIME_URL: 'http://127.0.0.1:1' });
  const down = await readTurn('ok');
  setEnv({ AI_RUNTIME_URL: stubUrl });
  assert.equal(down.status, 200);
  assert.equal(down.body.status, okTurn.body.status);
  const m = (await raw('/metrics', { headers: { Authorization: `Bearer ${METRICS_TOKEN}` } }))
    .body as string;
  for (const outcome of [
    'ok',
    'http_error',
    'rate_limited',
    'malformed',
    'timeout',
    'network_error',
  ])
    assert.match(
      m,
      new RegExp(`clinicos_ai_calls_total\\{kind="skill_route",outcome="${outcome}",`),
      outcome,
    );
  assert.match(m, /clinicos_ai_fallback_total\{component="skill_interpreter"/);
  assert.equal(
    await prisma.patientParameterReading.count({ where: { patientId: nursePatientId } }),
    writesBefore,
    'degraded AI never writes',
  );
  assert.match(m, /clinicos_ai_request_chars_total\{kind="skill_route"\} \d+/);
  stubMode = 'ok';
});

test('AI off: interpreter deterministic + no runtime → write workflow still previews and commits once', async () => {
  setEnv({ AI_RUNTIME_URL: undefined, SKILLS_INTERPRETER: 'deterministic' });
  try {
    const before = await prisma.patientParameterReading.count({
      where: { patientId: nursePatientId },
    });
    const ask = await call(base, nurse, 'POST', '/skills/converse', {
      message: 'registra pressione 125/80 a questo ospite',
      context: { currentPatientId: nursePatientId },
    });
    assert.equal(ask.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(ask.body));
    const confirm = () =>
      call(base, nurse, 'POST', '/skills/converse', {
        workflowId: ask.body.workflowId,
        action: 'confirm',
        previewId: ask.body.preview.previewId,
        context: { currentPatientId: nursePatientId },
      });
    // Duplicate confirmation (double click / two tabs / lost response retry), concurrently.
    const results = await Promise.all([confirm(), confirm(), confirm()]);
    const completed = results.filter((r) => r.body.status === 'COMPLETED').length;
    assert.ok(completed >= 1, JSON.stringify(results.map((r) => r.body.status)));
    assert.equal(
      await prisma.patientParameterReading.count({ where: { patientId: nursePatientId } }),
      before + 1,
      'exactly one write despite three confirmations',
    );
    // Retry after the "lost response": still exactly one row, never a false new success.
    const retry = await confirm();
    assert.notEqual(retry.status, 500);
    assert.equal(
      await prisma.patientParameterReading.count({ where: { patientId: nursePatientId } }),
      before + 1,
    );
    assert.ok(
      await waitForAudit({ requestId: `skill-${ask.body.workflowId}`, outcome: 'ok' }),
      'audit row present',
    );
  } finally {
    restoreEnv(['SKILLS_INTERPRETER']);
    setEnv({ AI_RUNTIME_URL: stubUrl });
  }
});

// ── 7. Concurrency / authorization recheck at commit ────────────────────────────────────────────

test('concurrency: two operators write the same resident simultaneously → both recorded, no lost update', async () => {
  const supervisor = await login(base, 'SIM-SUPERVISOR-1');
  setEnv({ SKILLS_INTERPRETER: 'deterministic' });
  try {
    const before = await prisma.patientParameterReading.count({
      where: { patientId: nursePatientId },
    });
    const prep = (s: Session, value: string) =>
      call(base, s, 'POST', '/skills/converse', {
        message: `registra pressione ${value} a questo ospite`,
        context: { currentPatientId: nursePatientId },
      });
    const [a, b] = await Promise.all([prep(nurse, '121/79'), prep(supervisor, '131/82')]);
    assert.equal(a.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(a.body));
    assert.equal(b.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(b.body));
    const [ca, cb] = await Promise.all(
      [
        [nurse, a],
        [supervisor, b],
      ].map(([s, r]: any) =>
        call(base, s, 'POST', '/skills/converse', {
          workflowId: r.body.workflowId,
          action: 'confirm',
          previewId: r.body.preview.previewId,
          context: { currentPatientId: nursePatientId },
        }),
      ),
    );
    assert.equal(ca.body.status, 'COMPLETED');
    assert.equal(cb.body.status, 'COMPLETED');
    assert.equal(
      await prisma.patientParameterReading.count({ where: { patientId: nursePatientId } }),
      before + 2,
    );
    // A workflow belongs to its session: another identity cannot confirm it.
    const c = await prep(nurse, '119/77');
    const hijack = await call(base, supervisor, 'POST', '/skills/converse', {
      workflowId: c.body.workflowId,
      action: 'confirm',
      previewId: c.body.preview.previewId,
      context: { currentPatientId: nursePatientId },
    });
    assert.notEqual(hijack.body.status, 'COMPLETED');
    assert.equal(
      await prisma.patientParameterReading.count({ where: { patientId: nursePatientId } }),
      before + 2,
    );
  } finally {
    restoreEnv(['SKILLS_INTERPRETER']);
  }
});

test('recovery: backend restart mid-workflow → pending confirmation expires cleanly, no write', async () => {
  setEnv({ SKILLS_INTERPRETER: 'deterministic' });
  try {
    const before = await prisma.patientParameterReading.count({
      where: { patientId: nursePatientId },
    });
    const ask = await call(base, nurse, 'POST', '/skills/converse', {
      message: 'registra pressione 118/76 a questo ospite',
      context: { currentPatientId: nursePatientId },
    });
    assert.equal(ask.body.status, 'NEEDS_CONFIRMATION');
    // Simulated restart: the in-memory workflow store is gone (a fresh process has an empty one).
    const { defaultSkillDeps } = await import('../skills/index.js');
    const { createMemoryWorkflowStore } = await import('../skills/store.js');
    const original = defaultSkillDeps.store;
    defaultSkillDeps.store = createMemoryWorkflowStore();
    let after;
    try {
      after = await call(base, nurse, 'POST', '/skills/converse', {
        workflowId: ask.body.workflowId,
        action: 'confirm',
        previewId: ask.body.preview.previewId,
        context: { currentPatientId: nursePatientId },
      });
    } finally {
      defaultSkillDeps.store = original;
    }
    assert.notEqual(after.body.status, 'COMPLETED', JSON.stringify(after.body));
    assert.ok(after.status < 500);
    assert.equal(
      await prisma.patientParameterReading.count({ where: { patientId: nursePatientId } }),
      before,
    );
  } finally {
    restoreEnv(['SKILLS_INTERPRETER']);
  }
});

// ── 8. Provider-agnostic backend (Phase 9 provider abstraction) ─────────────────────────────────

test('provider metadata: metrics carry provider/role/tokens and the normalized error code', async () => {
  resetMetrics();
  setEnv({ ACCESS_LOG: 'true' });
  const lines: string[] = [];
  const orig = console.log;
  console.log = (line: string) => lines.push(String(line));
  try {
    await readTurn('ok');
    await readTurn('500');
  } finally {
    console.log = orig;
    restoreEnv(['ACCESS_LOG']);
  }
  const m = (await raw('/metrics', { headers: { Authorization: `Bearer ${METRICS_TOKEN}` } }))
    .body as string;
  assert.match(
    m,
    /clinicos_ai_calls_total\{kind="skill_route",outcome="ok",provider="test",role="command_parser"\}/,
  );
  assert.match(
    m,
    /clinicos_ai_tokens_total\{direction="input",kind="skill_route",provider="test"\} 700/,
  );
  assert.match(
    m,
    /clinicos_ai_tokens_total\{direction="cached_input",kind="skill_route",provider="test"\} 100/,
  );
  const failure = lines
    .filter((l) => l.includes('"evt":"ai_call"'))
    .map((l) => JSON.parse(l))
    .find((e) => e.outcome === 'http_error');
  assert.equal(failure?.code, 'PROVIDER_UNAVAILABLE', 'normalized code from the runtime');
  stubMode = 'ok';
});

test('AI_ENABLED=false: every AI path off, classic API and deterministic assistant keep working', async () => {
  setEnv({ AI_ENABLED: 'false' });
  try {
    const before = stubSeen.length;
    const turn = await readTurn('ok');
    assert.equal(turn.status, 200);
    assert.equal(turn.body.interpreter, 'deterministic');
    assert.equal(stubSeen.length, before, 'no runtime call at all');
    const ready = await raw('/ready');
    assert.equal(ready.status, 200, 'AI off never makes the service not ready');
    assert.equal(ready.body.ai.enabled, false);
    assert.equal(ready.body.ai.voice, 'disabled');
    assert.equal((await call(base, nurse, 'GET', `/patients/${nursePatientId}`)).status, 200);
    // Import availability is computed once per process (env change = restart); covered by
    // src/ai/__tests__/config.test.ts «AI_ENABLED=false makes extraction unavailable».
  } finally {
    restoreEnv(['AI_ENABLED']);
  }
});
