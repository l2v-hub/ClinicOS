// Evidenza browser: parametri vitali come il prototipo HMI 1 (stub API :3001; rilevazioni e
// salvataggi simulati con page.route, con stato: un salvataggio aggiorna riepilogo e storico).
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-6-parametri-vitali-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
const sortedJson = (o) => JSON.stringify(Object.fromEntries(Object.entries(o ?? {}).sort()));
const iso = (hAgo) => new Date(Date.now() - hAgo * 3600e3).toISOString();

const browser = await chromium.launch();
async function openPar(width, { failSave = false, hasMore = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const readings = new Map(); // patientId -> readings (più recente prima)
  const posts = [];
  const seed = (pid, i) => {
    if (readings.has(pid)) return;
    readings.set(
      pid,
      i % 3 === 2
        ? []
        : [
            {
              id: `r-${pid}`,
              requestId: `r-${pid}`,
              patientId: pid,
              measuredAt: iso(1 + i * 0.1),
              values: {
                fr: '24',
                spo2: '92',
                o2: 'no',
                pa: '148/86',
                fc: '108',
                coscienza: 'A',
                temperatura: '38,2',
              },
              authorOperatorId: 'op1',
              authorName: 'Inf',
              createdAt: iso(1),
            },
          ],
    );
  };
  await page.route(/\/patients\/parameters\/page(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const data = await res.json();
    // Lo stub ignora q: la ricerca lato server è simulata qui (nome o cognome).
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q) data.items = data.items.filter((it) => `${it.patient.lastName} ${it.patient.firstName}`.toLowerCase().includes(q.toLowerCase()));
    data.items.forEach((item, i) => {
      seed(item.patient.id, i);
      const list = readings.get(item.patient.id);
      item.cartella.readingCount = list.length;
      item.cartella.lastReadingAt = list[0]?.measuredAt ?? null;
    });
    route.fulfill({ json: data });
  });
  await page.route(/\/patients\/[^/]+\/parameter-readings(\?.*)?$/, async (route) => {
    const pid = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[2]);
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      posts.push({ pid, ...body });
      if (failSave) return route.fulfill({ status: 500, json: { error: 'Errore del server' } });
      const reading = {
        id: `n-${posts.length}`,
        patientId: pid,
        authorOperatorId: 'op1',
        authorName: 'Inf',
        createdAt: body.measuredAt,
        ...body,
      };
      const list = [reading, ...(readings.get(pid) ?? [])];
      readings.set(pid, list);
      return route.fulfill({
        json: {
          reading,
          summary: {
            date:
              body.measuredAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
                ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date())
                : body.measuredAt.slice(0, 10),
            count: list.length,
            noteCount: list.filter((r) => r.values.note).length,
            lastReadingAt: body.measuredAt,
          },
        },
      });
    }
    seed(pid, 0);
    route.fulfill({ json: { readings: readings.get(pid), hasMore, nextCursor: hasMore ? 'c2' : null } });
  });
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Parametri"]').click();
  await page.locator('.par-form').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  return { page, posts };
}
const state = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.topbar-title')?.textContent ?? '',
    picks: [...document.querySelectorAll('.par-pick')].map((li) => ({
      bed: li.querySelector('.par-pick__bed')?.textContent,
      name: li.querySelector('.par-pick__name')?.textContent,
      cap: li.querySelector('.par-cap')?.textContent,
      news2: li.querySelector('.news2-chip')?.textContent ?? null,
      selected: li.classList.contains('par-pick--selected'),
    })),
    formName: document.querySelector('.par-form__name')?.textContent,
    cards: [...document.querySelectorAll('.par-card')].map((c) => ({
      label: c.querySelector('.par-card__label')?.textContent,
      value: c.querySelector('input')?.value,
      prev: c.querySelector('.par-cap')?.textContent,
      active: c.classList.contains('par-card--active'),
      h: Math.round(c.getBoundingClientRect().height),
    })),
    news2: document.querySelector('.par-news2')?.textContent ?? '',
    keys: document.querySelectorAll('.par-pad__key').length,
    save: document.querySelector('.par-wide.ds-btn--primary')?.textContent,
    saveDisabled: document.querySelector('.par-wide.ds-btn--primary')?.disabled,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
async function pad(page, text) {
  for (const ch of text)
    await page.getByRole('button', { name: ch === ',' ? 'Virgola' : ch, exact: true }).click();
}

