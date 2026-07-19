// backend/src/intake/__tests__/confirm-draft-therapy.test.ts
// TDD Task 2: confirmDraft must persist therapies + carry vitals/pain into Cartella.data.
// Uses node:test / node:assert — same pattern as seed-draft-from-import.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft } from '../draft-service.js';
import { confirmDraft } from '../../ai/upload/confirm-service.js';
import { prisma } from '../../lib/prisma.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PATIENT = {
  firstName: 'Anna',
  lastName: 'Bianchi',
  dateOfBirth: '1960-01-01',
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

const VALUTAZIONI_NRS = [
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
  const draft = await createDraft({ source: 'manual' });

  try {
    const result = await confirmDraft(draft.id, {
      patient: PATIENT,
      cartella: {
        parametriMensili: PARAMETRI_MENSILI,
        valutazioniNRS: VALUTAZIONI_NRS,
      },
      therapies: THERAPIES,
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

    // 3. Cartella.data must contain parametriMensili (len 1) and valutazioniNRS (len 1).
    const cartella = await prisma.cartella.findUnique({ where: { patientId } });
    assert.ok(cartella, 'Cartella row must exist');
    const data = cartella!.data as Record<string, unknown>;

    const pm = data.parametriMensili as unknown[];
    assert.ok(
      Array.isArray(pm) && pm.length === 1,
      `Expected parametriMensili length 1, got ${pm?.length}`,
    );

    const nrs = data.valutazioniNRS as unknown[];
    assert.ok(
      Array.isArray(nrs) && nrs.length === 1,
      `Expected valutazioniNRS length 1, got ${nrs?.length}`,
    );
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
