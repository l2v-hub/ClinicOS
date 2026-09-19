import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CartellaPaziente } from '../../types';
import {
  createParameterReadingRequest,
  parameterValuesError,
  saveParameterReading,
  ParameterReadingSaveError,
  readingTime,
  legacyParameterEntries,
  fetchParameterReadings,
} from '../patientParameterReadings';
import { buildPatientParametersPageUrl } from '../patientParametersPage';

test('new readings require measured values; preserve exact time and independent request identities', () => {
  assert.ok(parameterValuesError({}));
  assert.ok(parameterValuesError({ note: 'nota' }));
  assert.ok(parameterValuesError({ pa: '120' }));
  assert.ok(parameterValuesError({ spo2: '101' }));
  assert.ok(parameterValuesError({ fc: '-10' }));
  assert.equal(parameterValuesError({ temperatura: '36,5', pa: '120/80' }), null);
  const a = createParameterReadingRequest(
    { temperatura: ' 36,5 ', note: '' },
    new Date('2026-09-19T08:32:45.100Z'),
  );
  const b = createParameterReadingRequest(a.values, new Date(a.measuredAt));
  assert.notEqual(a.requestId, b.requestId);
  assert.equal(a.measuredAt, '2026-09-19T08:32:45.100Z');
  assert.deepEqual(a.values, { temperatura: '36,5' });
  assert.equal(readingTime(a.measuredAt), '19/09/2026 10:32');
});

test('network retry submits the same immutable request; no whole month PATCH', async () => {
  const request = createParameterReadingRequest({ fc: '72' });
  const bodies: string[] = [];
  let fail = true;
  const fetcher = (async (url, init) => {
    assert.equal(url, '/api/patients/p1/parameter-readings');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('x-operator-id'), 'op');
    bodies.push(String(init?.body));
    if (fail) {
      fail = false;
      throw new Error('disconnected after commit');
    }
    return Response.json({
      reading: { ...request, id: 'persisted', patientId: 'p1' },
      summary: { date: '2026-09-19', count: 1, lastReadingAt: request.measuredAt },
    });
  }) as typeof fetch;
  await assert.rejects(
    () =>
      saveParameterReading('/api', 'p1', request, { headers: { 'x-operator-id': 'op' }, fetcher }),
    (e) => e instanceof ParameterReadingSaveError && e.uncertain,
  );
  assert.equal(
    (
      await saveParameterReading('/api', 'p1', request, {
        headers: { 'x-operator-id': 'op' },
        fetcher,
      })
    ).reading.id,
    'persisted',
  );
  assert.equal(bodies[0], bodies[1]);
});

test('validation failures allow correction, server/parse/conflict failures retain retry identity', async () => {
  const request = createParameterReadingRequest({ fc: '80' });
  for (const [status, uncertain] of [
    [400, false],
    [403, false],
    [409, true],
    [500, true],
  ] as const) {
    await assert.rejects(
      () =>
        saveParameterReading('', 'p1', request, {
          headers: {},
          fetcher: (async () => Response.json({ error: 'rejected' }, { status })) as typeof fetch,
        }),
      (e) => e instanceof ParameterReadingSaveError && e.uncertain === uncertain,
    );
  }
  await assert.rejects(
    () =>
      saveParameterReading('', 'p1', request, {
        headers: {},
        fetcher: (async () =>
          Response.json({
            reading: { id: 'wrong', patientId: 'other', requestId: request.requestId },
          })) as typeof fetch,
      }),
    (e) => e instanceof ParameterReadingSaveError && e.uncertain,
  );
});

test('legacy history preserves multiple DTX, notes and explicit missing-time labels', () => {
  const chart = {
    parametriMensili: [
      {
        id: 'm1',
        anno: 2026,
        mese: 9,
        giorni: [
          {
            giorno: 18,
            dtx08: '90',
            dtx12: '110',
            dtx18: '100',
            note: 'nota',
            firmaIpM: 'Operatore sintetico',
          },
        ],
      },
    ],
    parametriVitali: [
      { id: 'old-date', rilevato: '2026-09-17', etichetta: 'PA', valore: '120/80', unita: 'mmHg' },
      { id: 'instant', rilevato: '2026-09-19T08:30:00.000Z', etichetta: 'FC', valore: '72' },
      { id: 'missing', rilevato: '', etichetta: 'TC', valore: '36.5' },
    ],
  } as CartellaPaziente;
  const entries = legacyParameterEntries(chart);
  assert.equal(entries[0].time, '10:30');
  assert.equal(entries[1].date, '2026-09-18');
  assert.equal(entries[1].time, 'Orario non disponibile');
  assert.match(entries[1].values, /DTX 12: 110/);
  assert.match(entries[1].values, /DTX 18: 100/);
  assert.equal(entries[2].time, 'Orario non disponibile');
  assert.equal(entries[3].date, '');
});

test('history fetch and entry page pass date and cursor with bounded limit and abort signal', async () => {
  const controller = new AbortController();
  const result = await fetchParameterReadings(
    '/api',
    'patient/a',
    { date: '2026-09-19', cursor: 'abc' },
    {
      headers: {},
      signal: controller.signal,
      fetcher: (async (url, init) => {
        assert.equal(
          String(url),
          '/api/patients/patient%2Fa/parameter-readings?limit=50&date=2026-09-19&cursor=abc',
        );
        assert.equal(init?.signal, controller.signal);
        assert.equal(init?.cache, 'no-store');
        return Response.json({ readings: [], hasMore: false, nextCursor: null });
      }) as typeof fetch,
    },
  );
  assert.equal(result.hasMore, false);
  assert.match(
    buildPatientParametersPageUrl('/api', { month: 9, year: 2026, date: '2026-09-19' }),
    /date=2026-09-19/,
  );
});
