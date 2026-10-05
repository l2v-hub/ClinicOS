// backend/src/intake/__tests__/confirm-draft-therapy.test.ts
// TDD Task 2: confirmDraft must persist therapies + carry vitals/pain into Cartella.data.
// Uses node:test / node:assert — same pattern as seed-draft-from-import.test.ts.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft } from '../draft-service.js';
import { confirmDraft } from '../../ai/upload/confirm-service.js';
import { prisma } from '../../lib/prisma.js';
import { createTestOperator } from '../../test-support/operator-fixture.js';

const TEST_OPERATOR_ID = 'TEST-OWNER-DRAFT-THERAPY';
let cleanupOperator: () => Promise<void>;

before(async () => {
  cleanupOperator = await createTestOperator(
    TEST_OPERATOR_ID,
    'test-owner-draft-therapy@clinicos.test',
  );
});

after(async () => cleanupOperator());

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PATIENT = {
  phone: '+39 333 000 0000',
  firstName: 'Anna',
  lastName: 'Bianchi',
  dateOfBirth: '1960-01-01',
  // #294: CF sintetico valido — obbligatorio per ogni creazione paziente.
  codiceFiscale: 'BNCNNA60A41H501N',
};

const PARAMETRI_MENSILI = [
  {
    id: 'p1',
    mese: 6,
    anno: 2026,
    giorni: [{ giorno: 1, pa: '120/80' }],
    createdAt: '2026-06-29T00:00:00Z',
  },
];

const LEGACY_NRS = [
  {
    id: 'n1',
    data: '2026-06-29',
    punteggio: 4,
    operatore: 'Op',
    note: '',
    createdAt: '2026-06-29T00:00:00Z',
  },
];

const THERAPIES = [
  {
    farmacoNome: 'Tachipirina',
    dataInizio: '2026-06-29',
    viaSomministrazione: 'orale',
    schedules: [
      {
        time: '08:00',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    ],
    operatoreInseritore: 'Op',
  },
];

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test('confirmDraft: persists therapies + vitals/pain into Cartella.data', async () => {
  const draft = await createDraft({ source: 'manual', createdById: TEST_OPERATOR_ID });

  try {
    // Legacy NRS cannot be injected even through a reviewed import. Each failure is atomic.
    for (const legacy of [null, [], LEGACY_NRS]) {
      const before = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draft.id } });
      await assert.rejects(
        confirmDraft(
          draft.id,
          { patient: PATIENT, cartella: { valutazioniNRS: legacy }, therapies: THERAPIES },
          { id: TEST_OPERATOR_ID },
        ),
        (error: any) => error.status === 409 && error.code === 'nrs_legacy_read_only',
      );
      const after = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draft.id } });
      assert.deepEqual(after, before);
      assert.equal(await prisma.patient.count({ where: { registeredById: TEST_OPERATOR_ID } }), 0);
      assert.equal(
        await prisma.patientTherapy.count({ where: { operatoreInseritore: TEST_OPERATOR_ID } }),
        0,
      );
    }
    const payload = {
      patient: PATIENT,
      cartella: {
        parametriMensili: PARAMETRI_MENSILI,
        parametriVitali: [{ id: 'pain-vital', etichetta: 'NRS', valore: '4' }],
      },
      therapies: THERAPIES,
    };
    const result = await confirmDraft(draft.id, payload, {
      id: TEST_OPERATOR_ID,
      name: 'Operatore Test',
    });

    // 1. Status must be 'created'.
    assert.equal(result.status, 'created', `Expected status 'created', got '${result.status}'`);

    const patientId = result.patient!.id;

    // 2. Exactly 1 PatientTherapy row created, with at least 1 schedule.
    const therapyRows = await prisma.patientTherapy.findMany({
      where: { patientId },
      include: { schedules: true },
    });
    assert.equal(therapyRows.length, 1, `Expected 1 PatientTherapy row, got ${therapyRows.length}`);
    assert.equal(therapyRows[0].farmacoNome, 'Tachipirina');
    assert.ok(
      therapyRows[0].schedules.length >= 1,
      `Expected at least 1 schedule, got ${therapyRows[0].schedules.length}`,
    );

    assert.equal(therapyRows[0].operatoreInseritore, 'Operatore Test');

    // Supported vital readings persist without creating legacy NRS history.
    const cartella = await prisma.cartella.findUnique({ where: { patientId } });
    assert.ok(cartella, 'Cartella row must exist');
    const data = cartella!.data as Record<string, unknown>;

    const pm = data.parametriMensili as unknown[];
    assert.ok(
      Array.isArray(pm) && pm.length === 1,
      `Expected parametriMensili length 1, got ${pm?.length}`,
    );

    assert.deepEqual(data.parametriVitali, payload.cartella.parametriVitali);
    assert.equal(Object.hasOwn(data, 'valutazioniNRS'), false);
    const replay = await confirmDraft(draft.id, payload, { id: TEST_OPERATOR_ID });
    assert.equal(replay.status, 'idempotent');
    assert.equal(replay.patient!.id, patientId);
    assert.equal(await prisma.patientTherapy.count({ where: { patientId } }), 1);
  } finally {
    // Cleanup: find the patient (if created) and cascade-delete everything.
    // Re-fetch the draft to find the confirmedPatientId.
    const confirmedDraft = await prisma.patientIntakeDraft.findUnique({ where: { id: draft.id } });
    const pid = confirmedDraft?.confirmedPatientId;
    if (pid) {
      await prisma.therapySchedule
        .deleteMany({ where: { therapy: { patientId: pid } } })
        .catch(() => {});
      await prisma.patientTherapy.deleteMany({ where: { patientId: pid } }).catch(() => {});
      await prisma.cartella.deleteMany({ where: { patientId: pid } }).catch(() => {});
      await prisma.patient.delete({ where: { id: pid } }).catch(() => {});
    }
    await prisma.patientIntakeDraft.delete({ where: { id: draft.id } }).catch(() => {});
  }
});
