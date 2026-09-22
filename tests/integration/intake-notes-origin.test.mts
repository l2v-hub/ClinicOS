import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, test } from 'node:test';
import {
  fixtureActors,
  startParameterDatabase,
  seedParameterDatabase,
  selectLocalParameterDatabase,
  closeParameterPrisma,
} from '../fixtures/parameter-database.mjs';
import { parseTherapyLine } from '../../backend/src/intake/parse-discharge-therapy.js';
import {
  prepareIntakeConfirmData,
  buildIntakeTherapyReview,
} from '../../frontend/src/components/shared/intake/intakeTherapies.ts';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let confirmDraft: typeof import('../../backend/src/ai/upload/confirm-service.js').confirmDraft;
let buildTherapySlots: typeof import('../../backend/src/therapies/therapy-slots.js').buildTherapySlots;
const actor = fixtureActors.operator;
before(
  async () => {
    database = await startParameterDatabase({});
    await seedParameterDatabase(database.db);
    selectLocalParameterDatabase(database.url);
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    ({ confirmDraft } = await import('../../backend/src/ai/upload/confirm-service.js'));
    ({ buildTherapySlots } = await import('../../backend/src/therapies/therapy-slots.js'));
  },
  { timeout: 60000 },
);
after(async () => {
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('reviewed operational notes persist without the OCR source; monitoring time is not scheduled; replay preserves archive', async () => {
  const source =
    'LASIX CPR 25 MG (OS) 1 Cpr ore 08:00; controllare PA alle 22:00 dal 23/09/2026 (Classe A)';
  const raw = parseTherapyLine(source);
  assert.deepEqual(raw.orari, ['08:00']);
  assert.match(raw.note, /controllare PA alle 22:00/);
  const prepared = prepareIntakeConfirmData({ terapiaImport: [{ ...raw, stato: 'ok' as const }] });
  const reviewed = buildIntakeTherapyReview(prepared);
  assert.deepEqual(reviewed[0].issues, []);
  assert.doesNotMatch(String(reviewed[0].input.note), /Origine:|ore 08:00/);
  const job = await prisma.importJob.create({
    data: {
      createdById: actor.id,
      status: 'review_ready',
      maxFiles: 10,
      maxTotalBytes: 1000000,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const bytes = Buffer.from('%PDF-1.4 synthetic therapy source');
  await prisma.importDocument.create({
    data: {
      jobId: job.id,
      filename: 'origine-sintetica.pdf',
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      storagePath: 'synthetic-only',
      dataBase64: bytes.toString('base64'),
      status: 'uploaded',
      sortOrder: 0,
    },
  });
  const draft = await prisma.patientIntakeDraft.create({
    data: { createdById: actor.id, source: 'import', importJobId: job.id, data: prepared },
  });
  const payload: any = {
    patient: { firstName: 'Note', lastName: 'Sintetiche' },
    therapies: [reviewed[0].input],
  };
  const result = await confirmDraft(draft.id, payload, actor);
  const patientId = result.patient!.id;
  const therapies = await prisma.patientTherapy.findMany({
    where: { patientId },
    include: { schedules: true },
  });
  assert.equal(therapies.length, 1);
  assert.match(therapies[0].note!, /controllare PA alle 22:00/);
  assert.doesNotMatch(therapies[0].note!, /Origine:|ore 08:00/);
  const slots = await buildTherapySlots('2026-09-23', { registeredById: actor.id });
  assert.deepEqual(
    slots
      .flatMap((s) => s.patients)
      .filter((p) => p.patientId === patientId)
      .flatMap((p) => p.administrations)
      .map((a) => a.scheduledTime),
    ['08:00'],
  );
  const saved = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draft.id } });
  assert.equal((saved.data as any).terapiaImport[0].originalText, source);
  assert.deepEqual((saved.data as any)._confirmation.selectedSources, ['import:0']);
  assert.deepEqual((saved.data as any)._confirmation.therapyIds, [therapies[0].id]);
  const documents = await prisma.patientDocument.findMany({ where: { patientId } });
  assert.equal(documents.length, 1);
  assert.equal(documents[0].dataBase64, bytes.toString('base64'));
  assert.equal((await confirmDraft(draft.id, payload, actor)).patient!.id, patientId);
  assert.equal(await prisma.patientDocument.count({ where: { patientId } }), 1);
  assert.equal(await prisma.patientTherapy.count({ where: { patientId } }), 1);
});
