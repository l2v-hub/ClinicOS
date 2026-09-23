import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Prisma } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import { assessmentTransaction } from '../access.js';
import { mnaPdfBlocks } from '../mna-pdf-content.js';
import { mnaSnapshotHash } from '../mna-snapshot.js';
import { assessmentRendererVersion } from '../pdf-renderer.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import { createAssessment, finalizeAssessment } from '../service.js';
import type { AssessmentSnapshot, MnaSnapshot } from '../types.js';
import { actor, patient, seed } from './fixture.js';
import { mnaAnswers, mnaInput } from './mna-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const folder = resolve(repositoryRoot, 'artifacts/task-validation/po-16-giro/backend');
const legacy = resolve(folder, 'legacy-v1');
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const save = async (name: string, value: unknown) => {
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, name), JSON.stringify(value, null, 2) + '\n');
};
const state = async () => JSON.parse(await readFile(resolve(legacy, 'state.json'), 'utf8'));

test('MNA presentation matches UI BMI precision at every threshold without changing snapshot values', async () => {
  const snapshot: MnaSnapshot = (await state()).assessment.finalSnapshot;
  const frontend = await import(
    pathToFileURL(resolve(repositoryRoot, 'frontend/src/lib/assessments/mnaLocalInputs.ts')).href
  );
  const cases: Array<[number, string]> = [
    [64 / (1.6 * 1.6), '25'],
    [18.999, '18,999'],
    [18.999999999999996, '18,999999999999996'],
    [19, '19'],
    [19.000000000000004, '19'],
    [19.234, '19,23'],
    [20.999, '20,999'],
    [20.999999999999996, '20,999999999999996'],
    [21, '21'],
    [22.999, '22,999'],
    [22.999999999999996, '22,999999999999996'],
    [23, '23'],
    [23.001, '23'],
    [0.0001, '0,0001'],
  ];
  for (const [bmi, expected] of cases) {
    const value = { ...snapshot, bmi },
      before = JSON.stringify(value);
    const text = mnaPdfBlocks(value).find((row) => row.text.startsWith('IMC: '))!.text;
    assert(text.startsWith(`IMC: ${expected} kg/m²`), text);
    assert.equal(expected, frontend.displayMnaBmi(bmi));
    assert.equal(JSON.stringify(value), before);
  }
  assert(mnaPdfBlocks(snapshot).some((row) => row.text === 'IMC: Non disponibile'));
  for (const [value, expected] of [
    [0, '0 punti'],
    [0.5, '0,5 punti'],
    [1, '1 punto'],
    [1.5, '1,5 punti'],
    [2, '2 punti'],
  ] as const) {
    const candidate = { ...snapshot, items: [{ ...snapshot.items[0], score: value }] };
    assert(mnaPdfBlocks(candidate).some((row) => row.text.endsWith(' — ' + expected)));
  }
  for (const [type, expected] of [
    ['painad', 'painad-a4-v1'],
    ['postural_transfers', 'transfers-a4-v1'],
    ['tinetti', 'tinetti-a4-v1'],
    ['gds15', 'gds15-a4-v1'],
    ['mna', 'mna-a4-v2'],
  ] as const)
    assert.equal(assessmentRendererVersion({ form: { type } } as AssessmentSnapshot), expected);
});

