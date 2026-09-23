import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment, getAssessment } from '../service.js';
import { renderAssessmentPdf } from '../pdf-renderer.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import { GDS15_ITEMS } from '../gds15-definition.js';
import { getPatientDocumentMetadata } from '../../ai/upload/patient-documents.js';
import { actor, patient, seed } from './fixture.js';
import { gds15Answers, gds15Input } from './gds15-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const folder = resolve(
  process.env.GDS15_PDF_QA_DIRECTORY ?? 'artifacts/task-validation/po-14-gds/backend/pdf-qa',
);
async function finalized(extra: Record<string, unknown> = {}) {
  const draft = (await createAssessment(patient, gds15Input(extra), actor)).assessment;
  const final = (
    await finalizeAssessment(
      patient,
      draft.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
  assert.equal(final.type, 'gds15');
  return final;
}
async function save(name: string, snapshot: any) {
  const bytes = await renderAssessmentPdf(snapshot);
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, name + '.pdf'), bytes);
  await writeFile(
    resolve(folder, name + '.snapshot.json'),
    JSON.stringify(snapshot, null, 2) + '\n',
  );
  return bytes;
}

test('GDS15 PDF renders frozen questions/source and a long corrected assessment with supported Unicode notes', async () => {
  const normal = await finalized();
  const snapshot = normal.finalSnapshot!;
  const bytes = await save('gds15-normal', snapshot);
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.match(doc.getTitle()!, /GDS-15/);
  assert.match(doc.getProducer()!, /gds15-a4-v1/);
  assert(doc.getKeywords()!.includes(snapshot.form.sourceSha256));
  const label = GDS15_ITEMS[0].label;
  try {
    (GDS15_ITEMS[0] as any).label = 'RUNTIME LABEL MUST NOT ENTER PDF';
    assert((await renderAssessmentPdf(snapshot)).equals(bytes));
  } finally {
    (GDS15_ITEMS[0] as any).label = label;
  }
  const ready = await retryAssessmentPdf(patient, normal.id, actor);
  assert.equal(ready.pdf!.status, 'ready');
  const long = await finalized({
    answers: {
      ...gds15Answers(false),
      notes: 'Prima riga àèìòù e Ω.\nSeconda riga conservata.\n'.repeat(90).slice(0, 4000),
    },
    predecessorId: normal.id,
    correctionReason: 'Rettifica sintetica: risposte del paziente riferite all’ultima settimana.',
    assessedAt: normal.assessedAt,
  });
  const longBytes = await save('gds15-long', long.finalSnapshot!);
  assert((await PDFDocument.load(longBytes)).getPageCount() > doc.getPageCount());
  assert.equal(long.result!.total, 5);
  assert.equal(long.finalSnapshot!.predecessor!.id, normal.id);
  assert.deepEqual((await getAssessment(patient, normal.id, actor)).finalSnapshot, snapshot);
  assert.equal(
    (await getAssessment(patient, normal.id, actor)).pdf!.documentId,
    ready.pdf!.documentId,
  );
  const meta = await getPatientDocumentMetadata(patient, ready.pdf!.documentId!, { actor });
  assert.equal(meta!.assessment!.type, 'gds15');
  assert.match(meta!.originalName, /^GDS15_/);
});

test('GDS15 PDF failure/concurrent retry creates one typed document and unsupported free-text glyphs preserve the final snapshot', async () => {
  const final = await finalized();
  const failed = await retryAssessmentPdf(patient, final.id, actor, async () => {
    throw new Error('synthetic failure');
  });
  assert.equal(failed.status, 'final');
  assert.equal(failed.pdf!.status, 'failed');
  assert.equal(failed.snapshotSha256, final.snapshotSha256);
  let calls = 0;
  await Promise.all(
    Array.from({ length: 4 }, () =>
      retryAssessmentPdf(patient, final.id, actor, async (snapshot) => {
        calls++;
        return renderAssessmentPdf(snapshot);
      }),
    ),
  );
  assert.equal(calls, 1);
  const ready = await getAssessment(patient, final.id, actor);
  assert.equal(ready.pdf!.status, 'ready');
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: final.id } }), 1);
  const notes = 'Nota originale ≤ 5, ≥ 10 → approfondire.\nSeconda riga intatta.';
  const unsupported = await finalized({ answers: { ...gds15Answers(), notes } });
  const original = JSON.stringify(unsupported.finalSnapshot);
  const result = await retryAssessmentPdf(patient, unsupported.id, actor);
  assert.equal(result.status, 'final');
  assert.equal(result.pdf!.status, 'failed');
  assert.equal(result.pdf!.errorCode, 'assessment_pdf_unsupported_glyph');
  assert.equal(result.snapshotSha256, unsupported.snapshotSha256);
  assert.equal(JSON.stringify(result.finalSnapshot), original);
  assert.equal(result.answers.notes, notes);
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: unsupported.id } }), 0);
  const snapshot = final.finalSnapshot!;
  for (const changed of [
    { ...snapshot, patient: { ...snapshot.patient, lastName: 'Paziente ≤' } },
    { ...snapshot, predecessorId: randomUUID(), correctionReason: 'Rettifica →' },
  ])
    await assert.rejects(
      renderAssessmentPdf(changed),
      (error: any) => error.code === 'assessment_pdf_unsupported_glyph',
    );
});
