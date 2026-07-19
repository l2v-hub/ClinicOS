import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSegments } from '../segments.js';
import { DEFAULT_TAG_STYLES } from '../tagStyles.js';
import type { SemanticAnnotation } from '../types.js';

const S = DEFAULT_TAG_STYLES;
function ann(raw: string, text: string, tag: SemanticAnnotation['tag']): SemanticAnnotation {
  const i = raw.indexOf(text);
  return { tag, text, startOffset: i, endOffset: i + text.length };
}
const join = (segs: { text: string }[]) => segs.map((s) => s.text).join('');

test('no annotations -> single faithful plain segment', () => {
  const raw = 'Testo semplice senza tag.';
  const segs = buildSegments(raw, [], S);
  assert.equal(join(segs), raw);
  assert.ok(segs.every((s) => !s.bold));
});

test('segments always reconstruct rawText exactly (no loss, no edit)', () => {
  const raw = 'Il 12/03/2025 visita. Anamnesi familiare: padre diabetico.';
  const segs = buildSegments(
    raw,
    [ann(raw, '12/03/2025', 'DATE'), ann(raw, 'Anamnesi familiare', 'SUBSECTION_TITLE')],
    S,
  );
  assert.equal(join(segs), raw);
});

test('DATE annotation produces an exact bold span', () => {
  const raw = 'Controllo il 09/09/2025.';
  const segs = buildSegments(raw, [ann(raw, '09/09/2025', 'DATE')], S);
  const bold = segs.filter((s) => s.bold);
  assert.equal(bold.length, 1);
  assert.equal(bold[0].text, '09/09/2025');
  assert.equal(bold[0].tag, 'DATE');
});

test('SUBSECTION_TITLE bolded (anamnesis subtitles)', () => {
  const raw = 'Anamnesi patologica remota: pregresso IMA.';
  const segs = buildSegments(raw, [ann(raw, 'Anamnesi patologica remota', 'SUBSECTION_TITLE')], S);
  assert.ok(segs.some((s) => s.bold && s.text === 'Anamnesi patologica remota'));
});

test('wrong-offset annotation is ignored (text still rendered, never mutated)', () => {
  const raw = 'Decorso regolare.';
  const segs = buildSegments(
    raw,
    [{ tag: 'DATE', text: '01/01/2099', startOffset: 0, endOffset: 10 }],
    S,
  );
  assert.equal(join(segs), raw);
  assert.ok(segs.every((s) => !s.bold));
});

test('annotation whose text mismatches its offsets is ignored', () => {
  const raw = 'Diagnosi: BPCO.';
  const segs = buildSegments(
    raw,
    [{ tag: 'SECTION_TITLE', text: 'Diagnosi', startOffset: 0, endOffset: 4 }],
    S,
  );
  assert.equal(join(segs), raw);
  assert.ok(segs.every((s) => !s.bold));
});

test('overlapping annotations: inner one skipped (no double wrap)', () => {
  const raw = '12/03/2025 ore 10:00';
  const segs = buildSegments(
    raw,
    [
      { tag: 'DATE', text: '12/03/2025 ore 10:00', startOffset: 0, endOffset: 20 },
      { tag: 'TIME', text: '10:00', startOffset: 15, endOffset: 20 },
    ],
    S,
  );
  assert.equal(join(segs), raw);
  assert.equal(segs.filter((s) => s.bold).length, 1);
});

test('illegible markers are highlighted', () => {
  const raw = 'Allergia a [ILLEGGIBILE] grave.';
  const segs = buildSegments(raw, [], S);
  assert.equal(join(segs), raw);
  assert.ok(segs.some((s) => s.illegible && s.text === '[ILLEGGIBILE]'));
});

test('ALLERGY_CRITICAL carries the critical class', () => {
  const raw = 'Penicillina';
  const segs = buildSegments(raw, [ann(raw, 'Penicillina', 'ALLERGY_CRITICAL')], S);
  assert.equal(segs[0].className, 'stt-allergy-critical');
  assert.ok(segs[0].bold);
});

test('no HTML is produced: literal angle brackets stay as text', () => {
  const raw = 'PA < 120 e <b>non</b> grassetto.';
  const segs = buildSegments(raw, [], S);
  assert.equal(join(segs), raw); // angle brackets preserved verbatim, never interpreted
});
