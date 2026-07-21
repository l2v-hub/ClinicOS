// #260: Entra JWT validation + server-side identity mapping — unit and route-level tests.
// A LOCAL synthetic JWKS (ephemeral HTTP server) plays the tenant: tokens are signed with a
// real RS256 keypair via jose, so signature/issuer/audience/expiry checks are exercised for
// real (no mocks on the verification path). Synthetic fixtures only — no real identities.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { authenticateEntra, entraConfig, resetJwksCache } from '../lib/entra-auth.js';
import { prisma } from '../lib/prisma.js';

const TENANT = 'clinicos-test-tenant';
const AUDIENCE = 'api://clinicos-test';
const ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;

let goodKeys: Awaited<ReturnType<typeof generateKeyPair>>;
let evilKeys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwksServer: Server;
let jwksUrl: string;

const STAMP = Date.now();
const EMAIL = `entra-test-${STAMP}@synthetic.local`;
const OID_LINKED = `oid-linked-${STAMP}`;
const OID_MAIL = `oid-mail-${STAMP}`;
let linkedUserId: string;
let mailUserId: string;
let inactiveUserId: string;

function makeConfig() {
  const cfg = entraConfig({
    ENTRA_TENANT_ID: TENANT,
    ENTRA_AUDIENCE: AUDIENCE,
    ENTRA_JWKS_URL: jwksUrl,
  } as NodeJS.ProcessEnv);
  assert.ok(cfg, 'test config must be complete');
  return cfg!;
}

async function sign(
  claims: Record<string, unknown>,
  opts: { key?: CryptoKey; issuer?: string; audience?: string; expired?: boolean } = {},
) {
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'good-key' })
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? AUDIENCE)
    .setIssuedAt();
  if (opts.expired) jwt.setExpirationTime(Math.floor(Date.now() / 1000) - 3600);
  else jwt.setExpirationTime('5m');
  return jwt.sign((opts.key ?? goodKeys.privateKey) as CryptoKey);
}

