// backend/src/therapies/__tests__/therapy-create.test.ts
// TDD: Task 1 — extract createTherapyInTx shared helper.
// Uses the same node:test / node:assert pattern as intake/__tests__/seed-draft-from-import.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTherapyInTx } from '../therapy-create.js';
import { prisma } from '../../lib/prisma.js';

test('createTherapyInTx: creates therapy with schedules and derives dosaggio + fasceMattina', async () => {
  // Create a minimal patient row for the FK constraint.
  const patient = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-TCT-${Date.now()}`,
      firstName: 'Test',
      lastName: 'Intake',
      dateOfBirth: new Date('1970-01-01'),
      sex: 'M',
    },
  });

  try {
    const therapy = await prisma.$transaction(tx =>
      createTherapyInTx(tx, patient.id, {
        farmacoNome: 'Tachipirina',
        dataInizio: '2026-06-29',
        commercialStrengthValue: 500,
        commercialStrengthUnit: 'mg',
        pharmaceuticalForm: 'compressa',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        schedules: [
          {
            time: '08:00',
            quantityNumerator: 1,
            quantityDenominator: 1,
            administrationUnit: 'compressa',
          },
        ],
        operatoreInseritore: 'Op Test',
      }),
    );

    assert.equal(therapy.farmacoNome, 'Tachipirina');
    assert.equal(therapy.dosaggio, '500 mg compressa', 'dosaggio must be derived from strength+form');
    assert.equal(therapy.commercialStrengthValue, 500);
    assert.equal(therapy.schedules.length, 1, 'one schedule row must be created');
    assert.equal(therapy.schedules[0].time, '08:00');
    assert.equal(therapy.fasceMattina, true, 'fasceMattina must be derived from 08:00 schedule');
  } finally {
    // Cleanup: cascade deletes therapy and schedules.
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
  }
});

test('createTherapyInTx: rejects when farmacoNome is missing', async () => {
  // Create a minimal patient row.
  const patient = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-TCM-${Date.now()}`,
      firstName: 'Test',
      lastName: 'Missing',
      dateOfBirth: new Date('1970-01-01'),
      sex: 'M',
    },
  });

  try {
    await assert.rejects(
      () =>
        prisma.$transaction(tx =>
          createTherapyInTx(tx, patient.id, {
            farmacoNome: '',
            dataInizio: '2026-06-29',
          }),
        ),
      (err: Error) => {
        assert.ok(
          err.message.includes('Campi obbligatori'),
          `Expected "Campi obbligatori" in error: ${err.message}`,
        );
        return true;
      },
    );
  } finally {
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
  }
});
