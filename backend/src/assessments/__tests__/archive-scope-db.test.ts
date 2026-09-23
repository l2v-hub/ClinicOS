import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment } from '../service.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import {
  createPatientDocument,
  getPatientDocumentContent,
  getPatientDocumentMetadata,
  listPatientDocuments,
  listPatientDocumentsForAi,
  updatePatientDocumentType,
} from '../../ai/upload/patient-documents.js';
import { assessmentAccessForAi } from '../document-access.js';
import { getPatientDocumentsG, searchDocuments } from '../../ai/gateway/services.js';
import type { UserContext } from '../../ai/gateway/types.js';
import {
  actor,
  other,
  manager,
  patient,
  foreign,
  input,
  seed,
  server,
  headers,
  answers,
} from './fixture.js';
before(seed);
after(() => prisma.$disconnect());
test('all archive/AI readers intersect generated documents with live patient scope before bounds; legacy stays accessible', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  let documentId = '',
    assessmentId = '';
  for (let n = 0; n < 3; n++) {
    const draft = (await createAssessment(foreign, input(), other)).assessment;
    await finalizeAssessment(
      foreign,
      draft.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      other,
    );
    const final = await retryAssessmentPdf(foreign, draft.id, other, async () => bytes);
    documentId = final.pdf!.documentId!;
    assessmentId = final.id;
  }
  const legacy = await createPatientDocument(
    foreign,
    { originalname: 'legacy.pdf', mimetype: 'application/pdf', buffer: bytes },
    'altro',
  );
  const denied = { actor };
  const owner = { actor: other };
  const source = await getPatientDocumentMetadata(foreign, documentId, owner);
  assert(source);
  assert.equal(source.assessment!.id, assessmentId);
  assert.equal(source.assessment!.assessedAt, '2026-03-28T23:30:00.000Z');
  const page = await listPatientDocuments(
    foreign,
    { limit: 1, sourceFileName: source.originalName },
    denied,
  );
  assert.equal(page.total, 1);
  assert.equal(page.documents[0].id, legacy.id);
  assert.equal(page.sourceMatch, null);
  assert.equal(page.pageInfo.hasMore, false);
  assert.equal(await getPatientDocumentMetadata(foreign, documentId, denied), null);
  assert.equal(await getPatientDocumentContent(foreign, documentId, denied), null);
  assert.equal(await updatePatientDocumentType(foreign, documentId, 'referto', denied), null);
  await assert.rejects(
    updatePatientDocumentType(foreign, documentId, 'referto', owner),
    (error: any) => error.code === 'assessment_document_immutable',
  );
  assert(await getPatientDocumentContent(foreign, legacy.id, denied));
  const ctx: UserContext = {
    userId: actor.id,
    roles: ['operator'],
    tenantId: 'clinicos',
    permittedPatientIds: [foreign],
    requestId: randomUUID(),
  };
  assert.deepEqual(
    (await listPatientDocumentsForAi(foreign, assessmentAccessForAi(ctx))).map((row) => row.id),
    [legacy.id],
  );
  assert.deepEqual(
    (await getPatientDocumentsG(foreign, ctx)).data.map((row: any) => row.id),
    [legacy.id],
  );
  assert.deepEqual(
    (await searchDocuments({ patientId: foreign, limit: 10 }, ctx)).data.map((row: any) => row.id),
    [legacy.id],
  );
  assert.equal(
    (await listPatientDocuments(foreign, { limit: 10 }, { actor: manager })).documents.length,
    4,
  );
  const global = { ...ctx, userId: manager.id, roles: ['manager'], permittedPatientIds: null };
  assert.equal((await searchDocuments({ patientId: foreign, limit: 10 }, global)).data.length, 4);
  const verifiedEntraGlobal = { ...ctx, roles: ['operatore'], permittedPatientIds: null };
  assert.equal((await getPatientDocumentsG(foreign, verifiedEntraGlobal)).data.length, 4);
  assert.equal(
    (await searchDocuments({ patientId: foreign, limit: 10 }, verifiedEntraGlobal)).data.length,
    4,
  );
  assert.equal((await listPatientDocumentsForAi(foreign)).length, 1);
  await assert.rejects(
    prisma.patientDocument.create({
      data: {
        patientId: patient,
        assessmentId,
        originalName: 'forged.pdf',
        mimeType: 'application/pdf',
        sizeBytes: bytes.length,
        sha256: '0'.repeat(64),
        dataBase64: bytes.toString('base64'),
        documentType: 'patient_assessment',
      },
    }),
  );
});
test('HTTP draft/final/PDF metadata flow preserves status codes, identity, bounds and current scope', async () => {
  const http = await server();
  try {
    const base = `${http.base}/patients/${patient}/assessments`;
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(`${base}?limit=101`, { headers: headers() })).status, 400);
    const body = input({ answers: answers(null) });
    const created = await fetch(base, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    assert.equal(created.status, 201);
    assert.match(created.headers.get('cache-control')!, /no-store/);
    const draft = (await created.json()).assessment;
    const again = await fetch(base, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    assert.equal(again.status, 200);
    assert.equal((await again.json()).assessment.id, draft.id);
    assert.equal(
      (
        await fetch(`${base}/${draft.id}/finalize`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ requestId: randomUUID(), expectedVersion: 1 }),
        })
      ).status,
      422,
    );
    const patched = await fetch(`${base}/${draft.id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({
        expectedVersion: 1,
        assessedAt: body.assessedAt,
        answers: answers(1),
      }),
    });
    assert.equal(patched.status, 200);
    const finalKey = { requestId: randomUUID(), expectedVersion: 2 };
    const response = await fetch(`${base}/${draft.id}/finalize`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(finalKey),
    });
    assert.equal(response.status, 200);
    const final = (await response.json()).assessment;
    assert.equal(final.status, 'final');
    assert.equal(final.pdf.status, 'ready');
    const docUrl = `${http.base}/patients/${patient}/documents/${final.pdf.documentId}`;
    const meta = await fetch(docUrl, { headers: headers() });
    assert.equal(meta.status, 200);
    assert.equal((await meta.json()).document.assessment.id, draft.id);
    const content = await fetch(`${docUrl}/content`, { headers: headers() });
    assert.equal(content.status, 200);
    assert.equal(content.headers.get('content-type'), 'application/pdf');
    const replay = await fetch(`${base}/${draft.id}/finalize`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(finalKey),
    });
    assert.equal((await replay.json()).replayed, true);
    const forbidden = await fetch(docUrl, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ documentType: 'altro' }),
    });
    assert.equal(forbidden.status, 409);
    const form = new FormData();
    form.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'fake.pdf');
    form.append('documentType', 'patient_assessment');
    const upload = await fetch(`${http.base}/patients/${patient}/documents`, {
      method: 'POST',
      headers: {
        'X-Operator-Id': actor.id,
        'X-Operator-Role': actor.role,
        'X-Demo-Patient-Id': patient,
      },
      body: form,
    });
    assert.equal(upload.status, 400);
    await prisma.patient.update({ where: { id: patient }, data: { registeredById: other.id } });
    assert.equal((await fetch(docUrl, { headers: headers() })).status, 404);
    assert.equal((await fetch(`${docUrl}/content`, { headers: headers() })).status, 404);
    assert.equal((await fetch(`${base}/${draft.id}`, { headers: headers() })).status, 404);
  } finally {
    await http.close();
  }
});