// AC1 — aspetto a 1180
{
  const { page } = await openPar(1180);
  const s = await state(page);
  await page.screenshot({ path: `${DIR}/screenshots/parametri-1180.png` });
  check(
    'AC1 titolo "Parametri vitali" nell\'intestazione',
    /Parametri vitali/.test(s.title) && /Rilevazione rapida con NEWS2/.test(s.title),
    s.title,
  );
  check(
    'AC1 colonna pazienti: camera, nome, "Ultimi HH:MM", NEWS2 reale',
    s.picks.length >= 6 &&
      s.picks[0].bed !== '—' &&
      /^Ultimi \d{2}:\d{2}( · \d+\soggi)?$/.test(s.picks[0].cap) &&
      /NEWS2\s*6/.test(s.picks[0].news2 ?? '') &&
      s.picks[0].selected,
    JSON.stringify(s.picks[0]),
  );
  check(
    'AC1 paziente senza rilevazioni: "Nessuna rilevazione oggi"',
    s.picks.some((p) => p.cap === 'Nessuna rilevazione oggi'),
    '',
  );
  check(
    'AC1 card FR, SpO2, PA sistolica, PA diastolica, FC, Temperatura, DTX con "Prima"',
    JSON.stringify(s.cards.map((c) => c.label)) ===
      JSON.stringify(['FR', 'SpO2', 'PA sistolica', 'PA diastolica', 'FC', 'Temperatura', 'DTX']) &&
      /^Prima: 24 · \d{2}:\d{2}$/.test(s.cards[0].prev) &&
      /^Prima: 148 ·/.test(s.cards[2].prev) &&
      /^Prima: 86 ·/.test(s.cards[3].prev) &&
      /^Prima: 38,2 ·/.test(s.cards[5].prev) &&
      s.cards[6].prev === 'Nessuna rilevazione precedente',
    s.cards.map((c) => c.prev).join(' | '),
  );
  check(
    'AC1 tastierino 12 tasti, NEWS2 "Inserisci i valori", "Salva parametri" disabilitato',
    s.keys === 12 &&
      /Inserisci i valori/.test(s.news2) &&
      s.saveDisabled &&
      /Salva parametri/.test(s.save),
    s.news2,
  );
  await page.close();
}

// AC2/AC3 — tastierino, campo successivo, NEWS2 in tempo reale, salvataggio
{
  const { page, posts } = await openPar(1180);
  await page.locator('.par-card').first().click();
  await pad(page, '24');
  await page.getByRole('button', { name: 'Campo successivo' }).click();
  await pad(page, '92');
  await page.getByRole('button', { name: 'Campo successivo' }).click();
  await pad(page, '148');
  await page.getByRole('button', { name: 'Campo successivo' }).click();
  await pad(page, '86');
  await page.getByRole('button', { name: 'Campo successivo' }).click();
  await pad(page, '108');
  await page.getByRole('button', { name: 'Campo successivo' }).click();
  await pad(page, '38,2');
  let s = await state(page);
  check(
    'AC2 il tastierino scrive nel campo attivo e "Campo successivo" segue l\'ordine',
    s.cards
      .map((c) => c.value)
      .slice(0, 6)
      .join(' ') === '24 92 148 86 108 38,2' && s.cards[5].active,
    s.cards.map((c) => c.value).join(' '),
  );
  await page.locator('.par-card').first().click();
  const commaDisabled = await page.getByRole('button', { name: 'Virgola', exact: true }).isDisabled();
  s = await state(page);
  check('AC2 la virgola del tastierino è disattivata nei campi interi (FR)', commaDisabled && s.cards[0].value === '24', String(commaDisabled));
  check(
    'AC3 senza ossigeno e coscienza il NEWS2 non dà un punteggio: "Mancano: O₂, Coscienza"',
    /—/.test(s.news2) && /Mancano: O₂, Coscienza/.test(s.news2),
    s.news2,
  );
  await page.getByRole('button', { name: 'In aria' }).click();
  await page.getByRole('button', { name: 'A · Vigile' }).click();
  s = await state(page);
  check(
    'AC3 con i sette parametri il NEWS2 in tempo reale è 6 con la risposta',
    /NEWS2 in tempo reale\s*6/.test(s.news2) && /Valutazione medica/.test(s.news2),
    s.news2,
  );
  await page.screenshot({ path: `${DIR}/screenshots/news2-tempo-reale.png` });
  await page.locator('.par-card').nth(6).click();
  await pad(page, '110');
  await page.getByLabel(/^Evacuazione per/).fill('Regolare');
  await page.getByLabel(/^Note per/).fill('Paziente tranquillo');
  await page.getByRole('button', { name: /^Salva parametri per/ }).click();
  await page.waitForTimeout(2000);
  s = await state(page);
  const body = posts[0] ?? {};
  check(
    'AC2 POST con gli stessi campi di sempre: pa "148/86", decimali con virgola, DTX, evacuazione, nota',
    sortedJson(body.values) ===
      sortedJson({
        fr: '24',
        spo2: '92',
        pa: '148/86',
        fc: '108',
        temperatura: '38,2',
        dtx: '110',
        o2: 'no',
        coscienza: 'A',
        evacuazione: 'Regolare',
        note: 'Paziente tranquillo',
      }) &&
      /^[0-9a-f-]{36}$/.test(body.requestId ?? '') &&
      !Number.isNaN(Date.parse(body.measuredAt)),
    JSON.stringify(body.values),
  );
  const result = await page
    .locator('.par-result')
    .textContent()
    .catch(() => '');
  check(
    'AC4 dopo il salvataggio: "Rilevazione archiviata", modulo vuoto, "Ultimi" e "Prima" aggiornati',
    /Rilevazione archiviata/.test(result) &&
      s.cards.every((c) => !c.value) &&
      /^Ultimi \d{2}:\d{2}( · \d+\soggi)?$/.test(s.picks[0].cap) &&
      /^Prima: 110 ·/.test(s.cards[6].prev),
    `${result} · ${s.picks[0].cap} · ${s.cards[6].prev}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/dopo-salva.png` });
  await page.close();
}

