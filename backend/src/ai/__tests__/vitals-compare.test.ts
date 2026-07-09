import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVitalValue, compareVitals, vitalsTrend } from '../assistant/vitals-compare.js';

const E = (etichetta: string, valore: string, rilevato: string) => ({ etichetta, valore, rilevato });
const PA = [
  E('PA', '140/85', '2026-07-09T08:00:00.000Z'),
  E('PA', '150/90', '2026-07-10T08:12:00.000Z'),
  E('PA', '142/86', '2026-07-07T08:00:00.000Z'),
  E('PA', '138/84', '2026-07-05T08:00:00.000Z'),
];

test('parseVitalValue: PA "150/90" → {150, 90}; T "36.5" → {36.5}; spazzatura → null', () => {
  assert.deepEqual(parseVitalValue('150/90'), { num: 150, num2: 90 });
  assert.deepEqual(parseVitalValue('36.5'), { num: 36.5 });
  assert.equal(parseVitalValue('n/d'), null);
});

test('compareVitals oggi vs ieri: delta computato dal backend', () => {
  const c = compareVitals(PA, 'PA', '2026-07-10', '2026-07-09');
  assert.ok(c);
  assert.deepEqual(c!.valA, { num: 150, num2: 90 });
  assert.deepEqual(c!.valB, { num: 140, num2: 85 });
  assert.deepEqual(c!.delta, { num: 10, num2: 5 });
});

test('compareVitals: giorno senza rilevazioni → valB null, delta null, non inventa', () => {
  const c = compareVitals(PA, 'PA', '2026-07-10', '2026-07-08');
  assert.ok(c);
  assert.equal(c!.valB, null);
  assert.equal(c!.delta, null);
});

test('compareVitals: deviation true quando |delta| supera la soglia PA (default 15)', () => {
  const entries = [...PA, E('PA', '170/100', '2026-07-10T18:00:00.000Z')]; // ultimo del 10/07 = 170
  const c = compareVitals(entries, 'PA', '2026-07-10', '2026-07-09');
  assert.equal(c!.deviation, true);   // 170-140=30 > 15
});

test('vitalsTrend 7gg: serie giornaliera con min/max/media e direzione', () => {
  const t = vitalsTrend(PA, 'PA', '2026-07-10', 7);
  assert.ok(t);
  assert.equal(t!.days.length, 4);                       // solo i giorni con dati
  assert.equal(t!.days[t!.days.length - 1].date, '2026-07-10');
  assert.ok(['salita', 'stabile', 'calo'].includes(t!.direction));
  assert.equal(t!.direction, 'salita');                  // 138→142→140→150 sistolica media in salita
});

test('vitalsTrend: etichetta assente → null (mai serie inventata)', () => {
  assert.equal(vitalsTrend(PA, 'SpO2', '2026-07-10', 7), null);
});

test('compareVitals: weeklyAvg calcolata sulla finestra 7gg e unit corretta', () => {
  const c = compareVitals(PA, 'PA', '2026-07-10', '2026-07-09');
  assert.equal(c!.unit, 'mmHg');
  // media sistolica su 138,142,140,150 = 142.5
  assert.equal(c!.weeklyAvg!.num, 142.5);
});

test('compareVitals: deviation true per scostamento SOLO diastolico oltre soglia', () => {
  const entries = [
    { etichetta: 'PA', valore: '140/60', rilevato: '2026-07-09T08:00:00.000Z' },
    { etichetta: 'PA', valore: '142/85', rilevato: '2026-07-10T08:00:00.000Z' },
  ];
  const c = compareVitals(entries, 'PA', '2026-07-10', '2026-07-09');
  assert.equal(c!.delta!.num2, 25);
  assert.equal(c!.deviation, true);   // sistolica +2 sotto soglia, diastolica +25 sopra
});

test('threshold override via env AGNOS_DEV_PA', () => {
  const c = compareVitals(PA, 'PA', '2026-07-10', '2026-07-09', { AGNOS_DEV_PA: '5' } as NodeJS.ProcessEnv);
  assert.equal(c!.deviation, true);   // delta 10 > soglia override 5
});
