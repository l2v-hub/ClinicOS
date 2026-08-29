import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import {
  correlate,
  getCrossPatientVitalSigns,
  searchClinicalSections,
  searchDocuments,
  searchPatients,
} from '../gateway/services.js';
import type { UserContext } from '../gateway/types.js';

const suffix = `gateway-${Date.now()}`;
const legacyId = `${suffix}-legacy`;
const relationalId = `${suffix}-relational`;
const otherId = `${suffix}-other`;
const patientIds = [legacyId, relationalId, otherId];

const globalContext: UserContext = {
  userId: 'gateway-integration-test',
  tenantId: 'clinicos',
  roles: ['manager'],
  permittedPatientIds: null,
  requestId: `${suffix}-request`,
};

before(async () => {
  await prisma.patient.createMany({
    data: [
      {
        id: legacyId,
        medicalRecordNumber: `${suffix}-mrn-legacy`,
        firstName: 'Giàcomo',
        lastName: 'Legacy',
        dateOfBirth: new Date('1950-01-01T00:00:00.000Z'),
      },
      {
        id: relationalId,
        medicalRecordNumber: `${suffix}-mrn-rel`,
        firstName: 'Maria',
        lastName: 'Relazionale',
        dateOfBirth: new Date('1960-01-01T00:00:00.000Z'),
        codiceFiscale: `${suffix}-canonical`,
      },
      {
        id: otherId,
        medicalRecordNumber: `${suffix}-mrn-other`,
        firstName: 'Luca',
        lastName: 'Altro',
        dateOfBirth: new Date('1970-01-01T00:00:00.000Z'),
      },
    ],
  });
  await prisma.cartella.create({
    data: {
      patientId: legacyId,
      data: {
        codiceFiscale: `${suffix}-legacy-cf`,
        allergie: [{ allergene: 'Caffè' }],
        terapie: [{ descrizione: 'Warfarìn', dataInizio: '2026-01-01' }],
        sensitiveNarrative: 'must never leave PostgreSQL during cross-patient vital search',
        parametriVitali: [
          {
            id: `${suffix}-vital`,
            etichetta: 'PA',
            valore: '170/95',
            rilevato: '2026-08-29',
            arbitraryPrivateField: 'must not be projected',
          },
          {
            id: `${suffix}-vital-2`,
            etichetta: 'PA',
            valore: '165/90',
            rilevato: '2026-08-28',
          },
        ],
      },
    },
  });
  await prisma.patientTherapy.create({
    data: {
      patientId: relationalId,
      farmacoNome: 'Metformìna',
      dosaggio: '500 mg',
      dataInizio: '2026-01-01',
    },
  });
  await prisma.patientNarrativeSection.create({
    data: {
      patientId: legacyId,
      sectionKey: 'ANAMNESIS',
      originalText: 'Il paziente beve caffè ogni mattina.',
    },
  });
  await prisma.patientDocument.create({
    data: {
      patientId: legacyId,
      originalName: 'Refèrto caffè.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1,
      sha256: `${suffix}-sha`,
      dataBase64: 'AA==',
      documentType: 'referto',
    },
  });
});

after(async () => {
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
  await prisma.$disconnect();
});

test('gateway SQL keeps legacy/relational filters, accents and ACL before limit', async () => {
  assert.deepEqual(
    (await searchPatients({ fiscalCode: `${suffix}-legacy-cf` }, globalContext)).map(
      (row) => row.patientId,
    ),
    [legacyId],
  );
  assert.deepEqual(
    (await searchPatients({ therapy: 'warfarin' }, globalContext)).map((row) => row.patientId),
    [legacyId],
  );
  assert.deepEqual(
    (await searchPatients({ therapy: 'metformina' }, globalContext)).map((row) => row.patientId),
    [relationalId],
  );
  assert.deepEqual(
    (await searchPatients({ allergy: 'caffe' }, globalContext)).map((row) => row.patientId),
    [legacyId],
  );
  const scoped = { ...globalContext, permittedPatientIds: [legacyId], requestId: `${suffix}-acl` };
  assert.deepEqual(await searchPatients({ therapy: 'metformina' }, scoped), []);
});

test('gateway narrative/document/correlation SQL is accent-insensitive and bounded', async () => {
  assert.deepEqual(
    (await searchClinicalSections({ query: 'caffe', limit: 5 }, globalContext)).map(
      (row) => row.patientId,
    ),
    [legacyId],
  );
  const documents = await searchDocuments({ query: 'referto', limit: 5 }, globalContext);
  assert.deepEqual(
    (documents.data as Array<{ patientId: string }>).map((row) => row.patientId),
    [legacyId],
  );
  assert.deepEqual(
    (await correlate({ therapy: 'warfarin', limit: 5 }, globalContext)).data.map(
      (row) => row.patientId,
    ),
    [legacyId],
  );
});

test('cross-vitals applies the patient ACL in SQL before the cap', async () => {
  const scoped = {
    ...globalContext,
    permittedPatientIds: [legacyId],
    requestId: `${suffix}-vitals`,
  };
  const result = await getCrossPatientVitalSigns(
    { label: 'PA', systolicMin: 151, patientLimit: 1, vitalLimitPerPatient: 1 },
    scoped,
    {
      AI_DEFAULT_TENANT: 'clinicos',
      AI_CROSS_PATIENT_SEARCH_ENABLED: 'true',
    },
  );
  assert.deepEqual(
    result.data.map((row) => row.patientId),
    [legacyId],
  );
  assert.ok(result.sourceRefs.every((source) => source.patientId === legacyId));
  assert.equal(result.data[0]?.vitals.length, 1);
  assert.equal(result.truncated, true);
  assert.deepEqual(Object.keys(result.data[0]?.vitals[0] ?? {}).sort(), [
    'etichetta',
    'id',
    'rilevato',
    'valore',
  ]);
});
