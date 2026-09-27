// Evidenza browser: giro terapia come il prototipo HMI 1 (stub API :3001; fasce simulate con
// page.route, con stato: una conferma aggiorna la ricarica successiva come farebbe il server).
//   BASE=http://localhost:4181 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/hmi-parita-5-giro-terapia-come-il-prototipo';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4181';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const roster = (await (await fetch('http://localhost:3001/patients/page?limit=25')).json()).items;
const P = roster.slice(0, 5);
const DRUGS = [
  ['Enoxaparina', '4000 UI', 's.c.'],
  ['Furosemide', '25 mg', 'os'],
  ['Bisoprololo', '2,5 mg', 'os'],
  ['Memantina', '10 mg', 'os'],
  ['Clopidogrel', '75 mg', 'os'],
];

function makeState(date, onePending = false) {
  const slots = [
    ['mattina', 'Terapia mattina', '08:00'],
    ['pranzo', 'Terapia pranzo', '12:00'],
    ['pomeriggio', 'Terapia pomeriggio', '18:00'],
    ['sera', 'Terapia sera', '20:00'],
  ].map(([fascia, label, ora], fi) => ({
    id: `${date}-${fascia}`,
    fascia,
    label,
    ora,
    patients: P.slice(0, fi === 3 ? 0 : fi === 0 ? 5 : 3).map((p, i) => ({
      patientId: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      codiceFiscale: p.codiceFiscale,
      dateOfBirth: p.dateOfBirth,
      location: p.location,
      room: 'STALE-ROOM',
      bed: 'STALE-BED',
      administrations: [
        {
          administrationId: null,
          therapyId: `th-${p.id}-${fi}`,
          drugName: DRUGS[i][0],
          dosage: DRUGS[i][1],
          quantityLabel: null,
          route: DRUGS[i][2],
          scheduledTime: ora,
          status: fi === 0 && (i === 3 || (onePending && i !== 0)) ? 'administered' : 'pending',
          administeredAt: fi === 0 && (i === 3 || (onePending && i !== 0)) ? `${date}T06:12:00Z` : null,
          administeredBy: fi === 0 && (i === 3 || (onePending && i !== 0)) ? 'L. Conti' : null,
          notAdministeredReason: null,
        },
      ],
    })),
  }));
  return slots;
}
function withSummary(slots) {
  return slots.map((s) => {
    const all = s.patients.flatMap((p) => p.administrations);
    const administered = all.filter((a) => a.status === 'administered').length;
    const notAdministered = all.filter((a) => a.status === 'not_administered').length;
    return {
      ...s,
      summary: {
        total: all.length,
        administered,
        notAdministered,
        pending: all.length - administered - notAdministered,
      },
    };
  });
}

const browser = await chromium.launch();
async function openGiro(width, { role = 'Operatore', failConfirm = false, partial = false, onePending = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 820 } });
  const state = new Map();
  const sent = [];
  page.on('dialog', (d) => d.dismiss());
  await page.route(/\/therapy-slots\/page(\?.*)?$/, (route) => {
    const date = new URL(route.request().url()).searchParams.get('date');
    if (!state.has(date)) state.set(date, makeState(date, onePending));
    const slots = withSummary(state.get(date));
    route.fulfill({
      json: {
        slots,
        pageInfo: {
          hasMore: partial,
          nextCursor: partial ? 'c2' : null,
          loadedTherapies: 11,
          completeness: partial ? 'partial' : 'complete',
          summaryExact: true,
        },
      },
    });
  });
  const act = (kind) => async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    sent.push({ kind, ...body });
    if (failConfirm) return route.fulfill({ status: 500, json: { error: 'x' } });
    const slots = state.get(body.date);
    const a = slots
      ?.find((s) => s.fascia === body.fascia)
      ?.patients.find((p) => p.patientId === body.patientId)
      ?.administrations.find((x) => x.therapyId === body.therapyId);
    if (a && kind === 'confirm') {
      a.status = 'administered';
      a.administeredAt = new Date().toISOString();
      a.administeredBy = body.operatoreNome;
    }
    if (a && kind === 'not') {
      a.status = 'not_administered';
      a.notAdministeredReason = body.motivo;
    }
    route.fulfill({ json: { ok: true } });
  };
  await page.route(/\/therapy-slots\/confirm$/, act('confirm'));
  await page.route(/\/therapy-slots\/not-administered$/, act('not'));
  await page.goto(BASE);
  await page.getByText(role, { exact: true }).first().click();
  await page.waitForTimeout(1000);
  if (width < 1024) await page.getByRole('button', { name: 'Apri menu' }).click();
  await page.locator('.teams-sidebar__item[title="Terapia"]').click();
  await page.locator('.giro-view').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  return { page, sent };
}
const snapshot = (page) =>
  page.evaluate(() => ({
    title: document.querySelector('.topbar-title')?.textContent ?? '',
    chips: [...document.querySelectorAll('.giro-slot')].map((c) => ({
      text: c.textContent.trim(),
      pressed: c.getAttribute('aria-pressed'),
      h: Math.round(c.getBoundingClientRect().height),
    })),
    count: document.querySelector('.giro-progress__count')?.textContent ?? '',
    fill: document.querySelector('.giro-progress__track i')?.style.width ?? '',
    rows: [...document.querySelectorAll('.giro-row')].map((r) => ({
      bed: r.querySelector('.giro-row__bed')?.textContent,
      name: r.querySelector('.giro-row__who .giro-row__name')?.textContent,
      cap: r.querySelector('.giro-row__who .giro-row__cap')?.textContent,
      drug: r.querySelector('.giro-row__drug .giro-row__name')?.textContent,
      drugCap: r.querySelector('.giro-row__drug .giro-row__cap')?.textContent,
      act: r.querySelector('.giro-row__act')?.textContent.trim(),
      done: r.classList.contains('giro-row--done'),
    })),
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    html: document.body.innerHTML.includes('STALE-'),
  }));

