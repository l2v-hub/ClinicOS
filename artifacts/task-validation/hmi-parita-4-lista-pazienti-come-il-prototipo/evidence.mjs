// Evidenza browser: lista pazienti come il prototipo HMI 1 (stub API :3001; NEWS2 simulato).
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-4-lista-pazienti-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const iso = (hAgo) =>
  new Date(Date.now() - hAgo * 3600e3).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const full = {
  fr: '24',
  spo2: '92',
  o2: 'no',
  pa: '148/86',
  fc: '108',
  coscienza: 'A',
  temperatura: '38,2',
};

const browser = await chromium.launch();
async function openList(width) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, (route) => {
    const pid = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[2]);
    route.fulfill({
      json: {
        readings: [
          {
            id: 'r',
            requestId: 'r',
            patientId: pid,
            measuredAt: iso(0.3),
            values: full,
            authorOperatorId: 'op1',
            authorName: 'Inf',
            createdAt: iso(0.3),
          },
        ],
        hasMore: false,
        nextCursor: null,
      },
    });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.locator('.plist-list').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
  return page;
}
const rows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.patient-roster tbody tr.patient-roster__row')]
      .filter((r) => r.getBoundingClientRect().height > 0)
      .map((r) => ({
        name: r.querySelector('.patient-identity__name')?.textContent,
        bed: r.querySelector('.patient-roster__bed')?.textContent,
        meta: r.querySelector('.patient-roster__meta')?.textContent,
        stato: r.querySelector('.stato-pill')?.textContent ?? null,
        news2: r.querySelector('.news2-chip')?.textContent ?? null,
        h: Math.round(r.getBoundingClientRect().height),
      })),
  );

// stato reale dallo stub (riepilogo clinico) per verificare i filtri
const roster = (await (await fetch('http://localhost:3001/patients/page?limit=25')).json()).items;

