import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect } from 'playwright/test';
const dir = resolve('artifacts/task-validation/pdf-multipage-preview/independent-qa');
const base = 'http://127.0.0.1:7541';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const dependency = resolve('node_modules/pdfjs-dist');
const version = JSON.parse(readFileSync(resolve(dependency, 'package.json'))).version;
const csp = JSON.parse(readFileSync('frontend/vercel.json')).headers.find(rule => rule.source === '/(.*)').headers.find(h => h.key === 'Content-Security-Policy').value;
const resources = [];
for (const file of readdirSync(resolve(dependency, 'wasm')).filter(n => /^(?:jbig2|openjpeg)(?:_nowasm_fallback\.js|\.wasm)$|^qcms_bg\.wasm$|^LICENSE_/.test(n))) {
  const original = readFileSync(resolve(dependency, 'wasm', file));
  const production = readFileSync(resolve('frontend/dist/assets', `pdfjs-${version}`, file));
  const qa = readFileSync(resolve('artifacts/task-validation/pdf-multipage-preview/qa-independent-dist/assets', `pdfjs-${version}`, file));
  assert.deepEqual(production, original);
  assert.deepEqual(qa, original);
  const response = await fetch(`${base}/assets/pdfjs-${version}/${file}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-security-policy'), csp);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(bytes, original);
  const expected = file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
  assert.equal(response.headers.get('content-type'), expected);
  resources.push({ file, bytes: bytes.length, sha256: sha(bytes), status: response.status, mime: expected, exactInstalledBytes: true });
}
writeFileSync(resolve(dir, 'resource-binding.json'), JSON.stringify({ version, fixtureSha256: sha(readFileSync('artifacts/task-validation/pdf-multipage-preview/fixtures/four-pages-synthetic.pdf')), csp, resources }, null, 2));
const out = resolve(dir, process.env.ERROR_RUN || 'invalid-original02'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1150, height: 1004 }, recordVideo: { dir: out } });
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
const errors = [], warnings = [], bad = [], requests = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
page.on('response', r => { if (r.status() >= 400) bad.push([r.status(), r.url()]); });
await context.route('**/*', async route => {
  const r = route.request(), u = new URL(r.url()); requests.push({ method: r.method(), path: u.pathname });
  if (u.hostname === 'fonts.googleapis.com' && r.method() === 'GET') return route.fulfill({ contentType: 'text/css', body: '/* offline synthetic QA */' });
  assert.equal(u.origin, base); assert.equal(r.method(), 'GET');
  if (u.pathname === '/synthetic/files/synthetic-doc/content') return route.fulfill({ contentType: 'application/pdf', body: 'SYNTHETIC INVALID PDF FOR ERROR TEST ONLY' });
  return route.continue();
});
try {
  await page.goto(`${base}/qa-preview`);
  await expect(page.locator('.import-documents')).toBeVisible();
  await expect(page.locator('[data-page-id="synthetic-page-2"] .import-page__thumbnail')).toContainText('Apri anteprima');
  await page.locator('[data-page-id="synthetic-page-2"] .import-page__open').click();
  const message = page.getByText('Impossibile mostrare l’anteprima PDF. Puoi scaricare l’originale.');
  await expect(message).toBeVisible();
  await expect(page.getByRole('link', { name: 'Scarica originale', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Riprova PDF', exact: true }).click();
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await expect(message).toBeVisible();
  await expect(page.locator('.document-pdf-preview__stage')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: 'Riprova PDF', exact: true })).toBeVisible();
  await expect(page.locator('.document-pdf-preview canvas')).toHaveAttribute('data-ready', 'false');
  assert.deepEqual(errors, []); assert.deepEqual(bad, []);
  await page.screenshot({ path: resolve(out, 'error-result.png'), fullPage: true });
  writeFileSync(resolve(out, 'results.json'), JSON.stringify({ pass: true, errors, warnings, bad, requests, expectedError: 'invalid synthetic PDF gives explicit error, retry and original download' }, null, 2));
} catch (e) {
  await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true });
  writeFileSync(resolve(out, 'failure.json'), JSON.stringify({ error: String(e), errors, warnings, bad, requests }, null, 2));
  throw e;
} finally {
  await context.tracing.stop({ path: resolve(out, 'trace.zip') });
  await context.close(); await browser.close();
}
console.log('PASS exact installed and built decoder bytes, HTTP/MIME/CSP, controlled invalid-original UI');
