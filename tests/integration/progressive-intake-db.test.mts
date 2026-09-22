import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { after, before, test } from 'node:test';
import {
  closeParameterPrisma,
  fixtureActors,
  fixturePatientIds,
  seedParameterDatabase,
  selectLocalParameterDatabase,
  startParameterApi,
  startParameterDatabase,
} from '../fixtures/parameter-database.mjs';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let api: Awaited<ReturnType<typeof startParameterApi>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let confirmDraft: typeof import('../../backend/src/ai/upload/confirm-service.js').confirmDraft;
let confirmJob: typeof import('../../backend/src/ai/upload/confirm-service.js').confirmJob;
let patchDraft: typeof import('../../backend/src/intake/draft-service.js').patchDraft;
let seedDraftFromImport: typeof import('../../backend/src/intake/draft-service.js').seedDraftFromImport;
let createDraft: typeof import('../../backend/src/intake/draft-service.js').createDraft;
const actor = fixtureActors.operator;
const headers = (who = actor) => ({
  'Content-Type': 'application/json',
  'X-Operator-Id': who.id,
  'X-Operator-Role': who.role,
});
const body = (patient: Record<string, unknown> = {}) => ({
  patient: { firstName: 'Persona', lastName: `QA-${randomUUID()}`, ...patient },
});
const invalid = (error: unknown) =>
  error instanceof Error && 'kind' in error && error.kind === 'config';

before(
  async () => {
    database = await startParameterDatabase({});
    assert.ok(database.applied.includes('20260923002000_progressive_patient_identity'));
    await seedParameterDatabase(database.db);
    selectLocalParameterDatabase(database.url);
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    ({ confirmDraft, confirmJob } = await import('../../backend/src/ai/upload/confirm-service.js'));
    ({ patchDraft, seedDraftFromImport, createDraft } =
      await import('../../backend/src/intake/draft-service.js'));
    api = await startParameterApi();
  },
  { timeout: 60000 },
);
after(async () => {
  await api?.close();
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

async function draft(data: Record<string, unknown> = {}, importJobId?: string) {
  return prisma.patientIntakeDraft.create({
    data: {
      createdById: actor.id,
      source: importJobId ? 'import' : 'manual',
      data: data as object,
      importJobId,
    },
  });
}
async function job() {
  const row = await prisma.importJob.create({
    data: {
      createdById: actor.id,
      status: 'review_ready',
      maxFiles: 10,
      maxTotalBytes: 1000000,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const bytes = Buffer.from('%PDF-1.4 synthetic intake source');
  await prisma.importDocument.create({
    data: {
      jobId: row.id,
      filename: 'synthetic.pdf',
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      storagePath: 'missing-synthetic-document',
      dataBase64: bytes.toString('base64'),
      status: 'uploaded',
      sortOrder: 0,
    },
  });
  return row;
}
async function update(patientId: string, data: unknown, who = actor) {
  return fetch(`${api.url}/api/patients/${patientId}`, {
    method: 'PATCH',
    headers: headers(who),
    body: JSON.stringify(data),
  });
}

test('manual and OCR intake preserve unknown DOB/CF/phone and archive source atomically', async () => {
  for (const imported of [false, true]) {
    const source = imported ? await job() : null;
    const d = await draft({}, source?.id);
    const result = await confirmDraft(d.id, body(), actor);
    assert.equal(result.status, 'created');
    const p = await prisma.patient.findUniqueOrThrow({ where: { id: result.patient!.id } });
    assert.equal(p.dateOfBirth, null);
    assert.equal(p.codiceFiscale, null);
    assert.equal(p.phone, null);
    assert.equal(p.registeredById, actor.id);
    assert.equal(
      await prisma.patientDocument.count({ where: { patientId: p.id } }),
      imported ? 1 : 0,
    );
    if (source) {
      assert.equal(
        (await prisma.importJob.findUniqueOrThrow({ where: { id: source.id } })).createdPatientId,
        p.id,
      );
      assert.equal((await confirmJob(source.id, body(), actor)).patient!.id, p.id);
    }
  }
});

test('supplied malformed values fail with no materialization and no placeholders', async () => {
  for (const identity of [
    { firstName: '' },
    { lastName: null },
    { dateOfBirth: '2026-02-30' },
    { dateOfBirth: '31/04/1950' },
    { dateOfBirth: '2999-01-01' },
    { dateOfBirth: 0 },
    { codiceFiscale: 123 },
    { codiceFiscale: 'invalid' },
    { phone: '1234' },
    { phone: {} },
  ]) {
    const d = await draft();
    const before = await prisma.patient.count();
    await assert.rejects(confirmDraft(d.id, body(identity) as any, actor), invalid);
    assert.equal(await prisma.patient.count(), before);
    assert.equal(
      (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: d.id } })).status,
      'draft',
    );
  }
  const d = await draft();
  const result = await confirmDraft(
    d.id,
    body({ dateOfBirth: '29/02/1952', phone: '+39 0331 123456' }),
    actor,
  );
  const p = await prisma.patient.findUniqueOrThrow({ where: { id: result.patient!.id } });
  assert.equal(p.dateOfBirth!.toISOString(), '1952-02-29T00:00:00.000Z');
  assert.equal(p.phone, '+39 0331 123456');
});

test('concurrent confirms and response replay converge on one identity', async () => {
  const d = await draft();
  const payload = body();
  const results = await Promise.all(
    Array.from({ length: 4 }, () => confirmDraft(d.id, payload, actor)),
  );
  assert.equal(new Set(results.map((r) => r.patient!.id)).size, 1);
  assert.equal(results.filter((r) => r.status === 'created').length, 1);
  assert.equal((await confirmDraft(d.id, payload, actor)).status, 'idempotent');
  await assert.rejects(patchDraft(d.id, { anagrafica: { firstName: 'Stale autosave' } }), invalid);
});

test('draft/job race shares identity, document and confirmation even without CF', async () => {
  const source = await job();
  const d = await draft({}, source.id);
  const payload = body();
  const results = await Promise.all([
    confirmJob(source.id, payload, actor),
    confirmDraft(d.id, payload, actor),
    confirmJob(source.id, payload, actor),
  ]);
  const id = results[0].patient!.id;
  assert.equal(new Set(results.map((r) => r.patient!.id)).size, 1);
  assert.equal(results.filter((r) => r.status === 'created').length, 1);
  assert.equal(await prisma.patientDocument.count({ where: { patientId: id } }), 1);
  assert.equal(
    (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: d.id } })).confirmedPatientId,
    id,
  );
});

