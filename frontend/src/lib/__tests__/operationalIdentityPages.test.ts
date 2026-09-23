import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchPatientPage, mergePatientPage } from '../patientPage';
import { fetchPatientParametersPage, mergePatientParametersPage } from '../patientParametersPage';
import { mergeTherapySlotPages, parseTherapySlotPage } from '../therapySlotPage';
import { mergeConsegnaPage } from '../consegneFeed';
import {
  identityPatient,
  identityHomonym,
  identityHandover,
  identityTherapySlot,
} from '../../components/operator/__tests__/operationalIdentity.fixtures';

test('patient page keeps identity projection with one bounded request and preserves it when merged', async () => {
  const requests: string[] = [];
  const page = await fetchPatientPage(
    '/api',
    { q: 'Rossi', limit: 8 },
    {
      headers: {},
      fetcher: (async (input, init) => {
        requests.push(String(input));
        assert.equal(init?.method, 'POST');
        assert.deepEqual(JSON.parse(String(init?.body)), { q: 'Rossi', limit: '8' });
        return new Response(
          JSON.stringify({ items: [identityPatient], hasMore: false, nextCursor: null }),
        );
      }) as typeof fetch,
    },
  );
  assert.deepEqual(requests, ['/api/patients/page/search']);
  assert.deepEqual(page.items[0].location, identityPatient.location);
  const updated = { ...identityPatient, location: identityHomonym.location };
  assert.deepEqual(mergePatientPage(page.items, [updated], true), [updated]);
});

test('parameter page projection survives fetching and identity refresh without chart requests', async () => {
  let requests = 0;
  const item = {
    patient: identityPatient,
    cartella: { pazienteId: identityPatient.id, parametriMensili: [] },
  };
  const page = await fetchPatientParametersPage(
    '/api',
    { date: '2026-09-23', view: 'entry' },
    {
      headers: {},
      fetcher: (async (input) => {
        requests++;
        assert.match(String(input), /\/patients\/parameters\/page\?limit=25/);
        return new Response(JSON.stringify({ items: [item], hasMore: false, nextCursor: null }));
      }) as typeof fetch,
    },
  );
  assert.equal(requests, 1);
  assert.deepEqual(page.items[0].patient, identityPatient);
  const updated = { ...item, patient: { ...identityPatient, location: identityHomonym.location } };
  assert.deepEqual(mergePatientParametersPage(page.items, [updated], true), [updated]);
});

const pageInfo = {
  hasMore: false,
  nextCursor: null,
  loadedTherapies: 2,
  completeness: 'complete',
  summaryExact: true,
};
test('therapy parser and merge preserve identity and date context without changing clinical payloads or totals', () => {
  const page = parseTherapySlotPage({ slots: [identityTherapySlot], pageInfo });
  const patient = page.slots[0].patients[0];
  assert.equal(patient.codiceFiscale, identityPatient.codiceFiscale);
  assert.equal(patient.dateOfBirth, identityPatient.dateOfBirth);
  assert.deepEqual(patient.location, identityPatient.location);
  assert.deepEqual(patient.administrations, identityTherapySlot.patients[0].administrations);
  const incoming = {
    ...page.slots[0],
    summary: { total: 99, administered: 0, notAdministered: 0, pending: 99 },
    patients: [{ ...patient, location: { ...identityHomonym.location!, asOf: '2026-09-22' } }],
  };
  const merged = mergeTherapySlotPages(page.slots, [incoming]);
  assert.equal(merged[0].summary.total, 2);
  assert.equal(merged[0].patients[0].location?.asOf, '2026-09-22');
  assert.equal(merged[0].patients.length, 2);
  assert.deepEqual(merged[0].patients[0].administrations, patient.administrations);
});

test('missing therapy projection is unavailable even when compatibility aliases contain stale labels', () => {
  const slot = {
    ...identityTherapySlot,
    patients: identityTherapySlot.patients.map((patient) => ({ ...patient, location: undefined })),
  };
  const parsed = parseTherapySlotPage({ slots: [slot], pageInfo });
  assert.equal(parsed.slots[0].patients[0].location, null);
});

test('handover page refresh can revoke identity without dropping the authorized handover name', () => {
  const revoked = { ...identityHandover, identity: null };
  assert.deepEqual(mergeConsegnaPage([identityHandover], [revoked], true), [revoked]);
});