// AC4 — bozza tenuta cambiando paziente
{
  const { page, posts } = await openPar(1180);
  await page.locator('.par-card').first().click();
  await pad(page, '18');
  await page.locator('.par-pick__main').nth(1).click();
  await page.waitForTimeout(800);
  let s = await state(page);
  const otherEmpty = s.cards[0].value === '' && s.picks[1].selected;
  const draftMark = /Bozza/.test(s.picks[0].cap);
  await page.locator('.par-pick__main').nth(0).click();
  await page.waitForTimeout(800);
  s = await state(page);
  check(
    'AC4 bozza tenuta cambiando paziente, segnata "Bozza", nessun salvataggio',
    otherEmpty && draftMark && s.cards[0].value === '18' && posts.length === 0,
    JSON.stringify({ otherEmpty, draftMark, back: s.cards[0].value }),
  );
  await page.close();
}

// AC4 — errore 500: messaggio, "Riprova", nessun dato perso
{
  const { page, posts } = await openPar(1180, { failSave: true });
  await page.locator('.par-card').first().click();
  await pad(page, '20');
  await page.getByRole('button', { name: /^Salva parametri per/ }).click();
  await page.waitForTimeout(1500);
  const s = await state(page);
  const err = await page
    .locator('.par-error')
    .textContent()
    .catch(() => '');
  check(
    'AC4 errore del server: avviso, "Riprova", valore conservato',
    /Errore del server/.test(err) &&
      /Riprova/.test(s.save) &&
      s.cards[0].value === '20' &&
      posts.length === 1,
    `${err} · ${s.save}`,
  );
  await page.getByRole('button', { name: /^Salva parametri per/ }).click();
  await page.waitForTimeout(1500);
  check(
    'AC4 "Riprova" ripete la stessa rilevazione (stesso requestId)',
    posts.length === 2 && posts[0].requestId === posts[1].requestId,
    `${posts.length}`,
  );
  await page.close();
}

