import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRepeatedHeaders, loadHeaderFilterConfig } from '../sections/header-filter.js';

// A tabular patient header printed on every page.
const HEADER = [
  'Paziente: NOBILI DANIELA',
  'Nascita: 30/01/1944',
  'Residenza: IMOLA (BO)',
  'Codice Fiscale: NBLDNL44A70',
  'Reparto: Cardiologia',
].join('\n');

const page = (n: number, body: string) => `${HEADER}\n\n${body}\n\nPagina ${n} di 3`;

test('identical header on every page → kept once, removed from later pages', () => {
  const doc = [page(1, '## Anamnesi\nDolore toracico.'), page(2, 'Proseguiva il ricovero.'), page(3, '## Terapia\nRamipril 5 mg.')].join('\n');
  const r = filterRepeatedHeaders(doc);
  // header text appears exactly once in the cleaned output
  const occurrences = (r.cleanedText.match(/Codice Fiscale: NBLDNL44A70/g) || []).length;
  assert.equal(occurrences, 1, 'header kept exactly once');
  assert.ok(r.removedHeaderBlocks >= 2, 'two later header blocks removed');
});

test('header with SAME labels but DIFFERENT values is still detected as repeated', () => {
  const h2 = HEADER.replace('IMOLA (BO)', 'BOLOGNA (BO)'); // a value changed
  const doc = [HEADER + '\n\n## Anamnesi\nA.', h2 + '\n\nContinua.'].join('\n');
  const r = filterRepeatedHeaders(doc);
  assert.ok(r.removedHeaderBlocks >= 1, 'repetition detected by labels, not values');
});

test('page WITHOUT a header is left untouched', () => {
  const doc = '## Diagnosi\nScompenso cardiaco.\n\n## Terapia\nFurosemide.';
  const r = filterRepeatedHeaders(doc);
  assert.equal(r.removedHeaderBlocks, 0);
  assert.ok(r.cleanedText.includes('Scompenso cardiaco.'));
  assert.ok(r.cleanedText.includes('Furosemide.'));
});

test('clinical text at the TOP of a page is not mistaken for a header', () => {
  const doc = ['Il paziente è stato ricoverato per dolore toracico acuto e dispnea ingravescente.', '## Diagnosi\nIMA.'].join('\n');
  const r = filterRepeatedHeaders(doc);
  assert.equal(r.removedHeaderBlocks, 0);
  assert.ok(r.cleanedText.includes('dolore toracico acuto'));
});

test('ambiguous repeated block BELOW threshold is kept and flagged', () => {
  // only 2 labels (< requiredMatches 3) would not even be a candidate; force ambiguity with a
  // high threshold so a real header scores below it.
  const doc = [HEADER + '\n\nA.', HEADER + '\n\nB.'].join('\n');
  const r = filterRepeatedHeaders(doc, { confidenceThreshold: 0.99 });
  assert.equal(r.removedHeaderBlocks, 0, 'nothing removed below threshold');
  assert.ok(r.warnings.some((w) => w.startsWith('AMBIGUOUS_HEADER_KEPT')), 'ambiguity warned');
});

test('#275: page-number footer is normalized and KEPT (sequential-reading aid)', () => {
  const doc = [page(1, '## Anamnesi\nA.'), page(2, 'B.')].join('\n');
  const r = filterRepeatedHeaders(doc);
  assert.ok(r.detectedPageNumbers.includes(1) && r.detectedPageNumbers.includes(2), 'page numbers recovered');
  // #275: the noisy footer is normalized, but the page N/total marker is KEPT — it lets a reader
  // follow a multi-page document in sequential order (the original "Pagina 1 di 3" wording is gone).
  assert.ok(!/Pagina \d+ di 3/.test(r.cleanedText), 'original footer wording normalized');
  assert.ok(/--- Pagina 1\/3 ---/.test(r.cleanedText), 'page 1 marker kept');
  assert.ok(/--- Pagina 2\/3 ---/.test(r.cleanedText), 'page 2 marker kept');
  assert.equal(r.keptPageMarkers, 2);
  assert.equal(r.removedFooterLines, 0, 'markers kept, not removed');
  assert.ok(r.cleanedText.indexOf('Pagina 1/3') < r.cleanedText.indexOf('Pagina 2/3'), 'markers stay in reading order');
});

test('#275: page marker without a total is kept as "--- Pagina N ---"', () => {
  const doc = 'Diagnosi.\n\nPagina 1\n\nProsegue.\n\nPagina 2';
  const r = filterRepeatedHeaders(doc);
  assert.ok(/--- Pagina 1 ---/.test(r.cleanedText) && /--- Pagina 2 ---/.test(r.cleanedText));
  assert.equal(r.keptPageMarkers, 2);
});

test('#275: opt-out (keepPageMarkers:false) restores the old strip behavior', () => {
  const doc = [page(1, 'A.'), page(2, 'B.')].join('\n');
  const r = filterRepeatedHeaders(doc, { keepPageMarkers: false });
  assert.ok(!/Pagina/.test(r.cleanedText), 'markers removed when opted out');
  assert.equal(r.keptPageMarkers, 0);
  assert.ok(r.removedFooterLines >= 2);
});

test('footer line that ALSO carries text is kept and warned', () => {
  const doc = 'Diagnosi principale.\nControllo cardiologico tra 30 giorni — Pagina 1 di 2';
  const r = filterRepeatedHeaders(doc);
  assert.ok(r.cleanedText.includes('Controllo cardiologico'), 'clinical footer text kept');
  assert.ok(r.warnings.includes('FOOTER_WITH_EXTRA_TEXT_KEPT'));
});

