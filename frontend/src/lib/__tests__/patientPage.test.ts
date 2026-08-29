import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Paziente } from '../../types';
import {
  buildPatientPageUrl,
  fetchPatientById,
  fetchPatientPage,
  fetchPatientPageWithSummary,
  mergePatientPage,
} from '../patientPage';

function patient(id: string, lastName = id): Paziente {
  return {
    id,
    medicalRecordNumber: `MRN-${id}`,
    firstName: 'Mario',
    lastName,
    dateOfBirth: '1980-01-01',
    sex: 'M',
    email: null,
    phone: null,
  };
}

test('patient page URL sends only supported bounded filters', () => {
  assert.equal(
    buildPatientPageUrl('/api', { q: ' Rossi ', sex: 'F', cursor: 'opaque', limit: 50 }),
    '/api/patients/page?limit=50&q=Rossi&sex=F&cursor=opaque',
  );
  assert.equal(buildPatientPageUrl('', {}), '/patients/page?limit=50');
  assert.equal(buildPatientPageUrl('', { limit: 999 }), '/patients/page?limit=100');
});

test('patient page merge replaces on a new search and deduplicates appended rows', () => {
  assert.deepEqual(
    mergePatientPage([patient('1')], [patient('2')], false).map((p) => p.id),
    ['2'],
  );
  assert.deepEqual(
    mergePatientPage(
      [patient('1'), patient('2', 'old')],
      [patient('2', 'new'), patient('3')],
      true,
    ),
    [patient('1'), patient('2', 'new'), patient('3')],
  );
});

test('patient page orchestration requests summaries only for visible page IDs', async () => {
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith('/api/patients/page?')) {
      return new Response(
        JSON.stringify({ items: [patient('1'), patient('2')], hasMore: true, nextCursor: 'next' }),
      );
    }
    return new Response(JSON.stringify([{ patientId: '1' }, { patientId: '2' }]));
  }) as typeof fetch;

  const result = await fetchPatientPageWithSummary(
    '/api',
    { limit: 50, q: 'Rossi' },
    { headers: {}, fetcher },
  );
  assert.equal(result.page.items.length, 2);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /^\/api\/patients\/page\?limit=50&q=Rossi$/);
  assert.equal(calls[1], '/api/patients/clinical-summary?patientIds=1%2C2');
  assert.ok(calls.every((url) => url !== '/api/patients'));
  assert.ok(calls.every((url) => url !== '/api/patients/clinical-summary'));
});

test('targeted patient refresh never falls back to the legacy roster', async () => {
  let called = '';
  const fetcher = (async (input: string | URL | Request) => {
    called = String(input);
    return new Response(JSON.stringify(patient('patient/1')));
  }) as typeof fetch;
  await fetchPatientById('/api', 'patient/1', { headers: {}, fetcher });
  assert.equal(called, '/api/patients/patient%2F1');
  assert.notEqual(called, '/api/patients');
});

test('directory search is one bounded page request without clinical summary or roster fallback', async () => {
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({ items: [patient('1')], hasMore: false, nextCursor: null }),
    );
  }) as typeof fetch;
  const page = await fetchPatientPage('/api', { q: 'Rossi', limit: 6 }, { headers: {}, fetcher });
  assert.equal(page.items.length, 1);
  assert.deepEqual(calls, ['/api/patients/page?limit=6&q=Rossi']);
});
