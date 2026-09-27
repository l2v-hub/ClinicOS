// Evidenza browser: consegne come il prototipo HMI 1 (stub API :3001; il salvataggio è simulato con
// page.route: risponde come il server, con lo stesso requestId e lo stato "aperta").
//   BASE=http://localhost:4182 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-7-consegne-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4182';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
async function openHo(width, { summary } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const posts = [];
  page.on('dialog', (d) => d.dismiss());
  await page.route(/\/consegne(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = JSON.parse(route.request().postData() ?? '{}');
    posts.push(body);
    route.fulfill({
      status: 201,
      json: {
        ...body,
        id: `c-new-${posts.length}`,
        pazienteNome: 'Paziente di prova',
        stato: 'aperta',
        replayed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  });
  if (summary) await page.route(/\/consegne\/patient-summary$/, summary);
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Consegne"]').click();
  await page.locator('.handover-rounds__composer').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  return { page, posts };
}
const state = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.topbar-title')?.textContent ?? '',
    eyebrow: document.querySelector('.ho-eyebrow')?.textContent ?? '',
    orderOpen: !!document.querySelector('#ho-order'),
    rows: [...document.querySelectorAll('.handover-rounds__patient')].map((li) => ({
      bed: li.querySelector('.ho-bed')?.textContent,
      name: li.querySelector('.patient-identity__name')?.textContent,
      cap: li.querySelector('.patient-identity__identifier')?.textContent,
      badges: [...li.querySelectorAll('.handover-rounds__badges > span')].map((b) => b.textContent),
      selected: li.classList.contains('is-selected'),
    })),
    card: document.querySelector('.ho-card-head h3')?.textContent ?? '',
    cardState: document.querySelector('.ho-card-head .ho-cap')?.textContent ?? '',
    primary: (() => {
      const b = document.querySelector('.handover-rounds__actions .ho-btn--primary');
      const r = b?.getBoundingClientRect();
      const card = document.querySelector('.handover-rounds__composer')?.getBoundingClientRect();
      return b
        ? { text: b.textContent, h: Math.round(r.height), right: Math.round(card.right - r.right) }
        : null;
    })(),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

// AC1 — aspetto a 1180
{
  const { page } = await openHo(1180);
  const s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/consegne-1180.png` });
  check(
    'AC1 titolo "Consegne" nell\'intestazione',
    /Consegne/.test(s.title) && /Giro pazienti e feed/.test(s.title),
    s.title,
  );
  check(
    'AC1 intestazione del turno e ordine del giro chiuso',
    /^Turno (mattino|pomeriggio|notte)$/.test(s.eyebrow) && !s.orderOpen,
    s.eyebrow,
  );
  check(
    'AC1 righe con camera, nome, CF e stato reale; prima riga scelta',
    s.rows.length >= 3 &&
      s.rows[0].bed !== '—' &&
      /^CF |Nato\/a/.test(s.rows[0].cap ?? '') &&
      s.rows[0].badges.length > 0 &&
      s.rows[0].selected,
    JSON.stringify(s.rows[0]),
  );
  check(
    'AC1 card "Consegna · Nome" con azione primaria 48 px in basso a destra',
    /^Consegna · /.test(s.card) &&
      s.primary?.text === 'Salva e prossimo' &&
      s.primary.h === 48 &&
      s.primary.right <= 32,
    JSON.stringify({ card: s.card, primary: s.primary }),
  );
  await page.close();
}

// AC2 — bozza per paziente, salva e prossimo, scarta con conferma
{
  const { page, posts } = await openHo(1180);
  const note = page.getByLabel('Cosa deve essere fatto?');
  await note.fill('Controllare la glicemia alle 18');
  await page.locator('.handover-rounds__select').nth(1).click();
  await page.waitForTimeout(600);
  let s = await state(page);
  const otherEmpty = (await note.inputValue()) === '';
  const marked = s.rows[0].badges.includes('Bozza');
  await page.locator('.handover-rounds__select').nth(0).click();
  await page.waitForTimeout(600);
  const kept = await note.inputValue();
  check(
    'AC2 bozza tenuta cambiando paziente e segnata "Bozza"; la card lo dice',
    otherEmpty &&
      marked &&
      kept === 'Controllare la glicemia alle 18' &&
      /Bozza non salvata/.test((await state(page)).cardState),
    JSON.stringify({ otherEmpty, marked, kept }),
  );
  const firstName = s.rows[0].name;
  await page.getByRole('button', { name: 'Salva e prossimo' }).click();
  await page.waitForTimeout(2500);
  s = await state(page);
  const body = posts[0] ?? {};
  check(
    'AC2 "Salva e prossimo": una sola richiesta con testo, tipo, priorità e scadenza; passa al paziente successivo',
    posts.length === 1 &&
      body.note === 'Controllare la glicemia alle 18' &&
      body.tipo === 'Monitoraggio' &&
      body.priorita === 'normale' &&
      /^\d{4}-\d{2}-\d{2}/.test(body.scadenza ?? '') &&
      /^[0-9a-f-]{36}$/.test(body.requestId ?? '') &&
      s.rows[1].selected,
    JSON.stringify({
      n: posts.length,
      tipo: body.tipo,
      priorita: body.priorita,
      scadenza: body.scadenza,
      selected: s.rows.findIndex((r) => r.selected),
    }),
  );
  check(
    'AC2 la riga salvata è segnata "Appena salvata"',
    s.rows[0].badges.includes('Appena salvata') && s.rows[0].name === firstName,
    JSON.stringify(s.rows[0].badges),
  );
  await note.fill('Da scartare');
  await page.getByRole('button', { name: 'Scarta bozza' }).click();
  const dialog = page.getByRole('dialog').or(page.getByRole('alertdialog'));
  const asked = await dialog.first().isVisible();
  await dialog.first().getByRole('button', { name: 'Scarta bozza' }).click();
  await page.waitForTimeout(400);
  check(
    'AC2 "Scarta bozza" chiede conferma e poi svuota',
    asked && (await note.inputValue()) === '',
    '',
  );
  await page.screenshot({ path: `${DIR}/screenshots/dopo-salva.png` });
  await page.close();
}

// AC3 — stati onesti con riepilogo in errore o lento; ricerca e camera
for (const [label, handler] of [
  ['500', (route) => route.fulfill({ status: 500, json: { error: 'x' } })],
  [
    'lento',
    async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.continue().catch(() => {});
    },
  ],
]) {
  const { page } = await openHo(1180, { summary: handler });
  const s = await state(page);
  const counts = s.rows
    .flatMap((r) => r.badges)
    .filter((b) => /\d+ (aperte|urgenti|nello storico)|Nessuna consegna/.test(b));
  check(
    `AC3 riepilogo ${label}: nessun conteggio inventato, stato dichiarato`,
    counts.length === 0 &&
      s.rows.every((r) =>
        r.badges.some((b) => /Riepilogo non disponibile|Verifica consegne/.test(b)),
      ),
    JSON.stringify(s.rows[0].badges),
  );
  await page.close();
}
{
  const { page } = await openHo(1180);
  const s0 = await state(page);
  const surname = s0.rows[0].name.split(',')[0];
  const firstName = s0.rows[0].name.split(', ')[1];
  await page.getByRole('searchbox', { name: 'Cerca paziente' }).fill(firstName);
  await page.waitForTimeout(1500);
  const s1 = await state(page);
  check(
    'AC3 ricerca per nome',
    s1.rows.length >= 1 && s1.rows.every((r) => r.name.includes(firstName)),
    `${s0.rows.length} → ${s1.rows.length} (${surname}, ${firstName})`,
  );
  const roomSeen = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.searchParams.has('room')) roomSeen.push(u.searchParams.get('room'));
  });
  await page.getByRole('searchbox', { name: 'Cerca paziente' }).fill('');
  await page.getByRole('searchbox', { name: 'Camera' }).fill(s0.rows[0].bed);
  await page.waitForTimeout(1500);
  check('AC3 il filtro per camera interroga il server con la camera', roomSeen.includes(s0.rows[0].bed), JSON.stringify(roomSeen));
  await page.close();
}

// Verifica QA, primo giro
{
  // 1 · selezionando l'ultima riga, titolo e identità della card restano a vista (1180×820)
  const { page } = await openHo(1180);
  const rows = page.locator('.handover-rounds__select');
  const n = await rows.count();
  await rows.nth(n - 1).click();
  await page.waitForTimeout(800);
  const pos = await page.evaluate(() => {
    const top = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().top ?? -999);
    const bottom = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().bottom ?? 9999);
    return { title: top('.ho-card-head h3'), identity: top('.handover-rounds__composer-identity'), note: bottom('.handover-rounds__note textarea'), row: top('.handover-rounds__patient.is-selected'), rowBottom: bottom('.handover-rounds__patient.is-selected'), vh: innerHeight };
  });
  check('QA1 ultima riga scelta: titolo, identità, testo e riga scelta tutti a vista', pos.title >= 72 && pos.identity >= 72 && pos.note <= pos.vh && pos.row >= 72 && pos.rowBottom <= pos.vh, JSON.stringify(pos));
  await page.screenshot({ path: `${DIR}/screenshots/ultima-riga.png` });
  await page.close();
}
// Verifica QA, secondo giro: 801–1023 px e finestre basse, il nome del paziente nella card è leggibile
for (const [w, h] of [[1000, 700], [900, 560], [1180, 600]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (w < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Consegne"]').click();
  await page.locator('.handover-rounds__composer').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const rows = page.locator('.handover-rounds__select');
  await rows.nth((await rows.count()) - 1).click();
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + Math.min(20, b.width / 2), b.top + b.height / 2);
      return b.top >= 0 && b.bottom <= innerHeight && !!hit && el.contains(hit);
    };
    return {
      titolo: vis(document.querySelector('.ho-card-head h3')),
      nomeIdentita: vis(document.querySelector('.handover-rounds__composer-identity .patient-identity__name')),
      rigaScelta: vis(document.querySelector('.handover-rounds__patient.is-selected .patient-identity__name')),
    };
  });
  check(`QA2 ${w}×${h}: nome del paziente leggibile nella card (titolo o identità) dopo la selezione`, r.titolo || r.nomeIdentita, JSON.stringify(r));
  await page.screenshot({ path: `${DIR}/screenshots/qa2-${w}x${h}.png` });
  await page.close();
}
for (const width of [390, 1024, 1180, 1440]) {
  // 2 · nomi lunghi e omonimi quasi uguali: righe dentro la colonna, nome intero leggibile
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  await page.route(/\/patients\/page(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const data = await res.json();
    if (data.items?.[0]) Object.assign(data.items[0], { lastName: "Dell'Acqua-Bianchi Santangelo", firstName: 'Maria Francesca Giuseppina' });
    if (data.items?.[1]) Object.assign(data.items[1], { lastName: "Dell'Acqua-Bianchi Santangelo", firstName: 'Maria Francesca Giuseppino' });
    route.fulfill({ json: data });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Consegne"]').click();
  await page.locator('.handover-rounds__composer').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    const col = document.querySelector('.handover-rounds__list').getBoundingClientRect();
    const rows = [...document.querySelectorAll('.handover-rounds__patient')];
    const names = rows.slice(0, 2).map((li) => {
      const n = li.querySelector('.patient-identity__name');
      return { text: n.textContent, clipped: n.scrollWidth > n.clientWidth + 1 };
    });
    return {
      over: Math.max(...rows.map((li) => Math.round(li.getBoundingClientRect().right - col.right))),
      rosterScrollX: (() => { const u = document.querySelector('.handover-rounds__roster'); return u.scrollWidth - u.clientWidth; })(),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      names,
    };
  });
  check(`QA1 ${width}: nomi lunghi dentro la colonna, interi e distinguibili`, r.over <= 0 && r.rosterScrollX <= 0 && r.docOverflow <= 0 && r.names.every((x) => !x.clipped) && /Giuseppina/.test(r.names[0].text) && /Giuseppino/.test(r.names[1].text), JSON.stringify(r));
  if (width === 1180) await page.screenshot({ path: `${DIR}/screenshots/nomi-lunghi-1180.png` });
  await page.close();
}

// AC4 — Feed raggiungibile, larghezze
{
  const { page } = await openHo(1180);
  await page.getByRole('button', { name: 'Feed consegne' }).click();
  await page.waitForTimeout(2000);
  const feedItems = await page
    .locator('.handover-workspace')
    .getByText(/Messaggio sintetico|consegn/i)
    .count();
  const pressed = await page
    .getByRole('button', { name: 'Feed consegne' })
    .getAttribute('aria-pressed');
  check(
    'AC4 il Feed si apre dal chip ed è popolato',
    pressed === 'true' && feedItems > 0,
    `${feedItems} elementi`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/feed-1180.png` });
  await page.close();
}
for (const width of [390, 768, 1024, 1440]) {
  const { page } = await openHo(width);
  const s = await state(page);
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, elenco e card presenti`,
    s.overflow <= 0 && s.rows.length > 0 && !!s.primary,
    `overflow ${s.overflow}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/consegne-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
