import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment } from '../service.js';
import { renderAssessmentPdf } from '../pdf-renderer.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import { getPatientDocumentMetadata } from '../../ai/upload/patient-documents.js';
import { actor, patient, seed } from './fixture.js';
import { tinettiInput } from './tinetti-fixture.js';
before(seed);
after(() => prisma.$disconnect());
test('Tinetti PDF renders all frozen items and Unicode notes, and archives under its own type', async () => {
  const draft = (await createAssessment(patient, tinettiInput(), actor)).assessment;
  const final = (
    await finalizeAssessment(
      patient,
      draft.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
  assert.equal(final.type, 'tinetti');
  const normal = await renderAssessmentPdf(final.finalSnapshot!);
  const long = structuredClone(final.finalSnapshot!);
  long.notes = 'Prima riga àèìòù e Ω.\nSeconda riga conservata.\n'.repeat(80).slice(0, 4000);
  const expanded = await renderAssessmentPdf(long);
  const pdf = await PDFDocument.load(expanded, { updateMetadata: false });
  assert(pdf.getPageCount() > 1);
  assert.match(pdf.getTitle()!, /Tinetti/);
  assert.match(pdf.getProducer()!, /tinetti-a4-v1/);
  assert(pdf.getKeywords()!.includes(long.form.referenceSha256));
  const folder = resolve('artifacts/task-validation/po-12-tinetti/backend/pdf-qa');
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, 'tinetti-normal.pdf'), normal);
  await writeFile(resolve(folder, 'tinetti-long.pdf'), expanded);
  const ready = await retryAssessmentPdf(patient, final.id, actor);
  const meta = await getPatientDocumentMetadata(patient, ready.pdf!.documentId!, { actor });
  assert.equal(meta!.assessment!.type, 'tinetti');
  assert.match(meta!.originalName, /^Tinetti_/);
});
