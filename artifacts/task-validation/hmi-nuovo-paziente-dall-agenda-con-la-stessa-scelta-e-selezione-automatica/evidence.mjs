// Evidenza browser: nuovo paziente dal modulo appuntamento, con la stessa scelta della lista.
// A fine creazione il paziente viene selezionato nel modulo, che resta aperto.
// Bozze intake e servizio AI sono simulati con page.route: il wizard manuale viene percorso
// davvero, passo per passo, fino a "Crea paziente". La conferma restituisce un paziente reale
// dello stub API.
//   BASE=http://localhost:4173 node <questo file>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR =
  'artifacts/task-validation/hmi-nuovo-paziente-dall-agenda-con-la-stessa-scelta-e-selezione-automatica';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4173';
const roster = await (await fetch('http://localhost:3001/patients/page?limit=12')).json();
const created = roster.items[3];
const createdName = `${created.lastName}, ${created.firstName}`;
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

async function setup(page, { failPatientFetch = false, slowPatientFetch = false } = {}) {
  await page.route(/\/ai\/extraction\/.*/, (route) =>
    route.fulfill({
      json: new URL(route.request().url()).pathname.endsWith('/status')
        ? { available: true, provider: 'x', model: 'y', errors: [] }
        : {},
    }),
  );
  let draft = {
    id: 'draft-manual',
    status: 'draft',
    version: 1,
    data: {
      anagrafica: {
        firstName: 'Teresa',
        lastName: 'Galli',
        dateOfBirth: '1941-03-12',
        sex: 'F',
        comuneNascita: 'Milano',
        provinciaNascita: 'MI',
      },
    },
  };
  const state = { confirmed: false };
  await page.route(/\/intake\/drafts(\/.*)?$/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (req.method() === 'POST' && url.pathname.endsWith('/confirm')) {
      state.confirmed = true;
      return route.fulfill({ json: { status: 'created', patient: { id: created.id } } });
    }
    if (req.method() === 'PATCH') {
      const { expectedDraftVersion: _v, ...patch } = body;
      draft = {
        ...draft,
        data: { ...draft.data, ...(patch.data ?? patch) },
        version: draft.version + 1,
      };
      return route.fulfill({ json: draft });
    }
    return route.fulfill({ json: draft });
  });
  if (failPatientFetch) {
    await page.route(new RegExp(`/patients/${created.id}$`), (route) =>
      route.fulfill({ status: 500, json: { error: 'x' } }),
    );
  }
  if (slowPatientFetch) {
    await page.route(new RegExp(`/patients/${created.id}$`), async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
  }
  return state;
}

async function walkWizard(page) {
  await page
    .getByText(/Passaggio 1 di 5/)
    .first()
    .waitFor({ timeout: 10000 });
  // dati minimi per registrare l'ingresso: nome e cognome
  await page.getByLabel(/^Nome/).first().fill('Teresa');
  await page.getByLabel(/^Cognome/).first().fill('Galli');
  for (let i = 0; i < 8; i++) {
    for (const cb of await page.getByRole('checkbox').all()) {
      const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
      if (/confermo|accetta|nessuna terapia/.test(txt) && !(await cb.isChecked())) await cb.check();
    }
    if (await page.getByText(/Passaggio 5 di 5/).count()) break;
    await page
      .getByRole('button', { name: /^Avanti/ })
      .last()
      .click();
    await page.waitForTimeout(400);
  }
  for (const cb of await page.getByRole('checkbox').all()) {
    const txt = (await cb.evaluate((e) => e.closest('label')?.innerText ?? '')).toLowerCase();
    if (/confermo|accetta/.test(txt) && !(await cb.isChecked())) await cb.check();
  }
  const confirmBtn = page.getByRole('button', { name: /Crea paziente|Conferma/ }).last();
  if (!(await confirmBtn.isVisible().catch(() => false))) {
    await page.screenshot({ path: `${DIR}/logs/wizard-bloccato.png` });
    const txt = await page.locator('[role=dialog]').last().innerText().catch(() => '');
    console.log('WIZARD BLOCCATO:', txt.replace(/\s+/g, ' ').slice(0, 900));
  }
  await confirmBtn.click({ timeout: 10000 });
}

const browser = await chromium.launch();
const aptDialog = (page) =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Nuovo Appuntamento' }) });
const chooser = (page) =>
  page
    .getByRole('dialog', { name: 'Nuovo paziente' })
    .filter({ hasText: 'Come vuoi inserire il paziente?' });

async function openOperatorForm(page) {
  await page.goto(BASE);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.locator('.teams-sidebar__item[title="Agenda"]').click();
  await page
    .getByRole('button', { name: /^Crea appuntamento alle / })
    .first()
    .click();
  await aptDialog(page).waitFor({ timeout: 10000 });
}

