import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment } from '../service.js';
import { renderAssessmentPdf } from '../pdf-renderer.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import {
  getPatientDocumentMetadata,
  listPatientDocuments,
  getPatientDocumentContent,
  listPatientDocumentsForAi,
} from '../../ai/upload/patient-documents.js';
import { actor, other, manager, patient, seed } from './fixture.js';
import { transfersInput, completeTransfers } from './transfers-fixture.js';
before(seed);
after(() => prisma.$disconnect());
async function final() {
  const answers = completeTransfers();
  answers.operatedLegLoad = { applicable: true, side: 'left', level: 'touch_down' };
  answers.aids.wheelchair = { selected: true, ownership: 'facility' };
  answers.transfers.bedToWheelchair = 'hoist_two_operators';
  const draft = (await createAssessment(patient, transfersInput({ answers }), actor)).assessment;
  return (
    await finalizeAssessment(
      patient,
      draft.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
}
test('Transfers PDF freezes all groups, source signature spaces and long Unicode paragraphs without scores', async () => {
  const saved = await final();
  assert.equal(saved.type, 'postural_transfers');
  const snapshot = saved.finalSnapshot!;
  assert.equal(snapshot.result, null);
  assert(!('items' in snapshot));
  assert('sections' in snapshot);
  assert.equal(snapshot.sections.length, 5);
  assert.equal(snapshot.sections.find((s) => s.id === 'aids')!.rows.length, 12);
  const normal = await renderAssessmentPdf(snapshot);
  const long = structuredClone(snapshot);
  long.patient.firstName = 'Élodie';
  long.patient.lastName = 'Παπαδόπουλος';
  long.sections.find((s) => s.id === 'notes')!.rows[0].value =
    'Prima riga con accenti àèìòù e Ω.\nSeconda riga conservata.\n'.repeat(60).slice(0, 4000);
  long.sections.find((s) => s.id === 'context')!.rows[1].value =
    'Diagnosi documentata sintetica. '.repeat(30);
  const expanded = await renderAssessmentPdf(long),
    parsed = await PDFDocument.load(expanded, { updateMetadata: false });
  assert(parsed.getPageCount() > 1);
  assert.match(parsed.getTitle()!, /Trasferimenti/);
  assert.match(parsed.getProducer()!, /transfers-a4-v1/);
  assert(parsed.getKeywords()!.includes(snapshot.form.sourceSha256));
  const artifact = resolve(
    process.env.TRANSFERS_PDF_QA_DIRECTORY ??
      'artifacts/task-validation/po-11-postural-transfers/backend/pdf-qa',
  );
  await mkdir(artifact, { recursive: true });
  await writeFile(resolve(artifact, 'transfers-normal.pdf'), normal);
  await writeFile(resolve(artifact, 'transfers-long.pdf'), expanded);
});
test('Transfers document metadata keeps its type and existing archive scope and retries remain intact', async () => {
  const saved = await final();
  const ready = await retryAssessmentPdf(patient, saved.id, actor);
  assert.equal(ready.pdf!.status, 'ready');
  const id = ready.pdf!.documentId!;
  const meta = await getPatientDocumentMetadata(patient, id, { actor });
  assert.equal(meta!.assessment!.type, 'postural_transfers');
  assert.equal(meta!.assessment!.formVersion, 'transfers-it-2026-09-22-v1');
  assert.equal((await retryAssessmentPdf(patient, saved.id, actor)).pdf!.documentId, id);
  assert.equal(await getPatientDocumentMetadata(patient, id, { actor: other }), null);
  assert.equal(await getPatientDocumentContent(patient, id, { actor: other }), null);
  assert.equal((await listPatientDocuments(patient, { limit: 1 }, { actor: other })).total, 0);
  assert.equal((await listPatientDocumentsForAi(patient, { actor: other })).length, 0);
  assert(await getPatientDocumentContent(patient, id, { actor: manager }));
});