// AC4 — ricerca: il termine va al server (la ricerca è lato server, come prima)
{
  const { page } = await openPar(1180);
  const first = (await state(page)).picks[0].name.split(', ')[1];
  const seen = [];
  page.on('request', (r) => {
    if (/\/patients\/parameters\/page/.test(r.url())) seen.push(new URL(r.url()).searchParams.get('q'));
  });
  await page.getByLabel('Cerca paziente per nome o camera').fill(first);
  await page.waitForTimeout(1500);
  check('AC4 la ricerca interroga il server con il termine digitato', seen.includes(first), JSON.stringify(seen));
  await page.close();
}
// Verifica QA, primo giro
{
  // 1 · storico con altre pagine: un campo assente non è dichiarato "nessuna rilevazione"
  const { page } = await openPar(1180, { hasMore: true });
  const s = await state(page);
  check('QA1 storico con altre pagine: DTX "non fra le ultime N rilevazioni"', /^Prima: non (fra le ultime \d+ rilevazioni|nell'ultima rilevazione)$/.test(s.cards[6].prev), s.cards[6].prev);
  await page.close();
}
for (const width of [768, 1024]) {
  // 2 · tablet: nomi interi (omonimi, stessa camera) e "Ultimi" completo
  const { page } = await openPar(width);
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('.par-pick')].map((li) => {
      const n = li.querySelector('.par-pick__name');
      const c = li.querySelector('.par-cap');
      return { name: n.textContent, clipped: n.scrollWidth > n.clientWidth + 1 || c.scrollWidth > c.clientWidth + 1, cap: c.textContent };
    }),
  );
  check(`QA1 ${width}: nomi e "Ultimi" interi nella lista`, r.length > 0 && r.every((x) => !x.clipped) && r.some((x) => /^Ultimi \d{2}:\d{2}/.test(x.cap)), JSON.stringify(r.slice(0, 2)));
  await page.screenshot({ path: `${DIR}/screenshots/lista-${width}.png` });
  await page.close();
}
{
  // 3 · "120/80" nella sistolica: 120 e 80 nei due campi; 4 · tastierino fermo con il fuoco nella nota
  const { page } = await openPar(1180);
  await page.locator('.par-card').nth(2).locator('input').pressSequentially('120/80');
  let s = await state(page);
  const split = s.cards[2].value === '120' && s.cards[3].value === '80';
  await page.getByLabel(/^Note per/).click();
  const disabled = await page.getByRole('button', { name: '7', exact: true }).isDisabled();
  s = await state(page);
  check('QA1 "120/80" digitato nella sistolica va nei due campi; tastierino fermo nella nota', split && disabled && s.cards[0].value === '', JSON.stringify({ pas: s.cards[2].value, pad: s.cards[3].value, disabled }));
  // 5 · la ricerca non cambia il paziente del modulo
  const before = s.formName;
  await page.getByLabel('Cerca paziente per nome o camera').fill('zzzz');
  await page.waitForTimeout(1200);
  s = await state(page);
  check('QA1 una ricerca non cambia il paziente del modulo', s.formName === before, `${before} → ${s.formName}`);
  await page.close();
}

// Verifica QA, secondo giro
for (const width of [1180, 1024, 390]) {
  // 1 · l'avviso "fuori dai risultati" si vede senza scorrere, sopra il nome del modulo
  const { page } = await openPar(width);
  await page.locator('.par-pick__main').nth(1).click();
  await page.waitForTimeout(600);
  await page.getByLabel('Cerca paziente per nome o camera').fill('Rossi');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const n = document.querySelector('.par-outside');
    const f = document.querySelector('.par-form');
    if (!n) return { found: false };
    n.scrollIntoView({ block: 'nearest' });
    const b = n.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + 10, b.top + b.height / 2);
    return { found: true, insideForm: f.contains(n), text: n.textContent, visible: !!hit && n.contains(hit), aboveName: b.bottom <= document.querySelector('.par-form__name').getBoundingClientRect().top + 1 };
  });
  check(`QA2 ${width}: avviso "non nei risultati" dentro il modulo, sopra il nome, visibile`, r.found && r.insideForm && r.visible && r.aboveName, JSON.stringify(r));
  await page.close();
}
{
  // 2 · una barra da sola non crea una bozza; 3 · "130/" non cancella la diastolica
  const { page } = await openPar(1180);
  const pas = page.locator('.par-card').nth(2).locator('input');
  await pas.pressSequentially('/');
  let s = await state(page);
  const draft = await page.locator('.par-pick--selected .par-pick__draft').count();
  const noDraft = s.cards[2].value === '' && s.cards[3].value === '' && draft === 0 && s.saveDisabled;
  await page.locator('.par-card').nth(3).locator('input').fill('86');
  await pas.click();
  await pas.pressSequentially('130/');
  s = await state(page);
  check('QA2 "/" da sola non crea bozza; "130/" tiene la diastolica 86', noDraft && s.cards[2].value === '130' && s.cards[3].value === '86', JSON.stringify({ noDraft, pas: s.cards[2].value, pad: s.cards[3].value }));
  const cancels = await page.evaluate(() =>
    [...document.styleSheets].some((sh) => { try { return [...sh.cssRules].some((r) => /par-search__input::-webkit-search-cancel-button/.test(r.selectorText ?? '') && /display:\s*none/.test(r.cssText)); } catch { return false; } }) ? 'none' : 'visible',
  );
  check('QA2 un solo pulsante per cancellare la ricerca', cancels === 'none', cancels);
  await page.close();
}