// 1. Operatore: scelta → A mano → wizard completo → paziente selezionato nel modulo.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const state = await setup(page);
  await openOperatorForm(page);
  await aptDialog(page)
    .getByRole('button', { name: /Crea nuovo paziente/ })
    .click();
  const chooserOk = await chooser(page)
    .waitFor({ timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  const labels = await page.locator('.new-patient-chooser__option strong').allInnerTexts();
  check(
    'agenda operatore: "Crea nuovo paziente" apre la scelta Da documenti / A mano',
    chooserOk && labels.join(',') === 'Da documenti,A mano',
    JSON.stringify(labels),
  );
  await page.screenshot({ path: `${DIR}/screenshots/agenda-scelta.png` });
  await chooser(page)
    .getByRole('button', { name: /A mano/ })
    .click();
  await walkWizard(page);
  await page.waitForTimeout(2500);
  const input = aptDialog(page).locator('#appointment-patient');
  const value = await input.inputValue().catch(() => '');
  const save = aptDialog(page).getByRole('button', { name: /Salva appuntamento/ });
  check('conferma del wizard inviata', state.confirmed);
  check('il modulo appuntamento resta aperto', (await aptDialog(page).count()) === 1);
  check(
    'il paziente creato è selezionato nel campo Paziente',
    value === createdName,
    `valore="${value}" atteso="${createdName}"`,
  );
  check('"Salva appuntamento" è abilitato', await save.isEnabled());
  check('nessun altro dialogo aperto', (await page.locator('[role=dialog]').count()) === 1);
  await page.screenshot({ path: `${DIR}/screenshots/agenda-paziente-selezionato.png` });
  await page.close();
}

// 2. Errore nel caricamento del paziente creato: messaggio, nessuna selezione, modulo utilizzabile.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await setup(page, { failPatientFetch: true });
  await openOperatorForm(page);
  await aptDialog(page)
    .getByRole('button', { name: /Crea nuovo paziente/ })
    .click();
  await chooser(page)
    .getByRole('button', { name: /A mano/ })
    .click();
  await walkWizard(page);
  await page.waitForTimeout(2500);
  const alert = await aptDialog(page).getByRole('alert').allInnerTexts();
  const value = await aptDialog(page)
    .locator('#appointment-patient')
    .inputValue()
    .catch(() => '');
  const saveEnabled = await aptDialog(page)
    .getByRole('button', { name: /Salva appuntamento/ })
    .isEnabled();
  check(
    'errore: messaggio "non è stato possibile selezionarlo"',
    alert.some((a) => /non è stato possibile selezionarlo/.test(a)),
    JSON.stringify(alert),
  );
  check(
    'errore: nessun paziente selezionato e Salva disattivato',
    value === '' && !saveEnabled,
    `valore="${value}"`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/agenda-errore-selezione.png` });
  await page.close();
}

// 3. Operatore: "Da documenti" apre l'import dal modulo appuntamento; chiudendolo resta il modulo.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await setup(page);
  await openOperatorForm(page);
  await aptDialog(page)
    .getByRole('button', { name: /Crea nuovo paziente/ })
    .click();
  await chooser(page)
    .getByRole('button', { name: /Da documenti/ })
    .click();
  const imp = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Importa lettere di dimissione' }) });
  const impOk = await imp.waitFor({ timeout: 8000 }).then(
    () => true,
    () => false,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(
    'agenda: "Da documenti" apre l\'import; Esc torna al modulo appuntamento',
    impOk && (await imp.count()) === 0 && (await aptDialog(page).count()) === 1,
  );
  await page.close();
}

// 4. Amministratore: stessa scelta dall'agenda multi-operatore.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await setup(page);
  await page.goto(BASE);
  await page.getByText('Amministratore', { exact: true }).first().click();
  await page.locator('.teams-sidebar__item[title="Agenda"]').click();
  await page.locator('.agt-admin-cell.free').first().click();
  await aptDialog(page).waitFor({ timeout: 10000 });
  await aptDialog(page)
    .getByRole('button', { name: /Crea nuovo paziente/ })
    .click();
  const ok = await chooser(page)
    .waitFor({ timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  check('agenda amministratore: "Crea nuovo paziente" apre la stessa scelta', ok);
  await chooser(page)
    .getByRole('button', { name: /A mano/ })
    .click();
  await walkWizard(page);
  await page.waitForTimeout(2500);
  const value = await aptDialog(page)
    .locator('#appointment-patient')
    .inputValue()
    .catch(() => '');
  check(
    'agenda amministratore: paziente creato selezionato nel modulo',
    value === createdName,
    `valore="${value}"`,
  );
  await page.screenshot({ path: `${DIR}/screenshots/agenda-admin-paziente-selezionato.png` });
  await page.close();
}

// 5. Caricamento lento del paziente creato e scelta a mano nel frattempo: vince la scelta a mano.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await setup(page, { slowPatientFetch: true });
  await openOperatorForm(page);
  await aptDialog(page).getByRole('button', { name: /Crea nuovo paziente/ }).click();
  await chooser(page).getByRole('button', { name: /A mano/ }).click();
  await walkWizard(page);
  await page.waitForTimeout(500);
  const status = await aptDialog(page).getByRole('status').allInnerTexts();
  check('caricamento lento: il modulo dice che sta selezionando il paziente creato', status.some((t) => /Selezione del paziente creato/.test(t)), JSON.stringify(status));
  const other = roster.items[0];
  const input = aptDialog(page).locator('#appointment-patient');
  await input.fill(other.firstName);
  const option = page.getByRole('option', { name: new RegExp(`${other.lastName}, ${other.firstName}`) }).first();
  await option.waitFor({ timeout: 8000 });
  await option.click();
  await page.waitForTimeout(4000);
  const value = await input.inputValue();
  const expected = `${other.lastName}, ${other.firstName}`;
  const statusAfter = await aptDialog(page).getByRole('status').count();
  check('caricamento lento: la scelta a mano non viene sovrascritta dal paziente creato', value === expected, `valore="${value}" atteso="${expected}"`);
  check('caricamento lento: il messaggio di attesa sparisce dopo la scelta a mano', statusAfter === 0);
  await page.close();
}

await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
process.exit(log.some((l) => l.startsWith('FAIL')) ? 1 : 0);
