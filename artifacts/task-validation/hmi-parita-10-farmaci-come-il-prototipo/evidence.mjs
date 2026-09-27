// Evidenza browser: farmaci come il prototipo HMI 1 (stub API :3001; /farmaci/cerca simulato con
// page.route: confezioni sintetiche, una revocata, una senza documento, paginazione).
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-10-farmaci-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const ESITI = [
  [
    '012745',
    'TACHIPIRINA',
    '1000 MG COMPRESSE',
    'Compressa',
    'Autorizzata',
    'paracetamolo',
    1000,
    'mg',
    true,
  ],
  [
    '012746',
    'TACHIPIRINA',
    '120 MG/5 ML SCIROPPO',
    'Sciroppo',
    'Autorizzata',
    'paracetamolo',
    24,
    'mg/ml',
    true,
  ],
  [
    '027821',
    'CLEXANE',
    '4000 UI 0,4 ML SOLUZIONE INIETTABILE',
    'Soluzione iniettabile',
    'Autorizzata',
    'enoxaparina sodica',
    4000,
    'UI',
    true,
  ],
  ['034567', 'LASIX', '25 MG COMPRESSE', 'Compressa', 'Revocata', 'furosemide', 25, 'mg', true],
  [
    '045678',
    'GENERICO SENZA DOCUMENTO',
    '10 COMPRESSE',
    'Compressa',
    'Autorizzata',
    'metformina',
    500,
    'mg',
    false,
  ],
].map(([aic, denominazione, descrizione, forma, stato, pa, q, u, doc]) => ({
  aic,
  denominazione,
  descrizione,
  forma,
  statoAmministrativo: stato,
  principiAttivi: [{ nome: pa, quantita: q, unita: u }],
  linkFi: doc ? `https://example.invalid/fi/${aic}.pdf` : null,
  linkRcp: null,
}));

