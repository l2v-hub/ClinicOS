import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Paziente } from '../../types';
import {
  buildPatientParametersPageUrl,
  fetchPatientParametersPage,
  mergePatientParametersPage,
  savePatientParameterMonth,
  type PatientParametersPageItem,
} from '../patientParametersPage';

function item(id: string): PatientParametersPageItem {
  const patient: Paziente = {
    id,
    medicalRecordNumber: `MRN-${id}`,
    firstName: 'Mario',
    lastName: id,
    dateOfBirth: '1980-01-01',
    sex: 'M',
    email: null,
    phone: null,
  };
  return { patient, cartella: { pazienteId: id, parametriMensili: [] } };
}

test('parameters page URL clamps to 25 and binds query/cursor', () => {
  assert.equal(
    buildPatientParametersPageUrl('/api', {
      q: ' Rossi ',
      cursor: 'next',
      limit: 500,
      month: 8,
      year: 2026,
    }),
    '/api/patients/parameters/page?limit=25&month=8&year=2026&q=Rossi&cursor=next',
  );
});

test('parameters page validates its bounded response and merges by patient id', async () => {
  let called = '';
  const fetcher = (async (input: string | URL | Request) => {
    called = String(input);
    return new Response(JSON.stringify({ items: [item('2')], hasMore: false, nextCursor: null }));
  }) as typeof fetch;
  const page = await fetchPatientParametersPage(
    '/api',
    { limit: 25, month: 8, year: 2026 },
    { headers: {}, fetcher },
  );
  assert.equal(called, '/api/patients/parameters/page?limit=25&month=8&year=2026');
  assert.deepEqual(
    mergePatientParametersPage([item('1'), item('2')], page.items, true).map(
      (entry) => entry.patient.id,
    ),
    ['1', '2'],
  );
});

test('parameter save uses an encoded id and the bounded PATCH contract', async () => {
  let input = '';
  let init: RequestInit | undefined;
  const month = {
    id: 'month-1',
    mese: 8,
    anno: 2026,
    giorni: [{ giorno: 29, spo2: '97' }],
    createdAt: '2026-08-29T00:00:00.000Z',
  };
  const fetcher = (async (url: string | URL | Request, requestInit?: RequestInit) => {
    input = String(url);
    init = requestInit;
    return new Response(JSON.stringify({ month }));
  }) as typeof fetch;
  const saved = await savePatientParameterMonth('/api', 'patient/1', month, {
    headers: { Authorization: 'Bearer test' },
    fetcher,
  });
  assert.equal(input, '/api/patients/patient%2F1/parameters');
  assert.equal(init?.method, 'PATCH');
  assert.deepEqual(JSON.parse(String(init?.body)), { month });
  assert.deepEqual(saved, month);
});
