// Dimissione dalla cartella: «Dimetti paziente» nel tab «Dimissione», finestra «Camera e
// Assegnazione» raggiungibile dall'intestazione, elenchi che si aggiornano, annullamento.
//
//   A. Infermiere (modifica la cartella, non gestisce i posti letto): dimette, lo stato cambia,
//      il letto resta assegnato; elenchi e ricaricamento.
//   B. Supervisore (gestisce i posti letto, non modifica la cartella): nessuna azione di
//      dimissione; dalla finestra chiude il letto del paziente dimesso.
//   C. Infermiere: annulla la dimissione.
//   D. Ruolo con entrambi i permessi (policy locale modificata e poi ripristinata): la dimissione
//      chiude anche il letto; se la chiusura fallisce (500 simulato) lo stato NON cambia.
//
// SOLO stack locale con dati sintetici (backend AUTH_MODE=demo + simulatore ruoli, seed
// POST /admin/synthetic-data/seed). Uso, dalla radice del repo:
//   FRONT=http://127.0.0.1:5211 API=http://127.0.0.1:3111 node scripts/e2e/dimissione-paziente.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const API = process.env.API ?? 'http://127.0.0.1:3111';
const OUT =
  process.argv[2] ?? 'artifacts/task-validation/dimissione-paziente-raggiungibile-dalla-cartella';
if (!/127\.0\.0\.1|localhost/.test(FRONT) || !/127\.0\.0\.1|localhost/.test(API))
  throw new Error('Solo stack locale: FRONT e API devono essere su localhost');
for (const d of ['screenshots', 'trace', 'video', 'test-results'])
  mkdirSync(`${OUT}/${d}`, { recursive: true });

const NURSE_PATIENT = { id: 'SEED-PAZ-007', name: 'Mancini, Roberto' };
const BED_MANAGER_PATIENT = { id: 'SEED-PAZ-006', name: 'Gatti, Lucia' };
const FAILURE_PATIENT = { id: 'SEED-PAZ-005', name: 'Neri, Carlo' };

const results = [];
const consoleErrors = [];
const badResponses = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};

// ONLY=AB limita gli scenari (per le prove durante lo sviluppo); senza, li esegue tutti.
const run = (scenario) => !process.env.ONLY || process.env.ONLY.includes(scenario);

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });

