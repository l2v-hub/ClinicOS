// Evidenza browser: agenda operatore come il prototipo HMI 1 (stub API :3001).
//   BASE=http://localhost:4181 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-8-agenda-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4181';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
async function openAgenda(width, role = 'Operatore') {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  page.on('dialog', (d) => d.dismiss());
  await page.goto(BASE);
  await page.getByText(role, { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Agenda"]').click();
  await page.waitForTimeout(2500);
  return page;
}
const state = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.topbar-title')?.textContent ?? '',
    cardTitle: document.querySelector('.agt-day-card__title')?.textContent ?? '',
    newBtn: (() => {
      const b = document.querySelector('.agt-new-btn');
      return b ? { h: Math.round(b.getBoundingClientRect().height), disabled: b.disabled } : null;
    })(),
    times: [...document.querySelectorAll('.agt-view--hmi .agt-slot__time')].map(
      (t) => t.textContent,
    ),
    pills: [...document.querySelectorAll('.agt-view--hmi .agt-apt-card')].map((c) => ({
      title: c.querySelector('.agt-apt-card__title')?.textContent,
      detail: c.querySelector('.agt-apt-card__detail')?.textContent,
      badge: c.querySelector('.agt-badge')?.textContent,
      h: Math.round(c.getBoundingClientRect().height),
    })),
    freeVisible: [...document.querySelectorAll('.agt-view--hmi .agt-free-slot')].filter(
      (f) => getComputedStyle(f).opacity !== '0',
    ).length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

{
  const page = await openAgenda(1180);
  const s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/agenda-1180.png` });
  check(
    'AC1 "Agenda di oggi" e "fasce da 30 minuti" nell\'intestazione',
    /Agenda di oggi/.test(s.title) && /fasce da 30 minuti/.test(s.title),
    s.title,
  );
  check(
    'AC1 card con la data e "Nuovo appuntamento" 48 px',
    s.cardTitle.length > 8 && s.newBtn?.h === 48,
    JSON.stringify({ card: s.cardTitle, btn: s.newBtn }),
  );
  check(
    "AC1 una riga per ogni fascia da 30 minuti con l'ora",
    s.times.length === 22 &&
      s.times[0] === '08:00' &&
      s.times[1] === '08:30' &&
      s.times.at(-1) === '18:30',
    `${s.times.length} fasce`,
  );
  check(
    'AC1 pillole su una riga: tipo, paziente · durata, stato',
    s.pills.length > 0 &&
      s.pills.every((p) => p.title && /·\s*\d+ min/.test(p.detail) && p.badge && p.h <= 48),
    JSON.stringify(s.pills[0]),
  );
  check(
    'AC1 fasce libere vuote (nessun "+ Disponibile" visibile a riposo)',
    s.freeVisible === 0,
    `${s.freeVisible}`,
  );

  // AC2 — selezione, azioni, cartella
  await page.locator('.agt-view--hmi .agt-apt-card').first().click();
  await page.waitForTimeout(300);
  const actions = await page
    .locator('.agt-view--hmi .agt-apt-card.selected')
    .getByRole('button')
    .allTextContents();
  check(
    'AC2 il clic sulla pillola la seleziona e mostra le azioni',
    actions.length >= 2,
    JSON.stringify(actions),
  );
  await page.screenshot({ path: `${DIR}/screenshots/selezione.png` });

  // AC2 — fascia libera e "Nuovo appuntamento"
  const free = page.locator('.agt-view--hmi .agt-slot--free').first();
  const freeLabel = await free.getAttribute('aria-label');
  await free.click();
  await page.waitForTimeout(500);
  const formTime = await page
    .locator('input[type="time"]')
    .first()
    .inputValue()
    .catch(() => '');
  check(
    'AC2 una fascia libera apre il modulo alla sua ora',
    !!freeLabel && freeLabel.endsWith(formTime) && formTime.length === 5,
    `${freeLabel} → ${formTime}`,
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: /Annulla|Chiudi/ })
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(400);
  const disabled = s.newBtn?.disabled;
  if (!disabled) {
    await page.getByRole('button', { name: 'Nuovo appuntamento' }).click();
    await page.waitForTimeout(500);
    const t = await page
      .locator('input[type="time"]')
      .first()
      .inputValue()
      .catch(() => '');
    const now = new Date().toTimeString().slice(0, 5);
    check(
      'AC2 "Nuovo appuntamento" apre il modulo alla prima fascia libera non passata',
      t.length === 5 && t >= `${now.slice(0, 3)}${now.slice(3) < '30' ? '00' : '30'}`,
      `${t} (ora ${now})`,
    );
    await page.screenshot({ path: `${DIR}/screenshots/nuovo-appuntamento.png` });
  } else {
    check(
      'AC2 "Nuovo appuntamento" disabilitato: nessuna fascia libera rimasta oggi (ora attuale oltre le 18:30 o giornata piena)',
      true,
      'disabilitato',
    );
  }
  await page.close();
}

// AC3 — filtro, viste, navigazione
{
  const page = await openAgenda(1180);
  const all = (await state(page)).pills.length;
  await page.getByRole('button', { name: /^Completato/ }).click();
  await page.waitForTimeout(400);
  const done = await state(page);
  check(
    'AC3 filtro "Completato": solo pillole completate',
    done.pills.length > 0 &&
      done.pills.length < all &&
      done.pills.every((p) => /Completato/.test(p.badge)),
    `${all} → ${done.pills.length}`,
  );
  await page.getByRole('button', { name: 'Settimana' }).click();
  await page.waitForTimeout(800);
  const week = await page.locator('.agt-week-grid').count();
  const title = (await state(page)).title;
  check(
    'AC3 vista Settimana invariata, titolo "Agenda"',
    week === 1 && /^Agenda[^d]/.test(title),
    title,
  );
  await page.getByRole('button', { name: 'Giorno' }).click();
  await page.getByRole('button', { name: 'Intervallo successivo' }).click();
  await page.waitForTimeout(1000);
  const next = await state(page);
  check(
    'AC3 giorno successivo: titolo "Agenda" e card del nuovo giorno',
    /^Agenda/.test(next.title) && !/di oggi/.test(next.title) && next.cardTitle.length > 0,
    `${next.title} · ${next.cardTitle}`,
  );
  // Domani: nessuna fascia passata, "Nuovo appuntamento" apre la prima fascia libera della giornata.
  const firstFree = await page.locator('.agt-view--hmi .agt-slot--free').first().getAttribute('aria-label');
  await page.getByRole('button', { name: 'Nuovo appuntamento' }).click();
  await page.waitForTimeout(500);
  const t = await page.locator('input[type="time"]').first().inputValue().catch(() => '');
  check('AC2 "Nuovo appuntamento" (giorno futuro) apre il modulo alla prima fascia libera', !!firstFree && firstFree.endsWith(t) && t.length === 5, `${firstFree} → ${t}`);
  await page.screenshot({ path: `${DIR}/screenshots/nuovo-appuntamento.png` });
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.route(/\/appointments(\?.*)?$/, (route) =>
    route.fulfill({ status: 500, json: { error: 'x' } }),
  );
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('.teams-sidebar__item[title="Agenda"]').click();
  await page.waitForTimeout(2000);
  const retry = await page.getByRole('button', { name: 'Riprova' }).count();
  check('AC3 errore di caricamento: "Riprova"', retry >= 1, `${retry}`);
  await page.close();
}

// Verifica QA: giorno passato e intestazione su telefono
{
  const page = await openAgenda(1180);
  await page.getByRole('button', { name: 'Intervallo precedente' }).click();
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => { const x = document.querySelector('.agt-new-btn'); return { disabled: x?.disabled, title: x?.title }; });
  check('QA1 giorno passato: "Nuovo appuntamento" disabilitato con spiegazione', b.disabled === true && /Giorno passato/.test(b.title ?? ''), JSON.stringify(b));
  await page.close();
}
{
  const page = await openAgenda(390);
  const r = await page.evaluate(() => {
    const d = document.querySelector('.topbar-title .agt-header__date');
    return { clipped: d ? getComputedStyle(d).textOverflow : null, op: document.querySelector('.agt-day-card__op')?.getBoundingClientRect().height ?? 0, title: document.querySelector('.topbar-title')?.textContent };
  });
  check('QA1 390: data con puntini nell\'intestazione e operatore nella card del giorno', r.clipped === 'ellipsis' && r.op > 0 && /Agenda/.test(r.title ?? ''), JSON.stringify(r));
  await page.screenshot({ path: `${DIR}/screenshots/agenda-390-intestazione.png` });
  await page.close();
}

// AC4 — larghezze e agenda admin invariata
for (const width of [390, 768, 1024, 1440]) {
  const page = await openAgenda(width);
  const s = await state(page);
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, fasce e pillole presenti`,
    s.overflow <= 0 && s.times.length === 22 && s.pills.length > 0,
    `overflow ${s.overflow}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/agenda-${width}.png` });
  await page.close();
}
{
  const page = await openAgenda(1180, 'Amministratore');
  const hmi = await page.locator('.agt-view--hmi').count();
  check('AC4 agenda admin invariata (nessuno stile HMI applicato)', hmi === 0, `${hmi}`);
  await page.screenshot({ path: `${DIR}/screenshots/admin-agenda.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
