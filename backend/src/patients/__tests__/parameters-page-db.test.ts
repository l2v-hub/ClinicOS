import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { loadPatientParametersPage } from '../parameters-page.js';
import { savePatientParameterMonth } from '../parameters-update.js';

const suffix = `parameters-page-${Date.now()}`;
const firstId = `${suffix}-1`;
const secondId = `${suffix}-2`;

before(async () => {
  await prisma.patient.createMany({
    data: [
      {
        id: firstId,
        medicalRecordNumber: `${suffix}-MRN-1`,
        firstName: 'Giàcomo',
        lastName: 'Rossi',
        dateOfBirth: new Date('1950-01-01T00:00:00.000Z'),
      },
      {
        id: secondId,
        medicalRecordNumber: `${suffix}-MRN-2`,
        firstName: 'Maria',
        lastName: 'Verdi',
        dateOfBirth: new Date('1960-01-01T00:00:00.000Z'),
      },
    ],
  });
  await prisma.cartella.create({
    data: {
      patientId: firstId,
      data: {
        cameraNumero: 'CAM-42',
        lettoNumero: 'B',
        parametriMensili: [
          {
            id: 'month-aug-2026',
            mese: 8,
            anno: 2026,
            createdAt: '2026-08-01T00:00:00.000Z',
            giorni: [{ giorno: 29, spo2: '97', legacySecret: 'non trasferire' }],
          },
          {
            id: 'month-jul-2026',
            mese: 7,
            anno: 2026,
            createdAt: '2026-07-01T00:00:00.000Z',
            giorni: [{ giorno: 1, spo2: '96' }],
          },
        ],
        allergie: [{ allergene: 'dato che non deve uscire nella proiezione' }],
      },
    },
  });
});

after(async () => {
  await prisma.patient.deleteMany({ where: { id: { in: [firstId, secondId] } } });
  await prisma.$disconnect();
});

test('parameter page filters accents/room before limit and returns a minimal projection', async () => {
  const byName = await loadPatientParametersPage({
    q: 'giacomo',
    limit: '25',
    month: '8',
    year: '2026',
  });
  assert.deepEqual(
    byName.items.map((item) => item.patient.id),
    [firstId],
  );
  assert.deepEqual(byName.items[0].cartella.parametriMensili, [
    {
      id: 'month-aug-2026',
      mese: 8,
      anno: 2026,
      createdAt: '2026-08-01T00:00:00.000Z',
      giorni: [{ giorno: 29, spo2: '97' }],
    },
  ]);
  assert.equal(byName.items[0].cartella.cameraNumero, 'CAM-42');
  assert.equal('allergie' in byName.items[0].cartella, false);

  const byRoom = await loadPatientParametersPage({
    q: 'cam-42',
    limit: '25',
    month: '8',
    year: '2026',
  });
  assert.deepEqual(
    byRoom.items.map((item) => item.patient.id),
    [firstId],
  );

  const byFullName = await loadPatientParametersPage({
    q: 'Rossi Giacomo',
    limit: '25',
    month: '8',
    year: '2026',
  });
  assert.deepEqual(
    byFullName.items.map((item) => item.patient.id),
    [firstId],
  );
});

test('parameter page enforces its endpoint-specific maximum of 25', async () => {
  const page = await loadPatientParametersPage({
    q: suffix,
    limit: '100',
    month: '8',
    year: '2026',
  });
  assert.ok(page.items.length <= 25);
});

test('parameter PATCH merges days and preserves historical months and unrelated clinical data', async () => {
  const saved = await savePatientParameterMonth(
    firstId,
    {
      month: {
        id: 'month-aug-2026',
        mese: 8,
        anno: 2026,
        createdAt: '2026-08-01T00:00:00.000Z',
        giorni: [{ giorno: 30, temperatura: '36.7' }],
      },
    },
    'operator-verified',
  );
  assert.deepEqual(saved.giorni, [
    { giorno: 29, spo2: '97' },
    { giorno: 30, temperatura: '36.7', firmaIpM: 'operator-verified' },
  ]);
  const row = await prisma.cartella.findUniqueOrThrow({ where: { patientId: firstId } });
  const data = row.data as Record<string, unknown>;
  assert.deepEqual(data.allergie, [{ allergene: 'dato che non deve uscire nella proiezione' }]);
  assert.equal((data.parametriMensili as unknown[]).length, 2);
});
