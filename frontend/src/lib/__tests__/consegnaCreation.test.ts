import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConsegna, createConsegnaRequest } from '../consegnaCreation';
import { fetchConsegnePatientSummary } from '../consegnePatientSummary';
import { buildPatientPageRequest } from '../patientPage';
import { input, record } from './consegnaGiro.fixtures';
const response = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

test('new request freezes normalized clinical body and contains no supplied authority or status fields', () => {
  const request = createConsegnaRequest({
    ...input,
    note: '  Nota sintetica  ',
    stato: 'completata',
    operatorId: 'other',
  } as typeof input);
  assert.equal(request.note, 'Nota sintetica');
  assert.ok(Object.isFrozen(request));
  assert.match(request.requestId, /^[A-Za-z0-9_-]{1,128}$/);
  assert.ok(!('stato' in request));
  assert.ok(!('operatorId' in request));
  for (const patch of [
    { note: '' },
    { scadenza: '2026-02-29' },
    { oraScadenza: '99:00' },
    { pazienteId: '../other' },
    { operatoreAssegnatoId: '../other' },
  ])
    assert.throws(() => createConsegnaRequest({ ...input, ...patch }));
});

test('validated creation/replay preserves current edited record and never restores original payload', async () => {
  const request = createConsegnaRequest(input);
  const created = await createConsegna('/api', request, {
    headers: {},
    fetcher: response({ ...record(request), requestId: request.requestId, replayed: false }),
  });
  assert.equal(created.kind, 'saved');
  const replay = await createConsegna('/api', request, {
    headers: {},
    fetcher: response({
      ...record(request),
      note: 'Modifica successiva',
      stato: 'completata',
      replayed: true,
    }),
  });
  assert.equal(replay.kind, 'saved');
  if (replay.kind === 'saved') {
    assert.equal(replay.record.note, 'Modifica successiva');
    assert.equal(replay.record.stato, 'completata');
  }
});

test('wrong patient/request, malformed success and a new completed record remain uncertain', async () => {
  const request = createConsegnaRequest(input);
  for (const patch of [
    { pazienteId: 'other' },
    { requestId: 'other' },
    { replayed: undefined },
    { id: null },
    { stato: 'completata' },
  ]) {
    const result = await createConsegna('/api', request, {
      headers: {},
      fetcher: response({ ...record(request), replayed: false, ...patch }),
    });
    assert.equal(result.kind, 'failed');
    if (result.kind === 'failed') assert.equal(result.uncertain, true);
  }
});

test('response loss retries exactly the same body/key and HTTP transport does not cache creation', async () => {
  const request = createConsegnaRequest(input);
  const calls: RequestInit[] = [];
  const fetcher = (async (_url, init) => {
    calls.push(init!);
    if (calls.length === 1) throw new Error('lost response');
    return new Response(JSON.stringify({ ...record(request), replayed: true }));
  }) as typeof fetch;
  const first = await createConsegna('/api', request, {
    headers: { Authorization: 'synthetic' },
    fetcher,
  });
  assert.equal(first.kind, 'failed');
  assert.equal(
    (await createConsegna('/api', request, { headers: { Authorization: 'synthetic' }, fetcher }))
      .kind,
    'saved',
  );
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls[0].cache, 'no-store');
  assert.equal(new Headers(calls[0].headers).get('Authorization'), 'synthetic');
});

test('conflict, unavailable patient and valid deleted receipt are explicit non-advance outcomes', async () => {
  const request = createConsegnaRequest(input);
  for (const [status, body] of [
    [409, { code: 'consegna_request_conflict' }],
    [404, { code: 'patient_not_found' }],
    [
      410,
      {
        code: 'consegna_creation_deleted',
        requestId: request.requestId,
        pazienteId: request.pazienteId,
        consegnaId: 'old-consegna',
      },
    ],
  ] as const) {
    const result = await createConsegna('/api', request, {
      headers: {},
      fetcher: response(body, status),
    });
    assert.equal(result.kind, 'failed');
    if (result.kind === 'failed') assert.equal(result.uncertain, false);
  }
  const invalid = await createConsegna('/api', request, {
    headers: {},
    fetcher: response({ code: 'consegna_creation_deleted', requestId: 'other' }, 410),
  });
  assert.equal(invalid.kind, 'failed');
  if (invalid.kind === 'failed') assert.equal(invalid.uncertain, true);
});

test('bounded summaries preserve omitted IDs as unavailable and distinguish zero from historical-only', async () => {
  const summaries = await fetchConsegnePatientSummary('/api', ['zero', 'history', 'omitted'], {
    headers: {},
    fetcher: response({
      items: [
        { patientId: 'zero', total: 0, open: 0, urgentOpen: 0, statoRicovero: null },
        { patientId: 'history', total: 3, open: 0, urgentOpen: 0, statoRicovero: 'dimesso' },
      ],
    }),
  });
  assert.deepEqual(
    summaries.map((row) => row.patientId),
    ['zero', 'history'],
  );
  await assert.rejects(
    fetchConsegnePatientSummary(
      '/api',
      Array.from({ length: 51 }, (_, i) => String(i)),
      { headers: {} },
    ),
  );
  await assert.rejects(
    fetchConsegnePatientSummary('/api', ['a'], {
      headers: {},
      fetcher: response({
        items: [{ patientId: 'other', total: 0, open: 0, urgentOpen: 0, statoRicovero: null }],
      }),
    }),
  );
});

test('room filter travels in both bounded identity routes and name search stays POST', () => {
  const direct = buildPatientPageRequest('/api', {
    room: ' 10A ',
    limit: 50,
    sort: 'location',
    direction: 'desc',
  });
  assert.match(direct.url, /room=10A/);
  const search = buildPatientPageRequest('/api', {
    q: 'Nome sintetico',
    room: ' 10A ',
    cursor: 'opaque',
    asOf: '2026-09-23',
  });
  assert.equal(search.url, '/api/patients/page/search');
  assert.equal(search.init.method, 'POST');
  assert.equal(JSON.parse(String(search.init.body)).room, '10A');
});
