// Milo fase 3 — i blocchi visivi nascono solo dai dati letti, strumento per strumento.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';

const { blocksFromResults } = await import('../assistant/blocks.js');
const { news2, NEWS2_SOURCE } = await import('../../clinical/scores/news2.js');
const { parameterSeries, SERIES_KEYS } = await import('../gateway/clinical-series.js');

const readings = [
  {
    id: 'r1',
    measuredAt: '2026-11-20T08:00:00.000Z',
    source: 'parametri' as const,
    values: { pa: '130/80', fc: '80' },
    author: 'Inf. Bianchi',
  },
  {
    id: 'r2',
    measuredAt: '2026-11-22T08:00:00.000Z',
    source: 'cartella' as const,
    values: { pa: '150/90' },
  },
];

test('parameters: kpi with the read values and the trend with the same readings', () => {
  const overview = {
    patientId: 'p1',
    from: '2026-11-16T00:00:00.000Z',
    to: '2026-11-22T22:00:00.000Z',
    readings,
    series: parameterSeries(readings, SERIES_KEYS),
  };
  const blocks = blocksFromResults([{ tool: 'get_patient_parameters', data: [overview] }]);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['kpi', 'parameter_trend'],
  );
  const kpi = blocks[0] as Extract<(typeof blocks)[number], { type: 'kpi' }>;
  const sys = kpi.items.find((i) => /sistolica/i.test(i.label));
  assert.equal(sys?.value, '150');
  assert.match(sys?.note ?? '', /2 misure · min 130 · max 150 · variazione \+20/);
  const trend = blocks[1] as Extract<(typeof blocks)[number], { type: 'parameter_trend' }>;
  assert.deepEqual(trend.params, ['pa', 'fc']);
  assert.deepEqual(trend.period, { start: '2026-11-16', end: '2026-11-22' });
  assert.deepEqual(
    trend.readings.map((r) => [r.id, r.values.pa, r.author ?? null]),
    [
      ['r1', '130/80', 'Inf. Bianchi'],
      ['r2', '150/90', null],
    ],
  );
});

test('NEWS2: total, risk tone, protocol response and source come from the backend score', () => {
  const values = {
    pa: '150/90',
    fc: '115',
    spo2: '93',
    fr: '22',
    temperatura: '37,0',
    o2: 'no',
    coscienza: 'A',
  };
  const result = news2(values);
  const point = { readingId: 'r1', measuredAt: '2026-11-22T08:00:00.000Z', result };
  const blocks = blocksFromResults([
    {
      tool: 'get_patient_news2',
      data: [
        {
          patientId: 'p1',
          source: NEWS2_SOURCE,
          latest: point,
          latestIncomplete: {
            readingId: 'r2',
            measuredAt: '2026-11-22T10:00:00.000Z',
            missing: ['fr'],
          },
          history: [{ ...point, readingId: 'r0' }, point],
        },
      ],
    },
  ]);
  const kpi = blocks[0] as Extract<(typeof blocks)[number], { type: 'kpi' }>;
  assert.equal(kpi.items[0].value, String(result.total));
  assert.equal(kpi.items[0].tone, 'warning'); // 6 = medio
  assert.equal(kpi.items[1].value, result.response);
  assert.match(kpi.items[2].note ?? '', /Mancano: fr/);
  assert.match(kpi.source ?? '', /NEWS2 — RCP 2017/);
  assert.equal(blocks[1].type, 'table');
});

test('tables: known tools only, fixed columns, at most 50 rows, wall-clock dates kept as written', () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({
    id: `a${i}`,
    date: '2026-11-21',
    time: '08:00',
    drug: 'Paracetamolo',
    dose: '1 g',
    status: 'somministrato',
    operator: 'Inf. Rossi',
    secret: 'non deve uscire',
  }));
  const [admin] = blocksFromResults([{ tool: 'get_patient_administrations', data: rows }]);
  assert.equal(admin.type, 'table');
  const t = admin as Extract<typeof admin, { type: 'table' }>;
  assert.equal(t.rows.length, 50);
  assert.equal(t.truncated, true);
  assert.deepEqual(Object.keys(t.rows[0]), ['quando', 'drug', 'dose', 'status', 'operator']);
  assert.equal(t.rows[0].quando, '21/11 08:00');
  const [diary] = blocksFromResults([
    {
      tool: 'get_patient_diary',
      data: [{ entryDateTime: '2026-11-21T09:15', authorType: 'nurse', title: 'Notte tranquilla' }],
    },
  ]);
  assert.equal((diary as Extract<typeof diary, { type: 'table' }>).rows[0].quando, '21/11 09:15');
  // Strumenti senza regola di visualizzazione o risultati vuoti: nessun blocco.
  assert.deepEqual(blocksFromResults([{ tool: 'search_across_patients', data: rows }]), []);
  assert.deepEqual(blocksFromResults([{ tool: 'get_patient_administrations', data: [] }]), []);
});

test('never more than 8 blocks per answer', () => {
  const many = Array.from({ length: 12 }, () => ({
    tool: 'query_agenda',
    data: [{ scheduledAt: '2026-11-23T09:30:00.000Z', patient: 'A', operator: 'B', status: 'x' }],
  }));
  assert.equal(blocksFromResults(many).length, 8);
});
