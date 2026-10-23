import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  latestCompleteNews2,
  loadNews2History,
  loadRosterNews2,
  news2Points,
  news2Staleness,
  news2Tone,
} from '../news2History';
import type { ParameterReadingsPage, PatientParameterReading } from '../patientParameterReadings';

const full = {
  fr: '16',
  spo2: '97',
  o2: 'no',
  pa: '130/80',
  fc: '72',
  coscienza: 'A',
  temperatura: '36,8',
};
const reading = (
  id: string,
  measuredAt: string,
  values: PatientParameterReading['values'],
): PatientParameterReading => ({
  id,
  requestId: id,
  patientId: 'p1',
  measuredAt,
  values,
  authorOperatorId: 'op1',
  authorName: 'Test',
  createdAt: measuredAt,
});

test('the chip uses the latest COMPLETE reading, not a newer partial one', () => {
  const points = news2Points([
    reading('old', '2026-09-26T08:00:00.000Z', {
      ...full,
      fr: '24',
      spo2: '92',
      fc: '108',
      temperatura: '38,2',
    }),
    reading('partial', '2026-09-27T06:00:00.000Z', { pa: '120/80', fc: '70' }),
    reading('mid', '2026-09-26T20:00:00.000Z', full),
  ]);
  assert.deepEqual(
    points.map((p) => p.reading.id),
    ['partial', 'mid', 'old'],
    'newest first',
  );
  const latest = latestCompleteNews2(points);
  assert.equal(latest?.reading.id, 'mid');
  assert.equal(latest?.result.total, 0);
  assert.equal(news2Tone(latest), 'ok');
  assert.equal(news2Tone(points[2]), 'medium');
});

test('no complete reading means no score', () => {
  const points = news2Points([reading('a', '2026-09-27T06:00:00.000Z', { spo2: '88', fc: '130' })]);
  assert.equal(latestCompleteNews2(points), null);
  assert.equal(news2Tone(null), 'none');
});

test('a reassuring score is stale when newer incomplete readings exist or it is older than 12 h', async () => {
  const { news2Staleness } = await import('../news2History');
  const now = Date.parse('2026-09-27T10:00:00.000Z');
  const points = news2Points([
    reading('ok', '2026-09-24T09:00:00.000Z', full),
    reading('newer', '2026-09-27T09:30:00.000Z', { spo2: '84', fc: '140' }),
  ]);
  const latest = latestCompleteNews2(points);
  const s = news2Staleness(points, latest, now);
  assert.equal(s.stale, true);
  assert.equal(s.newerIncomplete, 1);
  const fresh = news2Points([reading('f', '2026-09-27T08:00:00.000Z', full)]);
  assert.equal(news2Staleness(fresh, latestCompleteNews2(fresh), now).stale, false);
  const old = news2Points([reading('o', '2026-09-26T20:00:00.000Z', full)]);
  assert.equal(news2Staleness(old, latestCompleteNews2(old), now).stale, true, 'older than 12 h');
});

test('staleness follows the RCP monitoring frequency of each risk level', async () => {
  const { news2Staleness } = await import('../news2History');
  const now = Date.parse('2026-09-27T10:00:00.000Z');
  const at = (hAgo: number) => new Date(now - hAgo * 3600e3).toISOString();
  const low = news2Points([reading('l', at(8), { ...full, fc: '95' })]); // NEWS2 1, 8 h fa
  assert.equal(news2Staleness(low, latestCompleteNews2(low), now).stale, true, '1–4: oltre 6 h');
  const lowFresh = news2Points([reading('lf', at(5), { ...full, fc: '95' })]);
  assert.equal(news2Staleness(lowFresh, latestCompleteNews2(lowFresh), now).stale, false);
  const medium = news2Points([
    reading('m', at(2), { ...full, fr: '24', spo2: '92', fc: '108', temperatura: '38,2' }),
  ]);
  assert.equal(
    news2Staleness(medium, latestCompleteNews2(medium), now).stale,
    true,
    '5–6: oltre 1 h',
  );
});

const partialFifty = () =>
  Array.from({ length: 50 }, (_, index) =>
    reading(
      `partial-${index}`,
      new Date(Date.parse('2026-10-17T10:00:00Z') - index * 60000).toISOString(),
      { fc: '80' },
    ),
  );
const olderComplete = () => reading('complete', '2026-10-17T08:00:00Z', full);
function pages(...responses: ParameterReadingsPage[]) {
  const calls: URL[] = [];
  const fetcher: typeof fetch = async (input) => {
    calls.push(new URL(String(input)));
    assert.ok(responses.length, 'no unexpected page fetch');
    return Response.json(responses.shift());
  };
  return { calls, options: { headers: {}, fetcher } };
}

test('NEWS2 searches past fifty newer partial readings and retains their staleness and history cursor', async () => {
  const source = pages(
    { readings: partialFifty(), hasMore: true, nextCursor: 'page2' },
    { readings: [olderComplete()], hasMore: true, nextCursor: 'page3' },
    {
      readings: [reading('older', '2026-10-16T08:00:00Z', full)],
      hasMore: false,
      nextCursor: null,
    },
  );
  const history = await loadNews2History('https://api.test', 'p1', source.options);
  assert.equal(source.calls.length, 2, 'stop after the first complete observation');
  assert.equal(source.calls[0].searchParams.get('limit'), '50');
  assert.equal(source.calls[1].searchParams.get('cursor'), 'page2');
  assert.equal(history.readings.length, 51);
  assert.equal(history.nextCursor, 'page3');
  const points = news2Points(history.readings);
  assert.equal(latestCompleteNews2(points)?.reading.id, 'complete');
  assert.equal(news2Staleness(points, latestCompleteNews2(points)).newerIncomplete, 50);
  assert.equal(news2Staleness(points, latestCompleteNews2(points)).stale, true);
  const continued = await loadNews2History('https://api.test', 'p1', source.options, history);
  assert.equal(continued.readings.length, 52);
  assert.equal(continued.nextCursor, null);
  assert.deepEqual(continued.visitedCursors, ['', 'page2', 'page3']);
});

