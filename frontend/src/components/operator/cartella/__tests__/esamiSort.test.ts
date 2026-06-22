import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Inline sort helper (mirrors sortEsamiDesc from EsamiConsulenzeTab) ─────
// Inlined to avoid tsx/ESM JSX complexity in node:test.

interface EsameClinicoRecord {
  id: string;
  data: string;
  ora?: string;
  descrizione: string;
  esito: string;
  allegati?: string;
  operatore: string;
  note?: string;
  createdAt: string;
}

function sortEsamiDesc(records: EsameClinicoRecord[]): EsameClinicoRecord[] {
  return [...records].sort((a, b) => {
    const da = `${a.data}${a.ora ? 'T' + a.ora : 'T00:00'}`;
    const db = `${b.data}${b.ora ? 'T' + b.ora : 'T00:00'}`;
    return db.localeCompare(da);
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const rec = (id: string, data: string, ora?: string): EsameClinicoRecord => ({
  id,
  data,
  ora,
  descrizione: `Esame ${id}`,
  esito: '',
  operatore: 'Infermiere Test',
  createdAt: new Date().toISOString(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

test('sortEsamiDesc: orders by date descending (most recent first)', () => {
  const input = [
    rec('a', '2024-01-15'),
    rec('b', '2024-03-10'),
    rec('c', '2023-12-01'),
  ];
  const result = sortEsamiDesc(input);
  assert.deepEqual(result.map(r => r.id), ['b', 'a', 'c']);
});

test('sortEsamiDesc: same date ordered by time descending', () => {
  const input = [
    rec('a', '2024-05-20', '08:00'),
    rec('b', '2024-05-20', '14:30'),
    rec('c', '2024-05-20', '09:15'),
  ];
  const result = sortEsamiDesc(input);
  assert.deepEqual(result.map(r => r.id), ['b', 'c', 'a']);
});

test('sortEsamiDesc: records without time come before same-date records with midnight time', () => {
  // Without ora → T00:00, same as explicit midnight
  const input = [
    rec('a', '2024-06-01', '10:00'),
    rec('b', '2024-06-01'),           // no ora → T00:00
    rec('c', '2024-06-01', '07:00'),
  ];
  const result = sortEsamiDesc(input);
  // Descending: 10:00 > 07:00 > 00:00
  assert.deepEqual(result.map(r => r.id), ['a', 'c', 'b']);
});

test('sortEsamiDesc: mixed dates and times', () => {
  const input = [
    rec('old', '2023-01-01', '09:00'),
    rec('recent', '2024-12-31', '23:59'),
    rec('mid', '2024-06-15', '12:00'),
    rec('mid-early', '2024-06-15', '06:00'),
  ];
  const result = sortEsamiDesc(input);
  assert.deepEqual(result.map(r => r.id), ['recent', 'mid', 'mid-early', 'old']);
});

test('sortEsamiDesc: empty array returns empty array', () => {
  assert.deepEqual(sortEsamiDesc([]), []);
});

test('sortEsamiDesc: single record returns unchanged', () => {
  const input = [rec('x', '2024-01-01')];
  const result = sortEsamiDesc(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'x');
});

test('sortEsamiDesc: does not mutate the original array', () => {
  const input = [rec('a', '2024-02-01'), rec('b', '2024-01-01')];
  const original = [...input];
  sortEsamiDesc(input);
  assert.deepEqual(input.map(r => r.id), original.map(r => r.id));
});
