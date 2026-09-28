// Evidenza browser: Terapia in modalità calendario (stub :3001; /therapy-slots/page simulato per
// giorno con page.route: totali noti, un giorno opzionalmente in errore).
//   BASE=http://localhost:4181 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/terapia-modalita-calendario-della-settimana';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4181';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = iso(new Date());
const shift = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  return iso(new Date(y, m - 1, d + n, 12));
};
const MONDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
})();

/** Totali per giorno: passati completi tranne ieri (2 senza registrazione), oggi misto, futuri da fare. */
function summaryFor(day, fascia) {
  if (day < TODAY) {
    if (day === shift(TODAY, -1) && fascia === 'mattina')
      return { total: 5, administered: 2, notAdministered: 1, pending: 2 };
    return { total: 4, administered: 3, notAdministered: 1, pending: 0 };
  }
  if (day === TODAY)
    return fascia === 'mattina'
      ? { total: 5, administered: 5, notAdministered: 0, pending: 0 }
      : { total: 3, administered: 0, notAdministered: 0, pending: 3 };
  return { total: 3, administered: 0, notAdministered: 0, pending: 3 };
}
const FASCE = [
  ['mattina', 'Terapia Mattina', '08:00'],
  ['pranzo', 'Terapia Pranzo', '12:00'],
  ['sera', 'Terapia Sera', '20:00'],
];
function pageFor(day) {
  return {
    slots: FASCE.map(([fascia, label, ora]) => ({
      id: `ts-${fascia}`,
      fascia,
      label,
      ora,
      summary: summaryFor(day, fascia),
      patients: [],
    })),
    pageInfo: {
      hasMore: false,
      nextCursor: null,
      loadedTherapies: 0,
      completeness: 'complete',
      summaryExact: true,
    },
  };
}

