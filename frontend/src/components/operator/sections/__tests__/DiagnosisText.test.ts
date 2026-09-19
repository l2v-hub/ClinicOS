import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiagnosisText } from '../DiagnosisText';

const render = (text: string) => renderToStaticMarkup(createElement(DiagnosisText, { text }));

test('OCR headings, paragraphs and bold passages are readable without rewriting the source', () => {
  const source = '# Diagnosi di dimissione\r\n\r\nPrima riga\r\nSeconda riga **senza sintomi**.\r\n\r\nControllo programmato.';
  const html = render(source);
  assert.match(html, /<h4>Diagnosi di dimissione<\/h4>/);
  assert.match(html, /<p>Prima riga\nSeconda riga <strong>senza sintomi<\/strong>\.<\/p>/);
  assert.match(html, /<p>Controllo programmato\.<\/p>/);
  assert.ok(source.startsWith('# Diagnosi di dimissione\r\n\r\n'));
});

test('list markers, numbering, signs and intervening paragraphs retain their content and order', () => {
  const html = render('- Osservazione\n• Monitoraggio\n\nNota tra gli elenchi.\nSeconda riga.\n\n3) Controllo\n7. Rivalutazione\n- 3 mmol/L');
  assert.equal((html.match(/<ul>/g) ?? []).length, 2);
  for (const marker of ['-', '•', '3)', '7.']) assert.ok(html.includes(`>${marker}</span>`));
  assert.match(html, /<p>Nota tra gli elenchi\.\nSeconda riga\.<\/p>/);
  assert.ok(html.indexOf('Monitoraggio') < html.indexOf('Nota tra gli elenchi'));
  assert.ok(html.indexOf('Nota tra gli elenchi') < html.indexOf('Controllo'));
  assert.ok(html.includes('3 mmol/L'));
});

test('HTML and external resources from OCR stay literal escaped text', () => {
  const html = render('<script>alert(1)</script>\n<img src="https://example.invalid/image" onerror="alert(1)">\n**<b>testo</b>**\n[link](javascript:alert(1))\n![foto](https://example.invalid/x)');
  assert.doesNotMatch(html, /<(?:script|img|a|b)(?:\s|>)/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<strong>&lt;b&gt;testo&lt;\/b&gt;<\/strong>/);
  assert.ok(html.includes('[link](javascript:alert(1))'));
  assert.ok(html.includes('![foto](https://example.invalid/x)'));
});

test('unsupported or incomplete markup and clinical comparison signs remain visible', () => {
  const html = render('#senza spazio\n**enfasi incompleta\nValore < 5 e > 2; **assenza** di sintomi.\n| Colonna | Valore |');
  assert.ok(html.includes('#senza spazio'));
  assert.ok(html.includes('**enfasi incompleta'));
  assert.ok(html.includes('Valore &lt; 5 e &gt; 2; <strong>assenza</strong> di sintomi.'));
  assert.ok(html.includes('| Colonna | Valore |'));
});

test('long narrative is not shortened or split by guessed sentence boundaries', () => {
  const source = `Testo iniziale.\n${'Passaggio clinico sintetico senza variazioni. '.repeat(400)}\nUltima riga.`;
  const html = render(source);
  assert.ok(html.includes(source));
  assert.match(html, /Ultima riga\.<\/p>/);
});