const browser = await chromium.launch();
async function openFarmaci(width, { mode = 'ok' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const queries = [];
  await page.route(/\/farmaci\/cerca(\?.*)?$/, async (route) => {
    const u = new URL(route.request().url());
    queries.push(Object.fromEntries(u.searchParams));
    if (mode === 'error') return route.fulfill({ status: 500, json: { error: 'x' } });
    if (mode === 'empty')
      return route.fulfill({
        json: {
          query: u.searchParams.get('q'),
          esiti: [],
          pageInfo: { hasMore: false, nextCursor: null },
        },
      });
    const cursor = u.searchParams.get('cursor');
    const items = cursor ? ESITI.slice(3) : ESITI.slice(0, 3);
    route.fulfill({
      json: {
        query: u.searchParams.get('q'),
        esiti: items,
        pageInfo: { hasMore: !cursor, nextCursor: cursor ? null : 'c2' },
      },
    });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Farmaci"]').click();
  await page.locator('.page-anagrafica-farmaci').waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  return { page, queries };
}
const state = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.topbar-title')?.textContent ?? '',
    fieldH: Math.round(
      document.querySelector('.ricerca-farmaco__campo')?.getBoundingClientRect().height ?? 0,
    ),
    chipH: [...document.querySelectorAll('.ricerca-farmaco__criterio .filter-chip')].map((c) =>
      Math.round(c.getBoundingClientRect().height),
    ),
    notes: [...document.querySelectorAll('.ricerca-farmaco__nota')].map((n) =>
      n.textContent.trim(),
    ),
    rows: [...document.querySelectorAll('.ricerca-farmaco__riga')].map((r) => ({
      icon: !!r.querySelector('.ricerca-farmaco__icona svg'),
      name: r.querySelector('.ricerca-farmaco__nome')?.textContent,
      det: r.querySelector('.ricerca-farmaco__dettagli')?.textContent,
      pa: r.querySelector('.ricerca-farmaco__pa')?.textContent ?? null,
      btn: r.querySelector('.ricerca-farmaco__apri')?.textContent ?? null,
      btnH: Math.round(
        r.querySelector('.ricerca-farmaco__apri')?.getBoundingClientRect().height ?? 0,
      ),
    })),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

{
  const { page, queries } = await openFarmaci(1180);
  let s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/farmaci-vuoto-1180.png` });
  check(
    'AC1 intestazione "Farmaci · Anagrafica AIFA"',
    /Farmaci/.test(s.title) && /Anagrafica AIFA/.test(s.title),
    s.title,
  );
  check(
    'AC1 campo 48 px, chip 48 px, indicazione a campo vuoto',
    s.fieldH === 48 &&
      s.chipH.every((h) => h === 48) &&
      s.notes.some((n) => /almeno tre lettere/.test(n)),
    JSON.stringify({ f: s.fieldH, c: s.chipH, n: s.notes }),
  );
  await page.getByLabel('Cerca per nome commerciale').fill('ta');
  await page.waitForTimeout(500);
  s = await state(page);
  check(
    'AC3 meno di tre caratteri: "Almeno tre caratteri"',
    s.notes.some((n) => /Almeno tre caratteri/.test(n)) && !queries.some((q) => q.q === 'ta'),
    JSON.stringify(s.notes),
  );
  await page.getByLabel('Cerca per nome commerciale').fill('tachipirina');
  await page.waitForTimeout(1200);
  s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/farmaci-1180.png` });
  const r0 = s.rows[0];
  check(
    'AC2 righe: icona, nome, confezione · AIC, principi attivi, pulsante documento 48 px',
    s.rows.length === 3 &&
      r0.icon &&
      r0.name === 'TACHIPIRINA' &&
      /^1000 MG COMPRESSE · Compressa · AIC\s012745$/.test(r0.det) &&
      /paracetamolo 1000 mg/.test(r0.pa) &&
      /Apri foglietto/.test(r0.btn) &&
      r0.btnH === 48,
    JSON.stringify(r0),
  );
  check(
    'AC3 la query porta il testo e il criterio di sempre',
    queries.some((q) => q.q === 'tachipirina'),
    JSON.stringify(queries.at(-1)),
  );
  await page.getByRole('button', { name: 'Continua ricerca' }).click();
  await page.waitForTimeout(1000);
  s = await state(page);
  const revoked = await page.locator('.ricerca-farmaco__revocato').allTextContents();
  check(
    'AC3 "Continua ricerca" aggiunge le confezioni; revocata segnalata; senza documento dichiarato',
    s.rows.length === 5 &&
      revoked.includes('Revocata') &&
      s.rows.some((r) => r.btn === null) &&
      s.notes.some((n) => /Nessun documento ufficiale/.test(n)),
    JSON.stringify({ n: s.rows.length, revoked }),
  );
  await page.getByRole('button', { name: 'Principio attivo' }).click();
  await page.waitForTimeout(1200);
  check(
    'AC3 il criterio "Principio attivo" cambia la query',
    queries.some((q) => q.q === 'tachipirina' && q.pa === '1'),
    JSON.stringify(queries.at(-1)),
  );
  await page.close();
}
{
  const { page } = await openFarmaci(1180, { mode: 'empty' });
  await page.getByLabel('Cerca per nome commerciale').fill('zzzzz');
  await page.waitForTimeout(1200);
  const s = await state(page);
  check(
    'AC3 nessun risultato con suggerimento',
    s.notes.some(
      (n) => /Nessun farmaco corrisponde a «zzzzz»/.test(n) && /principio attivo/.test(n),
    ),
    JSON.stringify(s.notes),
  );
  await page.close();
}
{
  const { page } = await openFarmaci(1180, { mode: 'error' });
  await page.getByLabel('Cerca per nome commerciale').fill('tachipirina');
  await page.waitForTimeout(1500);
  const retry = await page.getByRole('button', { name: 'Riprova ricerca' }).count();
  check('AC3 errore con "Riprova ricerca"', retry === 1, `${retry}`);
  await page.close();
}
for (const width of [390, 600, 768, 1024, 1180, 1440]) {
  const { page } = await openFarmaci(width);
  await page.getByLabel('Cerca per nome commerciale').fill('tachipirina');
  await page.waitForTimeout(1200);
  const s = await state(page);
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, righe presenti`,
    s.overflow <= 0 && s.rows.length === 3,
    `overflow ${s.overflow}`,
  );
  // QA giro 1: nessuna parola spezzata a metà (nome e AIC leggibili anche su telefono)
  const words = await page.evaluate(() =>
    [...document.querySelectorAll('.ricerca-farmaco__testo')].map((t) => ({
      w: Math.round(t.getBoundingClientRect().width),
      nameLines: Math.round(t.querySelector('.ricerca-farmaco__nome').getBoundingClientRect().height / 24),
    })),
  );
  check(`QA1 ${width}: testo largo almeno 200 px e nome su una riga`, words.every((x) => x.w >= 200 && x.nameLines <= 1), JSON.stringify(words));
  await page.screenshot({ path: `${DIR}/screenshots/farmaci-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
