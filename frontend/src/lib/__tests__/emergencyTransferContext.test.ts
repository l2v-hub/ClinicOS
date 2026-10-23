import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadEmergencyTransferSources,
  emergencySourceMessage,
  type EmergencyTransferSources,
} from '../emergencyTransferContext';
import { setCurrentOperator } from '../operatorSession';
const patientId = 'synthetic-emergency';
const now = new Date('2026-10-21T10:00:00Z');
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
function empty(url: URL) {
  if (url.pathname.endsWith('/parameter-readings'))
    return { readings: [], hasMore: false, nextCursor: null };
  if (url.pathname.endsWith('/diary')) return { entries: [], hasMore: false, nextCursor: null };
  if (url.pathname.endsWith('/prn')) return { items: [] };
  return {
    items: [],
    summary: { total: 0, active: 0, inactive: 0 },
    pageInfo: { hasMore: false, nextCursor: null },
  };
}
async function withFetch(fetcher: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  setCurrentOperator({ id: 'synthetic-operator', role: 'infermiere' });
  try {
    await run();
  } finally {
    globalThis.fetch = original;
    setCurrentOperator(null);
  }
}

test('failed diary is unverifiable independently of verified sources and never a verified absence', async () => {
  const progress: EmergencyTransferSources[] = [];
  await withFetch(
    async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/diary')) throw new Error('Source failed');
      return json(empty(url));
    },
    async () => {
      const result = await loadEmergencyTransferSources(
        patientId,
        new AbortController().signal,
        now,
        {
          onProgress: (snapshot) => progress.push(snapshot),
        },
      );
      assert.equal(result.status?.diary.state, 'unverifiable');
      assert.equal(result.status?.readings.state, 'verified');
      assert.equal(result.status?.scheduled.state, 'verified');
      assert.match(
        emergencySourceMessage(result.status!.diary),
        /non verificabile, compilare a mano/,
      );
      assert.match(result.status!.diary.detail, /Nessuna assenza clinica verificata/);
      assert.ok(
        progress.some(
          (p) => p.status?.readings.state === 'verified' && p.status?.prn.state === 'loading',
        ),
      );
    },
  );
});

test('2000 historical readings require only two reading requests and at most ten authenticated GETs, concurrency three', async () => {
  const history = Array.from({ length: 2000 }, (_, i) => ({
    id: `reading-${i}`,
    patientId,
    measuredAt: new Date(now.getTime() - i * 60000).toISOString(),
    values: { spo2: '97' },
  }));
  let readingCalls = 0,
    calls = 0,
    active = 0,
    maxActive = 0;
  await withFetch(
    async (input, init) => {
      const url = new URL(String(input));
      calls++;
      active++;
      maxActive = Math.max(maxActive, active);
      assert.equal(init?.method ?? 'GET', 'GET');
      assert.equal(new Headers(init?.headers).get('X-Operator-Id'), 'synthetic-operator');
      assert.ok(init?.signal);
      await new Promise((resolve) => setImmediate(resolve));
      active--;
      if (url.pathname.endsWith('/parameter-readings')) {
        readingCalls++;
        const offset = Number(url.searchParams.get('cursor') ?? 0);
        return json({
          readings: history.slice(offset, offset + 50),
          hasMore: true,
          nextCursor: String(offset + 50),
        });
      }
      if (url.pathname.endsWith('/diary')) {
        assert.equal(url.searchParams.get('from'), '2026-10-19');
        assert.equal(url.searchParams.get('to'), '2026-10-21');
      }
      return json(empty(url));
    },
    async () => {
      const result = await loadEmergencyTransferSources(
        patientId,
        new AbortController().signal,
        now,
      );
      assert.equal(readingCalls, 2);
      assert.equal(result.readings.length, 100);
      assert.equal(result.status?.readings.state, 'partial');
      assert.match(emergencySourceMessage(result.status!.readings), /completezza non verificabile/);
      assert.ok(calls <= 10);
      assert.ok(maxActive <= 3);
    },
  );
});

test('missing capabilities skip only denied sources and disclose manual completion', async () => {
  const paths: string[] = [];
  await withFetch(
    async (input) => {
      const url = new URL(String(input));
      paths.push(url.pathname);
      return json(empty(url));
    },
    async () => {
      const result = await loadEmergencyTransferSources(
        patientId,
        new AbortController().signal,
        now,
        {
          allowed: { scheduled: false, prn: false },
        },
      );
      assert.ok(
        paths.every(
          (path) => !path.endsWith('/prn') && !path.includes('medication-administrations'),
        ),
      );
      assert.equal(result.status?.scheduled.state, 'unverifiable');
      assert.equal(result.status?.prn.state, 'unverifiable');
      assert.equal(result.status?.therapies.state, 'verified');
      assert.match(result.status!.scheduled.detail, /non autorizzata/);
    },
  );
});

