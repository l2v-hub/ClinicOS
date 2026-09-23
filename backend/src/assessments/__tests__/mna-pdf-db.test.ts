import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment, getAssessment } from '../service.js';
import { renderAssessmentPdf } from '../pdf-renderer.js';
import { mnaPdfBlocks } from '../mna-pdf-content.js';
import { MNA_K_LABELS } from '../mna-definition.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import { getPatientDocumentMetadata } from '../../ai/upload/patient-documents.js';
import { actor, patient, seed } from './fixture.js';
import { mnaAnswers, mnaInput } from './mna-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const folder = resolve(
  process.env.MNA_PDF_QA_DIRECTORY ?? 'artifacts/task-validation/po-13-mna/backend/pdf-qa',
);
async function finalized(answers = mnaAnswers()) {
  const draft = (await createAssessment(patient, mnaInput({ answers }), actor)).assessment;
  const final = (
    await finalizeAssessment(
      patient,
      draft.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
  assert.equal(final.type, 'mna');
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
test('MNA full PDFs retain measured units, source/copyright, all K questions and long Unicode notes', async () => {
  const answers = mnaAnswers();
  answers.F = { method: 'measured' };
  answers.Q = { method: 'measured' };
  answers.R = { method: 'measured' };
  answers.measurements = {
    weightKg: 64,
    heightCm: 160,
    armCircumferenceCm: 23,
    calfCircumferenceCm: 31,
  };
  answers.measurementDates = {
    weightKg: '2026-03-27',
    heightCm: '2026-03-20',
    armCircumferenceCm: null,
    calfCircumferenceCm: '2026-03-26',
  };
  await prisma.patient.update({ where: { id: patient }, data: { sex: 'F' } });
  const normal = await finalized(answers),
    snapshot = normal.finalSnapshot!;
  assert.equal(snapshot.result.screening!.score, 14);
  assert.equal(snapshot.result.global!.score, 16);
  assert.equal(snapshot.result.total!.score, 30);
  assert.equal(snapshot.bmi, 24.999999999999996);
  const normalBytes = await save('mna-full-normal', snapshot);
  const normalDoc = await PDFDocument.load(normalBytes, { updateMetadata: false });
  assert.match(normalDoc.getTitle()!, /Valutazione completa MNA/);
  assert.match(normalDoc.getProducer()!, /mna-a4-v2/);
  assert(normalDoc.getKeywords()!.includes(snapshot.form.sourceSha256));
  const text = mnaPdfBlocks(snapshot)
    .map((row) => row.text)
    .join('\n');
  for (const expected of [
    'Una o due volte la settimana',
    'Ogni giorno della carne',
    'demenza moderata',
    '64 kg',
    '160 cm',
    '31 cm',
    'inserito manualmente',
    '21 ≤ CB ≤ 22',
    'Nestlé',
    'N67200',
    'www.mna-elderly.com',
  ])
    assert(text.includes(expected) || JSON.stringify(snapshot).includes(expected), expected);
  const longAnswers = {
    ...answers,
    notes: 'Prima riga àèìòù e Ω.\nSeconda riga conservata.\n'.repeat(90).slice(0, 4000),
  };
  const long = await finalized(longAnswers);
  const longBytes = await save('mna-full-long', long.finalSnapshot!);
  assert((await PDFDocument.load(longBytes)).getPageCount() > normalDoc.getPageCount());
  assert.equal(
    (await getAssessment(patient, normal.id, actor)).snapshotSha256,
    normal.snapshotSha256,
  );
});

test('MNA screening PDF preserves partial G–R and frozen K sublabels; failed/concurrent retry archives one typed document', async () => {
  const answers = mnaAnswers('empty', 'screening'),
    maximum = mnaAnswers();
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F'] as const) (answers as any)[id] = maximum[id];
  answers.G = false;
  answers.K = { dairyDaily: true, eggsOrLegumesWeekly: null, meatFishOrPoultryDaily: false };
  answers.Q = { method: 'measured' };
  answers.measurements.armCircumferenceCm = 21;
  answers.measurementDates.armCircumferenceCm = '2026-03-27';
  answers.notes = 'Dati globali parziali conservati.\nNessuna misura inventata.';
  const final = await finalized(answers),
    snapshot = final.finalSnapshot!;
  assert.equal(snapshot.result.total, null);
  assert.equal(snapshot.items[10].description, null);
  const previous = MNA_K_LABELS.eggsOrLegumesWeekly;
  let bytes: Buffer;
  try {
    (MNA_K_LABELS as any).eggsOrLegumesWeekly = 'RUNTIME LABEL MUST NOT ENTER PDF';
    const text = mnaPdfBlocks(snapshot)
      .map((row) => row.text)
      .join('\n');
    assert(text.includes(previous + ': Non compilato'));
    assert(!text.includes('RUNTIME LABEL'));
    assert(text.includes('non inclusi nel totale'));
    assert(!text.includes('Totale MNA:'));
    bytes = await save('mna-screening-partial', snapshot);
  } finally {
    (MNA_K_LABELS as any).eggsOrLegumesWeekly = previous;
  }
  const failed = await retryAssessmentPdf(patient, final.id, actor, async () => {
    throw new Error('synthetic failure');
  });
  assert.equal(failed.status, 'final');
  assert.equal(failed.pdf!.status, 'failed');
  assert.equal(failed.snapshotSha256, final.snapshotSha256);
  let calls = 0;
  await Promise.all(
    Array.from({ length: 4 }, () =>
      retryAssessmentPdf(patient, final.id, actor, async () => {
        calls++;
        return bytes!;
      }),
    ),
  );
  assert.equal(calls, 1);
  const ready = await getAssessment(patient, final.id, actor);
  assert.equal(ready.pdf!.status, 'ready');
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: final.id } }), 1);
  const meta = await getPatientDocumentMetadata(patient, ready.pdf!.documentId!, { actor });
  assert.equal(meta!.assessment!.type, 'mna');
  assert.match(meta!.originalName, /^MNA_/);
});

