import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PatientParameterReading } from '../patientParameterReadings';
import {
  trendNumericValues,
  buildTrendSeries,
  trendPeriodError,
  trendMonths,
  trendPreset,
  trendTimeDomain,
  trendPointTime,
  trendValueDomain,
} from '../patientParameterTrends';
import { loadPatientParameterTrends } from '../loadPatientParameterTrends';

const row = (
  id: string,
  measuredAt = '2026-09-20T08:00:00.000Z',
  values = { fc: '72' },
): PatientParameterReading => ({
  id,
  patientId: 'synthetic-patient',
  requestId: id,
  measuredAt,
  values,
  authorName: 'Operatore test',
  authorOperatorId: 'synthetic-operator',
  createdAt: measuredAt,
});
const period = { start: '2026-09-01', end: '2026-09-30' };
const page = (readings: PatientParameterReading[], nextCursor: string | null = null) => ({
  readings,
  hasMore: nextCursor !== null,
  nextCursor,
});
const load = (fetcher: typeof fetch, range = period, signal = new AbortController().signal) =>
  loadPatientParameterTrends('/api', 'synthetic-patient', range, {
    headers: { 'x-operator-id': 'test' },
    signal,
    fetcher,
  });

test('strict parsers preserve zero, decimal commas and pressure pairs without coercing text', () => {
  assert.deepEqual(trendNumericValues('pa', ' 120 / 80 '), [120, 80]);
  assert.deepEqual(trendNumericValues('temperatura', '36,55'), [36.55]);
  assert.deepEqual(trendNumericValues('dtx', '0'), [0]);
  assert.deepEqual(trendNumericValues('spo2', '100'), [100]);
  for (const value of ['', ' ', null, 0, '72bpm', 'NaN', 'Infinity', '-2', '1e2', '72.555'])
    assert.equal(trendNumericValues('fc', value), null);
  assert.equal(trendNumericValues('spo2', '101'), null);
  assert.equal(trendNumericValues('pa', '120'), null);
});
test('series retain independent same-time records, PA components, originals, and gaps', () => {
  const readings = [
    row('a', undefined, { pa: '120/80' } as never),
    row('b', undefined, { pa: '130/85' } as never),
    row('c'),
    row('d', undefined, { pa: 'testo' } as never),
  ];
  const result = buildTrendSeries(readings, 'pa');
  assert.deepEqual(
    result.series.map((s) => s.points.map((p) => p?.value ?? null)),
    [
      [120, 130, null, null],
      [80, 85, null, null],
    ],
  );
  assert.equal(result.series[0].points[0]?.original, '120/80');
  assert.equal(result.series[0].points[0]?.timestamp, result.series[0].points[1]?.timestamp);
  assert.notEqual(result.series[0].points[0]?.id, result.series[0].points[1]?.id);
  assert.equal(result.invalid, 1);
  const [min, max] = trendValueDomain([
    buildTrendSeries([row('zero', undefined, { fc: '0' })], 'fc').series[0].points[0]!,
  ]);
  assert.equal(min, 0);
  assert.ok(max > min);
});
test('periods validate civil dates and explicit maximum, enumerate months and cross leap/year boundaries', () => {
  assert.equal(trendPeriodError({ start: '2024-02-29', end: '2024-02-29' }), null);
  assert.ok(trendPeriodError({ start: '2026-02-30', end: '2026-03-01' }));
  assert.ok(trendPeriodError({ start: '2026-09-02', end: '2026-09-01' }));
  assert.ok(trendPeriodError({ start: '2025-01-01', end: '2026-01-02' }));
  assert.equal(trendPeriodError({ start: '2025-01-01', end: '2026-01-01' }), null);
  assert.deepEqual(trendPreset(7, '2027-01-03'), { start: '2026-12-28', end: '2027-01-03' });
  assert.deepEqual(trendMonths({ start: '2026-12-31', end: '2027-02-01' }), [
    '2026-12',
    '2027-01',
    '2027-02',
  ]);
});
test('time domain follows Rome civil days over 23/25-hour DST and detail distinguishes repeated local hours', () => {
  const spring = trendTimeDomain({ start: '2026-03-29', end: '2026-03-29' });
  const autumn = trendTimeDomain({ start: '2026-10-25', end: '2026-10-25' });
  assert.equal(spring[1] - spring[0], 23 * 3600000);
  assert.equal(autumn[1] - autumn[0], 25 * 3600000);
  assert.equal(new Date(spring[0]).toISOString(), '2026-03-28T23:00:00.000Z');
  assert.match(trendPointTime('2026-10-25T00:30:00.000Z'), /02:30:00.*GMT\+2/);
  assert.match(trendPointTime('2026-10-25T01:30:00.000Z'), /02:30:00.*GMT\+1/);
});
test('loads all pages and months, keeps auth/signal, deduplicates only ids and filters inclusive Rome dates', async () => {
  const september = Array.from({ length: 50 }, (_, i) => row(`s${i}`));
  const boundary = row('boundary', '2026-09-30T22:30:00.000Z'); // October1 in Rome
  const requests: string[] = [];
  const signal = new AbortController().signal;
  const readings = await load(
    (async (url, init) => {
      const params = new URL(String(url), 'http://fixture').searchParams;
      assert.equal(new Headers(init?.headers).get('x-operator-id'), 'test');
      assert.equal(init?.signal, signal);
      assert.equal(init?.cache, 'no-store');
      assert.equal(params.get('limit'), '50');
      requests.push(`${params.get('month')}:${params.get('cursor')}`);
      if (params.get('month') === '2026-09')
        return Response.json(
          params.has('cursor') ? page([september[49], row('s50')]) : page(september, 'next'),
        );
      return Response.json(page([boundary, row('outside', '2026-10-01T22:01:00.000Z')]));
    }) as typeof fetch,
    { start: '2026-09-20', end: '2026-10-01' },
    signal,
  );
  assert.deepEqual(requests, ['2026-09:null', '2026-09:next', '2026-10:null']);
  assert.equal(readings.length, 52);
  assert.equal(readings.at(-1)?.id, 'boundary');
  assert.equal(new Set(readings.map((r) => r.id)).size, 52);
});
test('later-page failure rejects the whole range instead of returning partial data', async () => {
  let calls = 0;
  await assert.rejects(
    load((async () =>
      ++calls === 1
        ? Response.json(page([row('a')], 'next'))
        : Response.json({ error: 'failure' }, { status: 500 })) as typeof fetch),
  );
  assert.equal(calls, 2);
});
test('rejects cross-patient, malformed instant, wrong month, invalid values shape and conflicting duplicate', async () => {
  for (const patch of [
    { patientId: 'other' },
    { measuredAt: '2026-09-20' },
    { measuredAt: '2026-09-31T08:00:00.000Z' },
    { measuredAt: '2026-10-01T08:00:00.000Z' },
    { values: null },
    { values: { fc: 72 } },
    { authorName: null },
  ]) {
    await assert.rejects(
      load((async () =>
        Response.json(
          page([{ ...row('a'), ...patch } as PatientParameterReading]),
        )) as typeof fetch),
    );
  }
  await assert.rejects(
    load((async () =>
      Response.json(page([row('a'), row('a', undefined, { fc: '90' })]))) as typeof fetch),
  );
});
test('rejects cursor cycles, empty progress, hasMore inconsistency and oversized pages', async () => {
  for (const response of [
    { ...page([row('a')]), hasMore: true },
    { ...page([row('a')]), nextCursor: 'next' },
    page([], 'next'),
    page(Array.from({ length: 51 }, (_, i) => row(String(i)))),
  ]) {
    await assert.rejects(load((async () => Response.json(response)) as typeof fetch));
  }
  let calls = 0;
  await assert.rejects(
    load((async () => Response.json(page([row(String(++calls))], 'cycle'))) as typeof fetch),
  );
  assert.equal(calls, 2);
});
test('abort before/during loading cannot return old patient data or request another page', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    load(
      (async () => {
        calls++;
        controller.abort();
        return Response.json(page([row('a')], 'next'));
      }) as typeof fetch,
      period,
      controller.signal,
    ),
    { name: 'AbortError' },
  );
  assert.equal(calls, 1);
  await assert.rejects(
    load(
      (async () => {
        calls++;
        return Response.json(page([]));
      }) as typeof fetch,
      period,
      controller.signal,
    ),
    { name: 'AbortError' },
  );
  assert.equal(calls, 1);
});
test('empty complete period returns no fabricated values', async () => {
  assert.deepEqual(await load((async () => Response.json(page([]))) as typeof fetch), []);
});
test('page safety bound fails explicitly rather than silently truncating a very dense period', async () => {
  let calls = 0;
  await assert.rejects(
    load((async () => Response.json(page([row(`r${++calls}`)], `cursor${calls}`))) as typeof fetch),
    /intervallo più breve/,
  );
  assert.equal(calls, 400);
});