test('valid capped PRN keeps actual rows with explicit partial status rather than claiming completeness', async () => {
  await withFetch(
    async (input) => {
      const url = new URL(String(input));
      if (!url.pathname.endsWith('/prn')) return json(empty(url));
      const date = url.searchParams.get('date')!;
      return json({
        items: Array.from({ length: 200 }, (_, i) => ({
          id: `${date}-${i}`,
          patientId,
          date,
          drugName: 'Farmaco sintetico',
          dosage: '1 mg',
          route: 'orale',
          administeredAt: `${date}T09:00:00Z`,
        })),
      });
    },
    async () => {
      const result = await loadEmergencyTransferSources(
        patientId,
        new AbortController().signal,
        now,
      );
      assert.equal(result.prn.length, 400);
      assert.equal(result.status?.prn.state, 'partial');
      assert.match(emergencySourceMessage(result.status!.prn), /compilare a mano/);
    },
  );
});

test('corrupt legacy scheduled row affects only its section and never verifies an empty dose history', async () => {
  await withFetch(
    async (input) => {
      const url = new URL(String(input));
      return json(
        url.pathname.includes('/medication-administrations/')
          ? {
              items: [{ id: 'corrupt', patientId }],
              pageInfo: { hasMore: false, nextCursor: null },
            }
          : empty(url),
      );
    },
    async () => {
      const result = await loadEmergencyTransferSources(
        patientId,
        new AbortController().signal,
        now,
      );
      assert.equal(result.status?.scheduled.state, 'unverifiable');
      assert.equal(result.status?.prn.state, 'verified');
      assert.deepEqual(result.scheduled, []);
    },
  );
});

test('an aborted context publishes no late source and starts no later jobs', async () => {
  const controller = new AbortController();
  let calls = 0,
    progress = 0;
  await withFetch(
    async (input) => {
      calls++;
      controller.abort();
      return json(empty(new URL(String(input))));
    },
    async () => {
      await assert.rejects(
        loadEmergencyTransferSources(patientId, controller.signal, now, {
          onProgress: () => progress++,
        }),
        { name: 'AbortError' },
      );
      assert.ok(calls <= 3);
      assert.equal(progress, 1);
    },
  );
});

test('the spring DST 24-hour window reads all three intersecting civil PRN days within eleven total requests', async () => {
  const dates: string[] = [];
  let calls = 0;
  await withFetch(
    async (input) => {
      const url = new URL(String(input));
      calls++;
      if (url.pathname.endsWith('/prn')) dates.push(url.searchParams.get('date')!);
      return json(empty(url));
    },
    async () => {
      await loadEmergencyTransferSources(
        patientId,
        new AbortController().signal,
        new Date('2026-03-29T22:30:00Z'),
      );
      assert.deepEqual(dates, ['2026-03-28', '2026-03-29', '2026-03-30']);
      assert.ok(calls <= 11);
    },
  );
});

test('a therapy summary inconsistent with an exhausted page remains unverifiable rather than an empty verified list', async () => {
  await withFetch(
    async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/therapies/page'))
        return json({
          items: [],
          summary: { total: 1, active: 1, inactive: 0 },
          pageInfo: { hasMore: false, nextCursor: null },
        });
      return json(empty(url));
    },
    async () => {
      const result = await loadEmergencyTransferSources(
        patientId,
        new AbortController().signal,
        now,
      );
      assert.equal(result.status?.therapies.state, 'unverifiable');
      assert.equal(result.status?.readings.state, 'verified');
    },
  );
});

test('a hung source settles as unverifiable within its deadline while independent sources remain verified', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let readingSignal: AbortSignal | null = null;
  await withFetch(
    async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/parameter-readings')) {
        readingSignal = init!.signal!;
        return new Promise<Response>(() => {});
      }
      return json(empty(url));
    },
    async () => {
      const loading = loadEmergencyTransferSources(patientId, new AbortController().signal, now);
      await new Promise((resolve) => setImmediate(resolve));
      context.mock.timers.tick(8000);
      const result = await loading;
      assert.equal(result.status?.readings.state, 'unverifiable');
      assert.equal(result.status?.diary.state, 'verified');
      assert.equal(readingSignal!.aborted, true);
    },
  );
});