{
  const page = await openList(1180);
  const m = await page.evaluate(() => {
    const r = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    };
    return {
      title: document.querySelector('.topbar-title .page-header__title')?.textContent,
      newTitle: document.querySelector('#plist-new-title')?.textContent,
      primary: document.querySelector('.plist-btn--primary')?.textContent?.trim(),
      primaryBox: r('.plist-btn--primary'),
      search: r('.plist-search .search-input'),
      chips: [...document.querySelectorAll('.plist-chip')].map((c) => ({
        t: c.textContent.trim(),
        pressed: c.getAttribute('aria-pressed'),
        h: Math.round(c.getBoundingClientRect().height),
      })),
      headers: [...document.querySelectorAll('.patient-roster th')].map((t) =>
        t.textContent.replace(/[↑↓↕]/g, '').trim(),
      ),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(
    'AC1 titolo in intestazione, card "Nuovo ingresso" con pulsante primario 48',
    m.title === 'Pazienti' &&
      m.newTitle === 'Nuovo ingresso' &&
      m.primary === 'Nuovo ingresso' &&
      m.primaryBox?.h === 48,
    JSON.stringify({ t: m.title, n: m.newTitle, p: m.primaryBox }),
  );
  check(
    'AC1 ricerca 48 e chip 48: Ricoverati (attiva), Dimessi e archivio, Tutti, Filtri e ordine',
    m.search?.h === 48 &&
      m.chips.map((c) => c.t.replace(/\d+$/, '')).join(',') ===
        'Ricoverati,Dimessi e archivio,Tutti,Filtri e ordine' &&
      m.chips[0].pressed === 'true' &&
      m.chips.every((c) => c.h === 48),
    JSON.stringify(m.chips),
  );
  check(
    'AC2 intestazioni: Paziente, Ricovero, NEWS2, Segnalazioni, Azione',
    m.headers.join(',') === 'Paziente,Ricovero,NEWS2,Segnalazioni,Azione',
    m.headers.join(','),
  );
  await page.waitForTimeout(1500);
  const list = await rows(page);
  const sample = list[0];
  const p = roster.find((x) => `${x.lastName}, ${x.firstName}` === sample?.name);
  check(
    'AC2 righe ≥ 72 con camera, età · letto · CF, stato e NEWS2 reale (6)',
    list.length > 0 &&
      list.every((r) => r.h >= 72) &&
      sample.bed === p?.location?.room &&
      /\d+ anni · Letto .+ · CF .+/.test(sample.meta ?? '') &&
      /^NEWS2 6/.test(sample.news2 ?? ''),
    JSON.stringify(sample),
  );
  check(
    'AC3 "Ricoverati" esclude i dimessi',
    list.every((r) => r.stato !== 'Dimesso'),
    JSON.stringify(list.map((r) => r.stato)),
  );
  const counts = Object.fromEntries(
    m.chips
      .slice(0, 3)
      .map((c) => [c.t.replace(/\d+$/, '').trim(), Number(c.t.match(/(\d+)$/)?.[1])]),
  );
  check(
    'AC3 conteggi coerenti: Ricoverati + Dimessi = Tutti = righe caricate',
    counts['Ricoverati'] + counts['Dimessi e archivio'] === counts['Tutti'] &&
      counts['Ricoverati'] === list.length,
    JSON.stringify({ counts, righe: list.length }),
  );
  await page.screenshot({ path: `${DIR}/screenshots/pazienti-1180.png` });

  await page.getByRole('button', { name: /^Dimessi e archivio/ }).click();
  await page.waitForTimeout(600);
  const dim = await rows(page);
  check(
    'AC3 "Dimessi e archivio" mostra solo i dimessi',
    dim.length === counts['Dimessi e archivio'] && dim.every((r) => r.stato === 'Dimesso'),
    JSON.stringify(dim.map((r) => r.stato)),
  );
  await page.getByRole('button', { name: /^Tutti/ }).click();
  await page.waitForTimeout(600);
  const all = await rows(page);
  check(
    'AC3 "Tutti" mostra tutti i pazienti caricati',
    all.length === counts['Tutti'],
    `righe=${all.length}`,
  );

  await page.getByRole('button', { name: /^Ricoverati/ }).click();
  await page.locator('.plist-search .search-input').fill('Rossi');
  await page.waitForTimeout(2000);
  const pressed = await page.locator('.plist-chip[aria-pressed="true"]').innerText();
  check('AC3 la ricerca passa a "Tutti" (trova anche i dimessi)', /^Tutti/.test(pressed), pressed);
  await page.locator('.plist-search .search-input').fill('');
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Filtri e ordine' }).click();
  await page.waitForTimeout(400);
  const f = await page.evaluate(() => ({
    sex: [...document.querySelectorAll('#plist-filters .filter-chip')].map((c) =>
      c.textContent.trim(),
    ),
    sortSelect: (() => {
      const s = document.querySelector('#patient-sort-field');
      return s
        ? getComputedStyle(s.closest('.patient-roster-order__mobile')).display !== 'none'
        : false;
    })(),
    fiscal: !!document.querySelector('#patient-sort-field option[value="fiscalCode"]'),
  }));
  check(
    'AC4 "Filtri e ordine": sesso e ordinamento (anche per codice fiscale) disponibili',
    f.sex.join(',') === 'Tutti,Maschio,Femmina' && f.sortSelect && f.fiscal,
    JSON.stringify(f),
  );
  await page.screenshot({ path: `${DIR}/screenshots/filtri-e-ordine.png` });

  await page.getByRole('button', { name: 'Nuovo ingresso' }).click();
  const chooser = await page.getByRole('dialog', { name: 'Nuovo paziente' }).count();
  check('AC1 "Nuovo ingresso" apre la scelta documenti / a mano', chooser > 0);
  await page.keyboard.press('Escape');

  const firstName = await page.locator('.patient-roster__row .patient-identity__name').first().innerText();
  // si clicca sul nome: al centro della riga c'è la chip NEWS2, che apre lo storico
  await page.locator('.patient-roster__row .patient-roster__who').first().click();
  await page.waitForTimeout(1800);
  const opened = await page.evaluate(() => ({
    record: !!document.querySelector('.patient-record-view'),
    text: document.querySelector('.patient-record-view')?.innerText.slice(0, 400) ?? '',
    header: document.querySelector('.topbar-title')?.textContent ?? '',
  }));
  check('AC2 clic sulla riga apre la cartella giusta', opened.record && (opened.text.includes(firstName) || opened.header.includes(firstName)), firstName);
  check('AC4 1180: nessuno scorrimento orizzontale', m.overflow <= 0, `overflow=${m.overflow}`);
  await page.close();
}

// Verifica QA, primo giro
{
  // 1 · un clic dentro lo storico NEWS2 non apre la cartella
  const page = await openList(1180);
  const chip = page.locator('.patient-roster__row .news2-chip').first();
  await chip.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /NEWS2/ });
  await dialog.waitFor({ timeout: 5000 });
  await dialog.locator('h2, h3').first().click();
  await page.waitForTimeout(1200);
  const stillList = await page.locator('.plist-list').count();
  const chartOpen = await page.locator('.patient-record-view').count();
  check('QA1 un clic dentro lo storico NEWS2 non apre la cartella', stillList > 0 && chartOpen === 0, JSON.stringify({ stillList, chartOpen }));
  await page.close();
}
for (const [label, handler] of [
  ['500', (route) => route.fulfill({ status: 500, json: { error: 'x' } })],
  ['lento', async (route) => { await new Promise((r) => setTimeout(r, 7000)); await route.continue().catch(() => {}); }],
]) {
  // 2 · riepilogo in errore o lento: niente conteggi falsi, nessun paziente nascosto
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.route(/\/patients\/clinical-summary\?/, handler);
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.locator('.plist-list').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({
    chips: [...document.querySelectorAll('.plist-views .plist-chip')].slice(0, 3).map((c) => c.textContent.trim()),
    rows: [...document.querySelectorAll('.patient-roster tbody tr.patient-roster__row')].filter((x) => x.getBoundingClientRect().height > 0).length,
    note: document.querySelector('.plist-note')?.textContent ?? '',
  }));
  check(`QA1 riepilogo ${label}: nessun conteggio falso per Ricoverati/Dimessi, tutti i pazienti visibili, avviso`, r.chips[0] === 'Ricoverati' && r.chips[1] === 'Dimessi e archivio' && /^Tutti\d+$/.test(r.chips[2]) && r.rows === Number(r.chips[2].replace('Tutti', '')) && /stato di\s+ricovero non ancora disponibile/.test(r.note), JSON.stringify(r));
  await page.close();
}
{
  // 3 · un filtro per sesso attivo si vede anche a pannello chiuso e dopo una navigazione
  const page = await openList(1180);
  await page.getByRole('button', { name: /^Filtri e ordine/ }).click();
  await page.locator('#plist-filters .filter-chip', { hasText: 'Femmina' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^Filtri e ordine/ }).click();
  await page.locator('.teams-sidebar__item[title="Turno"]').click();
  await page.waitForTimeout(1200);
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => ({
    toggle: document.querySelector('.plist-chip--filters')?.textContent?.trim(),
    note: [...document.querySelectorAll('.plist-note')].map((n) => n.textContent.trim()),
  }));
  check('QA1 filtro "Femmine" visibile sul pulsante e in un avviso anche a pannello chiuso, dopo la navigazione', /Femmine/.test(r.toggle ?? '') && r.note.some((n) => /Filtro attivo: solo femmine/.test(n)), JSON.stringify(r));
  await page.close();
}

