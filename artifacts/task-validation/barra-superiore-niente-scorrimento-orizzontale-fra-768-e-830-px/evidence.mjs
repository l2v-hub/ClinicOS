// Evidenza browser: barra superiore dentro lo schermo fra 768 e 1023 px, invariata a 390 e 1280.
//   BASE=http://localhost:4173 LABEL=dopo node <questo file>   (LABEL=prima su origin/main)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/barra-superiore-niente-scorrimento-orizzontale-fra-768-e-830-px';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const LABEL = process.env.LABEL ?? 'dopo';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const browser = await chromium.launch();

async function measure(page) {
  return page.evaluate(() => {
    const w = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().width) : null; };
    const back = document.querySelector('.topbar-back');
    const icon = back?.querySelector('svg')?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      back: w('.topbar-back'), search: w('.topbar-search'), ctx: w('.topbar-ctx'), hamburger: w('.topbar-hamburger'),
      iconVisible: !!icon && icon.width > 0 && icon.left >= back.getBoundingClientRect().left && icon.right <= back.getBoundingClientRect().right,
      label: back?.textContent?.trim(),
    };
  });
}

async function open(width, section) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator(`.teams-sidebar__item[title="${section}"]`).click();
  await page.waitForTimeout(1200);
  return page;
}

const rows = [];
for (const section of ['Pazienti', 'Agenda']) {
  for (const width of [390, 768, 790, 800, 820, 900, 1023, 1280]) {
    const page = await open(width, section);
    const m = await measure(page);
    rows.push({ section, width, ...m });
    if (width >= 768 && width <= 1023) {
      check(`${LABEL} ${section} ${width}: nessuno scorrimento orizzontale`, m.overflow <= 0, `overflow=${m.overflow}`);
      check(`${LABEL} ${section} ${width}: freccia indietro ≥ 42 px con icona visibile, ricerca ≥ 42 px`, m.back >= 42 && m.iconVisible && m.search >= 42, JSON.stringify({ back: m.back, search: m.search, icon: m.iconVisible }));
    }
    if (section === 'Pazienti' && width === 768) await page.screenshot({ path: `${DIR}/screenshots/${LABEL}-768-pazienti.png`, clip: { x: 0, y: 0, width: 768, height: 140 } });
    await page.close();
  }
}

// Freccia indietro con il nome di un paziente: apri una cartella dalla lista, poi vai in Agenda.
for (const width of [768, 820]) {
  const page = await open(width, 'Pazienti');
  await page.getByRole('button', { name: /^Apri cartella di / }).first().click();
  await page.waitForTimeout(1500);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Agenda"]').click();
  await page.waitForTimeout(1200);
  const m = await measure(page);
  rows.push({ section: 'Agenda (indietro → paziente)', width, ...m });
  check(`${LABEL} indietro verso un paziente ${width}: nessuno scorrimento, freccia leggibile`, m.overflow <= 0 && m.back >= 42 && m.iconVisible, JSON.stringify({ overflow: m.overflow, back: m.back, label: m.label }));
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/misure-${LABEL}.json`, JSON.stringify(rows, null, 1));
writeFileSync(`${DIR}/logs/playwright-${LABEL}.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