test('anagraphic data from the first page is preserved (first header kept)', () => {
  const doc = [page(1, '## Anamnesi\nA.'), page(2, 'B.'), page(3, 'C.')].join('\n');
  const r = filterRepeatedHeaders(doc);
  assert.ok(r.cleanedText.includes('Paziente: NOBILI DANIELA'), 'first anagraphic header kept');
  assert.ok(r.cleanedText.includes('Codice Fiscale: NBLDNL44A70'));
});

test('Anamnesi split across two pages becomes contiguous after the interleaved header is removed', () => {
  const doc = [
    HEADER, '', '## Anamnesi Patologica', 'Inviata in PS per dolore toracico.', '',
    HEADER, '', 'Proseguiva il ricovero con stabilizzazione.', '',
  ].join('\n');
  const r = filterRepeatedHeaders(doc);
  const idxStart = r.cleanedText.indexOf('Inviata in PS');
  const idxCont = r.cleanedText.indexOf('Proseguiva il ricovero');
  assert.ok(idxStart >= 0 && idxCont > idxStart, 'anamnesi continuation follows directly');
  // no header label sits between the two anamnesi fragments
  const between = r.cleanedText.slice(idxStart, idxCont);
  assert.ok(!/Codice Fiscale/.test(between), 'no header interleaved inside the section');
});

test('Terapia continuation across pages stays contiguous', () => {
  const doc = [HEADER, '', '## Terapia', 'Ramipril 5 mg.', '', HEADER, '', 'Furosemide 25 mg.'].join('\n');
  const r = filterRepeatedHeaders(doc);
  const between = r.cleanedText.slice(r.cleanedText.indexOf('Ramipril'), r.cleanedText.indexOf('Furosemide'));
  assert.ok(!/Reparto:/.test(between), 'no header between therapy fragments');
});

test('no anagraphic duplication: each label value appears once', () => {
  const doc = [page(1, 'A.'), page(2, 'B.'), page(3, 'C.')].join('\n');
  const r = filterRepeatedHeaders(doc);
  assert.equal((r.cleanedText.match(/Paziente: NOBILI DANIELA/g) || []).length, 1);
  assert.equal((r.cleanedText.match(/Reparto: Cardiologia/g) || []).length, 1);
});

test('idempotent: re-running on cleaned text removes nothing further', () => {
  const doc = [page(1, 'A.'), page(2, 'B.')].join('\n');
  const once = filterRepeatedHeaders(doc);
  const twice = filterRepeatedHeaders(once.cleanedText);
  assert.equal(twice.removedHeaderBlocks, 0);
  assert.equal(twice.removedFooterLines, 0);
});

// BUG-046 (#68) regression: a header packed as MULTIPLE "label: value" pairs on ONE row
// (not one-label-per-line) must still be detected and de-duplicated. Reproduces the prod
// multipage bleed where the repeated inline header landed inside the Anamnesi block.
test('BUG-046: inline multi-label header row repeated across pages is removed from later pages', () => {
  // Real-OCR shape: the two header rows are separated by a BLANK line, and the 2nd row alone has
  // only 2 labels (< requiredMatches). The scanner must still treat them as one header block.
  const INLINE = [
    'Paziente: ROSSI MARIO (PAZIENTE FITTIZIO) Nascita: 01/01/1950 Sesso: M', '',
    'Residenza: Via di Prova 1, Testopoli Codice Fiscale: RSSMRA50A01L000T Cartella: TEST-0001',
  ].join('\n');
  const doc = [
    INLINE, '', '## Anamnesi Patologica Recente:', 'Frase di prova pagina uno.', '',
    INLINE, '', 'Frase di prova pagina due.', '',
    '## Terapia alla dimissione:', 'Farmaco A 5 mg.',
  ].join('\n');
  const r = filterRepeatedHeaders(doc);
  assert.ok(r.removedHeaderBlocks >= 1, 'the repeated inline header block is detected and removed');
  // the two anamnesi fragments are now contiguous with no header label between them
  const a = r.cleanedText.indexOf('pagina uno');
  const b = r.cleanedText.indexOf('pagina due');
  assert.ok(a >= 0 && b > a, 'anamnesi continuation preserved');
  const between = r.cleanedText.slice(a, b);
  assert.ok(!/Codice Fiscale/i.test(between) && !/Cartella/i.test(between), 'no header bleed inside the section');
  // first occurrence kept (anagraphic data preserved)
  assert.equal((r.cleanedText.match(/RSSMRA50A01L000T/g) || []).length, 1);
});

test('config: env threshold + label list are honoured', () => {
  const cfg = loadHeaderFilterConfig({ DOCUMENT_HEADER_CONFIDENCE_THRESHOLD: '0.5', DOCUMENT_HEADER_REQUIRED_MATCHES: '2', DOCUMENT_HEADER_LABELS: 'paziente,reparto' } as NodeJS.ProcessEnv);
  assert.equal(cfg.confidenceThreshold, 0.5);
  assert.equal(cfg.requiredMatches, 2);
  assert.deepEqual(cfg.labels, ['paziente', 'reparto']);
});

test('empty input is safe', () => {
  const r = filterRepeatedHeaders('');
  assert.equal(r.cleanedText, '');
  assert.equal(r.removedHeaderBlocks, 0);
});
