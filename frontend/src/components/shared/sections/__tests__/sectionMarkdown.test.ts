import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SemanticTaggedText, type SemanticTaggedTextProps } from '../SemanticTaggedText';
import { sectionMarkdownBlocks } from '../sectionMarkdown';
import type { SemanticAnnotation } from '../types';

const render = (rawText: string, props: Partial<SemanticTaggedTextProps> = {}) =>
  renderToStaticMarkup(createElement(SemanticTaggedText, { rawText, formatMarkdown: true, ...props }));
const annotation = (raw: string, text: string, tag: SemanticAnnotation['tag']): SemanticAnnotation => ({
  text, tag, startOffset: raw.indexOf(text), endOffset: raw.indexOf(text) + text.length,
});

test('formatting is opt-in and default source view keeps literal Markdown and CRLF', () => {
  const raw = '# Titolo\r\n\r\n-Testo **marcato**';
  const html = render(raw, { formatMarkdown: false });
  assert.ok(html.includes(raw));
  assert.doesNotMatch(html, /section-markdown|<h4|<ul/);
});

test('CRLF and Unicode source ranges are absolute and do not rewrite source', () => {
  const raw = '# Decorso 😊\r\n\r\n-Testo\r\ncontinua\r\n\r\n## Indicazioni\r\nAltro';
  const blocks = sectionMarkdownBlocks(raw);
  assert.equal(blocks.length, 4);
  assert.equal(blocks[0].kind, 'heading');
  if (blocks[0].kind === 'heading') assert.equal(raw.slice(blocks[0].start, blocks[0].end), 'Decorso 😊');
  assert.equal(blocks[1].kind, 'list');
  if (blocks[1].kind === 'list') assert.equal(raw.slice(blocks[1].items[0].start, blocks[1].items[0].end), 'Testo\r\ncontinua');
  assert.ok(raw.includes('\r\n\r\n## Indicazioni\r\n'));
});

test('OCR bullets without spaces and continuation lines become readable lists', () => {
  const html = render('# Decorso\n\n-E.E.: nella norma\n-TC: controllo\nIndicazione conservata.\n•Monitoraggio\n\n01. Prima indicazione\n7) Seconda indicazione');
  assert.match(html, /<h4><span>Decorso<\/span><\/h4>/);
  assert.equal((html.match(/<li>/g) ?? []).length, 5);
  assert.ok(html.includes('TC: controllo\nIndicazione conservata.'));
  assert.match(html, /class="section-markdown__number">01\.<\/span>/);
  assert.match(html, /class="section-markdown__number">7\)<\/span>/);
});

test('negative values, comparison signs and page markers remain visible, not bullets', () => {
  const html = render('-3 cm\n- 3 mmol/L\n- .5 mg\n- 1e3\n- 3/5\nValore < 5 e > 2\n---Pagina 1/5---');
  assert.doesNotMatch(html, /<ul|<li/);
  assert.ok(html.includes('-3 cm\n- 3 mmol/L\n- .5 mg\n- 1e3\n- 3/5\nValore &lt; 5 e &gt; 2\n---Pagina 1/5---'));
});

test('semantic classes, dates and illegibility keep exact source offsets after Markdown markers', () => {
  const raw = '# Decorso 😊\r\n\r\n-Farmaco **medicina**: [ILLEGGIBILE]\r\n- 12/03/2026 Controllo';
  const html = render(raw, { annotations: [annotation(raw, 'medicina', 'MEDICATION_NAME')] });
  assert.match(html, /<strong class="stt-med">medicina<\/strong>/);
  assert.match(html, /<strong class="stt-date-prefix">12\/03\/2026<\/strong>/);
  assert.match(html, /<mark class="stt-illegible">\[ILLEGGIBILE\]<\/mark>/);
});

test('valid annotations crossing block boundaries are clipped without losing text or style', () => {
  const raw = '# Attenzione\n\n-Controllo richiesto\n\nConclusione';
  const html = render(raw, { annotations: [annotation(raw, raw, 'WARNING_TEXT')] });
  assert.match(html, /<h4><strong class="stt-warning">Attenzione<\/strong><\/h4>/);
  assert.match(html, /<strong class="stt-warning">Controllo richiesto<\/strong>/);
  assert.match(html, /<strong class="stt-warning">Conclusione<\/strong>/);
});

test('wrong offsets are still ignored and semantic style overrides are honored', () => {
  const raw = '# Titolo\n\nTesto clinico';
  const bad = { tag: 'ALLERGY_CRITICAL' as const, text: 'Testo clinico', startOffset: 0, endOffset: 13 };
  assert.doesNotMatch(render(raw, { annotations: [bad] }), /stt-allergy-critical/);
  const valid = annotation(raw, 'Testo clinico', 'ALLERGY_CRITICAL');
  assert.doesNotMatch(render(raw, { annotations: [valid], styleOverrides: { ALLERGY_CRITICAL: { bold: false } } }), /stt-allergy-critical/);
});

test('HTML, resource URLs and unsupported fenced content remain literal and inert', () => {
  const html = render('<script>alert(1)</script>\n<img src="https://example.invalid/x">\n[fonte](javascript:alert(1))\n![foto](https://example.invalid/x)\n\n```text\n# Letterale\n**Letterale**\n```');
  assert.doesNotMatch(html, /<(?:script|img|a)(?:\s|>)/);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('[fonte](javascript:alert(1))'));
  assert.ok(html.includes('![foto](https://example.invalid/x)'));
  assert.ok(html.includes('```text\n# Letterale\n**Letterale**\n```'));
});

test('long annotated narratives retain all sections through the last line', () => {
  const raw = Array.from({ length: 800 }, (_, index) => `# Sezione ${index}\n\n-Indicazione ${index}\n\n`).join('') + 'Ultima riga';
  const html = render(raw, { annotations: [annotation(raw, 'Ultima riga', 'WARNING_TEXT')] });
  assert.equal((html.match(/<h4>/g) ?? []).length, 800);
  assert.equal((html.match(/<li>/g) ?? []).length, 800);
  assert.match(html, /<strong class="stt-warning">Ultima riga<\/strong>/);
});