test('absence of complete NEWS2 is verified at the actual end, including an empty history', async () => {
  const source = pages(
    { readings: partialFifty(), hasMore: true, nextCursor: 'last' },
    {
      readings: [reading('last', '2026-10-17T08:00:00Z', { spo2: '96' })],
      hasMore: false,
      nextCursor: null,
    },
  );
  const history = await loadNews2History('https://api.test', 'p1', source.options);
  assert.equal(history.readings.length, 51);
  assert.equal(history.nextCursor, null);
  assert.equal(latestCompleteNews2(news2Points(history.readings)), null);
  const empty = pages({ readings: [], hasMore: false, nextCursor: null });
  assert.deepEqual((await loadNews2History('https://api.test', 'p1', empty.options)).readings, []);
});

test('one unavailable patient does not erase another verified score or become an empty source', async () => {
  const fetcher: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path.includes('/p1/'))
      return Response.json({ readings: [olderComplete()], hasMore: false, nextCursor: null });
    if (path.includes('/empty/'))
      return Response.json({ readings: [], hasMore: false, nextCursor: null });
    return new Response('unavailable', { status: 503 });
  };
  const result = await loadRosterNews2('https://api.test', ['p1', 'failed', 'empty'], {
    headers: {},
    fetcher,
  });
  assert.deepEqual([...result.ids], ['p1']);
  assert.deepEqual([...result.unknownIds], ['failed']);
});

test('a failed second page is unknown, never a verified absence', async () => {
  let count = 0;
  const fetcher: typeof fetch = async () =>
    ++count === 1
      ? Response.json({ readings: partialFifty(), hasMore: true, nextCursor: 'next' })
      : new Response('failure', { status: 503 });
  const result = await loadRosterNews2('https://api.test', ['p1'], { headers: {}, fetcher });
  assert.equal(count, 2);
  assert.equal(result.ids.size, 0);
  assert.deepEqual([...result.unknownIds], ['p1']);
});

test('malformed, foreign, duplicate, unordered rows and inconsistent cursors fail closed', async (t) => {
  const valid = olderComplete();
  const badPages: unknown[] = [
    { readings: [{ ...valid, patientId: 'other' }], hasMore: false, nextCursor: null },
    { readings: [{ ...valid, values: null }], hasMore: false, nextCursor: null },
    { readings: [{ ...valid, values: { fc: 72 } }], hasMore: false, nextCursor: null },
    { readings: [{ ...valid, measuredAt: 'bad' }], hasMore: false, nextCursor: null },
    { readings: [valid, valid], hasMore: false, nextCursor: null },
    {
      readings: [valid, reading('newer', '2026-10-17T10:00:00Z', full)],
      hasMore: false,
      nextCursor: null,
    },
    { readings: [valid], hasMore: true, nextCursor: null },
    { readings: [valid], hasMore: false, nextCursor: 'unexpected' },
    { readings: [], hasMore: true, nextCursor: 'next' },
  ];
  for (const [index, page] of badPages.entries())
    await t.test(`malformed ${index}`, async () => {
      await assert.rejects(
        loadNews2History('https://api.test', 'p1', {
          headers: {},
          fetcher: async () => Response.json(page),
        }),
      );
    });
});

test('cursor loops across pages and across history continuations are rejected', async () => {
  const source = pages(
    { readings: partialFifty(), hasMore: true, nextCursor: 'again' },
    { readings: [reading('last', '2026-10-17T08:00:00Z', {})], hasMore: true, nextCursor: 'again' },
  );
  await assert.rejects(loadNews2History('https://api.test', 'p1', source.options), /Paginazione/);
  const continuation = pages({ readings: [], hasMore: true, nextCursor: 'page2' });
  await assert.rejects(
    loadNews2History('https://api.test', 'p1', continuation.options, {
      readings: [olderComplete()],
      nextCursor: 'page2',
      visitedCursors: ['', 'page2'],
    }),
    /Paginazione/,
  );
  assert.equal(continuation.calls.length, 0);
});

test('abort before a request or between pages prevents partial results and further requests', async () => {
  const early = new AbortController();
  early.abort();
  const untouched = pages();
  await assert.rejects(
    loadNews2History('https://api.test', 'p1', { ...untouched.options, signal: early.signal }),
    { name: 'AbortError' },
  );
  assert.equal(untouched.calls.length, 0);
  const controller = new AbortController();
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    controller.abort();
    return Response.json({ readings: partialFifty(), hasMore: true, nextCursor: 'next' });
  };
  await assert.rejects(
    loadRosterNews2('https://api.test', ['p1'], {
      headers: {},
      fetcher,
      signal: controller.signal,
    }),
    { name: 'AbortError' },
  );
  assert.equal(calls, 1);
});