// AC1 — aspetto a 1180
{
  const { page } = await openGiro(1180);
  const s = await snapshot(page);
  await page.screenshot({ path: `${DIR}/screenshots/giro-1180.png` });
  check('AC1 titolo "Giro terapia" nell\'intestazione', /Giro terapia/.test(s.title), s.title);
  check(
    'AC1 chip fasce "HH:MM · fatte/totale" 48 px, 08:00 scelta (prima con somministrazioni da fare)',
    JSON.stringify(s.chips.map((c) => c.text)) ===
      JSON.stringify(['08:00 · 1/5', '12:00 · 0/3', '18:00 · 0/3', '20:00 · 0/0']) &&
      s.chips.every((c) => c.h === 48) &&
      s.chips[0].pressed === 'true',
    JSON.stringify(s.chips),
  );
  check(
    'AC1 barra e contatore della fascia 1/5',
    s.count === '1/5' && s.fill === '20%',
    `${s.count} ${s.fill}`,
  );
  check(
    'AC1 nessun dialogo: il giro è nella pagina',
    s.dialogs === 0 && s.rows.length === 5,
    `${s.rows.length} righe`,
  );
  const r0 = s.rows[0];
  check(
    'AC2 riga con camera, paziente, CF, farmaco, dose, via · orario e azioni',
    r0.bed &&
      r0.bed !== '—' &&
      r0.name &&
      /CF |Nato\/a/.test(r0.cap) &&
      /Enoxaparina 4000 UI/.test(r0.drug) &&
      r0.drugCap === 's.c. · 08:00' &&
      /Non somm\./.test(r0.act) &&
      /Somministra/.test(r0.act),
    JSON.stringify(r0),
  );
  check('AC2 camera dalla posizione attuale, mai dai campi storici', !s.html, '');
  check(
    'AC2 riga già fatta: fondo tenue e "✓ 08:12 · L. Conti"',
    s.rows[3].done && /08:12 · L\. Conti/.test(s.rows[3].act),
    JSON.stringify(s.rows[3]),
  );
  await page.close();
}

// AC2 — Somministra: richiesta identica, riga aggiornata, doppio clic = un atto
{
  const { page, sent } = await openGiro(1180);
  const btn = page
    .locator('.giro-row')
    .first()
    .getByRole('button', { name: /^Erogata:/ });
  await btn.dblclick();
  await page.waitForTimeout(1500);
  const s = await snapshot(page);
  const c = sent.filter((x) => x.kind === 'confirm');
  const body = c[0] ?? {};
  check(
    'AC2 "Somministra" invia paziente, terapia, fascia, data e ora della fascia',
    body.patientId === P[0].id &&
      body.therapyId === `th-${P[0].id}-0` &&
      body.fascia === 'mattina' &&
      body.ora === '08:00' &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.date) &&
      body.farmacoNome === 'Enoxaparina',
    JSON.stringify({ ...body, operatoreNome: undefined }),
  );
  check('AC2 doppio clic: un solo atto inviato', c.length === 1, `${c.length} richieste`);
  check(
    'AC2 la riga diventa "✓ HH:MM · operatore" e il contatore sale a 2/5',
    /^\d{2}:\d{2} · .+/.test(s.rows[0].act) &&
      s.rows[0].done &&
      s.count === '2/5' &&
      s.chips[0].text === '08:00 · 2/5',
    `${s.rows[0].act} · ${s.count}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/dopo-somministra.png` });
  await page.close();
}

