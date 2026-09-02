import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Paziente } from '../../types';
import {
  buildPatientPageUrl,
  buildPatientPageRequest,
  fetchPatientById,
  fetchPatientPage,
  fetchPatientPageWithSummary,
  mergePatientPage,
} from '../patientPage';

function patient(id: string, lastName = id): Paziente {
  return {
    id,
    medicalRecordNumber: `MRN-${id}`,
    codiceFiscale: 'RSSMRA80A01H501U',
    firstName: 'Mario',
    lastName,
    dateOfBirth: '1980-01-01',
    sex: 'M',
    email: null,
    phone: null,
  };
}

test('patient page URL sends only non-identifying bounded filters', () => {
  assert.equal(
    buildPatientPageUrl('/api', { q: ' Rossi ', sex: 'F', cursor: 'opaque', limit: 50 }),
    '/api/patients/page?limit=50&sex=F&cursor=opaque',
  );
  assert.equal(buildPatientPageUrl('', {}), '/patients/page?limit=50');
  assert.equal(buildPatientPageUrl('', { limit: 999 }), '/patients/page?limit=100');
  assert.equal(
    buildPatientPageUrl('/api', { q: 'RSSMRA80A01H501U' }),
    '/api/patients/page?limit=50',
  );
});

test('patient search keeps fiscal identity and names out of the URL', () => {
  const request = buildPatientPageRequest('/api', {
    q: ' RSSMRA80A01H501U ',
    sex: 'F',
    cursor: 'opaque',
    limit: 999,
  });
  assert.equal(request.url, '/api/patients/page/search');
  assert.equal(request.init.method, 'POST');
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    q: 'RSSMRA80A01H501U',
    limit: '100',
    sex: 'F',
    cursor: 'opaque',
  });
  assert.ok(!request.url.includes('RSSMRA80A01H501U'));
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
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const controller = new AbortController();
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === '/api/patients/page/search') {
      return new Response(
        JSON.stringify({ items: [patient('1'), patient('2')], hasMore: true, nextCursor: 'next' }),
      );
    }
    return new Response(JSON.stringify([{ patientId: '1' }, { patientId: '2' }]));
  }) as typeof fetch;

  const result = await fetchPatientPageWithSummary(
    '/api',
    { limit: 50, q: 'Rossi', sex: 'F', cursor: 'opaque' },
    { headers: { Authorization: 'Bearer verified' }, signal: controller.signal, fetcher },
  );
  assert.equal(result.page.items.length, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, '/api/patients/page/search');
  assert.equal(calls[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    q: 'Rossi',
    limit: '50',
    sex: 'F',
    cursor: 'opaque',
  });
  assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), 'Bearer verified');
  assert.equal(new Headers(calls[0].init?.headers).get('Content-Type'), 'application/json');
  assert.equal(calls[0].init?.signal, controller.signal);
  assert.equal(calls[1].url, '/api/patients/clinical-summary?patientIds=1%2C2');
  assert.ok(calls.every(({ url }) => url !== '/api/patients'));
  assert.ok(calls.every(({ url }) => url !== '/api/patients/clinical-summary'));
});

test('blank directory query uses GET and never emits a q parameter', async () => {
  let call: { url: string; init?: RequestInit } | undefined;
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    call = { url: String(input), init };
    return new Response(JSON.stringify({ items: [], hasMore: false, nextCursor: null }));
  }) as typeof fetch;
  await fetchPatientPage('/api', { q: '   ', sex: 'M', limit: 10 }, { headers: {}, fetcher });
  assert.equal(call?.url, '/api/patients/page?limit=10&sex=M');
  assert.equal(call?.init?.method, undefined);
  assert.ok(!call?.url.includes('q='));
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
  assert.deepEqual(calls, ['/api/patients/page/search']);
});