async function login(role, label, { expectFailure = () => false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 820 },
    deviceScaleFactor: 2,
    recordVideo: { dir: `${OUT}/video`, size: { width: 1280, height: 820 } },
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  let auth = null;
  const writes = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(API)) return;
    if (r.headers().authorization) auth = r.headers().authorization;
    if (r.method() === 'PUT' || r.method() === 'POST')
      writes.push({ method: r.method(), path: r.url().slice(API.length), body: r.postData() });
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (expectFailure(m.text())) return;
    consoleErrors.push(`${label}: ${m.text().slice(0, 200)}`);
  });
  page.on('response', (r) => {
    if (!r.url().startsWith(API) || r.status() < 400) return;
    if (expectFailure(r.url())) return;
    badResponses.push(
      `${label}: ${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`,
    );
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  const api = async (path) => {
    const res = await fetch(`${API}${path}`, { headers: { authorization: auth } });
    return res.json();
  };
  const shot = (name) => page.screenshot({ path: `${OUT}/screenshots/${name}.png` });
  const close = async () => {
    await context.tracing.stop({ path: `${OUT}/trace/trace-${label}.zip` });
    await context.close();
  };
  return { page, api, shot, writes, close };
}

const stayOf = async (api, id) => (await api(`/patients/${id}/cartella`)).data?.statoRicovero;
const openBeds = async (api, id) =>
  (await api(`/patients/${id}/room-assignments?scope=active`)).filter((a) => a.endDate === null);
const cartellaWrites = (writes, id) =>
  writes
    .filter((w) => w.method === 'PUT' && w.path === `/patients/${id}/cartella`)
    .map((w) => JSON.parse(w.body).data);
const bedWrites = (writes, id) =>
  writes.filter((w) => w.path.startsWith(`/patients/${id}/room-assignments`));

async function openPatientList(page) {
  await page.locator('.teams-sidebar').getByText('Pazienti', { exact: true }).click();
  await page.getByRole('button', { name: 'Non dimessi' }).waitFor();
  await page.waitForLoadState('networkidle');
}
async function listView(page, view) {
  await page.getByRole('button', { name: view, exact: true }).click();
  await page.waitForTimeout(400);
}
// L'elenco mostra le righe prima che arrivi il riepilogo clinico (da cui dipende la vista): il
// conteggio si attende, come farebbe un'asserzione di Playwright, invece di leggerlo una volta sola.
async function inList(page, name, expected) {
  const rows = page.getByRole('table').getByText(name, { exact: true });
  const deadline = Date.now() + 10000;
  while ((await rows.count()) !== expected && Date.now() < deadline) await page.waitForTimeout(200);
  return rows.count();
}
const dialog = (page) => page.getByRole('dialog', { name: 'Camera e Assegnazione' });
const confirm = (page) => page.getByRole('alertdialog');
const stayCard = (page) => page.locator('.stay-status');
async function openDimissione(page) {
  await page.getByRole('tab', { name: 'Dimissione' }).click();
  await stayCard(page).waitFor();
}

// ───────────────────────── A. Infermiere ─────────────────────────
if (run('A')) {
  const P = NURSE_PATIENT;
  const s = await login('Infermiere', 'infermiere');
  const { page, api, shot, writes } = s;

  const before = await stayOf(api, P.id);
  check('A0', 'Stato iniziale: paziente non dimesso', before !== 'dimesso', `stato=${before}`);
  const bedsBefore = (await openBeds(api, P.id)).length;

  await openPatientList(page);
  check('A1', '«Non dimessi» contiene il paziente', (await inList(page, P.name, 1)) === 1);
  await shot('01-elenco-non-dimessi-prima');

  await page.getByRole('table').getByText(P.name, { exact: true }).click();
  const headerOpen = page.locator('.compact-topbar [data-stay-open]');
  await headerOpen.waitFor();
  check(
    'A2',
    'Intestazione: camera/letto è un controllo',
    /Camera \d+ · Letto/.test(await headerOpen.innerText()),
    await headerOpen.innerText(),
  );
  await headerOpen.click();
  await dialog(page).waitFor();
  check('A3', 'La finestra «Camera e Assegnazione» si apre dall’intestazione', true);
  check(
    'A4',
    'La finestra mostra lo stato del ricovero',
    (await dialog(page).locator('[data-stay-status]').count()) === 1,
  );
  await shot('02-finestra-camera-assegnazione');
  await dialog(page).getByRole('button', { name: 'Modifica stato ricovero' }).click();
  check(
    'A5',
    'Ruolo senza gestione letti: camera e letto bloccati, stato modificabile',
    (await page.locator('#patient-room-bed').isDisabled()) &&
      (await page.locator('#patient-room-number').isDisabled()) &&
      (await page.locator('#patient-room-status').isEnabled()) &&
      // Senza una modifica dello stato non c'è nulla da salvare.
      (await dialog(page).getByRole('button', { name: 'Salva' }).isDisabled()),
  );
  await shot('03-finestra-solo-stato-infermiere');
  await dialog(page).getByRole('button', { name: 'Annulla' }).click();
  await dialog(page).getByRole('button', { name: 'Chiudi', exact: true }).last().click();

  // Il modulo del profilo resta aperto mentre si dimette: salvandolo dopo non deve riscrivere lo
  // stato del ricovero letto alla sua apertura.
  await page.getByRole('tab', { name: 'Dati di ingresso' }).click();
  const anagrafica = page.getByRole('region', { name: 'Anagrafica' });
  await anagrafica.getByRole('button', { name: 'Modifica' }).click();
  await anagrafica.locator('.cr-inline-form').waitFor();

  await openDimissione(page);
  const action = page.locator('[data-stay-action="dimetti"]');
  check('A6', 'Tab «Dimissione»: azione «Dimetti paziente» visibile', await action.isVisible());
  await shot('04-tab-dimissione-prima');

  await action.click();
  await confirm(page).waitFor();
  const text = await confirm(page).innerText();
  check(
    'A7',
    'Conferma esplicita con le conseguenze',
    /Dimettere Mancini, Roberto\?/.test(text) &&
      /esce dagli elenchi di reparto/.test(text) &&
      /resta assegnato/.test(text),
    text.replace(/\s+/g, ' ').slice(0, 220),
  );
  await shot('05-conferma-dimissione-infermiere');
  await confirm(page).getByRole('button', { name: 'Annulla' }).click();
  await confirm(page).waitFor({ state: 'detached' });
  check(
    'A8',
    '«Annulla» non salva nulla',
    cartellaWrites(writes, P.id).length === 0 && (await stayOf(api, P.id)) === before,
  );

  await action.click();
  await confirm(page).getByRole('button', { name: 'Dimetti paziente' }).click();
  await page.locator('[data-stay-action="riammetti"]').waitFor();
  const sent = cartellaWrites(writes, P.id).at(-1);
  check(
    'A9',
    'PUT /patients/:id/cartella invia statoRicovero "dimesso"',
    sent?.statoRicovero === 'dimesso',
    `statoRicovero=${sent?.statoRicovero}`,
  );
  check(
    'A10',
    'Ruolo senza gestione letti: nessuna scrittura sulle assegnazioni, letto invariato',
    bedWrites(writes, P.id).length === 0 && (await openBeds(api, P.id)).length === bedsBefore,
  );
  check(
    'A11',
    'Il tab mostra «Dimesso» e offre «Annulla dimissione»',
    /Dimesso/i.test(await stayCard(page).innerText()),
  );
  check('A12', 'Intestazione: «Dimesso»', /^Dimesso/.test(await headerOpen.innerText()));
  await shot('06-tab-dimissione-dimesso');

  await page.getByRole('tab', { name: 'Dati di ingresso' }).click();
  const writesBeforeProfile = cartellaWrites(writes, P.id).length;
  await anagrafica.locator('.cr-inline-form').getByRole('button', { name: 'Salva' }).click();
  await anagrafica.locator('.cr-inline-form').waitFor({ state: 'detached' });
  const profileWrite = cartellaWrites(writes, P.id).at(-1);
  check(
    'A12b',
    'Il profilo aperto prima della dimissione, salvato dopo, non la annulla',
    cartellaWrites(writes, P.id).length === writesBeforeProfile + 1 &&
      profileWrite?.statoRicovero === 'dimesso' &&
      (await stayOf(api, P.id)) === 'dimesso' &&
      /^Dimesso/.test(await headerOpen.innerText()),
    `statoRicovero inviato=${profileWrite?.statoRicovero}`,
  );

  await openPatientList(page);
  check('A13', 'Il paziente è uscito da «Non dimessi»', (await inList(page, P.name, 0)) === 0);
  await shot('07-elenco-non-dimessi-dopo');
  await listView(page, 'Dimessi e archivio');
  check('A14', 'Il paziente è in «Dimessi e archivio»', (await inList(page, P.name, 1)) === 1);
  await shot('08-elenco-dimessi-e-archivio');

  await page.reload();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 }).catch(async () => {
    await page
      .getByRole('button', { name: /Infermiere/ })
      .first()
      .click();
    await page.waitForSelector('.teams-sidebar');
  });
  await page.waitForLoadState('networkidle');
  await openPatientList(page);
  const stillOut = (await inList(page, P.name, 0)) === 0;
  await listView(page, 'Dimessi e archivio');
  check(
    'A15',
    'Dopo il ricaricamento lo stato resta «dimesso» (elenchi e API)',
    stillOut && (await inList(page, P.name, 1)) === 1 && (await stayOf(api, P.id)) === 'dimesso',
  );
  await shot('09-dopo-ricaricamento');

  await s.close();
}