// AC2 — errore del server: la riga torna "da erogare" e non resta bloccata su "Invio…"
{
  const { page, sent } = await openGiro(1180, { failConfirm: true });
  await page
    .locator('.giro-row')
    .first()
    .getByRole('button', { name: /^Erogata:/ })
    .click();
  await page.waitForTimeout(2000);
  const btn = page
    .locator('.giro-row')
    .first()
    .getByRole('button', { name: /^Erogata:/ });
  const ok =
    (await btn.count()) === 1 &&
    (await btn.isEnabled()) &&
    /Somministra/.test(await btn.textContent());
  check(
    'AC2 dopo un errore la riga torna "Somministra" ed è di nuovo cliccabile',
    ok && sent.length === 1,
    `${sent.length} richieste`,
  );
  await page.close();
}

// AC3 — Non somministrata con motivo
{
  const { page, sent } = await openGiro(1180);
  const row = page.locator('.giro-row').nth(1);
  await row.getByRole('button', { name: /^Non erogata:/ }).click();
  const confirm = row.getByRole('button', { name: /^Conferma non erogata:/ });
  const disabledFirst = await confirm.isDisabled();
  await row.getByRole('button', { name: /^Altro:/ }).click();
  const input = row.getByRole('textbox');
  const hasInput = (await input.count()) === 1;
  await input.fill('Vomito dopo colazione');
  await page.screenshot({ path: `${DIR}/screenshots/motivo.png` });
  await confirm.click();
  await page.waitForTimeout(1500);
  const s = await snapshot(page);
  const body = sent.find((x) => x.kind === 'not') ?? {};
  check('AC3 "Conferma" disabilitato finché non si sceglie un motivo', disabledFirst, '');
  check('AC3 "Altro" chiede il testo', hasInput, '');
  check(
    'AC3 la richiesta porta motivo e nota, per la riga giusta',
    body.motivo === 'altro' &&
      body.note === 'Vomito dopo colazione' &&
      body.patientId === P[1].id &&
      body.fascia === 'mattina',
    JSON.stringify({ motivo: body.motivo, note: body.note }),
  );
  check(
    'AC3 la riga mostra "Non somm. · Altro" e il contatore 2/5',
    /Non somm\. · Altro/.test(s.rows[1].act) && s.count === '2/5',
    `${s.rows[1].act} ${s.count}`,
  );
  await page.close();
}

