// Synthetic component smoke: actual chart/intake components, intercepted localhost HTTP.
// This does not prove authenticated backend/database E2E or independent QA.
import assert from 'node:assert/strict';
import { mkdir, writeFile, mkdtemp, rm, rename } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../', import.meta.url));
const nativeOutput = path.join(root, 'artifacts/task-validation/bug-batch-507/evidence');
const output = process.env.QA_OUTPUT_DIR ? path.resolve(process.env.QA_OUTPUT_DIR) : nativeOutput;
assert(output === nativeOutput || output.startsWith(nativeOutput + path.sep), 'Evidence must remain in the owned native packet directory');
const screenshots = path.join(output, 'screenshots'), trace = path.join(output, 'trace'), videoDir = path.join(output, 'video');
for (const directory of [screenshots, trace, videoDir, path.join(output, 'test-results')]) await mkdir(directory, { recursive: true });
const cache = await mkdtemp(path.join(os.tmpdir(), 'clinicos-e2e-507-'));
process.env.VITE_API_URL = 'http://127.0.0.1:3999';
const entry = path.join(root, 'e2e/issue507/entry.tsx');
const html = `<html lang="it"><head><meta charset="UTF-8"><title>Issue 507 synthetic QA</title></head><body><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`;
const serverOptions = {
  configFile: false, envDir: false, root: path.join(root, 'frontend'),
  cacheDir: cache,
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:3999') },
  resolve: { alias: { '@': path.join(root, 'frontend/src') } },
  plugins: [react(), { name: 'issue507-private-entry', configureServer(vite) {
    vite.middlewares.use('/__qa507', async (_req, res, next) => {
      try { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/__qa507', html)); }
      catch (error) { next(error); }
    });
  } }],
  server: { host: '127.0.0.1', port: 5178, strictPort: true, fs: { allow: [root, cache] } },
};
let server, browser, activeContext, activePage, activeTimezone;
const errors = [], unexpected = [], results = [];
const saved = { id: 'synthetic-therapy', patientId: 'synthetic-patient',
  farmacoNome: 'Synthetic saved medicine', dosaggio: '20 mg', viaSomministrazione: 'orale',
  tipo: 'periodica', stato: 'attiva', dataInizio: '2026-08-30', dataFine: null,
  dataSomministrazione: null, orarioSomministrazione: null, orarioSpecifico: null,
  fasceMattina: true, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false,
  pharmaceuticalForm: 'compressa', commercialStrengthValue: 20, commercialStrengthUnit: 'mg',
  allowedFractions: '1', giorniSettimana: null,
  schedules: [{ id: 'synthetic-schedule', therapyId: 'synthetic-therapy', time: '08:00',
    quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' }],
};
async function value(locator, expected) {
  await locator.waitFor({ state: 'visible' });
  assert.equal(await locator.inputValue(), expected);
}
try {
  server = await createServer(serverOptions);
  await server.listen();
  browser = await chromium.launch({ headless: true,
    ...(process.env.QA_CHROMIUM_EXECUTABLE ? { executablePath: process.env.QA_CHROMIUM_EXECUTABLE } : {}),
    args: ['--no-sandbox'] });
  for (const timezoneId of ['Europe/Rome', 'America/Los_Angeles']) {
    const context = await browser.newContext({ timezoneId, viewport: { width: 1280, height: 960 }, recordVideo: { dir: videoDir, size: { width: 1280, height: 960 } } });
    activeContext = context;
    activeTimezone = timezoneId.replace('/', '-');
    await context.tracing.start({ screenshots: false, snapshots: true });
    await context.route('**/*', async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === '127.0.0.1' && url.port === '5178') return route.continue();
      // External fonts are denied without reaching the network.
      if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com')
        return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      if (url.hostname !== '127.0.0.1' || url.port !== '3999') {
        unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort('blockedbyclient');
      }
      let body;
      if (request.method() === 'GET' && /^\/patients\/synthetic-patient(?:-two)?\/therapies\/page$/.test(url.pathname)) {
        const items = url.pathname.includes('patient-two') ? [] : [saved];
        body = { items, summary: { total: items.length, active: items.length, inactive: 0 },
          pageInfo: { hasMore: false, nextCursor: null } };
      } else if (request.method() === 'GET' && /^\/patients\/synthetic-patient(?:-two)?\/cartella$/.test(url.pathname)) {
        body = { patientId: url.pathname.split('/')[2], data: { allergie: [], allergieStatus: 'assenti' } };
      } else if (request.method() === 'GET' && url.pathname === '/farmaci/cerca') {
        body = { query: url.searchParams.get('q'), esiti: [], pageInfo: { hasMore: false, nextCursor: null } };
      } else if (request.method() === 'GET' && url.pathname === '/therapy-slots') {
        body = [];
      } else if (request.method() === 'GET' && url.pathname === '/farmaci/stato') {
        body = { caricata: true };
      } else {
        unexpected.push(`${request.method()} ${url.pathname}`);
        return route.fulfill({ status: 500, body: 'Unexpected synthetic request' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    activePage = page;
    await page.clock.install({ time: new Date('2026-10-25T12:00:00Z') });
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:5178/__qa507');
    const chart = page.getByRole('region', { name: 'Chart therapy', exact: true });
    await value(chart.getByLabel('Data inizio *', { exact: true }), '2026-09-15');
    await chart.getByRole('radio', { name: /Una tantum/ }).check();
    await value(chart.getByLabel('Data somministrazione', { exact: true }), '2026-10-25');
    await chart.screenshot({ path: path.join(screenshots, `${timezoneId.replace('/', '-')}-chart-admission.png`) });
    await chart.getByLabel('Data inizio *', { exact: true }).fill('2026-10-01');
    await chart.getByLabel('Data somministrazione', { exact: true }).fill('2026-10-02');
    await page.getByLabel('Chart admission context', { exact: true }).fill('2026-09-20');
    await value(chart.getByLabel('Data inizio *', { exact: true }), '2026-10-01');
    await value(chart.getByLabel('Data somministrazione', { exact: true }), '2026-10-02');
    await chart.getByRole('tab', { name: 'Piano terapeutico' }).click();
    await chart.getByRole('tab', { name: 'Nuova terapia' }).click();
    await value(chart.getByLabel('Data inizio *', { exact: true }), '2026-10-01');
    await chart.getByRole('button', { name: 'Annulla', exact: true }).click();
    await chart.getByRole('tab', { name: 'Nuova terapia' }).click();
    await value(chart.getByLabel('Data inizio *', { exact: true }), '2026-09-20');
    await chart.getByRole('tab', { name: 'Piano terapeutico' }).click();
    await chart.getByRole('button', { name: /Synthetic saved medicine.*apri la prescrizione/ }).click();
    await chart.getByRole('button', { name: 'Modifica Synthetic saved medicine', exact: true }).click();
    await value(chart.getByLabel('Data inizio *', { exact: true }), '2026-08-30');
    results.push(`${timezoneId}: chart creation, type switch, explicit edits, context refresh, reopen and saved edit PASS`);

    const intake = page.getByRole('region', { name: 'Intake therapy', exact: true });
    await intake.getByRole('button', { name: '+ Aggiungi farmaco', exact: true }).click();
    await value(intake.getByLabel('Data inizio *', { exact: true }), '2026-09-12');
    await intake.getByLabel('Data inizio *', { exact: true }).fill('2026-09-13');
    await page.getByLabel('Intake admission context', { exact: true }).fill('2026-09-22');
    await value(intake.getByLabel('Data inizio *', { exact: true }), '2026-09-13');
    await intake.getByRole('button', { name: '+ Aggiungi un altro farmaco', exact: true }).click();
    await value(intake.getByLabel('Data inizio *', { exact: true }), '2026-09-22');
    await intake.getByRole('radio', { name: /Una tantum/ }).check();
    await value(intake.getByLabel('Data somministrazione', { exact: true }), '2026-10-25');
    await intake.screenshot({ path: path.join(screenshots, `${timezoneId.replace('/', '-')}-intake-admission.png`) });
    await intake.getByTestId('manual-therapy-row').first().getByRole('button', { name: 'Modifica', exact: true }).click();
    await value(intake.getByLabel('Data inizio *', { exact: true }), '2026-09-13');
    results.push(`${timezoneId}: real StepClinica intake new rows, context changes, once date and retained earlier row PASS`);
    await page.screenshot({ path: path.join(screenshots, `${timezoneId.replace('/', '-')}.png`), fullPage: true });
    for (const edit of ['untouched', 'start', 'once', 'same-fallback', 'empty-start', 'duration', 'end-date', 'no-end']) {
      await page.goto('http://127.0.0.1:5178/__qa507?cold=1');
      const coldChart = page.getByRole('region', { name: 'Chart therapy', exact: true });
      const start = coldChart.getByLabel('Data inizio *', { exact: true });
      await start.waitFor({ state: 'visible' });
      const fallback = await start.inputValue();
      const end = coldChart.getByLabel('Data fine (facoltativa)', { exact: true });
      if (edit === 'duration') await coldChart.getByRole('button', { name: '7 giorni', exact: true }).click();
      if (edit === 'end-date') await end.fill('2026-11-01');
      if (edit === 'no-end') await coldChart.getByRole('button', { name: 'Senza fine', exact: true }).click();
      if (edit === 'start') await start.fill('2026-10-01');
      if (edit === 'empty-start') await start.fill('');
      if (edit === 'same-fallback') {
        // Native input still represents an explicit choice when the value did not change.
        await start.evaluate((element) => element.dispatchEvent(new Event('input', { bubbles: true })));
      }
      if (edit === 'once') {
        await coldChart.getByRole('radio', { name: /Una tantum/ }).check();
        await coldChart.getByLabel('Data somministrazione', { exact: true }).fill('2026-10-02');
      }
      await page.getByLabel('Chart admission context', { exact: true }).fill('2026-09-15');
      await value(start, edit === 'start' ? '2026-10-01'
        : ['same-fallback', 'duration', 'end-date'].includes(edit) ? fallback : edit === 'empty-start' ? '' : '2026-09-15');
      if (edit === 'duration' || edit === 'end-date') {
        await value(end, edit === 'duration' ? '2026-10-31' : '2026-11-01');
        if (edit === 'duration') assert.equal(
          (Date.parse(await end.inputValue()) - Date.parse(await start.inputValue())) / 86400000 + 1,
          7, 'A chosen inclusive seven-day duration survives late admission');
        await coldChart.screenshot({ path: path.join(screenshots, `${timezoneId.replace('/', '-')}-interval-${edit}.png`) });
      } else if (edit !== 'once') await value(end, '');
      await coldChart.getByRole('radio', { name: /Una tantum/ }).check();
      await value(coldChart.getByLabel('Data somministrazione', { exact: true }),
        edit === 'once' ? '2026-10-02' : '2026-10-25');
      await coldChart.screenshot({ path: path.join(screenshots, `${timezoneId.replace('/', '-')}-cold-${edit}.png`) });
      results.push(`${timezoneId}: actual PatientDetail late admission, ${edit} dates PASS`);
    }
    await page.getByRole('button', { name: 'Switch synthetic patient', exact: true }).click();
    await value(page.getByRole('region', { name: 'Chart therapy', exact: true })
      .getByLabel('Data inizio *', { exact: true }), '2026-09-15');
    results.push(`${timezoneId}: actual patient-key remount does not reuse prior patient's draft PASS`);

    await page.goto('http://127.0.0.1:5178/__qa507?cold=1');
    const savedChart = page.getByRole('region', { name: 'Chart therapy', exact: true });
    await savedChart.getByRole('tab', { name: 'Piano terapeutico' }).click();
    await savedChart.getByRole('button', { name: /Synthetic saved medicine.*apri la prescrizione/ }).click();
    await savedChart.getByRole('button', { name: 'Modifica Synthetic saved medicine', exact: true }).click();
    await value(savedChart.getByLabel('Data inizio *', { exact: true }), '2026-08-30');
    await page.getByLabel('Chart admission context', { exact: true }).fill('2026-09-15');
    await value(savedChart.getByLabel('Data inizio *', { exact: true }), '2026-08-30');
    results.push(`${timezoneId}: delayed admission leaves saved editor dates unchanged PASS`);

    for (const edit of ['untouched', 'start', 'once', 'same-fallback', 'end-date']) {
      await page.goto('http://127.0.0.1:5178/__qa507?cold=1');
      const coldIntake = page.getByRole('region', { name: 'Intake therapy', exact: true });
      await coldIntake.getByRole('button', { name: '+ Aggiungi farmaco', exact: true }).click();
      const start = coldIntake.getByLabel('Data inizio *', { exact: true });
      const fallback = await start.inputValue();
      if (edit === 'end-date') await coldIntake.getByLabel('Data fine (facoltativa)', { exact: true }).fill('2026-11-01');
      if (edit === 'start') await start.fill('2026-10-01');
      if (edit === 'same-fallback') await start.evaluate((element) =>
        element.dispatchEvent(new Event('input', { bubbles: true })));
      if (edit === 'once') {
        await coldIntake.getByRole('radio', { name: /Una tantum/ }).check();
        await coldIntake.getByLabel('Data somministrazione', { exact: true }).fill('2026-10-02');
      }
      await page.getByLabel('Intake admission context', { exact: true }).fill('2026-09-12');
      await value(start, edit === 'start' ? '2026-10-01' : ['same-fallback', 'end-date'].includes(edit) ? fallback : '2026-09-12');
      if (edit === 'end-date') {
        await value(coldIntake.getByLabel('Data fine (facoltativa)', { exact: true }), '2026-11-01');
        await page.getByLabel('Intake admission context', { exact: true }).fill('2026-11-10');
        await value(start, fallback);
        await value(coldIntake.getByLabel('Data fine (facoltativa)', { exact: true }), '2026-11-01');
        await coldIntake.screenshot({ path: path.join(screenshots, `${timezoneId.replace('/', '-')}-intake-end-date.png`) });
      }
      await coldIntake.getByRole('radio', { name: /Una tantum/ }).check();
      await value(coldIntake.getByLabel('Data somministrazione', { exact: true }),
        edit === 'once' ? '2026-10-02' : edit === 'end-date' ? '2026-11-10' : '2026-10-25');
      results.push(`${timezoneId}: actual intake late admission, ${edit} dates PASS`);
    }
    await page.goto('http://127.0.0.1:5178/__qa507');
    const correctedIntake = page.getByRole('region', { name: 'Intake therapy', exact: true });
    const admissionInput = page.getByLabel('Intake admission context', { exact: true });
    await admissionInput.fill('2026-10-25');
    await correctedIntake.getByRole('button', { name: '+ Aggiungi farmaco', exact: true }).click();
    for (const day of ['2026-10-20', '2026-10-21']) {
      await admissionInput.fill(day);
      await value(correctedIntake.getByLabel('Data inizio *', { exact: true }), day);
    }
    await correctedIntake.getByLabel('Data inizio *', { exact: true }).fill('2026-10-19');
    await admissionInput.fill('2026-10-22');
    await value(correctedIntake.getByLabel('Data inizio *', { exact: true }), '2026-10-19');
    await correctedIntake.getByRole('button', { name: 'Rimuovi farmaco 1', exact: true }).click();
    await correctedIntake.getByRole('button', { name: '+ Aggiungi farmaco', exact: true }).click();
    await admissionInput.fill('2026-10-23');
    await value(correctedIntake.getByLabel('Data inizio *', { exact: true }), '2026-10-23');
    results.push(`${timezoneId}: repeated intake admission corrections, explicit edit and remove/re-add PASS`);
    await context.tracing.stop({ path: path.join(trace, `issue507-${timezoneId.replace('/', '-')}.zip`) });
    const video = page.video();
    await context.close();
    assert(video, 'A fresh native evidence video is required');
    await rename(await video.path(), path.join(videoDir, `issue507-${timezoneId.replace('/', '-')}.webm`));
    activeContext = null;
    activePage = null;
  }
  assert.deepEqual(unexpected, [], 'No unexpected or remote requests');
  assert.deepEqual(errors, [], 'No browser/console errors');
  await writeFile(path.join(output, 'test-results/browser.json'), JSON.stringify({ results, errors, unexpected }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  await writeFile(path.join(output, 'test-results/failure.json'), JSON.stringify({
    message: error instanceof Error ? error.message : String(error), results, errors, unexpected,
  }, null, 2));
  if (activeContext && activePage) {
    await activePage.screenshot({ path: path.join(screenshots, `${activeTimezone}-failure.png`), fullPage: true });
    await activeContext.tracing.stop({ path: path.join(trace, `issue507-${activeTimezone}-failure.zip`) });
    const video = activePage.video();
    await activeContext.close();
    if (video) await rename(await video.path(), path.join(videoDir, `issue507-${activeTimezone}-failure.webm`));
    activeContext = null;
  }
  throw error;
} finally {
  await browser?.close();
  await server?.close();
  await rm(cache, { recursive: true, force: true });
}
