// Evidenza browser: intestazioni ordinabili canoniche (ds-sort) nella lista pazienti e nelle
// tabelle cliniche (ClinicalTable, qui la tabella Operatori dell'amministratore). Stub :3001.
//   BASE=http://localhost:4184 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/design-system-intestazioni-ordinabili-delle-tabelle-canoniche';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
async function login(width, role) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE);
  await page.getByText(role, { exact: true }).first().click();
  await page.waitForTimeout(1200);
  return page;
}
async function go(page, title, width) {
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator(`.teams-sidebar__item[title="${title}"]`).click();
  await page.waitForTimeout(2000);
}
const heads = (page, scope) =>
  page.evaluate((scope) => {
    const th = [...document.querySelectorAll(`${scope} th`)];
    return th.map((t) => {
      const b = t.querySelector('.ds-sort');
      const cs = getComputedStyle(b ?? t);
      const thcs = getComputedStyle(t);
      return {
        // le frecce portano il selettore di variante testo (U+FE0E): tolto per il confronto
        text: t.textContent.replace(/︎/g, '').trim(),
        sortable: !!b,
        ariaSort: t.getAttribute('aria-sort'),
        label: b?.getAttribute('aria-label') ?? null,
        // freccia disegnata (svg): la direzione è in data-dir
        arrow: b?.querySelector('svg.ds-sort__arrow')?.getAttribute('data-dir') ?? null,
        sig: b ? [cs.minHeight, cs.fontSize, cs.fontWeight, cs.textTransform].join(' ') : null,
        th: [thcs.fontSize, thcs.fontWeight, thcs.textTransform].join(' '),
        color: cs.color,
      };
    });
  }, scope);
const firstRow = (page, scope) =>
  page.evaluate(
    (scope) => document.querySelector(`${scope} tbody tr`)?.textContent.trim().slice(0, 60),
    scope,
  );

const sigs = [];
// ── Lista pazienti ────────────────────────────────────────────────────────────────────────
{
  const page = await login(1180, 'Operatore');
  await go(page, 'Pazienti', 1180);
  const before = await heads(page, '.patient-roster');
  const sortable = before.filter((h) => h.sortable);
  sigs.push(...sortable.map((h) => h.sig));
  check(
    "AC1/AC2 lista: intestazioni ordinabili ds-sort (48px, 14/500, senza maiuscolo) con freccia e nome che dice l'ordine",
    sortable.length >= 2 &&
      sortable.every(
        (h) =>
          h.sig === '48px 14px 500 none' &&
          /^Ordina per .+ in ordine (crescente|decrescente)$/.test(h.label) &&
          /^(asc|desc|none)$/.test(h.arrow),
      ),
    JSON.stringify(sortable),
  );
  // ordina per ricovero: aria-sort e ordine
  const admission = page.locator('.patient-roster th', { hasText: 'Ricovero' }).locator('.ds-sort');
  await admission.click();
  await page.waitForTimeout(600);
  const a1 = (await heads(page, '.patient-roster')).find((h) => /Ricovero/.test(h.text));
  const r1 = await firstRow(page, '.patient-roster');
  await admission.click();
  await page.waitForTimeout(600);
  const a2 = (await heads(page, '.patient-roster')).find((h) => /Ricovero/.test(h.text));
  const r2 = await firstRow(page, '.patient-roster');
  check(
    'AC3 lista: il clic ordina (crescente, poi decrescente), aria-sort e freccia seguono, la colonna ordinata è blu',
    a1.ariaSort === 'ascending' &&
      a1.arrow === 'asc' &&
      a2.ariaSort === 'descending' &&
      a2.arrow === 'desc' &&
      a1.color === 'rgb(29, 79, 196)',
    JSON.stringify({ a1, a2, r1, r2 }),
  );
  await admission.focus();
  const outline = await admission.evaluate((el) => getComputedStyle(el).outlineWidth);
  check('AC2 lista: fuoco visibile 3px', outline === '3px', outline);
  await page.screenshot({ path: `${DIR}/screenshots/pazienti-ordinati-1180.png` });
  await page.close();
}
// ── Tabella clinica (ClinicalTable: Operatori, amministratore) ───────────────────────────
{
  const page = await login(1180, 'Amministratore');
  await go(page, 'Operatori', 1180);
  await page.waitForSelector('.clinicos-table');
  const before = await heads(page, '.clinicos-table');
  const sortable = before.filter((h) => h.sortable);
  sigs.push(...sortable.map((h) => h.sig));
  check(
    'AC1/AC2 tabella clinica: intestazioni ds-sort con la stessa firma della lista; testo delle intestazioni 14/500 senza maiuscolo',
    sortable.length >= 2 &&
      sortable.every(
        (h) =>
          h.sig === '48px 14px 500 none' &&
          h.label ===
            `Ordina per ${h.text.replace(/[↑↓↕]/g, '').trim().toLowerCase()} in ordine crescente`,
      ) &&
      before.every((h) => h.th === '14px 500 none') &&
      before.every((h) => !h.ariaSort),
    JSON.stringify(before),
  );
  const col = page
    .locator('.clinicos-table th')
    .filter({ has: page.locator('.ds-sort') })
    .first()
    .locator('.ds-sort');
  const r0 = await firstRow(page, '.clinicos-table');
  await col.click();
  await page.waitForTimeout(400);
  const h1 = (await heads(page, '.clinicos-table')).find((h) => h.sortable && h.ariaSort);
  const r1 = await firstRow(page, '.clinicos-table');
  await col.click();
  await page.waitForTimeout(400);
  const h2 = (await heads(page, '.clinicos-table')).find((h) => h.sortable && h.ariaSort);
  const r2 = await firstRow(page, '.clinicos-table');
  await col.click();
  await page.waitForTimeout(400);
  const h3 = (await heads(page, '.clinicos-table')).filter((h) => h.ariaSort);
  const r3 = await firstRow(page, '.clinicos-table');
  check(
    'AC3 tabella clinica: crescente → decrescente → nessun ordinamento come prima; aria-sort, freccia e nome seguono',
    h1?.ariaSort === 'ascending' &&
      h1.arrow === 'asc' &&
      /decrescente$/.test(h1.label) &&
      h2?.ariaSort === 'descending' &&
      h2.arrow === 'desc' &&
      /^Togli l'ordinamento/.test(h2.label) &&
      h3.length === 0 &&
      r3 === r0,
    JSON.stringify({ h1, h2, r0, r1, r2, r3 }),
  );
  await col.click();
  await page.screenshot({ path: `${DIR}/screenshots/operatori-ordinati-1180.png` });
  await page.close();
}
check(
  'AC2 una sola firma per le intestazioni ordinabili (lista + tabella clinica)',
  new Set(sigs).size === 1,
  JSON.stringify([...new Set(sigs)]),
);
for (const width of [390, 768, 1024, 1440]) {
  const page = await login(width, 'Amministratore');
  await go(page, 'Operatori', width);
  const o1 = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await page.screenshot({ path: `${DIR}/screenshots/operatori-${width}.png` });
  await page.close();
  const op = await login(width, 'Operatore');
  await go(op, 'Pazienti', width);
  const o2 = await op.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await op.screenshot({ path: `${DIR}/screenshots/pazienti-${width}.png` });
  await op.close();
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale (Operatori, Pazienti)`,
    o1 <= 0 && o2 <= 0,
    JSON.stringify({ o1, o2 }),
  );
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
