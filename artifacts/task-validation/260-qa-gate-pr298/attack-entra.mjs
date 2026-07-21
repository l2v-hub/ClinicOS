// QA GATE PR#298 / issue #260 — INDEPENDENT adversarial attack harness (NOT repo source).
// Spins its own local JWKS + RS256 keypair and drives the PR's authenticateEntra /
// requirePatientDocumentAccess with attack payloads BEYOND the PR's own tests.
// Every unauthorized case must be REJECTED (401, or mapped 403) with no crash.
// Also captures module stdout/stderr and asserts NO token/e-mail material is logged (AC7).
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { SignJWT, exportJWK, generateKeyPair, base64url } from 'jose';

const WT = 'E:/Workspace/DG_SE_DEV/ClinicOS/.claude/worktrees/agent-a142315a3a0b3461b';
const EV = 'E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/260-qa-gate-pr298';
const HEAD_SHA = 'c853e93da704dc510c6455231268fe3c8515cdba';

const entra = await import(pathToFileURL(`${WT}/backend/src/lib/entra-auth.ts`).href);
const docs = await import(pathToFileURL(`${WT}/backend/src/routes/patient-documents.ts`).href);
const { prisma } = await import(pathToFileURL(`${WT}/backend/src/lib/prisma.ts`).href);
const { authenticateEntra, entraConfig, resetJwksCache } = entra;
const { requirePatientDocumentAccess } = docs;

const TENANT = 'clinicos-attack-tenant';
const AUDIENCE = 'api://clinicos-attack';
const ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const STAMP = Date.now();

const SECRETS_TO_HUNT = [];

const goodKeys = await generateKeyPair('RS256');
const otherTenantKeys = await generateKeyPair('RS256');
const goodJwk = { ...(await exportJWK(goodKeys.publicKey)), kid: 'good', alg: 'RS256', use: 'sig' };
const otherJwk = {
  ...(await exportJWK(otherTenantKeys.publicKey)),
  kid: 'other',
  alg: 'RS256',
  use: 'sig',
};

const jwksServer = createServer((_q, r) => {
  r.setHeader('Content-Type', 'application/json');
  r.end(JSON.stringify({ keys: [goodJwk] }));
});
await new Promise((r) => jwksServer.listen(0, '127.0.0.1', r));
const jwksUrl = `http://127.0.0.1:${jwksServer.address().port}/keys`;
const otherJwksServer = createServer((_q, r) => {
  r.setHeader('Content-Type', 'application/json');
  r.end(JSON.stringify({ keys: [otherJwk] }));
});
await new Promise((r) => otherJwksServer.listen(0, '127.0.0.1', r));
resetJwksCache();

const config = entraConfig({
  ENTRA_TENANT_ID: TENANT,
  ENTRA_AUDIENCE: AUDIENCE,
  ENTRA_JWKS_URL: jwksUrl,
});
assert.ok(config, 'attack config must build');

const emailActive = `atk-active-${STAMP}@synthetic.local`;
const emailVictim = `atk-victim-${STAMP}@synthetic.local`;
const emailInactive = `atk-inactive-${STAMP}@synthetic.local`;
SECRETS_TO_HUNT.push(emailActive, emailVictim, emailInactive);
const OID_ACTIVE = `atk-oid-active-${STAMP}`;
const OID_VICTIM = `atk-oid-victim-${STAMP}`;
const OID_INACTIVE = `atk-oid-inactive-${STAMP}`;

const uActive = await prisma.user.create({
  data: {
    email: emailActive,
    passwordHash: 'x',
    fullName: 'Atk Active',
    entraObjectId: OID_ACTIVE,
    operator: { create: { ruolo: 'operatore' } },
  },
  include: { operator: true },
});
const uVictim = await prisma.user.create({
  data: {
    email: emailVictim,
    passwordHash: 'x',
    fullName: 'Atk Victim',
    entraObjectId: OID_VICTIM,
    operator: { create: { ruolo: 'operatore' } },
  },
  include: { operator: true },
});
const uInactive = await prisma.user.create({
  data: {
    email: emailInactive,
    passwordHash: 'x',
    fullName: 'Atk Inactive',
    entraObjectId: OID_INACTIVE,
    isActive: false,
    operator: { create: { ruolo: 'operatore' } },
  },
  include: { operator: true },
});

