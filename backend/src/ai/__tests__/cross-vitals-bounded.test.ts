import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCrossPatientVitals, type CrossVitalsReaders } from '../gateway/cross-vitals.js';
import type { UserContext } from '../gateway/types.js';

const env = {
  AI_DEFAULT_TENANT: 'clinicos',
  AI_CROSS_PATIENT_SEARCH_ENABLED: 'true',
} as NodeJS.ProcessEnv;

const context = (permittedPatientIds: string[] | null): UserContext => ({
  userId: 'manager-1',
  tenantId: 'clinicos',
  roles: ['manager'],
  permittedPatientIds,
  requestId: 'cross-vitals-test',
});

test('cross-vitals applies ACL before cap and performs two bounded reads', async () => {
  const authorizedId = 'z-authorized';
  let patientReads = 0;
  let cartellaReads = 0;
  const readers: CrossVitalsReaders = {
    async findPatients(input) {
      patientReads++;
      assert.deepEqual(input.permittedPatientIds, [authorizedId]);
      assert.equal(input.limit, 101);
      const allPatients = [
        ...Array.from({ length: 100 }, (_, index) => ({ id: `a-denied-${index}` })),
        { id: authorizedId },
      ];
      return allPatients
        .filter((patient) => input.permittedPatientIds?.includes(patient.id) ?? true)
        .slice(0, input.limit);
    },
    async findCartelle(patientIds) {
      cartellaReads++;
      assert.deepEqual(patientIds, [authorizedId]);
      return [
        {
          id: 'chart-1',
          patientId: authorizedId,
          data: {
            parametriVitali: [
              { id: 'vital-1', etichetta: 'PA', valore: '170/95', rilevato: '2026-08-29' },
            ],
          },
        },
      ];
    },
  };

  const result = await searchCrossPatientVitals(
    { label: 'PA', systolicMin: 151 },
    context([authorizedId]),
    readers,
    env,
  );

  assert.equal(patientReads, 1);
  assert.equal(cartellaReads, 1);
  assert.deepEqual(
    result.data.map((row) => row.patientId),
    [authorizedId],
  );
  assert.deepEqual(
    result.sourceRefs.map((source) => source.patientId),
    [authorizedId],
  );
  assert.equal(result.truncated, false);
});

test('cross-vitals keeps deterministic order and bounds results and nested vitals', async () => {
  const readers: CrossVitalsReaders = {
    async findPatients() {
      return [{ id: 'p-3' }, { id: 'p-1' }, { id: 'p-2' }];
    },
    async findCartelle(patientIds) {
      return patientIds.map((patientId) => ({
        id: `chart-${patientId}`,
        patientId,
        data: {
          parametriVitali: [
            { id: `${patientId}-1`, etichetta: 'PA', valore: '180/100' },
            { id: `${patientId}-2`, etichetta: 'PA', valore: '170/95' },
          ],
        },
      }));
    },
  };

  const result = await searchCrossPatientVitals(
    { label: 'PA', systolicMin: 151, resultLimit: 2, vitalLimitPerPatient: 1 },
    context(null),
    readers,
    env,
  );

  assert.deepEqual(
    result.data.map((row) => row.patientId),
    ['p-1', 'p-2'],
  );
  assert.ok(result.data.every((row) => row.vitals.length === 1));
  assert.equal(result.sourceRefs.length, 2);
  assert.equal(result.truncated, true);
});

test('cross-vitals defensively excludes rows outside the signed patient scope', async () => {
  const readers: CrossVitalsReaders = {
    async findPatients() {
      return [{ id: 'allowed' }, { id: 'denied' }];
    },
    async findCartelle(patientIds) {
      assert.deepEqual(patientIds, ['allowed']);
      return [
        {
          id: 'chart-allowed',
          patientId: 'allowed',
          data: { parametriVitali: [{ etichetta: 'PA', valore: '170/95' }] },
        },
        {
          id: 'chart-denied',
          patientId: 'denied',
          data: { parametriVitali: [{ etichetta: 'PA', valore: '190/110' }] },
        },
      ];
    },
  };

  const result = await searchCrossPatientVitals(
    { label: 'PA', systolicMin: 151 },
    context(['allowed']),
    readers,
    env,
  );
  assert.deepEqual(
    result.data.map((row) => row.patientId),
    ['allowed'],
  );
  assert.ok(result.sourceRefs.every((source) => source.patientId === 'allowed'));
});

test('cross-vitals tolerates malformed legacy vital arrays and uses look-ahead truncation', async () => {
  const readers: CrossVitalsReaders = {
    async findPatients(input) {
      assert.equal(input.limit, 3);
      return [{ id: 'p-1' }, { id: 'p-2' }, { id: 'p-3' }];
    },
    async findCartelle(patientIds) {
      return patientIds.map((patientId) => ({
        id: `chart-${patientId}`,
        patientId,
        data: { parametriVitali: patientId === 'p-1' ? 'legacy-invalid' : [] },
      }));
    },
  };

  const result = await searchCrossPatientVitals(
    { label: 'PA', systolicMin: 151, patientLimit: 2 },
    context(null),
    readers,
    env,
  );
  assert.deepEqual(result.data, []);
  assert.equal(result.truncated, true);
});

test('cross-vitals denies unprivileged callers before any read', async () => {
  let reads = 0;
  const readers: CrossVitalsReaders = {
    async findPatients() {
      reads++;
      return [];
    },
    async findCartelle() {
      reads++;
      return [];
    },
  };

  await assert.rejects(
    () =>
      searchCrossPatientVitals(
        { label: 'PA', systolicMin: 151 },
        { ...context(null), roles: ['operatore'] },
        readers,
        env,
      ),
    /disabled/i,
  );
  assert.equal(reads, 0);
});

test('cross-vitals returns early for an empty ACL and requires the environment gate', async () => {
  let reads = 0;
  const readers: CrossVitalsReaders = {
    async findPatients() {
      reads++;
      return [];
    },
    async findCartelle() {
      reads++;
      return [];
    },
  };

  const empty = await searchCrossPatientVitals(
    { label: 'PA', systolicMin: 151 },
    context([]),
    readers,
    env,
  );
  assert.deepEqual(empty.data, []);
  assert.equal(reads, 0);

  await assert.rejects(
    () =>
      searchCrossPatientVitals({ label: 'PA', systolicMin: 151 }, context(null), readers, {
        ...env,
        AI_CROSS_PATIENT_SEARCH_ENABLED: 'false',
      }),
    /disabled/i,
  );
  assert.equal(reads, 0);
});
