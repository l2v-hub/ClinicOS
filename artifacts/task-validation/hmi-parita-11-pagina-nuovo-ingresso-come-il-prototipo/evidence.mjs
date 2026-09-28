// Evidenza browser: pagina Nuovo ingresso (stub :3001; stato del servizio AI simulato con page.route).
//   BASE=http://localhost:4182 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-11-pagina-nuovo-ingresso-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4182';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
async function openStart(width, { ai = true } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  await page.route(/\/ai\/extraction\/status(\?.*)?$/, (route) =>
    route.fulfill({
      json: ai
        ? { available: true, provider: 'test', model: 'test', errors: [] }
        : {
            available: false,
            provider: 'test',
            model: 'test',
            errors: ['Servizio AI non configurato'],
          },
    }),
  );
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.locator('.plist-list').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).first().click();
  await page.waitForTimeout(1200);
  return page;
}
const state = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.topbar-title')?.textContent ?? '',
    cards: [...document.querySelectorAll('.nps-option')].map((c) => ({
      title: c.querySelector('.nps-option__title')?.textContent,
      text: c.querySelector('.nps-option__text')?.textContent,
      status: c.querySelector('.nps-option__status')?.textContent ?? null,
      icon: !!c.querySelector('.nps-option__icon svg'),
      disabled: c.disabled,
    })),
    how: [...document.querySelectorAll('.nps__how-title')].map((h) => h.textContent),
    list: !!document.querySelector('.plist-list'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

{
  const page = await openStart(1180);
  const s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/nuovo-ingresso-1180.png` });
  check(
    'AC1 intestazione "Nuovo ingresso · Scegli come arriva il paziente"',
    /Nuovo ingresso/.test(s.title) && /Scegli come arriva il paziente/.test(s.title),
    s.title,
  );
  check(
    'AC1 tre card con icona, titolo e testo; la lista non è visibile',
    s.cards.length === 3 &&
      s.cards.every((c) => c.icon && c.title && c.text) &&
      JSON.stringify(s.cards.map((c) => c.title)) ===
        JSON.stringify(['Da lettera di dimissione', 'Da file del trasferimento', 'A mano']) &&
      !s.list,
    JSON.stringify(s.cards.map((c) => c.title)),
  );
  check('AC1 "Come funziona" con tre punti', s.how.length === 3, JSON.stringify(s.how));
  // AC2: card documenti → import documenti; "A mano" → inserimento guidato; "Torna ai pazienti"
  await page.locator('.nps-option').first().click();
  await page.waitForTimeout(1500);
  const importOpen = await page.getByRole('dialog').count();
  const importText = await page
    .getByRole('dialog')
    .first()
    .textContent()
    .catch(() => '');
  check(
    'AC2 "Da lettera di dimissione" apre l\'import documenti di oggi',
    importOpen > 0 && /Importa lettere di dimissione/.test(importText),
    importText.slice(0, 80),
  );
  await page.screenshot({ path: `${DIR}/screenshots/import-da-lettera.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const back1 = await state(page);
  check(
    'AC2 chiudere il flusso riporta alla lista',
    back1.list,
    JSON.stringify({ list: back1.list }),
  );
  await page.close();
}
{
  const page = await openStart(1180);
  await page.locator('.nps-option').nth(1).click();
  await page.waitForTimeout(1500);
  const t = await page
    .getByRole('dialog')
    .first()
    .textContent()
    .catch(() => '');
  check(
    'AC2 "Da file del trasferimento" apre lo stesso import documenti',
    /Importa lettere di dimissione/.test(t),
    t.slice(0, 80),
  );
  await page.close();
}
{
  const page = await openStart(1180);
  await page.locator('.nps-option').nth(2).click();
  await page.waitForTimeout(1500);
  const intake = await page.locator('[data-testid="patient-intake-footer"]').count();
  check('AC2 "A mano" apre l\'inserimento guidato di oggi', intake > 0, `${intake}`);
  await page.close();
}
{
  const page = await openStart(1180);
  await page.getByRole('button', { name: /Torna ai pazienti/ }).click();
  await page.waitForTimeout(800);
  check('AC2 "Torna ai pazienti" riporta alla lista', (await state(page)).list);
  await page.close();
}
{
  const page = await openStart(1180, { ai: false });
  await page.waitForTimeout(800);
  const s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/ai-non-disponibile.png` });
  check(
    'AC3 AI non disponibile: card documenti disabilitate con il motivo, "A mano" disponibile',
    s.cards[0].disabled &&
      s.cards[1].disabled &&
      !s.cards[2].disabled &&
      /non/i.test(s.cards[0].status ?? ''),
    JSON.stringify(s.cards.map((c) => [c.disabled, c.status])),
  );
  await page.close();
}
{
  // AC3: tastiera
  const page = await openStart(1180);
  await page.getByRole('button', { name: /Torna ai pazienti/ }).focus();
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { cls: el.className, outline: cs.outlineWidth, style: cs.outlineStyle };
  });
  check(
    'AC3 card raggiungibili da tastiera con fuoco visibile',
    focus.cls === 'nps-option' && focus.style !== 'none' && parseFloat(focus.outline) >= 2,
    JSON.stringify(focus),
  );
  await page.close();
}
{
  // AC4: dal modulo appuntamento la scelta resta in finestra
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('.teams-sidebar__item[title="Agenda"]').click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Intervallo successivo' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Nuovo appuntamento' }).click();
  await page.waitForTimeout(1000);
  const btn = page.getByRole('button', { name: /Crea nuovo paziente/ }).first();
  let dialog = 'n/d';
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(800);
    dialog = String(await page.getByRole('dialog', { name: 'Nuovo paziente' }).count());
  }
  check(
    'AC4 dal modulo appuntamento la scelta resta in finestra "Nuovo paziente"',
    dialog === '1',
    dialog,
  );
  await page.close();
}
{
  // QA avvisi 1-3: voce di navigazione, freccia dell'intestazione, sidebar, fuoco, stato della lista.
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.locator('.plist-list').waitFor({ timeout: 15000 });
  const search = page.getByRole('searchbox').first();
  await search.fill('Ro');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).first().click();
  await page.waitForTimeout(1000);
  const opened = await page.evaluate(() => ({
    hash: location.hash,
    back: document.querySelector('.topbar-back')?.getAttribute('aria-label'),
    focus: document.activeElement?.className,
    active: document
      .querySelector('.teams-sidebar__item[aria-current="page"]')
      ?.getAttribute('title'),
  }));
  check(
    'QA avviso 1: #/nuovo-ingresso, freccia "Indietro: Pazienti", fuoco sulla pagina, sidebar su Pazienti',
    opened.hash === '#/nuovo-ingresso' &&
      opened.back === 'Indietro: Pazienti' &&
      opened.focus === 'nps' &&
      opened.active === 'Pazienti',
    JSON.stringify(opened),
  );
  await page.locator('.topbar-back').click();
  await page.waitForTimeout(1000);
  const back = await page.evaluate(() => ({
    list: !!document.querySelector('.plist-list'),
    hash: location.hash,
    q: document.querySelector('input[type="search"]')?.value,
    focus: document.activeElement?.textContent?.trim(),
  }));
  check(
    'QA avvisi 1+3: la freccia riporta alla lista (ricerca conservata) con il fuoco su "Nuovo ingresso"',
    back.list && back.hash === '#/pazienti' && back.q === 'Ro' && back.focus === 'Nuovo ingresso',
    JSON.stringify(back),
  );
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.locator('.teams-sidebar__item[title="Pazienti"]').click();
  await page.waitForTimeout(1000);
  check(
    'QA avviso 2: da Nuovo ingresso la voce "Pazienti" della sidebar riporta alla lista',
    await page.locator('.plist-list').isVisible(),
  );
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.locator('.nps-option').nth(2).click();
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  const closed = await page.evaluate(() => ({
    list: !!document.querySelector('.plist-list'),
    focus: document.activeElement?.textContent?.trim(),
  }));
  check(
    'QA avviso 3: chiudendo il flusso scelto il fuoco torna su "Nuovo ingresso" della lista',
    closed.list && closed.focus === 'Nuovo ingresso',
    JSON.stringify(closed),
  );
  await page.close();
}
for (const width of [390, 768, 1024, 1440]) {
  const page = await openStart(width);
  const s = await state(page);
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, tre card`,
    s.overflow <= 0 && s.cards.length === 3,
    `overflow ${s.overflow}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/nuovo-ingresso-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