async function openChartBySearch(page, name) {
  await page.locator('.topbar-search:not(.topbar-assistant)').click();
  await page.keyboard.type(name.split(',')[0]);
  await page.locator('.search-overlay').getByText(name, { exact: true }).click();
  await page.locator('.compact-topbar [data-stay-open]').waitFor();
  await page.waitForLoadState('networkidle');
}

// ───────── B. Supervisore: gestisce i posti letto, non modifica la cartella ─────────
if (run('B')) {
  const P = NURSE_PATIENT; // dimesso dall'infermiere nello scenario A: il letto è ancora assegnato
  const s = await login('Supervisore', 'supervisore');
  const { page, api, shot, writes } = s;
  check(
    'B0',
    'Stato iniziale: dimesso dall’infermiere, letto ancora assegnato',
    (await stayOf(api, P.id)) === 'dimesso' && (await openBeds(api, P.id)).length === 1,
  );
  await openChartBySearch(page, P.name);
  const headerOpen = page.locator('.compact-topbar [data-stay-open]');
  check(
    'B1',
    'Intestazione: «Dimesso» con il letto ancora assegnato',
    /^Dimesso · Camera \d+ · Letto/.test(await headerOpen.innerText()),
    await headerOpen.innerText(),
  );
  await openDimissione(page);
  check(
    'B2',
    'Ruolo che non modifica la cartella: stato visibile, nessuna azione di dimissione',
    /Dimesso/i.test(await stayCard(page).innerText()) &&
      (await page.locator('[data-stay-action]').count()) === 0,
  );
  await shot('10-supervisore-tab-sola-lettura');
  await headerOpen.click();
  await dialog(page).getByRole('button', { name: 'Modifica assegnazione' }).click();
  const save = dialog(page).getByRole('button', { name: 'Salva' });
  check(
    'B3',
    'Finestra: stato non modificabile, «Salva» chiude il posto letto del paziente dimesso',
    (await page.locator('#patient-room-status').isDisabled()) &&
      (await save.isEnabled()) &&
      /l’assegnazione del posto letto viene chiusa/.test(await dialog(page).innerText()),
  );
  await shot('11-supervisore-libera-letto');
  await save.click();
  await dialog(page).getByRole('button', { name: 'Modifica assegnazione' }).waitFor();
  await page.waitForLoadState('networkidle');
  const closeWrite = bedWrites(writes, P.id).find((w) => w.method === 'PUT');
  check(
    'B4',
    'L’assegnazione attiva viene chiusa (PUT room-assignments con endDate)',
    /^\d{4}-\d{2}-\d{2}$/.test(JSON.parse(closeWrite?.body ?? '{}').endDate ?? '') &&
      (await openBeds(api, P.id)).length === 0,
    closeWrite?.body ?? 'nessuna richiesta',
  );
  check(
    'B5',
    'Nessuna scrittura sulla cartella da parte del supervisore; lo stato resta «dimesso»',
    cartellaWrites(writes, P.id).length === 0 && (await stayOf(api, P.id)) === 'dimesso',
  );
  await s.close();
}