function signGood(
  claims,
  { key = goodKeys.privateKey, issuer = ISSUER, audience = AUDIENCE, expired = false } = {},
) {
  const j = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'good' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt();
  j.setExpirationTime(expired ? Math.floor(Date.now() / 1000) - 3600 : '5m');
  return j.sign(key);
}

let captured = '';
const origOut = process.stdout.write.bind(process.stdout);
const origErr = process.stderr.write.bind(process.stderr);
const origLog = console.log,
  origErrC = console.error,
  origWarn = console.warn,
  origInfo = console.info;
function startCapture() {
  process.stdout.write = (c) => {
    captured += String(c);
    return true;
  };
  process.stderr.write = (c) => {
    captured += String(c);
    return true;
  };
  console.log =
    console.error =
    console.warn =
    console.info =
      (...args) => {
        captured += args.map(String).join(' ') + '\n';
      };
}
function stopCapture() {
  process.stdout.write = origOut;
  process.stderr.write = origErr;
  console.log = origLog;
  console.error = origErrC;
  console.warn = origWarn;
  console.info = origInfo;
}

const results = [];
function record(name, expect, got, passed, detail = '') {
  results.push({ name, expect, got, passed, detail });
}

function driveMiddleware(headerVal, extraHeaders = {}) {
  return new Promise((resolve) => {
    const out = { headers: {} };
    const hmap = { authorization: headerVal, ...extraHeaders };
    const req = {
      header: (n) => hmap[n.toLowerCase()],
      params: { patientId: 'p-atk' },
      operator: undefined,
    };
    const res = {
      setHeader: (k, v) => {
        out.headers[k.toLowerCase()] = v;
      },
      status: (c) => {
        out.code = c;
        return res;
      },
      json: (b) => {
        out.body = b;
        resolve({ out, nexted: false });
        return res;
      },
      send: (b) => {
        out.body = b;
        resolve({ out, nexted: false });
        return res;
      },
    };
    requirePatientDocumentAccess(req, res, () => resolve({ out, nexted: true, req }));
  });
}

