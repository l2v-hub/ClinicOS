import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  boundTimeline,
  MAX_TIMELINE_EVENTS,
  MAX_TIMELINE_FIELD_TEXT,
  MAX_TIMELINE_SOURCE_TEXT,
  TIMELINE_LOOKAHEAD,
  normalizeTimelineVital,
  type TimelineCandidate,
} from '../gateway/timeline-window.js';

function candidate(at: string, kind: string, id: string): TimelineCandidate {
  return {
    event: { at, kind, label: `label-${id}` },
    source: {
      sourceType: kind === 'DIARY_ENTRY' ? 'DIARY_ENTRY' : 'APPOINTMENT',
      patientId: 'patient-1',
      recordId: id,
      label: `source-${id}`,
    },
  };
}

test('timeline window is bounded, aligned and deterministic at equal timestamps', () => {
  assert.equal(MAX_TIMELINE_EVENTS, 100);
  assert.equal(TIMELINE_LOOKAHEAD, 101);
  assert.equal(MAX_TIMELINE_SOURCE_TEXT, 240);
  const rows = Array.from({ length: 101 }, (_, index) =>
    candidate('2026-08-30T10:00', index % 2 ? 'DIARY_ENTRY' : 'APPOINTMENT', `id-${index}`),
  );
  const result = boundTimeline(rows);
  assert.equal(result.data.length, 100);
  assert.equal(result.sourceRefs.length, result.data.length);
  assert.equal(result.truncated, true);
  for (let index = 0; index < result.data.length; index++) {
    assert.equal(
      result.data[index]?.label.replace('label-', ''),
      result.sourceRefs[index]?.recordId,
    );
  }
  assert.deepEqual(
    result.data.slice(0, 3).map((event) => event.kind),
    ['APPOINTMENT', 'APPOINTMENT', 'APPOINTMENT'],
  );
});

test('timeline reports exact limits and upstream look-ahead without false completeness', () => {
  const exact = Array.from({ length: 100 }, (_, index) =>
    candidate(`2026-08-${String(index + 1).padStart(2, '0')}T10:00`, 'APPOINTMENT', `a-${index}`),
  );
  assert.equal(boundTimeline(exact).truncated, false);
  assert.equal(boundTimeline(exact.slice(0, 3), true).truncated, true);

  const tiedOverflow = Array.from({ length: 101 }, (_, index) =>
    candidate('2026-08-30T10:00', 'APPOINTMENT', `id-${String(index).padStart(3, '0')}`),
  );
  const tied = boundTimeline(tiedOverflow);
  assert.equal(tied.sourceRefs[0]?.recordId, 'id-100');
  assert.equal(tied.sourceRefs.at(-1)?.recordId, 'id-001');
  assert.equal(tied.truncated, true);
});

test('timeline vitals discard malformed JSON fields and bound projected text', () => {
  for (const recordedAt of [null, 123, {}, [], 'not-a-date', '2026-02-30T11:15', 'x'.repeat(65)]) {
    assert.equal(
      normalizeTimelineVital({
        recordId: 'cartella-1',
        id: null,
        recordedAt,
        label: 'PA',
        value: '120/80',
      }),
      null,
    );
  }
  const valid = normalizeTimelineVital({
    recordId: 'cartella-1',
    id: 'vital-1',
    recordedAt: '2026-08-30T11:15',
    label: 'L'.repeat(MAX_TIMELINE_FIELD_TEXT + 50),
    value: 'V'.repeat(MAX_TIMELINE_FIELD_TEXT + 50),
  });
  assert.ok(valid);
  assert.equal(valid.sourceLabel.length, MAX_TIMELINE_FIELD_TEXT);
  assert.equal(valid.label.length, MAX_TIMELINE_FIELD_TEXT * 2 + 1);

  const dateOnly = normalizeTimelineVital({
    recordId: 'cartella-1',
    id: 'vital-date-only',
    recordedAt: '2026-08-30',
    label: 'Peso',
    value: '70 kg',
  });
  assert.equal(dateOnly?.at, '2026-08-30');
});

test('timeline gateway limits every source and never loads the full cartella JSON', () => {
  const source = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
  const block = source
    .split('export async function getPatientTimeline')[1]
    ?.split('// ── Narrative / document search')[0];
  assert.ok(block);
  assert.match(block, /assertPatientAllowed\(ctx, patientId\)/);
  assert.match(block, /take: TIMELINE_LOOKAHEAD/);
  assert.equal(block.match(/LIMIT \$\{TIMELINE_LOOKAHEAD\}/g)?.length, 2);
  assert.match(block, /LEFT\(diary\."content", \$\{MAX_TIMELINE_SOURCE_TEXT\}\)/);
  assert.match(block, /jsonb_array_elements/);
  assert.match(block, /jsonb_typeof/);
  assert.match(block, /jsonb_typeof\(vital\.item->'rilevato'\) = 'string'/);
  assert.match(block, /length\(vital\.item->>'rilevato'\) <= \$\{MAX_TIMELINE_TIMESTAMP_LENGTH\}/);
  assert.match(block, /COALESCE\(vital\.item->>'id', ''\) DESC/);
  assert.match(block, /normalizeTimelineVital\(row\)/);
  assert.doesNotMatch(block, /loadCartella\(/);
  assert.doesNotMatch(block, /findMany\(\{ where: \{ patientId \}/);
  assert.match(block, /return result/);
});

test('assistant and internal route preserve the bounded timeline result contract', () => {
  const assistant = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
  const internalRoute = readFileSync(
    new URL('../../routes/internal-ai.ts', import.meta.url),
    'utf8',
  );
  assert.match(assistant, /sourceTruncated \|\|= r\.truncated === true/);
  assert.match(
    internalRoute,
    /getPatientTimeline\(String\(req\.body\?\.patientId \?\? ''\), ctxOf\(req\)\)/,
  );
});