test('completion preserves patient/document IDs; duplicate CF and malformed updates are atomic', async () => {
  const source = await job();
  const d = await draft({}, source.id);
  const id = (await confirmDraft(d.id, body(), actor)).patient!.id;
  const originalDocuments = await prisma.patientDocument.findMany({
    where: { patientId: id },
    select: { id: true },
  });
  const cf = 'NTKSNT70A01H501G';
  const response = await update(id, {
    dateOfBirth: '1970-01-01',
    phone: '+39 333 000 0000',
    codiceFiscale: cf,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, id);
  assert.deepEqual(
    await prisma.patientDocument.findMany({ where: { patientId: id }, select: { id: true } }),
    originalDocuments,
  );
  const other = (await confirmDraft((await draft()).id, body(), actor)).patient!.id;
  assert.equal(
    (await update(other, { codiceFiscale: cf, firstName: 'Must not persist' })).status,
    409,
  );
  assert.equal(
    (await prisma.patient.findUniqueOrThrow({ where: { id: other } })).firstName,
    'Persona',
  );
  assert.equal((await update(id, { dateOfBirth: '1950-02-30' })).status, 400);
  assert.equal((await update(id, { firstName: '' })).status, 400);
  assert.equal(
    (await update(id, { dateOfBirth: null, phone: '', codiceFiscale: null })).status,
    200,
  );
  const p = await prisma.patient.findUniqueOrThrow({ where: { id } });
  assert.equal(p.dateOfBirth, null);
  assert.equal(p.phone, null);
  assert.equal(p.codiceFiscale, null);
});

test('homonyms require review only within actor scope; absent DOB includes known birth dates', async () => {
  const same = { firstName: 'Anna', lastName: 'Alfa' };
  const result = await confirmDraft((await draft()).id, body(same), actor);
  assert.equal(result.status, 'duplicate');
  assert.equal(result.duplicate!.id, fixturePatientIds[0]);
  const outside = await confirmDraft(
    (await draft()).id,
    body({ firstName: 'Esterno', lastName: 'Gamma' }),
    actor,
  );
  assert.equal(outside.status, 'created');
  const differentDob = await confirmDraft(
    (await draft()).id,
    body({ ...same, dateOfBirth: '1970-01-01' }),
    actor,
  );
  assert.equal(differentDob.status, 'created');
});

test('scope prevents direct-service and HTTP access, including existing-patient import', async () => {
  const d = await draft();
  const source = await job();
  await assert.rejects(confirmDraft(d.id, body(), fixtureActors.outsider), /Bozza non trovata/);
  await assert.rejects(
    confirmJob(source.id, { ...body(), mode: 'existing', patientId: fixturePatientIds[2] }, actor),
    /Paziente non trovato/,
  );
  assert.equal((await update(fixturePatientIds[2], { phone: '1234567' })).status, 404);
  assert.equal(
    (
      await fetch(`${api.url}/api/patients/${fixturePatientIds[2]}/intake-review`, {
        headers: headers(),
      })
    ).status,
    404,
  );
});

test('selected reviewed therapy is materialized; excluded OCR therapy remains readable and not scheduled', async () => {
  const form = {
    farmacoNome: 'Farmaco sintetico',
    dataInizio: '2026-09-23',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    pharmaceuticalForm: 'compressa',
    commercialStrengthValue: '25',
    commercialStrengthUnit: 'mg',
    giorniSettimana: [],
    schedules: [
      {
        time: '20:00',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    ],
  };
  const imported = [
    {
      farmacoNome: form.farmacoNome,
      dataInizio: form.dataInizio,
      stato: 'ok',
      reviewedTherapy: form,
      originalText: 'Originale 16:00 corretto a 20:00',
    },
    {
      farmacoNome: 'Da verificare',
      stato: 'da_verificare',
      originalText: 'Fonte incerta',
      excludedFromConfirm: true,
    },
  ];
  const d = await draft({ terapiaImport: imported });
  const input = {
    ...form,
    commercialStrengthValue: 25,
    giorniSettimana: '',
    intakeSource: { type: 'import', index: 0 },
  };
  const payload = { ...body(), therapies: [input] } as any;
  await assert.rejects(
    confirmDraft(
      d.id,
      {
        ...payload,
        therapies: [{ ...input, schedules: [{ ...form.schedules[0], time: '16:00' }] }],
      },
      actor,
    ),
    invalid,
  );
  const id = (await confirmDraft(d.id, payload, actor)).patient!.id;
  const therapies = await prisma.patientTherapy.findMany({
    where: { patientId: id },
    include: { schedules: true },
  });
  assert.equal(therapies.length, 1);
  assert.equal(therapies[0].schedules[0].time, '20:00');
  const response = await fetch(`${api.url}/api/patients/${id}/intake-review`, {
    headers: headers(),
  });
  assert.equal(response.status, 200);
  const review = await response.json();
  assert.equal(review.deferredTherapies.length, 1);
  assert.equal(review.deferredTherapies[0].name, 'Da verificare');
  const saved = (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: d.id } }))
    .data as any;
  assert.deepEqual(saved._confirmation.therapyIds, [therapies[0].id]);
  assert.equal(saved.terapiaImport[1].originalText, 'Fonte incerta');
});