test('real archived PO15 MNA v1 ready retry invokes no renderer and preserves every persisted value', async () => {
  const { assessment, document } = await state();
  const bytes = await readFile(resolve(legacy, 'mna-ready-v1.pdf'));
  assert.equal(sha(bytes), document.sha256);
  assert.equal(mnaSnapshotHash(assessment.finalSnapshot), assessment.snapshotSha256);
  assert.equal(
    (await PDFDocument.load(bytes, { updateMetadata: false })).getProducer(),
    'ClinicOS mna-a4-v1',
  );
  const legacyActor = { id: assessment.authorOperatorId, role: 'operatore' };
  await prisma.user.create({
    data: {
      email: `po16-${randomUUID()}@example.test`,
      passwordHash: 'synthetic-disabled',
      fullName: assessment.authorName,
      operator: { create: { id: legacyActor.id } },
    },
  });
  await prisma.patient.create({
    data: {
      id: assessment.patientId,
      medicalRecordNumber: assessment.patientId,
      firstName: assessment.finalSnapshot.patient.firstName,
      lastName: assessment.finalSnapshot.patient.lastName,
      registeredById: legacyActor.id,
    },
  });
  const restored = { ...assessment };
  for (const key of ['assessedAt', 'createdAt', 'updatedAt', 'finalizedAt', 'pdfUpdatedAt'])
    restored[key] = new Date(assessment[key]);
  await assessmentTransaction(async (tx) => {
    await tx.patientAssessment.create({
      data: {
        ...restored,
        status: 'draft',
        version: 1,
        finalizedAt: null,
        finalSnapshot: Prisma.DbNull,
        snapshotSha256: null,
        finalizeRequestId: null,
        finalizePayloadHash: null,
        pdfStatus: null,
        pdfAttemptCount: 0,
        pdfUpdatedAt: null,
      } as Prisma.PatientAssessmentUncheckedCreateInput,
    });
    await tx.patientAssessment.update({
      where: { id: assessment.id },
      data: {
        ...restored,
        pdfStatus: 'pending',
      } as Prisma.PatientAssessmentUncheckedUpdateInput,
    });
    await tx.patientDocument.create({
      data: {
        ...document,
        createdAt: new Date(document.createdAt),
        dataBase64: bytes.toString('base64'),
      } as Prisma.PatientDocumentUncheckedCreateInput,
    });
    await tx.patientAssessment.update({
      where: { id: assessment.id },
      data: { pdfStatus: 'ready' },
    });
  });
  const read = () =>
    assessmentTransaction(async (tx) => ({
      assessment: await tx.patientAssessment.findUniqueOrThrow({ where: { id: assessment.id } }),
      document: await tx.patientDocument.findUniqueOrThrow({ where: { id: document.id } }),
      count: await tx.patientDocument.count({ where: { assessmentId: assessment.id } }),
    }));
  const before = await read();
  // Restore and read under the production UTC transaction convention. Preserve the dump and its original snapshot even when their timestamps differ.
  assert.deepEqual(
    JSON.parse(JSON.stringify(before.assessment)),
    JSON.parse(JSON.stringify(restored)),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(before.document)), {
    ...document,
    createdAt: new Date(document.createdAt).toISOString(),
    dataBase64: bytes.toString('base64'),
  });
  let renderCalls = 0;
  const responses = await Promise.all(
    Array.from({ length: 3 }, () =>
      retryAssessmentPdf(assessment.patientId, assessment.id, legacyActor, async () => {
        renderCalls++;
        throw new Error('Archived ready PDF must never be rendered again');
      }),
    ),
  );
  const after = await read();
  assert.equal(renderCalls, 0);
  assert.deepEqual(after, before);
  assert.equal(after.count, 1);
  for (const response of responses) {
    assert.equal(response.pdf!.documentId, document.id);
    assert.equal(response.pdf!.status, 'ready');
    assert.equal(response.snapshotSha256, assessment.snapshotSha256);
  }
  const retained = Buffer.from(after.document.dataBase64, 'base64');
  assert.deepEqual(retained, bytes);
  assert.equal(
    (await PDFDocument.load(retained, { updateMetadata: false })).getProducer(),
    'ClinicOS mna-a4-v1',
  );
  const withoutBytes = ({ dataBase64: _bytes, ...metadata }: typeof before.document) => metadata;
  await save('legacy-ready-retry-proof.json', {
    renderCalls,
    attempts: 3,
    database: 'synthetic native PostgreSQL loopback',
    before: {
      assessment: before.assessment,
      document: withoutBytes(before.document),
      count: before.count,
    },
    after: {
      assessment: after.assessment,
      document: withoutBytes(after.document),
      count: after.count,
    },
    fullBeforeSha256: sha(JSON.stringify(before)),
    fullAfterSha256: sha(JSON.stringify(after)),
    pdfBeforeSha256: sha(bytes),
    pdfAfterSha256: sha(retained),
    originalPdfSha256: document.sha256,
    producerBefore: 'ClinicOS mna-a4-v1',
    producerAfter: 'ClinicOS mna-a4-v1',
  });
});

test('new MNA v2 archives readable 1 punto, 27,5 and 25 while retaining raw BMI and snapshot digest', async () => {
  const answers = mnaAnswers();
  answers.A = 'moderate_reduction';
  answers.P = 'unknown';
  answers.F = { method: 'measured' };
  answers.measurements.weightKg = 64;
  answers.measurements.heightCm = 160;
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
  const snapshot = final.finalSnapshot!;
  assert.equal(snapshot.bmi, 24.999999999999996);
  assert.equal(snapshot.result.total!.score, 27.5);
  const original = JSON.stringify(snapshot),
    hash = mnaSnapshotHash(snapshot);
  const text = mnaPdfBlocks(snapshot)
    .map((row) => row.text)
    .join('\n');
  assert.match(text, / — 1 punto\n/);
  assert(!/ — 1 punti\n/.test(text));
  assert.match(text, /Totale MNA: 27,5 \/ 30/);
  assert.match(text, /IMC: 25 kg\/m²/);
  const ready = await retryAssessmentPdf(patient, final.id, actor);
  assert.equal(ready.pdf!.status, 'ready');
  const document = await prisma.patientDocument.findUniqueOrThrow({
    where: { id: ready.pdf!.documentId! },
  });
  assert.equal((document.sourceManifest as Prisma.JsonObject).rendererVersion, 'mna-a4-v2');
  const bytes = Buffer.from(document.dataBase64, 'base64');
  assert.equal(sha(bytes), document.sha256);
  assert.equal(
    (await PDFDocument.load(bytes, { updateMetadata: false })).getProducer(),
    'ClinicOS mna-a4-v2',
  );
  assert.equal(JSON.stringify(snapshot), original);
  assert.deepEqual(ready.finalSnapshot, snapshot);
  assert.deepEqual(ready.answers, answers);
  assert.equal(ready.snapshotSha256, hash);
  assert.equal(final.snapshotSha256, hash);
  const qa = resolve(folder, 'pdf-qa');
  await mkdir(qa, { recursive: true });
  await writeFile(resolve(qa, 'mna-v2-half-point.pdf'), bytes);
  await writeFile(resolve(qa, 'mna-v2-half-point.snapshot.json'), original + '\n');
  await save('fresh-v2-proof.json', {
    assessmentId: final.id,
    documentId: document.id,
    snapshotSha256: hash,
    rawBmi: snapshot.bmi,
    total: snapshot.result.total!.score,
    displayedBmi: '25',
    displayedTotal: '27,5',
    rendererVersion: 'mna-a4-v2',
    producer: 'ClinicOS mna-a4-v2',
    pdfSha256: document.sha256,
    bytes: bytes.length,
    sourceManifest: document.sourceManifest,
    pdfPath: 'pdf-qa/mna-v2-half-point.pdf',
    snapshotPath: 'pdf-qa/mna-v2-half-point.snapshot.json',
  });
});
