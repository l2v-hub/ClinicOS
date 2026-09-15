import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import type { Server } from 'node:http';
import express from 'express';
import {
  documentContentDisposition,
  PATIENT_DOCUMENT_TYPES,
} from '../upload/patient-document-types.js';

let prisma: typeof import('../../lib/prisma.js').prisma;
let server: Server;
let base: string;
let originals: Record<string, unknown>;
let rows: any[];
let writes: number;
const headers = {
  'X-Operator-Id': 'archive-qa',
  'X-Operator-Role': 'operatore',
  'X-Demo-Patient-Id': 'patient-a',
};
const pdf = Buffer.from('%PDF-1.4 synthetic archive');
const project = (row: any, select?: Record<string, boolean>) =>
  !row
    ? null
    : select
      ? Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]))
      : row;
before(async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/archive_test';
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  ({ prisma } = await import('../../lib/prisma.js'));
  const { default: router } = await import('../../routes/patient-documents.js');
  originals = { patient: prisma.patient, patientDocument: prisma.patientDocument };
  const app = express();
  app.use(express.json());
  app.use('/patients', router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      assert.ok(addr && typeof addr === 'object');
      base = `http://127.0.0.1:${addr.port}/patients/patient-a/documents`;
      resolve();
    });
  });
});
beforeEach(() => {
  writes = 0;
  rows = [
    {
      id: 'foreign',
      patientId: 'patient-b',
      originalName: 'referto.pdf',
      dataBase64: pdf.toString('base64'),
      documentType: 'esame',
      mimeType: 'application/pdf',
      sizeBytes: pdf.length,
      createdAt: new Date('2026-09-15T08:00:00Z'),
      sortOrder: 0,
    },
  ];
  Object.assign(prisma, {
    patient: {
      findUnique: async ({ where }: any) => (where.id === 'patient-a' ? { id: where.id } : null),
    },
    patientDocument: {
      aggregate: async () => ({ _max: { sortOrder: null } }),
      create: async ({ data, select }: any) => {
        writes++;
        const row = {
          id: `doc-${writes}`,
          ...data,
          importJobId: null,
          createdAt: new Date('2026-09-15T08:00:00Z'),
        };
        rows.push(row);
        return project(row, select);
      },
      updateMany: async ({ where, data }: any) => {
        assert.deepEqual(Object.keys(data), ['documentType']);
        assert.deepEqual(Object.keys(where).sort(), ['id', 'patientId']);
        const row = rows.find((item) => item.id === where.id && item.patientId === where.patientId);
        if (!row) return { count: 0 };
        writes++;
        Object.assign(row, data);
        return { count: 1 };
      },
      findFirst: async ({ where, select }: any) =>
        project(
          rows.find((row) => row.id === where.id && row.patientId === where.patientId),
          select,
        ),
      findMany: async ({ where, select }: any) =>
        rows.filter((row) => row.patientId === where.patientId).map((row) => project(row, select)),
      count: async ({ where }: any) =>
        rows.filter((row) => row.patientId === where.patientId).length,
    },
  });
});
after(async () => {
  Object.assign(prisma, originals);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});
async function upload(
  type: string | undefined = 'esame',
  data: Uint8Array = pdf,
  mime = 'application/pdf',
) {
  const body = new FormData();
  body.append('file', new Blob([data as BlobPart], { type: mime }), 'referto.pdf');
  if (type !== undefined) body.append('documentType', type);
  return fetch(base, { method: 'POST', headers, body });
}
const patch = (id: string, body: unknown, extra = headers) =>
  fetch(`${base}/${id}`, {
    method: 'PATCH',
    headers: { ...extra, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('POST persists every personal and clinical category; list and exact-id content survive later reads', async () => {
  for (const type of PATIENT_DOCUMENT_TYPES) {
    const response = await upload(type);
    assert.equal(response.status, 201);
    const { document } = (await response.json()) as any;
    assert.equal(document.documentType, type);
    assert.equal(document.dataBase64, undefined);
    const content = await fetch(`${base}/${document.id}/content`, { headers });
    assert.equal(content.status, 200);
    assert.equal(content.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.match(content.headers.get('Cache-Control')!, /no-store/);
    assert.deepEqual(Buffer.from(await content.arrayBuffer()), pdf);
  }
  const list = (await (await fetch(base, { headers })).json()) as any;
  assert.equal(list.total, PATIENT_DOCUMENT_TYPES.size);
  assert.equal(list.documents.length, PATIENT_DOCUMENT_TYPES.size);
});

test('PATCH persists only classification and preserves bytes and original filename', async () => {
  const { document } = (await (await upload()).json()) as any;
  const before = { ...rows.find((row) => row.id === document.id) };
  assert.equal((await patch(document.id, { documentType: 'consulenza' })).status, 200);
  const afterRow = rows.find((row) => row.id === document.id);
  assert.deepEqual(afterRow, { ...before, documentType: 'consulenza' });
  assert.equal(
    ((await (await fetch(base, { headers })).json()) as any).documents[0].documentType,
    'consulenza',
  );
});

test('anonymous, forbidden-role and foreign-patient access fail without writes', async () => {
  assert.equal(
    (await patch('foreign', { documentType: 'esame' }, {} as typeof headers)).status,
    401,
  );
  assert.equal(
    (
      await patch(
        'foreign',
        { documentType: 'esame' },
        { ...headers, 'X-Operator-Role': 'visitor' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await patch(
        'foreign',
        { documentType: 'esame' },
        { ...headers, 'X-Demo-Patient-Id': 'patient-b' },
      )
    ).status,
    403,
  );
  assert.equal((await patch('foreign', { documentType: 'esame' })).status, 404);
  assert.equal((await fetch(`${base}/foreign/content`, { headers })).status, 404);
  assert.equal(writes, 0);
});

test('invalid category, extra fields, MIME spoof and oversized file reject at boundary', async () => {
  for (const body of [
    { documentType: 'unknown' },
    { documentType: 'esame', patientId: 'patient-b' },
    { documentType: 'esame', dataBase64: 'bad' },
    { documentType: ['esame'] },
    null,
  ])
    assert.equal((await patch('foreign', body)).status, 400);
  assert.equal((await upload('unknown')).status, 400);
  assert.equal((await upload('esame', Buffer.from('<script>bad</script>'))).status, 415);
  assert.equal((await upload('esame', pdf, 'image/png')).status, 415);
  assert.equal((await upload('esame', new Uint8Array(15 * 1024 * 1024 + 1))).status, 413);
  assert.equal(writes, 0);
});

test('Unicode disposition handles accents, control characters and split surrogates safely', () => {
  for (const name of [
    'analisi à.pdf',
    'referto\r\nInjected: value.pdf',
    'x'.repeat(199) + '🩺.pdf',
    'x'.repeat(199) + '\ud83e',
  ]) {
    const disposition = documentContentDisposition(name);
    assert.ok(!/[\r\n]/.test(disposition));
    assert.match(disposition, /filename\*=UTF-8''/);
    assert.doesNotThrow(() => new Headers({ 'Content-Disposition': disposition }));
  }
});