// ───────────────── C. Infermiere: annulla la dimissione ─────────────────
if (run('C')) {
  const P = NURSE_PATIENT;
  const s = await login('Infermiere', 'infermiere-annulla');
  const { page, api, shot, writes } = s;
  await openPatientList(page);
  await listView(page, 'Dimessi e archivio');
  await page.getByRole('table').getByText(P.name, { exact: true }).click();
  await page.locator('.compact-topbar [data-stay-open]').waitFor();
  await openDimissione(page);
  await page.locator('[data-stay-action="riammetti"]').click();
  await confirm(page).waitFor();
  const text = await confirm(page).innerText();
  check(
    'C1',
    'Annullamento: conferma esplicita',
    /Annullare la dimissione\?/.test(text) && /Il posto letto non cambia/.test(text),
    text.replace(/\s+/g, ' ').slice(0, 220),
  );
  await shot('12-conferma-annulla-dimissione');
  await confirm(page).getByRole('button', { name: 'Annulla dimissione' }).click();
  await page.locator('[data-stay-action="dimetti"]').waitFor();
  check(
    'C2',
    'Annullamento: PUT con statoRicovero "ricoverato", salvato',
    cartellaWrites(writes, P.id).at(-1)?.statoRicovero === 'ricoverato' &&
      (await stayOf(api, P.id)) === 'ricoverato',
  );
  await openPatientList(page);
  await listView(page, 'Non dimessi');
  check('C3', 'Il paziente è tornato in «Non dimessi»', (await inList(page, P.name, 1)) === 1);
  await shot('13-elenco-dopo-annullamento');
  await s.close();
}

