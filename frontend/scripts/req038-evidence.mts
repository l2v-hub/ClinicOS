// REQ-038 visual evidence: render the REAL segment output (withDatePrefixes + buildSegments) and the
// REAL stt CSS to static HTML, then Playwright screenshots it. View mode bolds line-initial dates;
// edit mode shows the plain stored text (no markdown/HTML).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildSegments } from '../src/components/shared/sections/segments.js';
import { withDatePrefixes } from '../src/components/shared/sections/datePrefix.js';
import { DEFAULT_TAG_STYLES } from '../src/components/shared/sections/tagStyles.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, '..', '..', 'requirements', 'evidence', 'REQ-038');
mkdirSync(EVID, { recursive: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderHtml(text: string): string {
  const segs = buildSegments(text, withDatePrefixes(text, []), DEFAULT_TAG_STYLES);
  return segs.map((s) => (s.bold ? `<strong class="${s.className ?? ''}">${esc(s.text)}</strong>` : esc(s.text))).join('');
}

const SECTIONS: Record<string, { title: string; text: string }> = {
  'hospital-course': { title: 'Decorso ospedaliero', text: '09/03/2026 La paziente viene inviata in Pronto Soccorso per dolore toracico.\n\n12/03/2026 Viene eseguita consulenza cardiologica.\n\nIl 15/03/2026 dimissione in condizioni stabili.' },
  'consultations': { title: 'Consulenze', text: 'In data 09/03/2026 consulenza cardiologica.\n- 10/03/2026 parere pneumologico\n- 11 marzo 2026 valutazione fisiatrica' },
  'imaging': { title: 'Diagnostica per immagini', text: '09/03/2026 Rx torace: congestione.\n10-03-2026 ecocardiogramma di controllo.' },
  'therapy': { title: 'Terapia', text: '09/03/2026 Avvio terapia con Ramipril 5 mg 1 cp/die.\nLa dose è stata modificata il 12/03/2026.' },
};

const cssBlock = readFileSync(join(HERE, '..', 'src', 'app-additions.css'), 'utf8')
  .split('\n').filter((l) => l.includes('.stt-') || l.includes('.semantic-tagged-text')).join('\n');

const baseStyle = `
  body{font-family:Inter,system-ui,Arial,sans-serif;background:#F2F4F7;margin:0;padding:24px;color:#101828}
  .card{background:#fff;border:1px solid #D0D5DD;border-radius:12px;padding:16px 18px;margin:0 0 16px;max-width:900px}
  .card h3{margin:0 0 8px;font-size:14px;color:#475467;text-transform:uppercase;letter-spacing:.04em}
  .semantic-tagged-text{white-space:pre-wrap;line-height:1.6;font-size:15px}
  strong{font-weight:700}
  textarea{width:100%;box-sizing:border-box;min-height:96px;font:inherit;padding:10px;border:1px solid #D0D5DD;border-radius:8px}
  ${cssBlock}
`;

function page(cards: string): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${baseStyle}</style></head><body>${cards}</body></html>`;
}

const VP = { width: 1366, height: 768 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VP });
const pg = await ctx.newPage();

for (const [key, sec] of Object.entries(SECTIONS)) {
  const html = page(`<div class="card"><h3>${sec.title}</h3><div class="semantic-tagged-text">${renderHtml(sec.text)}</div></div>`);
  await pg.setContent(html, { waitUntil: 'load' });
  await pg.locator('.card').screenshot({ path: join(EVID, `${key}-date-prefix-bold.png`) });
}

// edit mode: the SAME stored text is plain in a textarea — no bold, no markdown.
const edit = SECTIONS['hospital-course'].text;
await pg.setContent(page(`<div class="card"><h3>Decorso ospedaliero — modifica</h3><textarea>${esc(edit)}</textarea></div>`), { waitUntil: 'load' });
await pg.locator('.card').screenshot({ path: join(EVID, 'edit-mode-plain-text.png') });

await browser.close();
console.log('REQ-038 screenshots written to', EVID);