test('omitting an included or unverified OCR row cannot silently activate or discard it', async () => {
  const d = await draft({
    terapiaImport: [{ farmacoNome: 'Non verificato', stato: 'da_verificare', originalText: 'raw' }],
  });
  await assert.rejects(confirmDraft(d.id, body(), actor), invalid);
  await assert.rejects(patchDraft(d.id, { terapiaImport: [] }), invalid);
  await assert.rejects(patchDraft(d.id, { _confirmation: {} }), invalid);
  await patchDraft(d.id, {
    terapiaImport: [
      {
        farmacoNome: 'Non verificato',
        stato: 'da_verificare',
        originalText: 'raw',
        excludedFromConfirm: true,
      },
    ],
  });
  const id = (await confirmDraft(d.id, body(), actor)).patient!.id;
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: id } }), 0);
});

test('missing original rolls back identity, job and draft confirmation', async () => {
  const source = await job();
  const d = await draft({}, source.id);
  await prisma.importDocument.updateMany({
    where: { jobId: source.id },
    data: { dataBase64: null },
  });
  const count = await prisma.patient.count();
  await assert.rejects(confirmDraft(d.id, body(), actor), /archiviare tutti i documenti/);
  assert.equal(await prisma.patient.count(), count);
  assert.equal(
    (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: d.id } })).confirmedPatientId,
    null,
  );
  assert.equal(
    (await prisma.importJob.findUniqueOrThrow({ where: { id: source.id } })).createdPatientId,
    null,
  );
});