// AC4 — cambio fascia, filtro, data, parziale, sola lettura, errore
{
  const { page } = await openGiro(1180);
  await page.getByRole('button', { name: /ore 12:00/ }).click();
  let s = await snapshot(page);
  check(
    'AC4 scelta la fascia 12:00: 3 righe e contatore 0/3',
    s.rows.length === 3 && s.count === '0/3' && s.chips[1].pressed === 'true',
    `${s.rows.length} ${s.count}`,
  );
  await page.getByRole('button', { name: /ore 08:00/ }).click();
  await page.getByRole('button', { name: /^Erogate/ }).click();
  s = await snapshot(page);
  check(
    'AC4 filtro "Erogate": solo la riga già erogata',
    s.rows.length === 1 && /L\. Conti/.test(s.rows[0].act),
    `${s.rows.length}`,
  );
  await page.getByRole('button', { name: 'Tutte', exact: true }).click();
  const before = await page.locator('.giro-view input[type="date"]').inputValue();
  await page.getByRole('button', { name: 'Giorno successivo' }).click();
  await page.waitForTimeout(1200);
  const after = await page.locator('.giro-view input[type="date"]').inputValue();
  s = await snapshot(page);
  check(
    'AC4 giorno successivo ricarica la data e riparte dalla prima fascia da fare',
    after > before && s.chips[0].pressed === 'true' && s.rows.length === 5,
    `${before} → ${after}`,
  );
  await page.close();
}
{
  const { page } = await openGiro(1180, { partial: true });
  const note = await page.locator('.giro-note-box').textContent();
  check(
    'AC4 parziale: avviso e "Carica altre terapie"',
    /parziale/.test(note) && /Carica altre terapie/.test(note),
    note.trim(),
  );
  await page.close();
}
{
  const { page } = await openGiro(1180, { role: 'Amministratore' });
  const s = await snapshot(page);
  const signing = await page
    .getByRole('button', { name: /^(Erogata|Non erogata|Conferma non erogata):/ })
    .count();
  check(
    'AC4 admin in sola lettura: nessuna firma, badge "Da erogare"',
    signing === 0 && s.rows.some((r) => /Da erogare/.test(r.act)),
    `${signing} pulsanti`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/admin-sola-lettura.png` });
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  let fail = true;
  await page.route(/\/therapy-slots\/page(\?.*)?$/, (route) =>
    fail ? route.fulfill({ status: 500, json: { error: 'x' } }) : route.continue(),
  );
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('.teams-sidebar__item[title="Terapia"]').click();
  await page.waitForTimeout(2000);
  const alert = await page.locator('.giro-view [role="alert"]').count();
  const retry = await page.getByRole('button', { name: 'Riprova' }).count();
  fail = false;
  check(
    'AC4 errore di caricamento: avviso e "Riprova"',
    alert > 0 && retry === 1,
    `${alert}/${retry}`,
  );
  await page.close();
}
// Verifica QA, primo giro
{
  // 1 · doppio clic sull'ultima riga da fare della fascia: un solo atto, la fascia non salta
  const { page, sent } = await openGiro(1180, { onePending: true });
  await page.locator('.giro-row').first().getByRole('button', { name: /^Erogata:/ }).dblclick();
  await page.waitForTimeout(1500);
  const s = await snapshot(page);
  const c = sent.filter((x) => x.kind === 'confirm');
  check('QA1 doppio clic sull\'ultima da fare: un solo atto, sulla fascia 08:00, che resta scelta', c.length === 1 && c[0].fascia === 'mattina' && s.chips[0].pressed === 'true' && s.chips[0].text === '08:00 · 5/5', JSON.stringify({ n: c.length, fasce: c.map((x) => x.fascia), chip: s.chips[0] }));
  await page.close();
}
{
  // 2 · motivo scelto a 08:00, poi cambio fascia: il pannello non passa alla 12:00
  const { page, sent } = await openGiro(1180);
  const row = page.locator('.giro-row').first();
  await row.getByRole('button', { name: /^Non erogata:/ }).click();
  await row.getByRole('button', { name: /^Paziente assente:/ }).click();
  await page.getByRole('button', { name: /ore 12:00/ }).click();
  await page.waitForTimeout(500);
  const panels = await page.locator('.giro-row__reasons').count();
  await page.getByRole('button', { name: /ore 08:00/ }).click();
  await page.waitForTimeout(500);
  const panelsBack = await page.locator('.giro-row__reasons').count();
  check('QA1 cambiando fascia il pannello motivi si chiude e non invia nulla', panels === 0 && panelsBack === 0 && sent.length === 0, JSON.stringify({ panels, panelsBack, sent: sent.length }));
  // 3 · il fuoco torna su "Non somm." dopo Annulla e sulla riga dopo Somministra
  await row.getByRole('button', { name: /^Non erogata:/ }).click();
  await row.getByRole('button', { name: 'Annulla' }).click();
  await page.waitForTimeout(200);
  const afterCancel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName);
  await row.getByRole('button', { name: /^Erogata:/ }).click();
  await page.waitForTimeout(400);
  const afterGive = await page.evaluate(() => document.activeElement?.className ?? document.activeElement?.tagName);
  check('QA1 fuoco: "Non somm." dopo Annulla, la riga dopo Somministra', /^Non erogata:/.test(afterCancel ?? '') && /giro-row/.test(afterGive ?? ''), JSON.stringify({ afterCancel, afterGive }));
  await page.close();
}
for (const width of [390, 768, 1024, 1440]) {
  const { page } = await openGiro(width);
  const s = await snapshot(page);
  check(
    `AC4 ${width}: nessuno scorrimento orizzontale, ${s.rows.length} righe`,
    s.overflow <= 0 && s.rows.length === 5,
    `overflow ${s.overflow}`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/giro-${width}.png` });
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);
