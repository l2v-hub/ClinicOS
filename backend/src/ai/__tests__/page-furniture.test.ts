// Intestazioni e piè di pagina ripetuti fra le pagine: tolti da dove interrompono il testo,
// mai persi, mai una riga con una dose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  joinPagesWithoutFurniture,
  pageOffsets,
  splitPages,
  stripPageFurniture,
} from '../sections/page-furniture.js';

// Trascrizione OCR reale (documento sintetico) delle due pagine di una lettera.
const HEADER = [
  'Azienda Ospedaliera Santa Chiara (dati di prova)',
  '',
  'U.O. Medicina Interna 2 — Direttore: Dott. P. Ferri',
  '',
  'Via dei Tigli 14, 40100 Bologna — Tel. 051 5550100',
  '',
  'Cod. documento LD-2026-004471',
  '',
  'Stampato il 18/11/2026 10:42',
  '',
];
const footer = (n: number) => [
  '',
  'Azienda Ospedaliera Santa Chiara — U.O. Medicina Interna 2 — documento di prova senza valore clinico',
  '',
  `LD-2026-004471 — pag. ${n}/2`,
];
const PAGE_1 = [
  ...HEADER,
  'Pagina 1 di 2',
  '',
  '# LETTERA DI DIMISSIONE',
  '',
  'Cognome e nome: BIANCHI GIOVANNI',
  '',
  '# DECORSO CLINICO',
  '',
  'Avviata terapia diuretica endovenosa con progressivo miglioramento del compenso e calo ponderale di 5',
  'kg. Alla dimissione paziente eupnoico a riposo, apiretico.',
  ...footer(1),
].join('\n');
const PAGE_2 = [
  ...HEADER,
  'Pagina 2 di 2',
  '',
  'Paziente: BIANCHI GIOVANNI — nato il 07/10/1941 — CF BNCGNN41R07A944W',
  '',
  'TERAPIA DOMICILIARE CONSIGLIATA',
  '',
  '| Farmaco | Dose | Posologia | Via | Note |',
  '| --- | --- | --- | --- | --- |',
  '| Bisoprololo 2,5 mg cpr | 2,5 mg | 1 cpr ore 8 | os | |',
  ...footer(2),
].join('\n');

test('repeated headers stay on the first page, repeated footers on the last: the text between pages is continuous', () => {
  const { pages, removedLines } = stripPageFurniture([PAGE_1, PAGE_2]);
  // Header: once, at the top of the document.
  assert.ok(pages[0].startsWith('Azienda Ospedaliera Santa Chiara (dati di prova)'));
  for (const line of HEADER.filter(Boolean)) assert.ok(!pages[1].includes(line), line);
  // Footer: once, at the end of the document.
  assert.ok(!pages[0].includes('documento di prova senza valore clinico'));
  assert.ok(!pages[0].includes('pag. 1/2'));
  assert.ok(pages[1].includes('documento di prova senza valore clinico'));
  assert.ok(pages[1].endsWith('LD-2026-004471 — pag. 2/2'));
  assert.equal(removedLines, 7); // 5 header lines on page 2 + 2 footer lines on page 1
  // Clinical text and the patient strip are untouched.
  assert.ok(pages[0].includes('Alla dimissione paziente eupnoico a riposo, apiretico.'));
  assert.ok(pages[1].includes('Paziente: BIANCHI GIOVANNI'));
  assert.ok(pages[1].includes('| Bisoprololo 2,5 mg cpr | 2,5 mg | 1 cpr ore 8 | os | |'));
  // Between the last clinical line of page 1 and the first of page 2 there is no page furniture
  // left, except the page number, which the header filter turns into its own marker.
  const joined = joinPagesWithoutFurniture([PAGE_1, PAGE_2]);
  const between = joined.slice(
    joined.indexOf('apiretico.') + 'apiretico.'.length,
    joined.indexOf('Paziente: BIANCHI'),
  );
  assert.equal(between.trim(), 'Pagina 2 di 2');
});

test('nothing is lost: every distinct line of the letter is still present once', () => {
  const joined = joinPagesWithoutFurniture([PAGE_1, PAGE_2]);
  const distinct = new Set(
    [PAGE_1, PAGE_2]
      .join('\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  );
  // The two footer page numbers are one footer line: the last one is kept.
  distinct.delete('LD-2026-004471 — pag. 1/2');
  for (const line of distinct) assert.ok(joined.includes(line), line);
});

test('a single page is returned as it is: there is no repetition to recognise', () => {
  assert.deepEqual(stripPageFurniture([PAGE_1]), { pages: [PAGE_1], removedLines: 0 });
});

test('a line carrying a dose is never page furniture, even when two pages end with it', () => {
  const a = 'TERAPIA IN CORSO\n\nRamipril 5 mg 1 cpr ore 8\nParacetamolo 1000 mg 1 cpr al bisogno';
  const b =
    'TERAPIA DOMICILIARE\n\nBisoprololo 2,5 mg 1 cpr ore 8\nParacetamolo 1000 mg 1 cpr al bisogno';
  assert.deepEqual(stripPageFurniture([a, b]).pages, [a, b]);
});

test('a repeated table header is kept once; the page-number-only line is left to the header filter', () => {
  const head = '| Farmaco | Dose | Posologia |';
  const a = `${head}\n| Ramipril | 5 mg | ore 8 |\n\nPagina 1 di 2`;
  const b = `${head}\n| Bisoprololo | 2,5 mg | ore 8 |\n\nPagina 2 di 2`;
  const { pages } = stripPageFurniture([a, b]);
  assert.ok(pages[0].includes(head));
  assert.ok(!pages[1].includes(head));
  assert.ok(pages[0].includes('Pagina 1 di 2'));
  assert.ok(pages[1].includes('Pagina 2 di 2'));
});

test('a line on one page only is content, whatever its position', () => {
  const a = 'Ospedale Alfa\nReparto Medicina\n\nTesto clinico della prima pagina.';
  const b = 'Ospedale Alfa\nReparto Chirurgia\n\nTesto clinico della seconda pagina.';
  const { pages } = stripPageFurniture([a, b]);
  assert.ok(pages[0].includes('Reparto Medicina'));
  assert.ok(pages[1].includes('Reparto Chirurgia'));
  assert.ok(!pages[1].includes('Ospedale Alfa'));
});

test('page offsets rebuild the pages of the stored text; without valid offsets it is one page', () => {
  const texts = [PAGE_1, '', PAGE_2];
  const raw = texts.join('\n\n');
  assert.deepEqual(splitPages(raw, pageOffsets(texts)), texts);
  assert.deepEqual(splitPages(raw, undefined), [raw]);
  assert.deepEqual(splitPages(raw, [0, 999999]), [raw]);
  assert.deepEqual(splitPages(raw, [5, 20]), [raw]);
  assert.deepEqual(splitPages(raw, [0, 1]), [raw]);
});
