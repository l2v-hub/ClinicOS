// Evidence: diary "Valida terapia" when the automatic preview fails (manual compilation with the
// reason) and when it only partially understands the text (fields to fill by hand).
// Stack: frontend on :5373 (VITE_API_URL=http://localhost:3301) + perf stub API on :3301, whose
// therapy-preview endpoint does not exist (404, the reported failure). Run from repo root:
//   node qa-evidence/diary-preview/preview-fallback-evidence.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const APP = process.env.APP_URL ?? 'http://localhost:5373/';
const OUT = 'artifacts/task-validation/diary-therapy-preview-manual-fallback';
for (const dir of ['screenshots', 'trace', 'logs']) mkdirSync(`${OUT}/${dir}`, { recursive: true });

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ step: name, result: 'PASS' });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ step: name, result: 'FAIL', error: String(error?.message ?? error) });
    console.log(`FAIL  ${name}\n      ${error?.message ?? error}`);
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

async function openPanel(text) {
  await page.goto(APP);
  await page.getByText('Operatore', { exact: true }).first().click();
  await page.waitForTimeout(2000);
  await page.locator('.teams-sidebar').getByText('Pazienti', { exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByText('Moretti, Andrea').first().click();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Aggiungi voce', exact: true }).click();
  await page.getByPlaceholder('Descrizione, note cliniche…').fill(text);
  await page.getByRole('button', { name: 'Valida terapia' }).click();
  const panel = page.getByTestId('diary-therapy-panel');
  await panel.waitFor();
  return panel;
}

await step(
  'preview fails (404) → reason shown AND therapy form opens for manual compilation',
  async () => {
    const text = 'Iniziare terapia come concordato con il cardiologo, dose da definire';
    const panel = await openPanel(text);
    const alert = panel.getByRole('alert');
    await alert.waitFor();
    const reason = await alert.innerText();
    assert.match(
      reason,
      /Anteprima non disponibile: l’interprete del testo non è attivo su questo server \(404\)/,
    );
    assert.match(await panel.innerText(), /compila la terapia a mano/);
    // The editable therapy form is there, with the diary text in the notes.
    const confirm = panel.getByRole('button', { name: 'Conferma e aggiungi in Terapia' });
    assert.equal(await confirm.count(), 1, 'manual form offered');
    const values = await panel.locator('textarea').evaluateAll((els) => els.map((e) => e.value));
    assert.ok(values.some((v) => v.includes(text)), 'diary text copied into the notes');
    assert.equal(await confirm.isDisabled(), true, 'required fields must be completed first');
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${OUT}/screenshots/01-preview-404-manual-form.png`,
      fullPage: true,
    });
  },
);

await step('partial preview → names the fields the interpreter did not understand', async () => {
  await page.route('**/diary/therapy-preview', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        row: {
          farmacoNome: 'RAMIPRIL',
          forma: '',
          dosaggio: '5 mg',
          viaSomministrazione: '',
          quantita: '',
          orari: [],
          giorni: [],
          dataInizio: '',
          classe: '',
          note: '',
          originalText: 'ramipril 5 mg',
          stato: 'da_verificare',
          dataFine: '',
          quantitaValore: '',
          quantityNumerator: null,
          quantityDenominator: null,
          unitaSomministrazione: '',
        },
        intent: 'prescrizione',
        inferred: [],
        ambiguous: [],
        fasciaConflicts: [],
        warnings: [],
        prescriptionRange: null,
        source: 'deterministic',
      }),
    }),
  );
  const panel = await openPanel('ramipril 5 mg');
  const unread = panel.getByTestId('diary-therapy-unread');
  await unread.waitFor();
  assert.match(
    await unread.innerText(),
    /non ho capito: via di somministrazione, orari, quantità per dose/,
  );
  assert.equal(await panel.getByRole('alert').count(), 0, 'no error when the preview worked');
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${OUT}/screenshots/02-partial-preview-unread-fields.png`,
    fullPage: true,
  });
  await page.unroute('**/diary/therapy-preview');
});

await context.tracing.stop({ path: `${OUT}/trace/diary-preview-fallback.zip` });
await browser.close();
writeFileSync(`${OUT}/logs/playwright-results.json`, JSON.stringify(results, null, 2));
writeFileSync(`${OUT}/logs/browser-console-errors.txt`, consoleErrors.join('\n') || '(none)');
const failed = results.filter((r) => r.result === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} steps passed`);
process.exit(failed ? 1 : 0);
