// #260: requirePatientDocumentAccess in AUTH_MODE=entra — gate-level tests with a real local
// JWKS. AC5 (fail closed on incomplete config), AC6 (self-declared headers are never identity),
// and the verified happy path attaching req.operator from claims + server-side mapping.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { requirePatientDocumentAccess } from '../routes/patient-documents.js';
import { resetJwksCache } from '../lib/entra-auth.js';
import { prisma } from '../lib/prisma.js';
import type { AuthedRequest } from '../ai/auth.js';

const TENANT = 'clinicos-gate-tenant';
const AUDIENCE = 'api://clinicos-gate';
const ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const STAMP = Date.now();
const OID = `gate-oid-${STAMP}`;

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwksServer: Server;
let jwksUrl = '';
let userId = '';
let operatorId = '';
const savedEnv: Record<string, string | undefined> = {};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (!(k in savedEnv)) savedEnv[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

before(async () => {
  keys = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'gate-key', alg: 'RS256', use: 'sig' };
  jwksServer = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((r) => jwksServer.listen(0, '127.0.0.1', r));
  const addr = jwksServer.address();
  jwksUrl = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}/keys`;
  resetJwksCache();

  const user = await prisma.user.create({
    data: {
      email: `gate-entra-${STAMP}@synthetic.local`,
      passwordHash: 'x',
      fullName: 'Gate Entra Synthetic',
      entraObjectId: OID,
      operator: { create: { ruolo: 'operatore' } },
    },
    include: { operator: true },
  });
  userId = user.id;
  operatorId = user.operator!.id;
});

after(async () => {
  await prisma.operator.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await new Promise<void>((r) => jwksServer.close(() => r()));
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await prisma.$disconnect().catch(() => {});
});

function mockReq(headers: Record<string, string>): AuthedRequest {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    header: (n: string) => lower[n.toLowerCase()],
    params: { patientId: 'patient-gate' },
    operator: undefined,
  } as unknown as AuthedRequest;
}

/** Async-aware mock response: resolves once status().json() runs (the entra path is async). */
function mockRes() {
  const out: { code?: number; body?: Record<string, unknown>; headers: Record<string, string> } = {
    headers: {},
  };
  let resolveDone: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));
  const res = {
    _out: out,
    done,
    setHeader(name: string, value: string) {
      out.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      out.code = code;
      return res;
    },
    json(body: Record<string, unknown>) {
      out.body = body;
      resolveDone();
      return res;
    },
  };
  return res;
}

async function token(claims: Record<string, unknown> = { oid: OID }) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'gate-key' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(keys.privateKey as CryptoKey);
}

test('AC5: AUTH_MODE=entra with incomplete tenant config fails closed (503)', async () => {
  setEnv({ AUTH_MODE: 'entra', ENTRA_TENANT_ID: undefined, ENTRA_AUDIENCE: undefined });
  const res = mockRes();
  requirePatientDocumentAccess(mockReq({}), res as never, () => {
    assert.fail('next() must not run without config');
  });
  assert.equal(res._out.code, 503);
  assert.equal((res._out.body as { code?: string })?.code, 'document_auth_unavailable');
});

test('AC6: in entra mode self-declared X-Operator-*/X-Demo-Patient-Id headers are NOT identity', async () => {
  setEnv({
    AUTH_MODE: 'entra',
    ENTRA_TENANT_ID: TENANT,
    ENTRA_AUDIENCE: AUDIENCE,
    ENTRA_JWKS_URL: jwksUrl,
  });
  const res = mockRes();
  requirePatientDocumentAccess(
    mockReq({
      'X-Operator-Id': 'spoofed-op',
      'X-Operator-Role': 'admin',
      'X-Demo-Patient-Id': 'patient-gate',
    }),
    res as never,
    () => assert.fail('spoofed headers must never authenticate in entra mode'),
  );
  await res.done;
  assert.equal(res._out.code, 401);
  assert.match(res._out.headers['www-authenticate'] ?? '', /Bearer/);
});

test('AC1-AC3: verified Bearer token authenticates and attaches the mapped operator', async () => {
  setEnv({
    AUTH_MODE: 'entra',
    ENTRA_TENANT_ID: TENANT,
    ENTRA_AUDIENCE: AUDIENCE,
    ENTRA_JWKS_URL: jwksUrl,
  });
  const req = mockReq({ Authorization: `Bearer ${await token()}` });
  const res = mockRes();
  await new Promise<void>((resolve, reject) => {
    requirePatientDocumentAccess(req, res as never, () => resolve());
    res.done.then(() => reject(new Error(`unexpected response ${res._out.code}`)));
  });
  assert.equal(req.operator?.id, operatorId, 'operator id must come from server-side mapping');
  assert.equal(req.operator?.role, 'operator');
});

test('AC4: forged token in entra mode → 401 without enumeration', async () => {
  setEnv({
    AUTH_MODE: 'entra',
    ENTRA_TENANT_ID: TENANT,
    ENTRA_AUDIENCE: AUDIENCE,
    ENTRA_JWKS_URL: jwksUrl,
  });
  const evil = await generateKeyPair('RS256');
  const forged = await new SignJWT({ oid: OID })
    .setProtectedHeader({ alg: 'RS256', kid: 'gate-key' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(evil.privateKey as CryptoKey);
  const res = mockRes();
  requirePatientDocumentAccess(mockReq({ Authorization: `Bearer ${forged}` }), res as never, () =>
    assert.fail('forged token must not authenticate'),
  );
  await res.done;
  assert.equal(res._out.code, 401);
  assert.equal((res._out.body as { code?: string })?.code, 'token_invalid');
});
