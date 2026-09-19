import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TherapyCreateInput } from '../therapy-create.js';

test('shared therapy creation preserves inhaler form and puff quantities in its persistence payload', async () => {
  // No live database is contacted: the supplied transaction is the only persistence delegate.
  process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:1/therapy_inhaler_test';
  const { createTherapyInTx } = await import('../therapy-create.js');
  const { prisma } = await import('../../lib/prisma.js');
  const input: TherapyCreateInput = {
    farmacoNome: 'Inalatore sintetico',
    dataInizio: '2026-09-20',
    viaSomministrazione: 'inalatoria',
    tipo: 'periodica',
    pharmaceuticalForm: 'inalatore',
    commercialStrengthValue: 100,
    commercialStrengthUnit: 'mcg',
    allowedFractions: '1',
    schedules: [
      { time: '08:00', quantityNumerator: 2, quantityDenominator: 1, administrationUnit: 'puff' },
      { time: '20:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'puff' },
    ],
  };
  const original = structuredClone(input);
  let writes = 0;
  const transaction = {
    patientTherapy: {
      create: async ({ data }: { data: Record<string, any> }) => {
        writes += 1;
        return JSON.parse(
          JSON.stringify({ id: 'synthetic-therapy', ...data, schedules: data.schedules.create }),
        );
      },
    },
  } as unknown as Parameters<typeof createTherapyInTx>[0];
  try {
    const saved = await createTherapyInTx(transaction, 'synthetic-patient', input);
    assert.equal(writes, 1);
    assert.equal(saved.patientId, 'synthetic-patient');
    assert.equal(saved.pharmaceuticalForm, 'inalatore');
    assert.equal(saved.viaSomministrazione, 'inalatoria');
    assert.equal(saved.commercialStrengthValue, 100);
    assert.equal(saved.commercialStrengthUnit, 'mcg');
    assert.equal(saved.fasceMattina, true);
    assert.equal(saved.fasceSera, true);
    assert.equal(saved.orarioSpecifico, '08:00,20:00');
    assert.deepEqual(
      saved.schedules.map(
        ({ time, quantityNumerator, quantityDenominator, administrationUnit }) => ({
          time,
          quantityNumerator,
          quantityDenominator,
          administrationUnit,
        }),
      ),
      input.schedules,
    );
    assert.deepEqual(input, original);
  } finally {
    await prisma.$disconnect();
  }
});
