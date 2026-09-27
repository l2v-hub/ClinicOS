// Evidenza browser: note e messaggi come il prototipo HMI 1 (stub API :3001; PUT /notes/:id
// simulato con page.route, risponde con la nota aggiornata).
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-9-note-e-messaggi-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
async function openNotes(width, { failList = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const puts = [];
  const queries = [];
  page.on('dialog', (d) => d.dismiss());
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/notes' && r.method() === 'GET')
      queries.push(Object.fromEntries(u.searchParams));
  });
  await page.route(/\/notes\/[^/?]+$/, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    const body = JSON.parse(route.request().postData() ?? '{}');
    puts.push({ id: route.request().url().split('/').pop(), ...body });
    const all = (await (await fetch('http://localhost:3001/notes?limit=200')).json()).items ?? [];
    const orig = all.find((n) => n.id === puts.at(-1).id) ?? {};
    route.fulfill({ json: { ...orig, ...body, id: puts.at(-1).id } });
  });
  if (failList)
    await page.route(/\/notes(\?.*)?$/, (route) =>
      route.fulfill({ status: 500, json: { error: 'x' } }),
    );
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Note"]').click();
  await page.waitForTimeout(2500);
  return { page, puts, queries };
}
const state = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.topbar-title')?.textContent ?? '',
    cardTitle: document.querySelector('.nm-card__title')?.textContent ?? '',
    newBtnH: Math.round(document.querySelector('.nm-card__head .ds-btn--primary')?.getBoundingClientRect().height ?? 0),
    rows: [...document.querySelectorAll('.nm-row')].map((r) => ({
      avatar: r.querySelector('.nm-avatar')?.textContent,
      unread: !!r.querySelector('.nm-dot'),
      author: r.querySelector('.nm-author')?.textContent,
      dest: r.querySelector('.nm-dest')?.textContent,
      prio: r.querySelector('.nm-prio')?.textContent ?? null,
      time: r.querySelector('.nm-time')?.textContent,
      text: r.querySelector('.nm-message')?.textContent?.trim(),
      h: Math.round(r.getBoundingClientRect().height),
    })),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

{
  const { page, puts } = await openNotes(1180);
  const s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/note-1180.png` });
  check(
    'AC1 intestazione "Note e messaggi" e "N da leggere"',
    /Note e messaggi/.test(s.title) && /\d+ da leggere|Tutte lette/.test(s.title),
    s.title,
  );
  check(
    'AC1 card "Messaggi" con "Nuova nota" 48 px',
    s.cardTitle === 'Messaggi' && s.newBtnH === 48,
    `${s.cardTitle} ${s.newBtnH}`,
  );
  const r0 = s.rows[0];
  check(
    'AC1 righe compatte: avatar, autore → destinatario, testo, ora',
    s.rows.length > 3 &&
      /^[A-Z?]{1,2}$/.test(r0.avatar) &&
      r0.author &&
      /^→ /.test(r0.dest) &&
      r0.text &&
      /\d{2}:\d{2}|\d{2} \w+/.test(r0.time),
    JSON.stringify(r0),
  );
  check(
    'AC1 non lette con puntino; urgenti con "Urgente"; normali senza badge',
    s.rows.some((r) => r.unread) &&
      s.rows.some((r) => r.prio === 'Urgente') &&
      s.rows.some((r) => r.prio === null),
    JSON.stringify(s.rows.slice(0, 3).map((r) => [r.unread, r.prio])),
  );
  // AC2 — azioni
  const firstUnread = page.locator('.nm-row--unread').first();
  await firstUnread.getByRole('button', { name: 'Segna come letta' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Segna come risolta' }).first().click();
  await page.waitForTimeout(800);
  check(
    'AC2 "Segna come letta" e "Segna come risolta" inviano lo stato di sempre',
    puts.some((p) => p.stato === 'letta') && puts.some((p) => p.stato === 'risolta'),
    JSON.stringify(puts.map((p) => p.stato)),
  );
  await page.getByRole('button', { name: 'Nuova nota', exact: true }).click();
  await page.waitForTimeout(400);
  const form = await page.locator('#nuova-nota-panel').count();
  const expanded = await page
    .getByRole('button', { name: 'Nuova nota', exact: true })
    .getAttribute('aria-expanded');
  check(
    'AC2 "Nuova nota" apre il modulo esistente',
    form === 1 && expanded === 'true',
    `${form} ${expanded}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/nuova-nota.png` });
  await page.close();
}
{
  const { page, queries } = await openNotes(1180);
  await page.getByRole('button', { name: /^Non lette/ }).click();
  await page.waitForTimeout(800);
  await page.getByLabel('Cerca nelle note').fill('sintetico 3');
  await page.waitForTimeout(900);
  check(
    'AC3 filtri e ricerca inviano la stessa query (box, q)',
    queries.some((q) => q.box === 'unread') && queries.some((q) => q.q === 'sintetico 3'),
    JSON.stringify(queries.slice(-3)),
  );
  await page.close();
}
{
  const { page } = await openNotes(1180, { failList: true });
  const retry = await page.getByRole('button', { name: 'Riprova' }).count();
  check('AC3 errore di caricamento con "Riprova"', retry >= 1, `${retry}`);
  await page.close();
}
// Verifica QA: iniziali da nomi insoliti ed etichette delle azioni con il contesto della nota
{
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.route(/\/notes(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const data = await res.json();
    const names = ['  (Sistema)  ', 'Dr.Rossi', 'Dr.ssa Francesca Neri', ''];
    data.items.slice(0, 4).forEach((n, i) => (n.autoreNome = names[i]));
    route.fulfill({ json: data });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('.teams-sidebar__item[title="Note"]').click();
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => ({
    avatars: [...document.querySelectorAll('.nm-avatar')].slice(0, 4).map((a) => a.textContent),
    label: document.querySelector('.nm-row .ds-icon-btn')?.getAttribute('aria-label'),
  }));
  check('QA1 iniziali: "(Sistema)"→S, "Dr.Rossi"→R, "Dr.ssa Francesca Neri"→FN, vuoto→?', JSON.stringify(r.avatars) === JSON.stringify(['S', 'R', 'FN', '?']), JSON.stringify(r.avatars));
  check('QA1 azioni con il contesto della nota', /^Segna come risolta: nota di .+ delle /.test(r.label ?? ''), r.label ?? '');
  await page.close();
}
for (const width of [390, 768, 1024, 1440]) {
  const { page } = await openNotes(width);
  const s = await state(page);
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, righe presenti`,
    s.overflow <= 0 && s.rows.length > 0,
    `overflow ${s.overflow}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/note-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