// Verifica QA, terzo giro: PA incollata o dettata non viene troncata
{
  const { page, posts } = await openPar(1180);
  await page.locator('.par-card').nth(2).locator('input').click();
  await page.keyboard.insertText('120/100');
  let s = await state(page);
  const fields = `${s.cards[2].value}/${s.cards[3].value}`;
  await page.locator('.par-card').first().locator('input').fill('20');
  await page.getByRole('button', { name: /^Salva parametri per/ }).click();
  await page.waitForTimeout(1500);
  check('QA3 "120/100" incollato: campi 120 e 100, POST con pa "120/100"', fields === '120/100' && posts[0]?.values?.pa === '120/100', JSON.stringify({ fields, pa: posts[0]?.values?.pa }));
  await page.close();
}

// Verifica QA, quarto giro: testo incollato o dettato → valore inserito oppure rifiuto, mai altro
{
  // card: 0 FR, 1 SpO2, 4 FC, 5 Temperatura, 6 DTX. atteso: stringa salvata, oppure null = rifiutato
  // [card, testo, atteso, modo]: atteso = valore salvato, null = rifiutato (nessuna POST)
  const CASES = [
    [1, 'SpO2 98', null, 'paste'],
    [1, 'SpO2: 98%', null, 'paste'],
    [4, 'FC: 108 bpm', null, 'paste'],
    [6, 'DTX: 110 mg/dl', null, 'paste'],
    [5, '36.5-37', null, 'paste'],
    [5, '37.555', null, 'paste'],
    [0, '18.5', null, 'paste'],
    [6, '>600', null, 'paste'],
    [6, '6,1 mmol/L', null, 'paste'],
    [5, '-1', null, 'paste'],
    [5, '37°5', null, 'type'],
    [5, '3,8,2', null, 'type'],
    [4, '1O8', null, 'type'],
    [0, '2.4', null, 'type'],
    [4, '1080', '1080', 'paste'],
    [6, '1100,55', '1100,55', 'paste'],
    [5, '37.5', '37.5', 'type'],
    [1, '98', '98', 'type'],
  ];
  const KEY = { 0: 'fr', 1: 'spo2', 4: 'fc', 5: 'temperatura', 6: 'dtx' };
  const bad = [];
  for (const [card, text, expected, mode] of CASES) {
    const { page, posts } = await openPar(1180);
    await page.locator('.par-card').nth(card).locator('input').click();
    if (mode === 'type') await page.keyboard.type(text);
    else await page.keyboard.insertText(text);
    await page.getByRole('button', { name: /^Salva parametri per/ }).click();
    await page.waitForTimeout(900);
    const sent = posts[0]?.values?.[KEY[card]];
    const error = await page.locator('.par-error').textContent().catch(() => '');
    const ok = expected === null ? posts.length === 0 && !!error : sent === expected;
    if (!ok) bad.push({ text, expected, sent, error });
    await page.close();
  }
  check(`QA4 ${CASES.length} testi incollati, dettati o digitati: salvato esattamente il valore inserito oppure rifiutato`, bad.length === 0, JSON.stringify(bad));
}

for (const width of [390, 768, 1024, 1440]) {
  const { page } = await openPar(width);
  const s = await state(page);
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, modulo e tastierino presenti`,
    s.overflow <= 0 && s.cards.length === 7 && s.keys === 12,
    `overflow ${s.overflow}`,
  );
  await page.screenshot({
    path: `${DIR}/screenshots/parametri-${width}.png`,
    fullPage: width === 390,
  });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
