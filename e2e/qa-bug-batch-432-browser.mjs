// Browser orchestration runs under the outer flock; every backend/database target is local.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { prisma } from '../backend/src/lib/prisma.js';
import { facilityToday } from '../backend/src/patients/parameter-reading-input.js';
// Same lifecycle guard as the full-suite H1 regression; synthetic failure tests exercise both copies.
export async function withHeldCorrection(correction, entered, release, run, timeoutMs = 5e3) {
  const settled = correction.then(
    (value) => ({ ok: true, value }),
    (error) => ({ ok: false, error }),
  );
  async function bounded(operation, message) {
    let timer;
    try {
      return await Promise.race([
        operation,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  let failed = false;
  let primary;
  try {
    await bounded(
      Promise.race([
        entered,
        settled.then((result) => {
          if (!result.ok) throw result.error;
          throw new Error('Correction settled before interpreter entry');
        }),
      ]),
      'Correction did not reach interpreter entry',
    );
    // Attach rejection handling before invoking the callback, including late rejection after timeout.
    await bounded(Promise.resolve().then(run), 'Confirmation callback did not complete');
  } catch (error) {
    failed = true;
    primary = error;
    throw error;
  } finally {
    release();
    try {
      const result = await bounded(settled, 'Correction did not settle after barrier release');
      if (!result.ok) throw result.error;
    } catch (cleanupError) {
      if (!failed) throw cleanupError;
      if (cleanupError !== primary)
        throw new AggregateError([primary, cleanupError], 'Correction and cleanup failed', {
          cause: primary,
        });
    }
  }
}

// Supported alternate static distribution: real pinned font bytes, never clinical/API mocks.
export async function installVerifiedFonts(context, proofDirectory) {
  const assets = fileURLToPath(
    new URL('../artifacts/task-validation/bug-batch-432/font-assets/', import.meta.url),
  );
  const manifest = JSON.parse(readFileSync(resolve(assets, 'manifest.json'), 'utf8'));
  for (const item of manifest.packages) {
    const bytes = readFileSync(resolve(assets, item.license.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.license.sha256);
  }
  assert.deepEqual(
    manifest.packages.map((p) => [p.name, p.version]),
    [
      ['@fontsource/inter', '5.2.8'],
      ['@fontsource/jetbrains-mono', '5.2.8'],
    ],
  );
  const files = manifest.files;
  assert.equal(Object.keys(files).length, 7);
  const css = Object.keys(files)
    .map((file) => {
      const family = file.startsWith('inter-') ? 'Inter' : 'JetBrains Mono';
      const weight = file.match(/-(\d+)-normal/)[1];
      return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url("https://fonts.gstatic.com/clinicos-qa/${file}") format("woff2");}`;
    })
    .join('\n');
  await context.route('https://fonts.googleapis.com/**', async (route) => {
    const url = new URL(route.request().url());
    assert.equal(url.pathname, '/css2');
    assert.deepEqual(url.searchParams.getAll('family'), [
      'Inter:wght@400;500;600;700;800',
      'JetBrains Mono:wght@400;500',
    ]);
    assert.equal(url.searchParams.get('display'), 'swap');
    assert.deepEqual([...new Set(url.searchParams.keys())].sort(), ['display', 'family']);
    await route.fulfill({ status: 200, contentType: 'text/css', body: css });
  });
  await context.route('https://fonts.gstatic.com/clinicos-qa/**', async (route) => {
    const file = new URL(route.request().url()).pathname.split('/').pop();
    assert.ok(files[file], 'Only pinned real font bytes are mirrored');
    const bytes = readFileSync(resolve(assets, files[file].path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), files[file].sha256);
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    await route.fulfill({
      status: 200,
      contentType: 'font/woff2',
      body: bytes,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });
  writeFileSync(
    resolve(proofDirectory, 'font-mirror-provenance.json'),
    JSON.stringify(
      {
        ...manifest,
        assetSource: 'committed-packet-only',
        sharedCacheUsed: false,
        distribution:
          'Test-only exact Google CSS request mirror using actual SHA256-verified pinned @fontsource WOFF2 bytes. No application CSS or business API changed.',
      },
      null,
      2,
    ),
  );
}
export async function verifyLoadedFonts(page) {
  const metrics = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px Inter'),
      document.fonts.load('700 16px Inter'),
      document.fonts.load('400 16px "JetBrains Mono"'),
    ]);
    await document.fonts.ready;
    const canvas = document.createElement('canvas').getContext('2d');
    canvas.font = '400 16px Inter';
    const normal = canvas.measureText('ClinicOS pazienti').width;
    canvas.font = '700 16px Inter';
    const bold = canvas.measureText('ClinicOS pazienti').width;
    return {
      normal,
      bold,
      loaded:
        document.fonts.check('400 16px Inter') &&
        document.fonts.check('700 16px Inter') &&
        document.fonts.check('400 16px "JetBrains Mono"'),
    };
  });
  assert.ok(
    metrics.loaded && metrics.normal > 50 && metrics.bold > 50 && metrics.normal !== metrics.bold,
    'Real normal/bold font geometry required',
  );
  return metrics;
}

// Simulator sessions are synthetic, but their signed bearer values still do not belong in
// published traces. Preserve every request/result/screenshot while redacting only those values.
export async function redactSyntheticTrace(file) {
  const script = `import pathlib,re,sys,zipfile,os
p=pathlib.Path(sys.argv[1]); tmp=p.with_suffix('.redacted.tmp'); count=0
with zipfile.ZipFile(p) as source,zipfile.ZipFile(tmp,'w',compression=zipfile.ZIP_DEFLATED) as target:
 for item in source.infolist():
  data=source.read(item.filename)
  try:
   text=data.decode('utf-8'); text,n=re.subn(r'sim\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+','sim.REDACTED.REDACTED',text); count+=n; data=text.encode('utf-8')
  except UnicodeDecodeError: pass
  target.writestr(item,data)
os.replace(tmp,p)
print(count)`;
  const child = spawn('python3', ['-c', script, file], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '',
    error = '';
  child.stdout.on('data', (data) => {
    output += data;
  });
  child.stderr.on('data', (data) => {
    error += data;
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(code, 0, error);
  return Number(output.trim());
}

async function runBrowserQa() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const out = resolve(root, 'artifacts/task-validation/bug-batch-432');
  const evidence = resolve(out, 'evidence');
  const logs = resolve(out, 'test-results');
  mkdirSync(evidence, { recursive: true });
  const backend = process.env.QA_BACKEND_URL;
  const frontend = process.env.QA_FRONTEND_URL;
  for (const value of [backend, frontend, process.env.DATABASE_URL])
    assert.ok(value && ['127.0.0.1', 'localhost'].includes(new URL(value).hostname));
  assert.equal(new URL(process.env.DATABASE_URL).pathname, '/clinicos_qa_batch432');
  if (!process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH && existsSync('/usr/bin/chromium'))
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
  // An explicit cache may contain the environment's already installed FFmpeg. No vendor
  // download or browser package is replaced; the native tool provenance is kept in test-results.
  const nativeTools = '/workspace/.cache/clinicos-batch432-playwright';
  if (
    !process.env.PLAYWRIGHT_BROWSERS_PATH &&
    existsSync(resolve(nativeTools, 'ffmpeg-1011/ffmpeg-linux'))
  ) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = nativeTools;
  }
  async function script(name, path) {
    const directory = resolve(out, name);
    mkdirSync(directory, { recursive: true });
    const child = spawn(process.execPath, ['--import', 'tsx', path, directory], {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
    });
    child.stderr.on('data', (data) => {
      output += data;
    });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', resolve);
    });
    writeFileSync(resolve(logs, `${name}.txt`), output);
    assert.equal(code, 0, `${name} failed; see ${name}.txt`);
    await redactSyntheticTrace(resolve(directory, 'trace.zip'));
    return directory;
  }
  function publish(source, screenshot, issues) {
    for (const issue of issues) {
      copyFileSync(resolve(source, screenshot), resolve(evidence, `issue-${issue}.png`));
      copyFileSync(resolve(source, 'trace.zip'), resolve(evidence, `issue-${issue}-trace.zip`));
      copyFileSync(resolve(source, 'flow.webm'), resolve(evidence, `issue-${issue}.webm`));
    }
  }
  async function assertOwnedFixtureDatabase(stage) {
    const target = new URL(process.env.DATABASE_URL);
    assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname));
    assert.equal(target.pathname, '/clinicos_qa_batch432');
    const runId = process.env.QA_RUN_OWNER;
    assert.match(
      runId ?? '',
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const marker =
      await prisma.$queryRaw`SELECT current_database() AS database, shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname=current_database()`;
    assert.deepEqual(marker, [{ database: 'clinicos_qa_batch432', owner: `clinicos-qa:${runId}` }]);
    writeFileSync(
      resolve(logs, `${stage}-ownership.json`),
      JSON.stringify(
        {
          runId,
          database: marker[0].database,
          marker: marker[0].owner,
          host: target.hostname,
          port: target.port,
          checkedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  }
  // Materialize the standard synthetic identities through the real local authentication API
  // before fixtures reference their relational operator IDs. Do not persist their bearer values.
  for (const identityId of [
    'SIM-ADMIN',
    'SIM-SUPERVISOR-1',
    'SIM-DOCTOR-1',
    'SIM-NURSE-1',
    'SIM-OSS-1',
  ]) {
    const response = await fetch(`${backend}/auth/simulator/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityId }),
    });
    assert.equal(response.status, 201, `Synthetic identity setup failed: ${identityId}`);
    await response.arrayBuffer();
  }
  // The broad unit suite may leave reference fixtures; this database was created solely for QA.
  await assertOwnedFixtureDatabase('initial-empty-catalog');
  await prisma.farmaco.deleteMany();
  assert.equal(await prisma.farmaco.count(), 0);
  const inventory = await script('inventory-browser', 'e2e/qa-therapy-completeness-browser.mjs');
  publish(inventory, 'inventory-complete.png', [432, 463]);
  publish(inventory, 'desktop-distinct-doses.png', [441]);
  publish(inventory, 'oneoff-after-band-shift.png', [467]);
  const retry = await script('retry-browser', 'e2e/qa-scheduled-retry-browser.mjs');
  publish(retry, 'after-reload-one-record.png', [460]);

  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const patientIds = [];
  const results = [];
  const today = facilityToday();
  async function patient(label, count) {
    const record = await prisma.patient.create({
      data: {
        medicalRecordNumber: `QA432-${randomUUID()}`,
        firstName: 'Test',
        lastName: label,
        registeredById: 'SIM-DOCTOR-1',
      },
    });
    patientIds.push(record.id);
    await prisma.patientTherapy.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        patientId: record.id,
        farmacoNome: `${label} ${String(i).padStart(3, '0')}`,
        dosaggio: '1 compressa',
        viaSomministrazione: 'orale',
        tipo: 'periodica',
        stato: 'attiva',
        dataInizio: today,
        fasceMattina: true,
      })),
    });
    return record;
  }
  async function open(page, id, identity = /^Infermiere 1/, navigate = true) {
    if (navigate) await page.goto(`${frontend}/#/dettaglio-paziente/${id}`);
    await verifyLoadedFonts(page);
    const login = page.getByRole('button', { name: identity });
    const needsLogin = await Promise.race([
      login.waitFor().then(() => true),
      page
        .locator('.patient-record-view')
        .waitFor()
        .then(() => false),
    ]);
    if (needsLogin) await login.click();
    await page.locator('.patient-record-view').waitFor();
    await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
    await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).click();
  }
  let context;
  try {
    const a = await patient('QA printable', 105);
    const b = await patient('QA second', 2);
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: { dir: resolve(out, 'additional-video') },
    });
    await installVerifiedFonts(context, logs);
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    const consoleErrors = [],
      pageErrors = [],
      badResponses = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('response', (r) => {
      if (r.url().startsWith(backend) && r.status() >= 400)
        badResponses.push({ path: new URL(r.url()).pathname, status: r.status() });
    });
    await open(page, a.id);
    const active = page.getByRole('list', { name: 'Farmaci attivi' });
    await active.getByRole('button', { name: /^QA printable 104 / }).waitFor();
    assert.equal(await active.locator(':scope > li').count(), 105);
    await page.getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true }).click();
    const printDialog = page.getByRole('dialog', { name: 'Invio in Pronto Soccorso', exact: true });
    await printDialog.getByText('QA printable 104', { exact: true }).waitFor();
    assert.equal(
      await printDialog.getByRole('button', { name: 'Stampa / PDF', exact: true }).isEnabled(),
      true,
    );
    assert.equal(await printDialog.locator('tbody tr').count(), 105);
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: resolve(evidence, 'issue-432-print.png'), fullPage: true });
    await page.emulateMedia({ media: 'screen' });
    await printDialog.getByRole('button', { name: 'Chiudi', exact: true }).click();
    results.push({ name: 'complete105-print-through-real-paginated-API', pass: true, count: 105 });

    // Reset the prior successful print's 15-second read cache before injecting a new fault.
    // Inventory reads status=tutte; the following print must reach status=attiva over HTTP.
    await page.reload();
    await open(page, a.id, undefined, false);
    await page
      .getByRole('list', { name: 'Farmaci attivi' })
      .getByRole('button', { name: /^QA printable 104 / })
      .waitFor();
    let foreignPrintPage = true;
    const printUrl = `${backend}/patients/${a.id}/therapies/page*`;
    await page.route(printUrl, async (route) => {
      const response = await route.fetch();
      if (
        foreignPrintPage &&
        new URL(route.request().url()).searchParams.get('status') === 'attiva'
      ) {
        foreignPrintPage = false;
        const body = await response.json();
        body.items[0].patientId = b.id;
        return route.fulfill({ response, json: body });
      }
      await route.fulfill({ response });
    });
    await page.getByRole('button', { name: 'Invio in Pronto Soccorso', exact: true }).click();
    const rejectedPrint = page.getByRole('dialog', {
      name: 'Invio in Pronto Soccorso',
      exact: true,
    });
    const printAlert = rejectedPrint
      .getByRole('alert')
      .filter({ hasText: /Elenco terapie non valido/ });
    await printAlert.waitFor();
    assert.equal(
      foreignPrintPage,
      false,
      'The negative print must consume the foreign-patient page',
    );
    assert.equal(
      await rejectedPrint.getByRole('button', { name: 'Stampa / PDF', exact: true }).isEnabled(),
      false,
    );
    assert.equal(await rejectedPrint.locator('tbody tr').count(), 0);
    await printAlert.getByRole('button', { name: 'Riprova', exact: true }).click();
    await rejectedPrint.getByText('QA printable 104', { exact: true }).waitFor();
    assert.equal(
      await rejectedPrint.getByRole('button', { name: 'Stampa / PDF', exact: true }).isEnabled(),
      true,
    );
    assert.equal(await rejectedPrint.locator('tbody tr').count(), 105);
    await rejectedPrint.getByRole('button', { name: 'Chiudi', exact: true }).click();
    await page.unroute(printUrl);
    results.push({
      name: 'foreign-patient-print-blocked-retry-fetches-repaired-complete105',
      pass: true,
    });

    // A deliberately short response is a network fault, not a replacement app/backend path.
    const inventoryUrl = `${backend}/patients/${a.id}/therapies/page*`;
    let short = true;
    await page.route(inventoryUrl, async (route) => {
      const response = await route.fetch();
      if (short) {
        const body = await response.json();
        body.items = body.items.slice(0, 1);
        body.pageInfo = { hasMore: false, nextCursor: null };
        return route.fulfill({ response, json: body });
      }
      await route.fulfill({ response });
    });
    await page.reload();
    await open(page, a.id, undefined, false);
    const alert = page.getByRole('alert').filter({ hasText: /incompleto/ });
    await alert.waitFor();
    assert.equal(await page.getByRole('list', { name: 'Farmaci attivi' }).count(), 0);
    short = false; // The synthetic upstream data is repaired only after the visible error barrier.
    await alert.getByRole('button', { name: 'Riprova', exact: true }).click();
    await page
      .getByRole('list', { name: 'Farmaci attivi' })
      .getByRole('button', { name: /^QA printable 104 / })
      .waitFor();
    results.push({ name: 'short-page-fails-closed-and-visible-retry-restores105', pass: true });
    await page.unroute(inventoryUrl);
    await page.evaluate((id) => {
      location.hash = `#/dettaglio-paziente/${id}`;
    }, b.id);
    await page.getByRole('tab', { name: 'Terapia', exact: true }).click();
    await page.getByRole('tab', { name: 'Piano terapeutico', exact: true }).click();
    await page
      .getByRole('list', { name: 'Farmaci attivi' })
      .getByRole('button', { name: /^QA second 001 / })
      .waitFor();
    assert.equal(
      await page.getByRole('list', { name: 'Farmaci attivi' }).locator(':scope > li').count(),
      2,
    );
    assert.equal(await page.getByText('QA printable 104', { exact: true }).count(), 0);
    await page.setViewportSize({ width: 360, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
    await page.screenshot({
      path: resolve(evidence, 'issue-432-switch-mobile.png'),
      fullPage: true,
    });
    results.push({ name: 'patient-switch-no-previous-prescriptions-mobile', pass: true, count: 2 });
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(badResponses, []);
    await context.tracing.stop({ path: resolve(evidence, 'issue-432-additional-trace.zip') });
    await context.close();
    await redactSyntheticTrace(resolve(evidence, 'issue-432-additional-trace.zip'));
    context = undefined;

    const imported = JSON.parse(readFileSync(resolve(logs, 'therapy-import-results.json'), 'utf8'));
    assert.equal(imported.detected, 5);
    assert.equal(imported.persisted, 3);
    assert.deepEqual(imported.deferred, [2, 4]);
    assert.equal(imported.missingIncludedRowsRejected, true);
    assert.equal(imported.staleLegacyOmissionsRejected, true);
    patientIds.push(imported.patientId);
    const importedContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: { dir: resolve(out, 'import-video') },
    });
    await installVerifiedFonts(importedContext, logs);
    await importedContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const importedPage = await importedContext.newPage();
    const importErrors = [],
      importFailures = [];
    importedPage.on('pageerror', (error) => importErrors.push(error.message));
    importedPage.on('console', (message) => {
      if (message.type() === 'error') importErrors.push(message.text());
    });
    importedPage.on('response', (response) => {
      if (response.url().startsWith(backend) && response.status() >= 400)
        importFailures.push(response.status());
    });
    const importedVideo = importedPage.video();
    await open(importedPage, imported.patientId);
    const importedList = importedPage.getByRole('list', { name: 'Farmaci attivi' });
    await importedList.getByRole('button', { name: /^PARACETAMOLO / }).waitFor();
    assert.equal(await importedList.locator(':scope > li').count(), 3);
    for (const name of imported.names)
      assert.equal(
        await importedList.getByRole('button', { name: new RegExp(`^${name} `) }).isVisible(),
        true,
      );
    assert.equal(await importedList.getByText('PEVARYL', { exact: true }).count(), 0);
    await importedPage.reload();
    await open(importedPage, imported.patientId, undefined, false);
    await importedPage
      .getByRole('list', { name: 'Farmaci attivi' })
      .getByRole('button', { name: /^PARACETAMOLO / })
      .waitFor();
    assert.equal(
      await importedPage
        .getByRole('list', { name: 'Farmaci attivi' })
        .locator(':scope > li')
        .count(),
      3,
    );
    await importedPage.screenshot({
      path: resolve(evidence, 'issue-432-import-saved.png'),
      fullPage: true,
    });
    assert.deepEqual(importErrors, []);
    assert.deepEqual(importFailures, []);
    await importedContext.tracing.stop({ path: resolve(evidence, 'issue-432-import-trace.zip') });
    await importedContext.close();
    await redactSyntheticTrace(resolve(evidence, 'issue-432-import-trace.zip'));
    copyFileSync(await importedVideo.path(), resolve(evidence, 'issue-432-import.webm'));
    results.push({
      name: 'import5-detected3-reviewed-persisted2-explicit-deferred-replay-visible-after-reload',
      pass: true,
    });

    // The app also resolves its global round. Retire completed synthetic high-volume fixtures
    // before positive-catalog cases so their unrelated names do not exhaust the public limiter.
    // This exact owned QA database is guarded above; keep B's two prescriptions as the fixture.
    await assertOwnedFixtureDatabase('positive-catalog');
    await prisma.patientTherapy.deleteMany({ where: { patientId: { not: b.id } } });
    // Available, malformed and unreachable status preserve real per-name searches on two rows.
    const aic = `QA${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    await prisma.farmaco.create({
      data: {
        aic,
        denominazione: 'QA second 000',
        denominazioneNorm: 'QA SECOND 000',
        statoAmministrativo: 'Autorizzata',
        forma: 'Compressa',
        descrizione: '1 compressa',
      },
    });
    try {
      const catalogStatus = await fetch(`${backend}/farmaci/stato`);
      const catalogBody = await catalogStatus.json();
      const fixtureLookup = await fetch(`${backend}/farmaci/cerca?q=QA%20SECOND%20000&limite=25`);
      const fixtureBody = await fixtureLookup.json();
      writeFileSync(
        resolve(logs, 'catalog-fixture-diagnostic.json'),
        JSON.stringify(
          {
            status: catalogStatus.status,
            catalog: catalogBody,
            lookupStatus: fixtureLookup.status,
            lookup: fixtureBody,
          },
          null,
          2,
        ),
      );
      assert.equal(catalogStatus.status, 200);
      assert.equal(catalogBody.caricata, true);
      assert.equal(fixtureLookup.status, 200);
      assert.ok(
        fixtureBody.esiti.some((item) => item.aic === aic),
        'The real available catalog fixture must resolve before browser/fault assertions',
      );
      for (const variant of ['available', 'malformed', 'unreachable']) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await installVerifiedFonts(ctx, logs);
        const p = await ctx.newPage();
        const searches = [];
        const errors = [];
        const statuses = [];
        const consoleMessages = [];
        let injectedStatusFailures = 0;
        p.on('pageerror', (e) => errors.push(e.message));
        p.on('console', (message) => {
          if (message.type() === 'error') consoleMessages.push(message.text());
        });
        p.on('request', (r) => {
          if (r.url().includes('/farmaci/cerca?'))
            searches.push(new URL(r.url()).searchParams.get('q'));
        });
        p.on('response', (r) => {
          if (r.url().startsWith(backend) && r.status() >= 400)
            statuses.push({ path: new URL(r.url()).pathname, status: r.status() });
        });
        if (variant !== 'available')
          await p.route(`${backend}/farmaci/stato`, (route) => {
            assert.equal(route.request().method(), 'GET');
            if (variant === 'unreachable') injectedStatusFailures++;
            return route.fulfill({
              status: variant === 'unreachable' ? 503 : 200,
              contentType: 'application/json',
              body:
                variant === 'malformed'
                  ? '{"caricata":"false"}'
                  : '{"error":"synthetic status failure"}',
            });
          });
        await open(p, b.id);
        await p.getByRole('button', { name: /^QA second 000 / }).click();
        try {
          await p.getByText('Trovato in AIFA', { exact: true }).first().waitFor();
        } catch (error) {
          writeFileSync(
            resolve(logs, `catalog-${variant}-failed-dom.json`),
            JSON.stringify(
              {
                searches,
                statuses,
                consoleMessages,
                visibleText: await p.locator('.patient-record-view').innerText(),
              },
              null,
              2,
            ),
          );
          await p.screenshot({
            path: resolve(evidence, `catalog-${variant}-failed.png`),
            fullPage: true,
          });
          throw error;
        }
        await p.getByRole('button', { name: /^QA second 001 / }).click();
        await p.getByRole('button', { name: 'non in anagrafica', exact: true }).first().waitFor();
        assert.deepEqual([...new Set(searches)].sort(), ['QA SECOND 000', 'QA SECOND 001']);
        assert.deepEqual(errors, []);
        const expectedFailures = variant === 'unreachable' ? injectedStatusFailures : 0;
        if (variant === 'unreachable') assert.ok(expectedFailures > 0);
        assert.deepEqual(
          consoleMessages,
          Array(expectedFailures).fill(
            'Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
          ),
          'Only the exact deliberately injected GET503 console failures are expected',
        );
        assert.deepEqual(
          statuses,
          Array.from({ length: expectedFailures }, () => ({ path: '/farmaci/stato', status: 503 })),
          'Every failed HTTP response must match a specific deliberate status request; no429 or other errors',
        );
        results.push({
          name: `catalog-${variant}-real-name-search-retained`,
          pass: true,
          searches: searches.length,
          deliberateStatusFailures: expectedFailures,
        });
        await ctx.close();
      }
    } finally {
      await prisma.farmaco.delete({ where: { aic } });
    }

    for (const role of ['Infermiere 1', 'Medico 1', 'OSS 1', 'Supervisore 1']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await installVerifiedFonts(ctx, logs);
      const p = await ctx.newPage();
      const searches = [];
      const errors = [];
      const responses = [];
      p.on('pageerror', (error) => errors.push(error.message));
      p.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      p.on('request', (request) => {
        if (request.url().includes('/farmaci/cerca?')) searches.push(request.url());
      });
      p.on('response', (response) => {
        if (response.url().startsWith(backend) && response.status() >= 400)
          responses.push(response.status());
      });
      if (role === 'OSS 1') {
        await p.goto(`${frontend}/#/dettaglio-paziente/${b.id}`);
        await verifyLoadedFonts(p);
        await p.getByRole('button', { name: /^OSS 1/ }).click();
        await p.locator('.patient-record-view').waitFor();
        assert.equal(
          await p.getByRole('tab', { name: 'Terapia', exact: true }).count(),
          0,
          'OSS must retain its therapy-read denial',
        );
      } else {
        await open(p, b.id, new RegExp(`^${role}`));
        await p
          .getByRole('list', { name: 'Farmaci attivi' })
          .getByRole('button', { name: /^QA second 001 / })
          .waitFor();
        await p.getByRole('button', { name: /^QA second 000 / }).click();
        await p.getByText('anagrafica non raggiungibile', { exact: true }).first().waitFor();
      }
      assert.deepEqual(searches, []);
      assert.deepEqual(errors, []);
      assert.deepEqual(responses, []);
      results.push({ name: `empty-catalog-role-${role}`, pass: true, searches: 0 });
      await ctx.close();
    }

    // Exercise internal services against this run's real synthetic DB, then render their
    // measured results on the QA-only surface (rather than drawing a claimed PASS badge).
    const { findTherapiesDue } = await import('../backend/src/therapies/due-therapy-query.js');
    const { dayKey } = await import('../backend/src/ai/assistant/facility-signals.js');
    const { facilityClock } = await import('../backend/src/lib/facility-time.js');
    const nightPatient = await patient('QA runtime night', 0);
    for (const clock of ['08:00', '00:45'])
      await prisma.patientTherapy.create({
        data: {
          patientId: nightPatient.id,
          farmacoNome: `QA runtime night ${clock}`,
          dosaggio: '1 compressa',
          tipo: 'una_tantum',
          dataInizio: '2026-10-13',
          dataSomministrazione: '2026-10-13',
          orarioSomministrazione: clock,
        },
      });
    const now = new Date('2026-10-12T22:30:00Z');
    const beforeNight = await findTherapiesDue(
      dayKey(now),
      { patientIds: [nightPatient.id] },
      now,
      15,
      10,
    );
    assert.equal(beforeNight.overdueCount, 0);
    assert.equal(beforeNight.dueSoonCount, 1);
    assert.equal(beforeNight.dueSoon[0].scheduledTime, '00:45');
    assert.equal(beforeNight.dueSoon[0].minutesUntil, 15);
    const afterNight = await findTherapiesDue(
      '2026-10-13',
      { patientIds: [nightPatient.id] },
      new Date('2026-10-12T22:46:00Z'),
      15,
      10,
    );
    assert.equal(afterNight.overdueCount, 1);
    assert.equal(afterNight.overdue[0].minutesLate, 1);
    const dstMinutes = [
      '2026-03-29T00:30:00Z',
      '2026-03-29T01:30:00Z',
      '2026-10-25T00:30:00Z',
      '2026-10-25T01:30:00Z',
    ].map((t) => facilityClock(new Date(t)).minutes);
    assert.deepEqual(dstMinutes, [90, 210, 150, 150]);
    const clockMeasured = {
      clinicalDay: dayKey(now),
      at0030: {
        overdue: beforeNight.overdueCount,
        dueSoon: beforeNight.dueSoonCount,
        scheduled: beforeNight.dueSoon[0].scheduledTime,
        minutesUntil: beforeNight.dueSoon[0].minutesUntil,
      },
      at0046: { overdue: afterNight.overdueCount, minutesLate: afterNight.overdue[0].minutesLate },
      dstMinutes,
    };

    const { converse } = await import('../backend/src/skills/engine.js');
    const { defaultSkillDeps } = await import('../backend/src/skills/index.js');
    const { deterministicInterpreter } = await import('../backend/src/skills/interpreter.js');
    const surname = `QACorrection${randomUUID()
      .replace(/[^a-z]/g, '')
      .slice(0, 10)}`;
    const correctionPatient = await prisma.patient.create({
      data: {
        medicalRecordNumber: `QA442-${randomUUID()}`,
        firstName: 'Mario',
        lastName: surname,
        registeredById: 'SIM-NURSE-1',
      },
    });
    patientIds.push(correctionPatient.id);
    let held = false,
      entered,
      release;
    const reachedInterpreter = new Promise((resolve) => {
      entered = resolve;
    });
    const heldCorrection = new Promise((resolve) => {
      release = resolve;
    });
    const deps = {
      ...defaultSkillDeps,
      interpreter: async (input) => {
        if (held) {
          entered();
          await heldCorrection;
        }
        return deterministicInterpreter(input);
      },
    };
    const identity = {
      operatorId: 'SIM-NURSE-1',
      role: 'operatore',
      name: 'Infermiere 1',
      appRole: 'nurse',
    };
    const start = await converse(deps, identity, {
      message: `registra pressione 120/80 per Mario ${surname}`,
    });
    assert.equal(start.status, 'NEEDS_CONFIRMATION');
    held = true;
    const correction = converse(deps, identity, {
      workflowId: start.workflowId,
      message: 'pressione 130/80',
    });
    let correctionMeasured;
    await withHeldCorrection(
      correction,
      reachedInterpreter,
      () => {
        held = false;
        release();
      },
      async () => {
        held = false;
        const completed = await converse(deps, identity, {
          workflowId: start.workflowId,
          action: 'confirm',
          previewId: start.preview.previewId,
        });
        assert.equal(completed.status, 'COMPLETED');
        const firstRecord = await prisma.patientParameterReading.findUniqueOrThrow({
          where: { id: completed.result.readingId },
        });
        release();
        const late = await correction;
        assert.equal(late.status, 'COMPLETED');
        const replay = await converse(deps, identity, {
          workflowId: start.workflowId,
          action: 'confirm',
          previewId: start.preview.previewId,
        });
        assert.equal(replay.status, 'COMPLETED');
        const records = await prisma.patientParameterReading.findMany({
          where: { patientId: correctionPatient.id },
        });
        assert.deepEqual(records, [firstRecord]);
        assert.deepEqual(firstRecord.values, { pa: '120/80' });
        assert.equal(firstRecord.authorOperatorId, identity.operatorId);
        correctionMeasured = {
          completed: completed.status,
          lateCorrection: late.status,
          replay: replay.status,
          clinicalWrites: records.length,
          persistedValue: firstRecord.values.pa,
          author: firstRecord.authorOperatorId,
        };
      },
    );
    writeFileSync(
      resolve(logs, 'internal-measured-results.json'),
      JSON.stringify({ issue442: correctionMeasured, issue464: clockMeasured }, null, 2),
    );
    results.push({
      name: 'real-runtime-correction-barrier-one-write-and-facility-clock',
      pass: true,
    });

    // Safe QA-only surface renders only already executed assertion results for internal features.
    const backendLog = readFileSync(resolve(logs, 'backend-unit.txt'), 'utf8');
    assert.match(backendLog, /QA H1.*slow correction/);
    assert.match(backendLog, /nighttime assistant queue uses the clinical day/);
    assert.match(backendLog, /(?:# fail|ℹ fail) 0/);
    const qa = await browser.newContext({ recordVideo: { dir: resolve(out, 'internal-video') } });
    await qa.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const p = await qa.newPage();
    const video = p.video();
    for (const [issue, name, values] of [
      [442, 'Deterministic correction barrier', JSON.stringify(correctionMeasured)],
      [464, 'Europe/Rome clinical clock', JSON.stringify(clockMeasured)],
    ]) {
      await p.setContent(
        '<main><h1></h1><p></p><output aria-label="Executed assertion status"></output></main>',
      );
      await p.evaluate(
        ({ name, values }) => {
          document.querySelector('h1').textContent = name;
          document.querySelector('p').textContent = values;
          document.querySelector('output').textContent =
            'PASS — assertions executed on isolated PostgreSQL';
        },
        { name, values },
      );
      assert.equal(await p.getByRole('heading', { name }).isVisible(), true);
      assert.equal(await p.locator('p').textContent(), values);
      assert.equal(
        await p.getByLabel('Executed assertion status').textContent(),
        'PASS — assertions executed on isolated PostgreSQL',
      );
      await p.screenshot({ path: resolve(evidence, `issue-${issue}.png`), fullPage: true });
    }
    await qa.tracing.stop({ path: resolve(evidence, 'issue-442-trace.zip') });
    await qa.close();
    await redactSyntheticTrace(resolve(evidence, 'issue-442-trace.zip'));
    copyFileSync(
      resolve(evidence, 'issue-442-trace.zip'),
      resolve(evidence, 'issue-464-trace.zip'),
    );
    for (const issue of [442, 464])
      copyFileSync(await video.path(), resolve(evidence, `issue-${issue}.webm`));
  } finally {
    if (context) await context.close();
    writeFileSync(
      resolve(logs, 'additional-browser-results.json'),
      JSON.stringify({ results }, null, 2),
    );
    await browser.close();
    for (const id of patientIds) await prisma.patient.delete({ where: { id } });
    await prisma.$disconnect();
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await runBrowserQa();
