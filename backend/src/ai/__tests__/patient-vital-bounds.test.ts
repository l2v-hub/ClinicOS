import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { filterVitals } from '../gateway/filters.js';
import {
  boundPatientVitalRows,
  MAX_PATIENT_VITAL_LABEL,
  MAX_PATIENT_VITAL_SIGNS,
  parsePatientVitalBoundary,
  PATIENT_VITAL_LOOKAHEAD,
  type PatientVitalRow,
} from '../gateway/patient-vital-window.js';

function row(index: number, contentTruncated = false): PatientVitalRow {
  return {
    recordId: 'chart-1',
    id: `v-${index}`,
    etichetta: 'PA',
    valore: `${120 + index}/80`,
    unita: 'mmHg',
    stato: 'normale',
    rilevato: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
    contentTruncated,
  };
}

test('patient vital window is exact-cap, look-ahead bounded and content-aware', () => {
  assert.equal(MAX_PATIENT_VITAL_SIGNS, 100);
  assert.equal(PATIENT_VITAL_LOOKAHEAD, 101);
  const exact = boundPatientVitalRows(Array.from({ length: 100 }, (_, index) => row(index)));
  assert.equal(exact.rows.length, 100);
  assert.equal(exact.truncated, false);

  const overflow = boundPatientVitalRows(Array.from({ length: 101 }, (_, index) => row(index)));
  assert.equal(overflow.rows.length, 100);
  assert.equal(overflow.rows.at(-1)?.id, 'v-99');
  assert.equal(overflow.truncated, true);
  assert.equal(boundPatientVitalRows([row(0, true)]).truncated, true);
});

test('vital filtering remains defensive and equivalent before the SQL cap', () => {
  const malformed = [null, 'bad', 3, [], {}, { etichetta: 'PA', valore: 'bad' }];
  assert.deepEqual(filterVitals(malformed as never, { label: 'PA', systolicMin: 150 }), []);
  const readings = [
    { id: '1', etichetta: 'PA', valore: ' 160/95 ', rilevato: '2026-08-01' },
    { id: '2', etichetta: 'pa', valore: '140/80', rilevato: '2026-08-02' },
    { id: '3', etichetta: 'FC', valore: ' 90 bpm', rilevato: '2026-08-03' },
  ];
  assert.deepEqual(
    filterVitals(readings, {
      label: 'PA',
      systolicMin: 150,
      from: '2026-08-01',
      to: '2026-08-31',
    }).map((vital) => vital.id),
    ['1'],
  );
  assert.deepEqual(
    filterVitals(readings, { valueMin: 89 }).map((vital) => vital.id),
    ['1', '2', '3'],
  );
  assert.equal(
    parsePatientVitalBoundary('2026-08-01T10:00:00+02:00')?.toISOString(),
    '2026-08-01T08:00:00.000Z',
  );
  assert.equal(parsePatientVitalBoundary('2026-08-01')?.toISOString(), '2026-08-01T00:00:00.000Z');
  assert.equal(parsePatientVitalBoundary('not-a-date'), undefined);
});

test('gateway filters and projects vitals in PostgreSQL before look-ahead', () => {
  const services = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
  const block = services
    .split('export async function getPatientVitalSigns')[1]
    ?.split('export async function getCrossPatientVitalSigns')[0];
  assert.ok(block);
  assert.match(block, /prisma\.\$queryRaw/);
  assert.match(block, /jsonb_array_elements/);
  assert.match(block, /Prisma\.join\(predicates, ' AND '\)/);
  assert.match(block, /btrim\(COALESCE\(vital\.item->>'valore'/);
  assert.match(block, /::timestamptz/);
  assert.match(block, /parsePatientVitalBoundary\(query\.from\)/);
  assert.match(block, /LIMIT \$\{PATIENT_VITAL_LOOKAHEAD\}/);
  assert.match(block, /ORDER BY vital\.ordinal/);
  assert.match(block, /left\(vital\.item->>'etichetta', \$\{MAX_PATIENT_VITAL_LABEL\}\)/);
  assert.doesNotMatch(block, /loadCartella\(/);
  assert.equal(MAX_PATIENT_VITAL_LABEL, 32);
});

test('query engine and assistant propagate vital truncation without misaligned sources', () => {
  const engine = readFileSync(new URL('../gateway/query/engine.ts', import.meta.url), 'utf8');
  const assistant = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
  const vitalBlock = engine
    .split('async function vitalStep')[1]
    ?.split('async function runStep')[0];
  assert.ok(vitalBlock);
  assert.match(vitalBlock, /const rows = r\.data\.slice\(0, step\.limit\)/);
  assert.match(vitalBlock, /sources: r\.sourceRefs\.slice\(0, rows\.length\)/);
  assert.match(vitalBlock, /truncated: r\.truncated \|\| r\.data\.length > step\.limit/);
  assert.match(engine, /truncated: \[\.\.\.results\.values\(\)\]\.some/);
  assert.match(assistant, /truncated: out\.truncated/);
});