const browser = await chromium.launch();
async function open(width, { failDay = null, inexactDay = null } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const requested = [];
  let fail = failDay;
  await page.route(/\/therapy-slots\/page(\?.*)?$/, (route) => {
    const day = new URL(route.request().url()).searchParams.get('date');
    requested.push(day);
    if (day === fail) return route.fulfill({ status: 500, json: { error: 'x' } });
    const body = pageFor(day);
    if (day === inexactDay) body.pageInfo.summaryExact = false;
    route.fulfill({ json: body });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Terapia"]').click();
  await page.waitForTimeout(1800);
  return { page, requested, clearFail: () => (fail = null) };
}
const grid = (page) =>
  page.evaluate(() => ({
    days: [...document.querySelectorAll('.tcal__day')].map((d) => ({
      text: d.textContent.trim(),
      today: d.getAttribute('aria-current') === 'date',
    })),
    rows: [...document.querySelectorAll('.tcal__table tbody tr')].map((tr) => ({
      ora: tr.querySelector('th')?.textContent.trim(),
      cells: [...tr.querySelectorAll('td')].map((td) => {
        const b = td.querySelector('button');
        return b
          ? {
              t: b.textContent.trim(),
              tone: [...b.classList].find((c) => c.startsWith('tcal__btn--'))?.slice(11),
              label: b.getAttribute('aria-label'),
            }
          : { t: td.textContent.trim() };
      }),
    })),
    subtitle: document.querySelector('.topbar-title')?.textContent ?? '',
    note: document.querySelector('.tcal__note')?.textContent ?? '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

{
  const { page } = await open(1180);
  const giroBtn = page.getByRole('button', { name: 'Giro', exact: true });
  const calBtn = page.getByRole('button', { name: /Calendario/ });
  check(
    'AC1 selettore Giro/Calendario con stato (Giro predefinito)',
    (await giroBtn.getAttribute('aria-pressed')) === 'true' &&
      (await calBtn.getAttribute('aria-pressed')) === 'false',
  );
  await calBtn.click();
  await page.waitForTimeout(1500);
  const g = await grid(page);
  await page.screenshot({ path: `${DIR}/screenshots/calendario-1180.png` });
  const todayIdx = g.days.findIndex((d) => d.today);
  check(
    'AC1 settimana lunedì–domenica, 7 colonne, oggi evidenziato',
    g.days.length === 7 &&
      /^lun/i.test(g.days[0].text) &&
      todayIdx === (new Date().getDay() + 6) % 7,
    JSON.stringify(g.days.map((d) => d.text)),
  );
  check(
    'AC1 fasce in ordine orario',
    JSON.stringify(g.rows.map((r) => r.ora)) === JSON.stringify(['08:00', '12:00', '20:00']),
    JSON.stringify(g.rows.map((r) => r.ora)),
  );
  const todayMorning = g.rows[0].cells[todayIdx];
  const todayEvening = g.rows[2].cells[todayIdx];
  check(
    'AC1 celle "registrate/totale" dai totali del servizio: oggi 08:00 5/5 completa, 20:00 0/3',
    /^5\/5/.test(todayMorning.t) &&
      todayMorning.tone === 'completa' &&
      /^0\/3/.test(todayEvening.t),
    JSON.stringify({ todayMorning, todayEvening }),
  );
  if (todayIdx > 0) {
    const y = g.rows[0].cells[todayIdx - 1];
    check(
      'AC3 ieri 08:00 con 2 senza registrazione: "da verificare", etichetta accessibile completa',
      y.tone === 'mancanti' &&
        /2 da verificare/.test(y.t) &&
        /registrate su 5.*2 senza registrazione.*Apri il giro/.test(y.label),
      JSON.stringify(y),
    );
  }
  if (todayIdx < 6) {
    const f = g.rows[1].cells[todayIdx + 1];
    check(
      'AC3 domani: cella futura 0/3',
      f.tone === 'futura' && /^0\/3/.test(f.t),
      JSON.stringify(f),
    );
  }
  check(
    'AC1 sottotitolo "Calendario della settimana · …"',
    /Calendario della settimana · /.test(g.subtitle),
    g.subtitle,
  );
  // AC2: clic su una cella apre il giro su quel giorno e fascia
  const target = g.rows[2].cells[todayIdx];
  await page
    .locator('.tcal__table tbody tr')
    .nth(2)
    .locator('td')
    .nth(todayIdx)
    .locator('button')
    .click();
  await page.waitForTimeout(1800);
  const after = await page.evaluate(() => ({
    pressedSlot: document.querySelector('.giro-slot[aria-pressed="true"]')?.textContent.trim(),
    giro: document
      .querySelector('[aria-label="Vista della terapia"] button[aria-pressed="true"]')
      ?.textContent.trim(),
    date: document.querySelector('.ds-date-nav__input')?.value,
  }));
  check(
    'AC2 clic sulla cella di oggi 20:00: torna al Giro, data di oggi, fascia 20:00 premuta',
    after.giro === 'Giro' &&
      after.date ===
        (await page.evaluate(() => {
          const d = new Date();
          const p = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        })) &&
      /^20:00/.test(after.pressedSlot ?? ''),
    JSON.stringify({ ...after, target }),
  );
  await page.screenshot({ path: `${DIR}/screenshots/giro-dalla-cella-1180.png` });
  await page.close();
}
{
  // AC2: una cella di un altro giorno apre il giro di quel giorno
  const { page } = await open(1180);
  await page.getByRole('button', { name: /Calendario/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Settimana successiva' }).click();
  await page.waitForTimeout(1500);
  const g = await grid(page);
  const notToday = g.days.every((d) => !d.today);
  await page.locator('.tcal__table tbody tr').nth(1).locator('td').nth(2).locator('button').click();
  await page.waitForTimeout(1800);
  const after = await page.evaluate(() => ({
    date: document.querySelector('.ds-date-nav__input')?.value,
    slot: document.querySelector('.giro-slot[aria-pressed="true"]')?.textContent.trim(),
  }));
  const expected = shift(MONDAY, 9);
  check(
    'AC4 settimana successiva: nessun giorno "oggi"; AC2 mercoledì 12:00 apre il giro di quel giorno su 12:00',
    notToday && after.date === expected && /^12:00/.test(after.slot ?? ''),
    JSON.stringify({ notToday, after, expected }),
  );
  await page.close();
}
{
  // AC3: ieri 08:00 con 2 somministrazioni senza registrazione → "da verificare" (settimana di ieri)
  const { page } = await open(1180);
  await page.getByRole('button', { name: /Calendario/ }).click();
  await page.waitForTimeout(1500);
  const y = shift(TODAY, -1);
  if (y < MONDAY) {
    await page.getByRole('button', { name: 'Settimana precedente' }).click();
    await page.waitForTimeout(1800);
  }
  const col = (new Date(`${y}T12:00:00`).getDay() + 6) % 7;
  const g = await grid(page);
  const c = g.rows[0].cells[col];
  check('AC3 ieri 08:00 con 2 senza registrazione: "da verificare", etichetta accessibile completa', c.tone === 'mancanti' && /2 da verificare/.test(c.t) && /3 registrate su 5, 1 non somministrate, 2 senza registrazione\. Apri il giro/.test(c.label), JSON.stringify(c));
  const other = g.rows[1].cells[col];
  check('AC3 giorno passato completo: "completa" 4/4', other.tone === 'completa' && /^4\/4/.test(other.t), JSON.stringify(other));
  await page.screenshot({ path: `${DIR}/screenshots/calendario-settimana-precedente-1180.png` });
  await page.close();
}
{
  // AC4: un giorno in errore: "—", avviso e "Riprova" che ricarica
  const failDay = shift(MONDAY, 2);
  const { page, requested, clearFail } = await open(1180, { failDay });
  await page.getByRole('button', { name: /Calendario/ }).click();
  await page.waitForTimeout(1800);
  let g = await grid(page);
  const col = g.rows[0].cells[2];
  const alert = await page.locator('.tcal__note[role="alert"]').count();
  clearFail();
  const before = requested.filter((d) => d === failDay).length;
  await page.getByRole('button', { name: 'Riprova' }).click();
  await page.waitForTimeout(1800);
  g = await grid(page);
  check(
    'AC4 giorno in errore: "—" e avviso con "Riprova"; "Riprova" ricarica e mostra i totali',
    col.t?.startsWith('—') &&
      alert === 1 &&
      requested.filter((d) => d === failDay).length > before &&
      /\//.test(g.rows[0].cells[2].t ?? ''),
    JSON.stringify({ col, alert, after: g.rows[0].cells[2] }),
  );
  await page.close();
}
{
  // QA blocker: dopo un salto dal calendario a un altro giorno, uscire e rientrare in Terapia
  // mostra la stessa data dei dati caricati (e le azioni usano quella data).
  const { page, requested } = await open(1180);
  await page.getByRole('button', { name: /Calendario/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Settimana successiva' }).click();
  await page.waitForTimeout(1500);
  await page.locator('.tcal__table tbody tr').nth(0).locator('td').nth(1).locator('button').click();
  await page.waitForTimeout(1800);
  await page.locator('.teams-sidebar__item[title="Consegne"]').click();
  await page.waitForTimeout(1200);
  await page.locator('.teams-sidebar__item[title="Terapia"]').click();
  await page.waitForTimeout(1800);
  const shown = await page.evaluate(() => document.querySelector('.ds-date-nav__input')?.value);
  const loaded = requested[requested.length - 1];
  const expected = shift(MONDAY, 8);
  check(
    'AC2 rientro in Terapia dopo un salto dal calendario: data mostrata = giorno caricato',
    shown === expected && loaded === expected,
    JSON.stringify({ shown, loaded, expected }),
  );
  await page.close();
}
{
  // Totali non esatti: la cella non ha colore di stato e l'avviso nomina il giorno.
  const inexact = shift(MONDAY, 1);
  const { page } = await open(1180, { inexactDay: inexact });
  await page.getByRole('button', { name: /Calendario/ }).click();
  await page.waitForTimeout(1800);
  const g = await grid(page);
  const tones = g.rows.map((r) => r.cells[1].tone);
  check(
    'AC3 giorno con totali non esatti: celle "parziale" (nessun verde) e avviso che nomina il giorno',
    tones.every((t) => t === 'parziale') && /Totali non esatti per martedì/.test(g.note),
    JSON.stringify({ tones, note: g.note }),
  );
  await page.close();
}
for (const width of [390, 768, 1024, 1440]) {
  const { page } = await open(width);
  await page.getByRole('button', { name: /Calendario/ }).click();
  await page.waitForTimeout(1500);
  const g = await grid(page);
  check(
    `AC4 ${width}: nessuno scorrimento della pagina (la tabella scorre nel suo riquadro)`,
    g.overflow <= 0 && g.days.length === 7,
    `overflow ${g.overflow}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/calendario-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
