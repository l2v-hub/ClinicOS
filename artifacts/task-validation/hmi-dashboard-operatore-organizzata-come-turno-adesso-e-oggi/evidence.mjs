// Evidenza browser: dashboard operatore organizzata come "Turno".
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-dashboard-operatore-organizzata-come-turno-adesso-e-oggi';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const browser = await chromium.launch();
for (const width of [768, 900, 1024, 1280, 1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.locator('.od-shift').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const top = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + window.scrollY) : null; };
    const cols = [...document.querySelectorAll('.od-shift__col')].map((c) => { const r = c.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top + window.scrollY), title: c.querySelector('.od-shift__title')?.textContent?.trim() }; });
    const inCol = (sel, title) => { const e = document.querySelector(sel); return !!e && e.closest('.od-shift__col')?.querySelector('.od-shift__title')?.textContent?.trim() === title; };
    return {
      order: [top('[class^="dashboard-notification-bar"], .dashboard-notification-bar'), top('[class*="kpi"]'), top('.od-shift')],
      cols,
      deadlinesInNow: inCol('.dashboard-therapy-deadlines, [class*="therapy-deadlines"]', 'Adesso'),
      agendaInToday: inCol('.agenda-day-list', 'Oggi'),
      agendaHeader: [...document.querySelectorAll('.section-header__title')].some((h) => /Agenda di Oggi/.test(h.textContent)),
      vediTutto: [...document.querySelectorAll('.od-shift button')].some((b) => /Vedi tutto/.test(b.textContent)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // dentro la card: nessun figlio oltre il bordo destro (la card ha overflow:hidden)
      clipped: (() => { const card = document.querySelector('.od-shift .therapy-deadlines'); if (!card) return -1; const r = card.getBoundingClientRect().right; return [...card.querySelectorAll('.therapy-deadlines__row > *')].filter((e) => e.getBoundingClientRect().right > r + 0.5).length; })(),
      rows: document.querySelectorAll('.od-shift .therapy-deadlines__row').length,
      timingVisible: (() => { const card = document.querySelector('.od-shift .therapy-deadlines'); if (!card) return false; const r = card.getBoundingClientRect(); const t = [...card.querySelectorAll('.therapy-deadlines__timing')]; return t.length > 0 && t.every((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.left >= r.left && b.right <= r.right + 0.5; }); })(),
      topsAligned: (() => { const c = [...document.querySelectorAll('.od-shift__col')].map((col) => { const f = col.children[1]; return f ? Math.round(f.getBoundingClientRect().top) : null; }); return c; })(),
    };
  });
  const [n, k, s] = m.order;
  check(`${width}: ordine notifiche → indicatori → Turno`, n !== null && k !== null && s !== null && n < k && k < s, JSON.stringify(m.order));
  check(`${width}: sezioni "Adesso" e "Oggi"`, m.cols.map((c) => c.title).join(',') === 'Adesso,Oggi', JSON.stringify(m.cols));
  if (width >= 768) check(`${width}: colonne affiancate`, m.cols.length === 2 && m.cols[0].top === m.cols[1].top && m.cols[1].left > m.cols[0].left);
  else check(`${width}: colonne impilate`, m.cols.length === 2 && m.cols[1].top > m.cols[0].top && m.cols[0].left === m.cols[1].left);
  check(`${width}: scadenze di terapia in "Adesso", agenda in "Oggi" con "Vedi tutto"`, m.deadlinesInNow && m.agendaInToday && m.agendaHeader && m.vediTutto, JSON.stringify({ d: m.deadlinesInNow, a: m.agendaInToday, h: m.agendaHeader, v: m.vediTutto }));
  check(`${width}: righe scadenze intere dentro la card (nessuna colonna tagliata)`, m.rows > 0 && m.clipped === 0 && m.timingVisible, JSON.stringify({ rows: m.rows, clipped: m.clipped, timing: m.timingVisible }));
  if (width >= 768) check(`${width}: primo blocco di "Adesso" e "Oggi" alla stessa altezza`, m.topsAligned[0] !== null && m.topsAligned[0] === m.topsAligned[1], JSON.stringify(m.topsAligned));
  check(`${width}: nessuno scorrimento orizzontale`, m.overflow <= 0, `overflow=${m.overflow}`);
  await page.screenshot({ path: `${DIR}/screenshots/turno-${width}.png`, fullPage: true });
  await page.close();
}
await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