test('MNA editorial typography preserves free text and reports unsupported glyphs without changing the snapshot', async () => {
  const notes = 'Nota originale: 21 ≤ CB ≤ 22; CP ≥ 31 → confermare.\nSeconda riga.';
  const final = await finalized({ ...mnaAnswers(), notes });
  const snapshot = final.finalSnapshot!;
  const original = JSON.stringify(snapshot);
  const blocks = mnaPdfBlocks(snapshot);
  assert(blocks.some((block) => block.text === notes));
  const editorial = blocks
    .filter((block) => block.text !== notes)
    .map((block) => block.text)
    .join('\n');
  assert(!/[≤≥→]/u.test(editorial));
  assert(editorial.includes('21 <= CB <= 22'));
  assert(JSON.stringify(snapshot).includes('21 ≤ CB ≤ 22'));
  const failed = await retryAssessmentPdf(patient, final.id, actor);
  assert.equal(failed.status, 'final');
  assert.equal(failed.pdf!.status, 'failed');
  assert.equal(failed.pdf!.errorCode, 'assessment_pdf_unsupported_glyph');
  assert.equal(failed.snapshotSha256, final.snapshotSha256);
  assert.equal(JSON.stringify(failed.finalSnapshot), original);
  assert.equal(failed.answers.notes, notes);
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: final.id } }), 0);
  for (const changed of [
    { ...snapshot, notes: '', patient: { ...snapshot.patient, lastName: 'Paziente ≤' } },
    { ...snapshot, notes: '', predecessorId: randomUUID(), correctionReason: 'Rettifica →' },
    { ...snapshot, notes: '', demographics: { ...snapshot.demographics, sex: 'F ≥' } },
  ]) {
    await assert.rejects(
      renderAssessmentPdf(changed),
      (error: any) => error.code === 'assessment_pdf_unsupported_glyph',
    );
  }
});