test('an already confirmed import cannot create an editable draft; concurrent seeds converge', async () => {
  const source = await job();
  await prisma.importJob.update({
    where: { id: source.id },
    data: {
      resultData: {
        _narrative: {
          firstName: 'QA',
          lastName: 'Import',
          diagnosisText: 'Diagnosi sintetica',
          boldTags: [],
          sourceReferences: [],
        },
      },
    },
  });
  const drafts = await Promise.all([
    seedDraftFromImport(source.id, { actor, createdById: actor.id }),
    createDraft({ importJobId: source.id, createdById: actor.id }),
  ]);
  assert.equal(drafts[0].id, drafts[1].id);
  const id = (await confirmJob(source.id, body(), actor)).patient!.id;
  assert.equal(
    await prisma.patientNarrativeSection.count({
      where: { patientId: id, originalText: 'Diagnosi sintetica' },
    }),
    1,
  );
  await assert.rejects(
    seedDraftFromImport(source.id, { actor, createdById: actor.id }),
    /già confermato/,
  );
  await assert.rejects(
    createDraft({ importJobId: source.id, createdById: actor.id }),
    /già confermato/,
  );
});

test('job narrative fallback and clinical allergy guards survive a legacy empty linked draft', async () => {
  const source = await job();
  const d = await draft({}, source.id);
  await prisma.importJob.update({
    where: { id: source.id },
    data: {
      resultData: {
        _narrative: {
          firstName: 'QA',
          lastName: 'Legacy',
          diagnosisText: 'Diagnosi dalla fonte',
          boldTags: [],
          sourceReferences: [],
        },
        _sections: { allergies: { status: 'conflicting' } },
      },
    },
  });
  await assert.rejects(confirmJob(source.id, body(), actor), /allergie contrastanti/);
  assert.equal(
    (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: d.id } })).status,
    'draft',
  );
  const id = (await confirmJob(source.id, { ...body(), confirmAllergyConflict: true }, actor))
    .patient!.id;
  assert.equal(
    await prisma.patientNarrativeSection.count({
      where: { patientId: id, originalText: 'Diagnosi dalla fonte' },
    }),
    1,
  );
});

test('confirmed replay respects changed patient scope and refuses contradictory legacy references', async () => {
  const source = await job(); const d = await draft({}, source.id);
  const id = (await confirmDraft(d.id, body(), actor)).patient!.id;
  await prisma.patient.update({ where: { id }, data: { registeredById: fixtureActors.outsider.id } });
  await assert.rejects(confirmDraft(d.id, body(), actor), /Paziente non trovato/);
  assert.equal((await confirmDraft(d.id, body(), fixtureActors.manager)).patient!.id, id);
  await prisma.importJob.update({ where: { id: source.id }, data: { createdPatientId: fixturePatientIds[0] } });
  await assert.rejects(confirmJob(source.id, body(), fixtureActors.manager), /non coincidono/);
});

test('fiscal uniqueness under concurrent distinct drafts stays global without leaking names', async () => {
  const d1 = await draft();
  const d2 = await draft();
  const payload = body({ codiceFiscale: 'NTKSNT70A01H501G' });
  const results = await Promise.allSettled([
    confirmDraft(d1.id, payload, actor),
    confirmDraft(d2.id, payload, actor),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
  assert.match(failure.reason.message, /Codice fiscale già presente/);
  assert.ok(!failure.reason.message.includes(payload.patient.lastName));
});