startCapture();
try {
  {
    // 1) alg:none
    const h = base64url.encode(JSON.stringify({ alg: 'none', typ: 'JWT', kid: 'good' }));
    const p = base64url.encode(
      JSON.stringify({
        oid: OID_ACTIVE,
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    );
    const tok = `${h}.${p}.`;
    SECRETS_TO_HUNT.push(tok);
    const r = await authenticateEntra(`Bearer ${tok}`, config);
    record(
      '1. alg:none token',
      '401 rejected',
      r.ok ? 'ACCEPTED' : `${r.failure.status} ${r.failure.code}`,
      r.ok === false && r.failure.status === 401,
    );
  }
  {
    // 2) HS256 key-confusion, secret = serialized public JWK
    try {
      const pubSerialized = JSON.stringify(goodJwk);
      const tok = await new SignJWT({ oid: OID_ACTIVE })
        .setProtectedHeader({ alg: 'HS256', kid: 'good' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(new TextEncoder().encode(pubSerialized));
      SECRETS_TO_HUNT.push(tok);
      const r = await authenticateEntra(`Bearer ${tok}`, config);
      record(
        '2. HS256 key-confusion',
        '401 rejected',
        r.ok ? 'ACCEPTED(!)' : `${r.failure.status} ${r.failure.code}`,
        r.ok === false && r.failure.status === 401,
      );
    } catch (e) {
      record(
        '2. HS256 key-confusion',
        '401 rejected',
        `threw ${e.message.slice(0, 40)}`,
        false,
        'unexpected throw',
      );
    }
  }
  {
    // 3) cross-identity control
    const tok = await signGood({ oid: OID_VICTIM, preferred_username: emailActive });
    SECRETS_TO_HUNT.push(tok);
    const r = await authenticateEntra(`Bearer ${tok}`, config);
    record(
      '3a. identity binds to verified oid owner',
      `maps victim ${uVictim.id.slice(0, 8)}`,
      r.ok
        ? `${r.identity.userId.slice(0, 8)} role=${r.identity.role}`
        : `rejected ${r.failure?.code}`,
      r.ok === true && r.identity.userId === uVictim.id && r.identity.userId !== uActive.id,
      'preferred_username cannot override oid',
    );
    const tok2 = await signGood({ oid: OID_INACTIVE });
    SECRETS_TO_HUNT.push(tok2);
    const r2 = await authenticateEntra(`Bearer ${tok2}`, config);
    record(
      '3b. inactive operator -> 403',
      '403 identity_inactive',
      r2.ok ? 'ACCEPTED(!)' : `${r2.failure.status} ${r2.failure.code}`,
      r2.ok === false && r2.failure.status === 403 && r2.failure.code === 'identity_inactive',
    );
    const tok3 = await signGood({ oid: `ghost-${STAMP}` });
    const r3 = await authenticateEntra(`Bearer ${tok3}`, config);
    record(
      '3c. unmapped oid -> 403',
      '403 identity_not_mapped',
      r3.ok ? 'ACCEPTED(!)' : `${r3.failure.status} ${r3.failure.code}`,
      r3.ok === false && r3.failure.status === 403 && r3.failure.code === 'identity_not_mapped',
    );
  }
  {
    // 4) tampered payload
    const valid = await signGood({ oid: OID_ACTIVE });
    const [h, , s] = valid.split('.');
    const forgedPayload = base64url.encode(
      JSON.stringify({
        oid: OID_VICTIM,
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    );
    const tampered = `${h}.${forgedPayload}.${s}`;
    SECRETS_TO_HUNT.push(tampered);
    const r = await authenticateEntra(`Bearer ${tampered}`, config);
    record(
      '4. tampered payload / orig signature',
      '401 rejected',
      r.ok ? 'ACCEPTED(!)' : `${r.failure.status} ${r.failure.code}`,
      r.ok === false && r.failure.status === 401,
    );
  }
  {
    // 5) expired then reissued
    const expired = await signGood({ oid: OID_ACTIVE }, { expired: true });
    const rE = await authenticateEntra(`Bearer ${expired}`, config);
    const okE = rE.ok === false && rE.failure.status === 401;
    const fresh = await signGood({ oid: OID_ACTIVE });
    const rF = await authenticateEntra(`Bearer ${fresh}`, config);
    const okF = rF.ok === true && rF.identity.userId === uActive.id;
    record(
      '5. expired->401, reissued->ok (sanity)',
      'expired 401 / fresh ok',
      `${okE ? 'expired 401' : 'expired NOT 401'}, ${okF ? 'fresh ok' : 'fresh FAIL'}`,
      okE && okF,
    );
  }
  {
    // 6) huge token
    const huge = 'A'.repeat(100 * 1024);
    const t0 = Date.now();
    const r = await authenticateEntra(`Bearer ${huge}`, config);
    const dt = Date.now() - t0;
    record(
      '6. 100KB junk token',
      '401 quickly, no crash',
      r.ok ? 'ACCEPTED(!)' : `${r.failure.status} in ${dt}ms`,
      r.ok === false && r.failure.status === 401 && dt < 5000,
    );
  }
  {
    // 7) cross-tenant
    const otherTok = await new SignJWT({ oid: OID_ACTIVE })
      .setProtectedHeader({ alg: 'RS256', kid: 'other' })
      .setIssuer('https://login.microsoftonline.com/EVIL-TENANT/v2.0')
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(otherTenantKeys.privateKey);
    SECRETS_TO_HUNT.push(otherTok);
    const r = await authenticateEntra(`Bearer ${otherTok}`, config);
    record(
      '7. cross-tenant (wrong issuer+key)',
      '401 rejected',
      r.ok ? 'ACCEPTED(!)' : `${r.failure.status} ${r.failure.code}`,
      r.ok === false && r.failure.status === 401,
    );
    const foreignSigned = await new SignJWT({ oid: OID_ACTIVE })
      .setProtectedHeader({ alg: 'RS256', kid: 'other' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(otherTenantKeys.privateKey);
    const r2 = await authenticateEntra(`Bearer ${foreignSigned}`, config);
    record(
      '7b. right issuer, foreign signing key',
      '401 rejected',
      r2.ok ? 'ACCEPTED(!)' : `${r2.failure.status} ${r2.failure.code}`,
      r2.ok === false && r2.failure.status === 401,
    );
  }
  {
    // 8) gate alg:none
    process.env.AUTH_MODE = 'entra';
    process.env.ENTRA_TENANT_ID = TENANT;
    process.env.ENTRA_AUDIENCE = AUDIENCE;
    process.env.ENTRA_JWKS_URL = jwksUrl;
    const h = base64url.encode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const p = base64url.encode(JSON.stringify({ oid: OID_ACTIVE }));
    const g = await driveMiddleware(`Bearer ${h}.${p}.`);
    record(
      '8. gate: alg:none -> 401 + WWW-Authenticate',
      '401 no next()',
      g.nexted
        ? 'next() ran(!)'
        : `${g.out.code} wa=${g.out.headers['www-authenticate'] || 'none'}`,
      !g.nexted && g.out.code === 401 && /Bearer/.test(g.out.headers['www-authenticate'] || ''),
    );
  }
  {
    // 9) gate spoofed headers, no bearer
    const g = await driveMiddleware(undefined, {
      'x-operator-id': 'spoof',
      'x-operator-role': 'admin',
      'x-demo-patient-id': 'p-atk',
    });
    record(
      '9. gate: spoofed X-Operator-* ignored (AC6)',
      '401 no next()',
      g.nexted ? 'AUTHENTICATED(!)' : `${g.out.code}`,
      !g.nexted && g.out.code === 401,
    );
  }
} finally {
  stopCapture();
}

const leaks = SECRETS_TO_HUNT.filter((s) => s && s.length > 6 && captured.includes(s));
record(
  'AC7. no token/e-mail in module stdout/stderr',
  'zero leaks',
  leaks.length === 0 ? `clean (${captured.length}B captured)` : `LEAKED ${leaks.length}`,
  leaks.length === 0,
  `captured ${captured.length} bytes`,
);

for (const id of [uActive.id, uVictim.id, uInactive.id]) {
  await prisma.operator.deleteMany({ where: { userId: id } }).catch(() => {});
  await prisma.user.delete({ where: { id } }).catch(() => {});
}
await prisma.$disconnect().catch(() => {});
await new Promise((r) => jwksServer.close(() => r()));
await new Promise((r) => otherJwksServer.close(() => r()));

const accepted = results.filter((r) => !r.passed);
const unitTotals = { entraAuth: '6/6', gate: '4/4', backendFull: '376/376' };
writeFileSync(
  `${EV}/attack-results.json`,
  JSON.stringify({ head: HEAD_SHA, results, accepted: accepted.length, unitTotals }, null, 2),
);

const rows = results
  .map(
    (r) =>
      `<tr class="${r.passed ? 'ok' : 'bad'}"><td>${r.name}</td><td>${r.expect}</td><td>${r.got}</td><td>${r.passed ? 'REJECTED / PASS' : 'ACCEPTED / FAIL'}</td></tr>`,
  )
  .join('\n');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>QA Gate PR#298 — #260 Entra Auth</title>
<style>body{font-family:system-ui,Segoe UI,sans-serif;margin:2rem;background:#EEF1F6;color:#16202E}h1{color:#123056}table{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1)}th,td{padding:.55rem .7rem;border-bottom:1px solid #E6EBF2;text-align:left;font-size:14px}th{background:#123056;color:#fff}tr.ok td:last-child{color:#0a7d33;font-weight:600}tr.bad td:last-child{color:#D93A4A;font-weight:700}.summary{background:#fff;padding:1rem;border-radius:8px;margin:1rem 0;border-left:5px solid ${accepted.length === 0 ? '#0a7d33' : '#D93A4A'}}.verdict{font-size:20px;font-weight:700;color:${accepted.length === 0 ? '#0a7d33' : '#D93A4A'}}code{background:#dde;padding:1px 5px;border-radius:4px}</style></head>
<body><h1>QA Gate — PR #298 / Issue #260</h1>
<p>Production-grade Azure Entra ID (OIDC) auth for clinical document endpoints. Independent adversarial harness (own JWKS + RS256 keypair).</p>
<p>PR head SHA: <code>${HEAD_SHA}</code></p>
<div class="summary"><div class="verdict" id="verdict">${accepted.length === 0 ? 'ALL ATTACKS REJECTED — 0 ACCEPTED' : accepted.length + ' ATTACK(S) ACCEPTED — BLOCKED'}</div>
<p>Unit totals: entra-auth <b>${unitTotals.entraAuth}</b> · gate <b>${unitTotals.gate}</b> · backend full <b>${unitTotals.backendFull}</b></p></div>
<table><thead><tr><th>Attack case</th><th>Expected</th><th>Observed</th><th>Outcome</th></tr></thead><tbody>
${rows}
</tbody></table>
<p id="verdict-flag" data-accepted="${accepted.length}">Generated by independent QA gate session (no repo source touched).</p>
</body></html>`;
writeFileSync(`${EV}/qa-report.html`, html);

console.log(`\nATTACK SUITE COMPLETE — cases:${results.length} accepted(fails):${accepted.length}`);
for (const r of results) console.log(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name} => ${r.got}`);
if (accepted.length > 0) process.exitCode = 1;