before(async () => {
  goodKeys = await generateKeyPair('RS256');
  evilKeys = await generateKeyPair('RS256');
  const jwk = {
    ...(await exportJWK(goodKeys.publicKey)),
    kid: 'good-key',
    alg: 'RS256',
    use: 'sig',
  };
  jwksServer = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((r) => jwksServer.listen(0, '127.0.0.1', r));
  const addr = jwksServer.address();
  jwksUrl = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}/keys`;
  resetJwksCache();

  // Synthetic users: pre-linked, e-mail-linkable, inactive.
  const linked = await prisma.user.create({
    data: {
      email: `linked-${EMAIL}`,
      passwordHash: 'x',
      fullName: 'Entra Linked Synthetic',
      entraObjectId: OID_LINKED,
      operator: { create: { ruolo: 'operatore' } },
    },
  });
  linkedUserId = linked.id;
  const mail = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: 'x',
      fullName: 'Entra Mail Synthetic',
      operator: { create: { ruolo: 'operatore' } },
    },
  });
  mailUserId = mail.id;
  const inactive = await prisma.user.create({
    data: {
      email: `inactive-${EMAIL}`,
      passwordHash: 'x',
      fullName: 'Entra Inactive Synthetic',
      entraObjectId: `${OID_LINKED}-inactive`,
      isActive: false,
      operator: { create: { ruolo: 'operatore' } },
    },
  });
  inactiveUserId = inactive.id;
});

after(async () => {
  for (const id of [linkedUserId, mailUserId, inactiveUserId]) {
    if (!id) continue;
    await prisma.operator.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.user.delete({ where: { id } }).catch(() => {});
  }
  await new Promise<void>((r) => jwksServer.close(() => r()));
  await prisma.$disconnect().catch(() => {});
});

test('entraConfig fails closed on incomplete configuration (AC5)', () => {
  assert.equal(entraConfig({} as NodeJS.ProcessEnv), null);
  assert.equal(entraConfig({ ENTRA_TENANT_ID: 't' } as NodeJS.ProcessEnv), null);
  assert.equal(entraConfig({ ENTRA_AUDIENCE: 'a' } as NodeJS.ProcessEnv), null);
  const full = entraConfig({ ENTRA_TENANT_ID: 't', ENTRA_AUDIENCE: 'a' } as NodeJS.ProcessEnv);
  assert.equal(full?.issuer, 'https://login.microsoftonline.com/t/v2.0');
});

test('valid token with pre-linked oid resolves the identity (AC1/AC2)', async () => {
  const token = await sign({ oid: OID_LINKED, preferred_username: `linked-${EMAIL}` });
  const r = await authenticateEntra(`Bearer ${token}`, makeConfig());
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.identity.userId, linkedUserId);
    assert.equal(r.identity.role, 'operator');
    assert.ok(r.identity.operatorId);
  }
});

test('unlinked oid with matching verified e-mail auto-links once (AC2)', async () => {
  const token = await sign({ oid: OID_MAIL, preferred_username: EMAIL.toUpperCase() });
  const r = await authenticateEntra(`Bearer ${token}`, makeConfig());
  assert.equal(r.ok, true);
  const persisted = await prisma.user.findUnique({ where: { id: mailUserId } });
  assert.equal(persisted?.entraObjectId, OID_MAIL, 'oid must be persisted on first login');
});

test('e-mail match must NOT hijack a user already linked to a different oid (AC2)', async () => {
  const token = await sign({ oid: 'oid-attacker', preferred_username: `linked-${EMAIL}` });
  const r = await authenticateEntra(`Bearer ${token}`, makeConfig());
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.failure.code, 'identity_not_mapped');
  const untouched = await prisma.user.findUnique({ where: { id: linkedUserId } });
  assert.equal(untouched?.entraObjectId, OID_LINKED);
});

test('missing / malformed / forged / expired / wrong-issuer / wrong-audience → 401 (AC1/AC4)', async () => {
  const cfg = makeConfig();
  const cases: Array<[string, string | undefined]> = [
    ['missing header', undefined],
    ['not bearer', 'Basic abc'],
    ['garbage', 'Bearer not.a.jwt'],
    [
      'forged key',
      `Bearer ${await sign({ oid: OID_LINKED }, { key: evilKeys.privateKey as CryptoKey })}`,
    ],
    ['expired', `Bearer ${await sign({ oid: OID_LINKED }, { expired: true })}`],
    [
      'wrong issuer',
      `Bearer ${await sign({ oid: OID_LINKED }, { issuer: 'https://evil.example/v2.0' })}`,
    ],
    ['wrong audience', `Bearer ${await sign({ oid: OID_LINKED }, { audience: 'api://other' })}`],
    ['no oid claim', `Bearer ${await sign({})}`],
  ];
  for (const [label, header] of cases) {
    const r = await authenticateEntra(header, cfg);
    assert.equal(r.ok, false, `${label} must fail`);
    if (!r.ok) assert.equal(r.failure.status, 401, `${label} must be 401`);
  }
});

test('valid token without a mapped user → 403; inactive user → 403 (AC4)', async () => {
  const cfg = makeConfig();
  const unmapped = await authenticateEntra(`Bearer ${await sign({ oid: 'oid-ghost' })}`, cfg);
  assert.equal(unmapped.ok, false);
  if (!unmapped.ok)
    assert.deepEqual(unmapped.failure, { status: 403, code: 'identity_not_mapped' });

  const inactive = await authenticateEntra(
    `Bearer ${await sign({ oid: `${OID_LINKED}-inactive` })}`,
    cfg,
  );
  assert.equal(inactive.ok, false);
  if (!inactive.ok) assert.deepEqual(inactive.failure, { status: 403, code: 'identity_inactive' });
});
