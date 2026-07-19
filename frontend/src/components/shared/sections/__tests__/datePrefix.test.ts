import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDatePrefixAnnotations, withDatePrefixes } from '../datePrefix.js';
import { buildSegments } from '../segments.js';
import { DEFAULT_TAG_STYLES } from '../tagStyles.js';

const tags = (text: string) => detectDatePrefixAnnotations(text).map((a) => a.text);

test('DD/MM/YYYY at the start of a line is a prefix', () => {
  assert.deepEqual(tags('09/03/2026 La paziente viene inviata in PS.'), ['09/03/2026']);
});

test('DD-MM-YYYY and DD.MM.YYYY are recognised', () => {
  assert.deepEqual(tags('09-03-2026 evento'), ['09-03-2026']);
  assert.deepEqual(tags('09.03.2026 evento'), ['09.03.2026']);
});

test('two-digit year DD/MM/YY is recognised', () => {
  assert.deepEqual(tags('09/03/26 evento'), ['09/03/26']);
});

test('textual month is recognised', () => {
  assert.deepEqual(tags('9 marzo 2026 consulenza'), ['9 marzo 2026']);
  assert.deepEqual(tags('09 marzo 2026 consulenza'), ['09 marzo 2026']);
});

test('"In data 09/03/2026" highlights the whole expression', () => {
  assert.deepEqual(tags('In data 09/03/2026 ricovero.'), ['In data 09/03/2026']);
});

test('"Il 09/03/2026" at line start highlights the whole expression', () => {
  assert.deepEqual(tags('Il 09/03/2026 dimissione.'), ['Il 09/03/2026']);
});

test('date after a bullet item is a prefix', () => {
  const a = tags('- 09/03/2026 ingresso\n- 12/03/2026 dimissione');
  assert.deepEqual(a, ['09/03/2026', '12/03/2026']);
});

test('a date INSIDE a sentence is NOT a prefix', () => {
  assert.deepEqual(tags('La visita è stata eseguita il 09/03/2026.'), []);
});

test('page numbers and record numbers are NOT marked', () => {
  assert.deepEqual(tags('Pagina 1 di 3'), []);
  assert.deepEqual(tags('Numero cartella 123456'), []);
  assert.deepEqual(tags('Ramipril 5 mg 1 cp/die'), []);
});

test('multiple date prefixes in one block (new paragraphs)', () => {
  const text = '09/03/2026 ingresso in PS.\n\n12/03/2026 consulenza cardiologica.';
  assert.deepEqual(tags(text), ['09/03/2026', '12/03/2026']);
});

test('offsets are exact and slice back to the same text', () => {
  const text = '09/03/2026 La paziente.';
  const a = detectDatePrefixAnnotations(text)[0];
  assert.equal(text.slice(a.startOffset, a.endOffset), a.text);
  assert.equal(a.tag, 'DATE_PREFIX');
});

test('recalculation after a manual edit reflects the new text (no stale offsets)', () => {
  const before = detectDatePrefixAnnotations('09/03/2026 A.');
  const after = detectDatePrefixAnnotations('Premessa.\n12/03/2026 B.');
  assert.equal(before[0].startOffset, 0);
  assert.equal(after[0].text, '12/03/2026');
  assert.ok(after[0].startOffset > 0, 'offset moved with the edited text');
});

test('render: DATE_PREFIX produces a bold segment, text is never modified', () => {
  const text = '09/03/2026 La paziente viene inviata in PS.';
  const segs = buildSegments(text, withDatePrefixes(text, []), DEFAULT_TAG_STYLES);
  assert.equal(segs.map((s) => s.text).join(''), text, 'no text loss/mutation');
  const bold = segs.find((s) => s.bold);
  assert.equal(bold?.text, '09/03/2026');
});

test('withDatePrefixes does not double-mark a provided overlapping annotation', () => {
  const text = '09/03/2026 evento';
  const provided = [{ tag: 'DATE' as const, text: '09/03/2026', startOffset: 0, endOffset: 10 }];
  const merged = withDatePrefixes(text, provided);
  assert.equal(
    merged.filter((a) => a.startOffset === 0).length,
    1,
    'no duplicate at the same span',
  );
});