// ───── D. Policy locale: un ruolo che modifica la cartella E gestisce i posti letto ─────
// Nella policy predefinita nessun ruolo ha entrambi i permessi. Qui, solo sul database locale,
// l'infermiere riceve `room_assignments.create|update` dalla stessa API usata dalla pagina «Ruoli»;
// la policy di partenza viene ripristinata alla fine.
async function grantNurseBedRights() {
  const session = await fetch(`${API}/auth/simulator/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identityId: 'SIM-ADMIN' }),
  });
  const headers = {
    authorization: `Bearer ${(await session.json()).token}`,
    'content-type': 'application/json',
  };
  const { active } = await (await fetch(`${API}/authz/policy`, { headers })).json();
  const save = async (document, basedOnVersion, note) => {
    const res = await fetch(`${API}/authz/policy/versions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ document, basedOnVersion, note, apply: true }),
    });
    if (!res.ok) throw new Error(`policy ${res.status}: ${await res.text()}`);
    return res.json();
  };
  const document = structuredClone(active.document);
  document.grants.nurse['room_assignments.create'] = 'ALLOWED';
  document.grants.nurse['room_assignments.update'] = 'ALLOWED';
  const saved = await save(document, active.version, 'QA locale: infermiere gestisce i letti');
  return () => save(active.document, saved.version, 'QA locale: ripristino della policy');
}

