// Invocability + GUI parity: documents.* tools reach the SAME services as
// routes/patient-documents.ts (upload → list → metadata → content → reclassify), with real DB rows.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import documentsRouter from '../../routes/patient-documents.js';
import { createToolRegistry } from '../registry.js';
import { documentTools } from '../capabilities/documents.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  restoreAudit,
  serve,
  type TestOperator,
} from './support.js';

// #389: the default resident scope is facility-wide. This suite exercises the scope-enforcement
// plumbing (out-of-scope residents denied), so it pins the restricted, still-supported mode.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

const registry = createToolRegistry(documentTools);
let owner: TestOperator;
let stranger: TestOperator;
let patientId = '';
let strangerPatientId = '';

// 1×1 PNG and a minimal PDF header: enough for the route's byte sniffing.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'ascii');

type Doc = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  documentType: string;
};
type Page = {
  documents: Doc[];
  total: number | null;
  pageInfo: { hasMore: boolean; nextCursor: string | null };
};

before(async () => {
  captureAudit();
  owner = await createOperator('doc-owner');
  stranger = await createOperator('doc-stranger');
  patientId = (await createPatient('doc-own', owner)).id;
  strangerPatientId = (await createPatient('doc-foreign', stranger)).id;
});

after(async () => {
  restoreAudit();
  await cleanup([owner, stranger], [patientId, strangerPatientId]);
});

async function invokeOk<T>(name: string, input: unknown, op = owner): Promise<T> {
  const result = await registry.invoke<T>(name, input, ctxOf(op));
  assert.equal(result.ok, true, `${name}: ${JSON.stringify(result)}`);
  return (result as { data: T }).data;
}

const guiHeaders = (op: TestOperator, pid: string) => ({
  'X-Operator-Id': op.operatorId,
  'X-Operator-Role': op.role,
  'X-Demo-Patient-Id': pid,
});

test('upload → list → get_metadata → get_content roundtrip (PNG), bytes persisted in DB', async () => {
  const uploaded = await invokeOk<{ document: Doc }>('documents.upload', {
    patientId,
    body: {
      documentType: 'rx',
      fileName: 'rx-torace.png',
      mimeType: 'image/png',
      base64: PNG_BASE64,
    },
  });
  const bytes = Buffer.from(PNG_BASE64, 'base64');
  const row = await prisma.patientDocument.findUniqueOrThrow({
    where: { id: uploaded.document.id },
  });
  assert.equal(row.patientId, patientId);
  assert.equal(row.documentType, 'rx');
  assert.equal(row.mimeType, 'image/png');
  assert.equal(row.sizeBytes, bytes.length);
  assert.equal(row.sha256, createHash('sha256').update(bytes).digest('hex'));

  const page = await invokeOk<Page>('documents.list', { patientId });
  assert.ok(page.documents.some((doc) => doc.id === uploaded.document.id));
  assert.equal(
    (page.documents[0] as unknown as Record<string, unknown>).dataBase64,
    undefined,
    'list never carries bytes',
  );

  const meta = await invokeOk<{ document: Doc }>('documents.get_metadata', {
    patientId,
    documentId: uploaded.document.id,
  });
  assert.equal(meta.document.sha256, row.sha256);

  const content = await invokeOk<{
    contentType: string;
    fileName: string;
    byteLength: number;
    base64: string;
  }>('documents.get_content', { patientId, documentId: uploaded.document.id });
  assert.equal(content.contentType, 'image/png');
  assert.equal(content.fileName, 'rx-torace.png');
  assert.equal(content.byteLength, bytes.length);
  assert.ok(Buffer.from(content.base64, 'base64').equals(bytes));
});

test('update_type reclassifies in DB; the route body rules are kept (invalid_input)', async () => {
  const { document } = await invokeOk<{ document: Doc }>('documents.upload', {
    patientId,
    body: {
      fileName: 'referto.pdf',
      mimeType: 'application/pdf',
      base64: PDF_BYTES.toString('base64'),
    },
  });
  assert.equal(document.documentType, 'allegato', 'default type like the route');
  const updated = await invokeOk<{ document: Doc }>('documents.update_type', {
    patientId,
    documentId: document.id,
    body: { documentType: 'referto' },
  });
  assert.equal(updated.document.documentType, 'referto');
  const row = await prisma.patientDocument.findUniqueOrThrow({ where: { id: document.id } });
  assert.equal(row.documentType, 'referto');

  for (const body of [{ documentType: 'boh' }, { documentType: 'rx', originalName: 'x' }]) {
    const result = await registry.invoke(
      'documents.update_type',
      { patientId, documentId: document.id, body },
      ctxOf(owner),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'invalid_input');
      assert.equal(result.error.domainCode, 'invalid_document_type');
    }
  }
  const missing = await registry.invoke(
    'documents.update_type',
    { patientId, documentId: 'missing-doc', body: { documentType: 'rx' } },
    ctxOf(owner),
  );
  assert.equal(!missing.ok && missing.error.code, 'not_found');
});

test('upload keeps the route MIME/sniff checks (415) and writes nothing', async () => {
  const before = await prisma.patientDocument.count({ where: { patientId } });
  const cases = [
    { mimeType: 'application/pdf', base64: PNG_BASE64 }, // declared ≠ sniffed
    { mimeType: 'text/plain', base64: Buffer.from('hello').toString('base64') },
  ];
  for (const c of cases) {
    const result = await registry.invoke(
      'documents.upload',
      { patientId, body: { fileName: 'x', ...c } },
      ctxOf(owner),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'invalid_input');
      assert.equal(result.error.status, 415);
    }
  }
  const badType = await registry.invoke(
    'documents.upload',
    {
      patientId,
      body: { fileName: 'x.png', mimeType: 'image/png', base64: PNG_BASE64, documentType: 'nope' },
    },
    ctxOf(owner),
  );
  assert.equal(!badType.ok && badType.error.domainCode, 'invalid_document_type');
  assert.equal(await prisma.patientDocument.count({ where: { patientId } }), before);
});

