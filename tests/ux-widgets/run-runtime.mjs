import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const out = path.resolve(
  process.env.UX_EVIDENCE_DIR ||
    'artifacts/task-validation/ux-widgets-calendari-bozze-consegne-e-milo',
);
for (const dir of ['screenshots', 'trace', 'video', 'test-results'])
  mkdirSync(path.join(out, dir), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1150, height: 1004 },
  recordVideo: { dir: path.join(out, 'video') },
});
await context.tracing.start({ screenshots: true, snapshots: true });
let writes = 0;
await context.route('http://localhost:3001/**', (route) => {
  if (route.request().method() !== 'GET') writes++;
  return route.fulfill({
    json: { items: [], pageInfo: { hasMore: false, nextCursor: null, loadedCount: 0 } },
  });
});
const page = await context.newPage(),
  errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const url = 'http://127.0.0.1:5187/tests/ux-widgets/index.html';
try {
  await page.goto(url);
  await page.getByLabel('Testo widget', { exact: true }).fill('Bozza da conservare');
  await page.getByRole('button', { name: '▴ Chiudi tutte le sezioni', exact: true }).click();
  assert.equal(await page.getByLabel('Testo widget', { exact: true }).isVisible(), false);
  assert.equal(
    await page.getByLabel('Testo widget', { exact: true }).inputValue(),
    'Bozza da conservare',
  );
  await page.getByRole('button', { name: '▾ Apri tutte le sezioni', exact: true }).click();
  assert.equal(
    await page.getByLabel('Testo widget', { exact: true }).inputValue(),
    'Bozza da conservare',
  );
  await page.getByRole('button', { name: 'Comprimi Dati di ingresso', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(
    await page
      .getByRole('region', { name: 'Dati di ingresso', exact: true })
      .locator('.patient-contacts')
      .isVisible(),
    false,
  );
  await page.getByRole('button', { name: 'Espandi Dati di ingresso', exact: true }).click();
  results.push(
    'PASS individual and page collapse retain mounted editor state and keyboard controls',
  );
  for (const module of ['medicazioni', 'contenzioni', 'braden'])
    await page.getByLabel('Nota ' + module, { exact: true }).fill('Bozza ' + module);
  await page
    .getByLabel('Testo consegna', { exact: true })
    .fill('Segnalazione sintetica persistente');
  await page.reload();
  for (const module of ['medicazioni', 'contenzioni', 'braden'])
    assert.equal(
      await page.getByLabel('Nota ' + module, { exact: true }).inputValue(),
      'Bozza ' + module,
    );
  assert.equal(
    await page.getByLabel('Testo consegna', { exact: true }).inputValue(),
    'Segnalazione sintetica persistente',
  );
  results.push('PASS three legacy draft adapters and handover restore after actual page reload');
  const med = page.getByRole('region', { name: 'medicazioni', exact: true });
  await med.getByRole('button', { name: 'Elimina bozza', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Elimina bozza', exact: true })
    .click();
  await page.reload();
  assert.equal(await page.getByLabel('Nota medicazioni', { exact: true }).inputValue(), '');
  assert.equal(
    await page.getByLabel('Nota contenzioni', { exact: true }).inputValue(),
    'Bozza contenzioni',
  );
  await page.goto(url + '?operator=qa-b');
  assert.equal(await page.getByLabel('Nota contenzioni', { exact: true }).inputValue(), '');
  assert.equal(await page.getByLabel('Testo consegna', { exact: true }).inputValue(), '');
  await page.goto(url);
  assert.equal(
    await page.getByLabel('Nota contenzioni', { exact: true }).inputValue(),
    'Bozza contenzioni',
  );
  results.push(
    'PASS confirmed deletion persists and different author cannot see another personal draft',
  );
  const print = page.getByRole('region', { name: 'Stampa ingresso' });
  assert.match(
    await print.textContent(),
    /Ingresso sintetico.*Condizioni sintetiche.*Documento test.*Autonomia sintetica/s,
  );
  assert.match(await print.textContent(), /Referente sintetico/);
  for (const width of [1150, 390]) {
    await page.setViewportSize({ width, height: 1004 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({
      path: path.join(out, 'screenshots', `widgets-${width}.png`),
      fullPage: true,
    });
  }
  results.push('PASS contacts and all synthetic admission fields in print, no overflow1150/390');
  assert.deepEqual(errors, []);
  assert.equal(writes, 0);
} catch (error) {
  results.push('FAIL ' + error.stack);
  process.exitCode = 1;
  await page.screenshot({
    path: path.join(out, 'screenshots', 'widget-failure.png'),
    fullPage: true,
  });
} finally {
  await context.tracing.stop({ path: path.join(out, 'trace', 'widgets.zip') });
  writeFileSync(
    path.join(out, 'test-results', 'widgets-runtime.json'),
    JSON.stringify({ results, errors, writes }, null, 2),
  );
  console.log(results.join('\n'));
  await context.close();
  await browser.close();
}