if (run('D')) {
  const restorePolicy = await grantNurseBedRights();
  try {
    const P = BED_MANAGER_PATIENT;
    const s = await login('Infermiere', 'infermiere-con-letti');
    const { page, api, shot, writes } = s;
    const before = await stayOf(api, P.id);
    check(
      'D0',
      'Stato iniziale: non dimesso, con un letto assegnato',
      before !== 'dimesso' && (await openBeds(api, P.id)).length === 1,
      `stato=${before}`,
    );
    await openPatientList(page);
    await page.getByRole('table').getByText(P.name, { exact: true }).click();
    await page.locator('.compact-topbar [data-stay-open]').click();
    await dialog(page).getByRole('button', { name: 'Modifica assegnazione' }).click();
    await page.selectOption('#patient-room-status', 'dimesso');
    const save = dialog(page).getByRole('button', { name: 'Salva' });
    check(
      'D1',
      'Finestra: con «Dimesso» il salvataggio non richiede camera e letto',
      (await save.isEnabled()) && (await page.locator('#patient-room-bed').isDisabled()),
    );
    await shot('14-finestra-dimesso');
    await save.click();
    await confirm(page).waitFor();
    const text = await confirm(page).innerText();
    check(
      'D2',
      'Finestra: stessa conferma, con la chiusura del letto dichiarata',
      new RegExp(`Dimettere ${P.name}\\?`).test(text) &&
        /viene chiusa con la data di oggi/.test(text),
      text.replace(/\s+/g, ' ').slice(0, 220),
    );
    await shot('15-conferma-dimissione-con-letto');
    check(
      'D3',
      'Prima della conferma nessun salvataggio',
      cartellaWrites(writes, P.id).length === 0 && bedWrites(writes, P.id).length === 0,
    );
    await confirm(page).getByRole('button', { name: 'Dimetti paziente' }).click();
    await confirm(page).waitFor({ state: 'detached' });
    await page.waitForLoadState('networkidle');
    const closeWrite = bedWrites(writes, P.id).find((w) => w.method === 'PUT');
    check(
      'D4',
      'L’assegnazione attiva viene chiusa (PUT room-assignments con endDate)',
      /^\d{4}-\d{2}-\d{2}$/.test(JSON.parse(closeWrite?.body ?? '{}').endDate ?? '') &&
        (await openBeds(api, P.id)).length === 0,
      closeWrite?.body ?? 'nessuna richiesta',
    );
    const sent = cartellaWrites(writes, P.id).at(-1);
    check(
      'D5',
      'PUT cartella: statoRicovero "dimesso", senza cameraNumero/lettoNumero',
      sent?.statoRicovero === 'dimesso' && !('cameraNumero' in sent) && !('lettoNumero' in sent),
      `statoRicovero=${sent?.statoRicovero}`,
    );
    check('D6', 'Stato salvato sul server', (await stayOf(api, P.id)) === 'dimesso');
    await shot('16-dopo-dimissione-con-letto');

    check(
      'D6b',
      'Dopo la conferma la finestra si chiude e il fuoco torna al pulsante dell’intestazione',
      (await dialog(page).count()) === 0 &&
        (await page.evaluate(() => document.activeElement?.hasAttribute('data-stay-open'))),
    );

    // Annulla la dimissione dal tab.
    await openDimissione(page);
    await page.locator('[data-stay-action="riammetti"]').click();
    await confirm(page).getByRole('button', { name: 'Annulla dimissione' }).click();
    await page.locator('[data-stay-action="dimetti"]').waitFor();
    check(
      'D7',
      'Annullamento: stato «ricoverato», il letto non viene riassegnato da solo',
      (await stayOf(api, P.id)) === 'ricoverato' && (await openBeds(api, P.id)).length === 0,
    );
    // Lo stesso giorno il letto chiuso risulta ancora del paziente: riassegnarlo deve riaprire
    // l'assegnazione, non lasciarla scadere a mezzanotte.
    await page.locator('.compact-topbar [data-stay-open]').click();
    await dialog(page).getByRole('button', { name: 'Modifica assegnazione' }).click();
    await dialog(page).getByRole('button', { name: 'Salva' }).click();
    await dialog(page).getByRole('button', { name: 'Modifica assegnazione' }).waitFor();
    await page.waitForLoadState('networkidle');
    const reopen = bedWrites(writes, P.id).at(-1);
    check(
      'D7b',
      'Riassegnare il letto lo stesso giorno riapre l’assegnazione (endDate: null)',
      JSON.parse(reopen?.body ?? '{}').endDate === null && (await openBeds(api, P.id)).length === 1,
      reopen?.body ?? 'nessuna richiesta',
    );
    await shot('16b-letto-riassegnato');
    await s.close();

    // Chiusura del letto fallita (risposta 500 simulata): lo stato non deve cambiare.
    const F = FAILURE_PATIENT;
    const failing = (text) => /room-assignments\/|status of 500/.test(text);
    const f = await login('Infermiere', 'chiusura-letto-fallita', { expectFailure: failing });
    const statusBefore = await stayOf(f.api, F.id);
    await f.page.route(`${API}/patients/${F.id}/room-assignments/*`, (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"QA"}' })
        : route.continue(),
    );
    await openPatientList(f.page);
    await f.page.getByRole('table').getByText(F.name, { exact: true }).click();
    await f.page.locator('.compact-topbar [data-stay-open]').waitFor();
    await openDimissione(f.page);
    await f.page.locator('[data-stay-action="dimetti"]').click();
    await confirm(f.page).getByRole('button', { name: 'Dimetti paziente' }).click();
    await f.page.getByText('Impossibile chiudere l’assegnazione del posto letto').waitFor();
    check(
      'D8',
      'Chiusura del letto fallita: messaggio all’operatore, conferma ancora aperta',
      await confirm(f.page).isVisible(),
    );
    await f.shot('17-chiusura-letto-fallita');
    check(
      'D9',
      'Chiusura del letto fallita: lo stato del ricovero NON cambia',
      cartellaWrites(f.writes, F.id).length === 0 && (await stayOf(f.api, F.id)) === statusBefore,
      `stato=${await stayOf(f.api, F.id)}`,
    );
    await f.close();
  } finally {
    await restorePolicy();
  }
}

check('Z1', 'Nessun errore in console', consoleErrors.length === 0, consoleErrors.join(' | '));
check(
  'Z2',
  'Nessuna risposta 4xx/5xx inattesa',
  badResponses.length === 0,
  badResponses.join(' | '),
);
await browser.close();

const failed = results.filter((r) => r.result === 'FAIL');
writeFileSync(
  `${OUT}/test-results/dimissione-paziente.json`,
  JSON.stringify(
    { front: FRONT, api: API, total: results.length, failed: failed.length, results },
    null,
    2,
  ),
);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