test('list mirrors the route paging (limit/cursor) and its 400s', async () => {
  const first = await invokeOk<Page>('documents.list', { patientId, query: { limit: '1' } });
  assert.equal(first.documents.length, 1);
  assert.equal(first.pageInfo.hasMore, true);
  const second = await invokeOk<Page>('documents.list', {
    patientId,
    query: { limit: '1', cursor: first.pageInfo.nextCursor! },
  });
  assert.equal(second.documents.length, 1);
  assert.notEqual(second.documents[0].id, first.documents[0].id);
  for (const [query, code] of [
    [{ limit: '0' }, 'invalid_limit'],
    [{ cursor: 'garbage' }, 'invalid_cursor'],
    [{ sourceFileName: 'x'.repeat(201) }, 'invalid_source_name'],
  ] as const) {
    const result = await registry.invoke('documents.list', { patientId, query }, ctxOf(owner));
    assert.equal(!result.ok && result.error.domainCode, code);
  }
});

test('scope: another owner’s patient is not reachable through any documents tool', async () => {
  const doc = await prisma.patientDocument.create({
    data: {
      patientId: strangerPatientId,
      originalName: 'foreign.png',
      mimeType: 'image/png',
      sizeBytes: 1,
      sha256: 'x',
      dataBase64: PNG_BASE64,
      documentType: 'rx',
      sortOrder: 0,
    },
  });
  const inputs: Array<[string, Record<string, unknown>]> = [
    ['documents.list', { patientId: strangerPatientId }],
    ['documents.get_metadata', { patientId: strangerPatientId, documentId: doc.id }],
    ['documents.get_content', { patientId: strangerPatientId, documentId: doc.id }],
    [
      'documents.update_type',
      { patientId: strangerPatientId, documentId: doc.id, body: { documentType: 'altro' } },
    ],
    [
      'documents.upload',
      {
        patientId: strangerPatientId,
        body: { fileName: 'x.png', mimeType: 'image/png', base64: PNG_BASE64 },
      },
    ],
  ];
  for (const [name, input] of inputs) {
    const result = await registry.invoke(name, input, ctxOf(owner));
    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.error.code, 'not_found', name);
      assert.equal(result.error.domainCode, 'patient_not_found', name);
    }
  }
  const rows = await prisma.patientDocument.findMany({ where: { patientId: strangerPatientId } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].documentType, 'rx');
});

test('GUI == Tool: multipart upload vs tool upload store the same document; list/content agree', async () => {
  const gui = await serve('/patients', documentsRouter);
  try {
    const form = new FormData();
    form.append('documentType', 'consulenza');
    form.append('file', new Blob([PDF_BYTES], { type: 'application/pdf' }), 'consulenza.pdf');
    const httpUpload = await fetch(`${gui.base}/patients/${patientId}/documents`, {
      method: 'POST',
      headers: guiHeaders(owner, patientId),
      body: form,
    });
    assert.equal(httpUpload.status, 201);
    const httpDoc = ((await httpUpload.json()) as { document: Doc }).document;
    const toolDoc = (
      await invokeOk<{ document: Doc }>('documents.upload', {
        patientId,
        body: {
          documentType: 'consulenza',
          fileName: 'consulenza.pdf',
          mimeType: 'application/pdf',
          base64: PDF_BYTES.toString('base64'),
        },
      })
    ).document;
    const shape = async (id: string) => {
      const r = await prisma.patientDocument.findUniqueOrThrow({ where: { id } });
      return [
        r.patientId,
        r.originalName,
        r.mimeType,
        r.sizeBytes,
        r.sha256,
        r.documentType,
        r.dataBase64,
      ];
    };
    assert.deepEqual(await shape(toolDoc.id), await shape(httpDoc.id));

    const httpList = (await (
      await fetch(`${gui.base}/patients/${patientId}/documents`, {
        headers: guiHeaders(owner, patientId),
      })
    ).json()) as Page;
    const toolList = await invokeOk<Page>('documents.list', { patientId });
    assert.deepEqual(toolList, httpList);

    const httpContent = Buffer.from(
      await (
        await fetch(`${gui.base}/patients/${patientId}/documents/${httpDoc.id}/content`, {
          headers: guiHeaders(owner, patientId),
        })
      ).arrayBuffer(),
    );
    const toolContent = await invokeOk<{ base64: string }>('documents.get_content', {
      patientId,
      documentId: httpDoc.id,
    });
    assert.ok(Buffer.from(toolContent.base64, 'base64').equals(httpContent));

    // Error parity: mismatched bytes → 415 over HTTP, status 415 via tool.
    const bad = new FormData();
    bad.append('file', new Blob([PDF_BYTES], { type: 'image/png' }), 'fake.png');
    const httpBad = await fetch(`${gui.base}/patients/${patientId}/documents`, {
      method: 'POST',
      headers: guiHeaders(owner, patientId),
      body: bad,
    });
    assert.equal(httpBad.status, 415);
    const toolBad = await registry.invoke(
      'documents.upload',
      {
        patientId,
        body: { fileName: 'fake.png', mimeType: 'image/png', base64: PDF_BYTES.toString('base64') },
      },
      ctxOf(owner),
    );
    assert.equal(!toolBad.ok && toolBad.error.status, 415);
  } finally {
    await gui.close();
  }
});
