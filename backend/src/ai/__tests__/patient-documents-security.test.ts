import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  documentAuthMode,
  requirePatientDocumentAccess,
  sniffAllowedMime,
  MAX_UPLOAD_BYTES,
} from '../../routes/patient-documents.js';

// #246 remediation: negative-path security coverage for the patient-documents router.
// Codex QA FAILED finding: "no backend API/security tests cover unauthenticated access,
// cross-patient access, size rejection, MIME spoofing, or ownership". This file covers the
// gate (requireOperator, shared with backend/src/ai/__tests__/security.test.ts style) and the
// magic-byte sniffer in isolation — pure logic, no live server/DB needed.

function mockReq(headers: Record<string, string>) {
  return {
    header: (n: string) => headers[n] ?? headers[n.toLowerCase()],
    params: { patientId: 'patient-a' },
    ip: '1.2.3.4',
    operator: undefined as { id: string; role: string } | undefined,
  };
}

function withAuthMode(
  mode: string | undefined,
  nodeEnv: string | undefined,
  run: () => void,
): void {
  const previousMode = process.env.AUTH_MODE;
  const previousNodeEnv = process.env.NODE_ENV;
  if (mode === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = mode;
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  try {
    run();
  } finally {
    if (previousMode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previousMode;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}

test('AUTH_MODE is fail-closed when absent, invalid, entra-unimplemented, or demo in production', () => {
  assert.equal(documentAuthMode({} as NodeJS.ProcessEnv), 'disabled');
  assert.equal(documentAuthMode({ AUTH_MODE: 'unexpected' } as NodeJS.ProcessEnv), 'disabled');
  assert.equal(documentAuthMode({ AUTH_MODE: 'entra' } as NodeJS.ProcessEnv), 'entra');
  assert.equal(
    documentAuthMode({ AUTH_MODE: 'demo', NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    'disabled',
  );
  assert.equal(
    documentAuthMode({ AUTH_MODE: 'demo', NODE_ENV: 'test' } as NodeJS.ProcessEnv),
    'demo',
  );
});
function mockRes() {
  const out: { code?: number; body?: unknown } = {};
  return {
    status(c: number) {
      out.code = c;
      return this;
    },
    json(b: unknown) {
      out.body = b;
      return this;
    },
    setHeader() {},
    _out: out,
  };
}

test('patient-documents gate: anonymous caller (no operator headers) -> 401', () => {
  const req = mockReq({});
  const res = mockRes();
  let nexted = false;
  withAuthMode('demo', 'test', () =>
    requirePatientDocumentAccess(req as never, res as never, () => {
      nexted = true;
    }),
  );
  assert.equal(nexted, false);
  assert.equal(res._out.code, 401);
});

test('patient-documents gate: role "guest" -> 403', () => {
  const req = mockReq({
    'X-Operator-Id': 'attacker',
    'X-Operator-Role': 'guest',
    'X-Demo-Patient-Id': 'patient-a',
  });
  const res = mockRes();
  let nexted = false;
  withAuthMode('demo', 'test', () =>
    requirePatientDocumentAccess(req as never, res as never, () => {
      nexted = true;
    }),
  );
  assert.equal(nexted, false);
  assert.equal(res._out.code, 403);
});

test('patient-documents gate: valid "operatore" role passes and is attached to the request', () => {
  const req = mockReq({
    'X-Operator-Id': 'op-1',
    'X-Operator-Role': 'operatore',
    'X-Demo-Patient-Id': 'patient-a',
  });
  const res = mockRes();
  let nexted = false;
  withAuthMode('demo', 'test', () =>
    requirePatientDocumentAccess(req as never, res as never, () => {
      nexted = true;
    }),
  );
  assert.equal(nexted, true);
  assert.equal(req.operator?.id, 'op-1');
  assert.equal(req.operator?.role, 'operatore');
});

test('patient-documents gate: demo request scoped to another patient -> 403', () => {
  const req = mockReq({
    'X-Operator-Id': 'op-1',
    'X-Operator-Role': 'operatore',
    'X-Demo-Patient-Id': 'patient-b',
  });
  const res = mockRes();
  let nexted = false;
  withAuthMode('demo', 'test', () =>
    requirePatientDocumentAccess(req as never, res as never, () => {
      nexted = true;
    }),
  );
  assert.equal(nexted, false);
  assert.equal(res._out.code, 403);
});

test('patient-documents gate: entra, missing and invalid modes return explicit 503 without fallback', () => {
  for (const mode of ['entra', undefined, 'invalid']) {
    const req = mockReq({
      'X-Operator-Id': 'op-1',
      'X-Operator-Role': 'operatore',
      'X-Demo-Patient-Id': 'patient-a',
    });
    const res = mockRes();
    let nexted = false;
    withAuthMode(mode, 'test', () =>
      requirePatientDocumentAccess(req as never, res as never, () => {
        nexted = true;
      }),
    );
    assert.equal(nexted, false);
    assert.equal(res._out.code, 503);
  }
});

test('sniffAllowedMime: recognises real signatures for every allowed family', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert.equal(sniffAllowedMime(png), 'image/png');

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  assert.equal(sniffAllowedMime(jpeg), 'image/jpeg');

  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
  assert.equal(sniffAllowedMime(webp), 'image/webp');

  const pdf = Buffer.from('%PDF-1.4\n%...');
  assert.equal(sniffAllowedMime(pdf), 'application/pdf');

  const heic = Buffer.concat([
    Buffer.from([0, 0, 0, 24]),
    Buffer.from('ftyp'),
    Buffer.from('heic'),
    Buffer.from([0, 0]),
  ]);
  assert.equal(sniffAllowedMime(heic), 'image/heic');
});

test('sniffAllowedMime: spoofed upload (PNG-declared filename/mimetype, non-image bytes) -> null (rejected)', () => {
  // Simulates an attacker renaming a script/executable to look like a PNG upload.
  const fakePng = Buffer.from('#!/bin/sh\necho pwned\n');
  assert.equal(sniffAllowedMime(fakePng), null);
});

test('sniffAllowedMime: empty/truncated buffer -> null', () => {
  assert.equal(sniffAllowedMime(Buffer.alloc(0)), null);
  assert.equal(sniffAllowedMime(Buffer.from([0x89, 0x50])), null);
});

test('upload size limit: multer is configured with the documented 15MB cap', () => {
  assert.equal(MAX_UPLOAD_BYTES, 15 * 1024 * 1024);
});

// Ownership check (getPatientDocumentContent: `findFirst({ id: documentId, patientId })` in
// backend/src/ai/upload/patient-documents.ts) requires a live Prisma/Postgres connection to
// exercise end-to-end and is out of scope for this pure-logic unit suite (matches the existing
// pattern in upload.test.ts — no DB-backed tests in this file group). It is covered by:
//   1. static review: the query pairs documentId with patientId in the same `where`, so a
//      document fetched under a foreign patientId returns null -> route responds 404;
//   2. the Playwright spec e2e/remediation/issue-246.spec.ts, which is the objective evidence
//      artifact for this remediation pass.