// Verifica QA, secondo giro: lo storico NEWS2 copre tutta la pagina (un solo storico alla volta)
for (const width of [1180, 390]) {
  const page = await openList(width);
  const chips = page.locator('.news2-chip:visible');
  await chips.first().click();
  const dialog = page.getByRole('dialog').filter({ hasText: /NEWS2/ });
  await dialog.first().waitFor({ timeout: 5000 });
  // il pulsante di chiusura è davvero cliccabile (non coperto dall'intestazione)
  const closeReachable = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /NEWS2/.test(x.textContent));
    const btn = d && [...d.querySelectorAll('button')].find((b) => /Chiudi/i.test(b.getAttribute('aria-label') ?? b.textContent));
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && btn.contains(hit);
  });
  // un secondo clic su un'altra chip non deve aprire un secondo storico
  const box = await chips.nth(1).boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600);
  const open = await page.getByRole('dialog').filter({ hasText: /NEWS2/ }).count();
  check(`QA2 ${width}: "Chiudi" raggiungibile; un clic su un'altra chip non apre un secondo storico`, open <= 1 && closeReachable, JSON.stringify({ open, closeReachable }));
  await page.screenshot({ path: `${DIR}/screenshots/storico-news2-${width}.png` });
  await page.close();
}

for (const width of [390, 768, 1024, 1440]) {
  const page = await openList(width);
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check(`AC4 ${width}: nessuno scorrimento orizzontale`, r.overflow <= 0, JSON.stringify(r));
  await page.screenshot({ path: `${DIR}/screenshots/pazienti-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
