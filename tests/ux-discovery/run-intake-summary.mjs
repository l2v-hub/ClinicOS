import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = 'artifacts/task-validation/intake-therapy-summary';
mkdirSync(out, { recursive: true });
const imported = {
  farmacoNome: 'Farmaco importato',
  forma: '',
  dosaggio: '20 mg/ml',
  viaSomministrazione: '',
  quantita: 'Dose da verificare',
  orari: ['08:00'],
  giorni: [],
  dataInizio: '',
  classe: '',
  note: '',
  originalText: 'Farmaco importato 20 mg/ml. Dose da verificare sulla lettera.',
  stato: 'da_verificare',
};
const manual = {
  farmacoNome: 'Farmaco manuale',
  pharmaceuticalForm: 'compressa',
  commercialStrengthValue: '2,5',
  commercialStrengthUnit: 'mg',
  allowedFractions: ['1'],
  viaSomministrazione: 'orale',
  tipo: 'periodica',
  stato: 'attiva',
  dataInizio: '',
  dataFine: '',
  giorniSettimana: [],
  prescrittore: 'Prescrittore test',
  note: 'Nota sintetica leggibile',
  dataSomministrazione: '',
  orarioSomministrazione: '',
  schedules: [
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
    { time: '25:10', quantityNumerator: 2, quantityDenominator: 0, administrationUnit: '' },
  ],
};
const draft = {
  id: 'synthetic-intake',
  version: 1,
  status: 'draft',
  importJobId: null,
  data: {
    anagrafica: { firstName: 'Ospite', lastName: 'Test', dateOfBirth: '1950-01-01', sex: 'M' },
    _accepted: { demographics: true, therapy: false },
    terapiaImport: [
      { ...imported, farmacoNome: 'Bozza esclusa', excludedFromConfirm: true },
      imported,
    ],
    terapia: [manual],
  },
};
const original = JSON.stringify(draft);
const browser = await chromium.launch();
const failures = [];
let writes = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1150, height: 884 } });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:5187') return route.continue();
    if (url.origin !== 'http://localhost:3001') return route.abort();
    if (request.method() !== 'GET') {
      writes++;
      return route.fulfill({ status: 403, body: '{}' });
    }
    const body = url.pathname === '/intake/drafts/synthetic-intake' ? draft : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('http://127.0.0.1:5187/tests/ux-discovery/intake-summary.html');
  await page.getByTestId('intake-therapy-3').waitFor();
  await page
    .locator('.intake-index')
    .getByRole('button', { name: /^Riepilogo/ })
    .click();
  const card = page.getByTestId('intake-therapy-3');
  await card.scrollIntoViewIfNeeded();
  assert.match(await card.innerText(), /2,5/);
  assert.match(await card.innerText(), /25:10/);
  assert.match(await card.innerText(), /2 \/ 0/);
  assert.doesNotMatch(await card.innerText(), /NaN/);
  await page.screenshot({ path: `${out}/summary-1150.png` });
  await card
    .getByRole('button', { name: 'Correggi Ora 2 della terapia 3: Farmaco manuale', exact: true })
    .click();
  const time = page.locator(
    '[data-therapy-source="manual"][data-therapy-index="0"] [data-therapy-field="time"][data-therapy-schedule="1"]',
  );
  await time.waitFor();
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute('data-therapy-field') === 'time' &&
      document.activeElement?.getAttribute('data-therapy-schedule') === '1',
  );
  assert.equal(await time.getAttribute('aria-invalid'), 'true');
  await page.screenshot({ path: `${out}/exact-correction-1150.png` });
  await time
    .locator('xpath=ancestor::article')
    .getByRole('button', { name: 'Chiudi scheda', exact: true })
    .first()
    .click();
  await time.waitFor({ state: 'detached' });
  await card
    .getByRole('button', { name: 'Correggi Ora 2 della terapia 3: Farmaco manuale', exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute('data-therapy-field') === 'time' &&
      document.activeElement?.getAttribute('data-therapy-schedule') === '1',
  );
  const sourceCard = page.getByTestId('intake-therapy-2');
  await sourceCard
    .getByRole('button', {
      name: 'Correggi Testo estratto dalla lettera della terapia 2: Farmaco importato',
      exact: true,
    })
    .click();
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute('data-therapy-field') === 'sourceReview' &&
      document.activeElement
        ?.closest('[data-therapy-index]')
        ?.getAttribute('data-therapy-index') === '1',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await card.scrollIntoViewIfNeeded();
  assert.ok(
    await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    'summary card must not overflow on mobile',
  );
  await page.screenshot({ path: `${out}/summary-390.png` });
  assert.equal(await page.getByTestId('intake-therapy-1').count(), 0);
  assert.equal(writes, 0);
  assert.equal(JSON.stringify(draft), original);
  assert.deepEqual(failures, []);
  writeFileSync(
    `${out}/results.json`,
    JSON.stringify(
      {
        passed: true,
        sourceValuesPreserved: true,
        manualCorrection: 'row 0 / time 1',
        importedCorrection: 'row 1 / sourceReview',
        clinicalWrites: writes,
        viewports: [1150, 390],
        pageErrors: failures,
      },
      null,
      2,
    ),
  );
  console.log(
    'Intake summary: values, exact correction targets, responsive layout and no clinical writes passed.',
  );
} finally {
  await browser.close();
}
