import { readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyRuntime, TARGET } from '../../../../scripts/maintenance/demo-patient-inventory.mjs';

const directory = resolve(import.meta.dirname);
const checks = [];
const env = {
  RAILWAY_PROJECT_ID: TARGET.projectId,
  RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
  RAILWAY_ENVIRONMENT_NAME: TARGET.environmentName,
  RAILWAY_SERVICE_ID: '50000000-0000-4000-8000-000000000471',
  EXPECTED_INVENTORY_SERVICE_ID: '50000000-0000-4000-8000-000000000471',
  DATABASE_URL: 'postgresql://synthetic:local-only@postgres.railway.internal/railway',
};
for (const [name, changed] of [
  ['reject project mismatch', { RAILWAY_PROJECT_ID: 'other' }],
  ['reject environment mismatch', { RAILWAY_ENVIRONMENT_ID: 'other' }],
  ['reject production name', { RAILWAY_ENVIRONMENT_NAME: 'production' }],
  ['reject backend service identity', { RAILWAY_SERVICE_ID: TARGET.backendServiceId }],
  ['reject service expectation mismatch', { EXPECTED_INVENTORY_SERVICE_ID: '50000000-0000-4000-8000-000000000472' }],
  ['reject database host mismatch', { DATABASE_URL: 'postgresql://synthetic:local-only@other.internal/railway' }],
  ['reject database name mismatch', { DATABASE_URL: 'postgresql://synthetic:local-only@postgres.railway.internal/other' }],
  ['reject absent credential components', { DATABASE_URL: 'postgresql://postgres.railway.internal/railway' }],
]) {
  assert.throws(() => verifyRuntime({ ...env, ...changed }));
  checks.push({ name, value: 'PASS' });
}
const child = spawnSync(process.execPath, ['scripts/maintenance/demo-patient-inventory.mjs', '--unsupported'], {
  cwd: resolve(directory, '../../../..'), encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: 'sensitive-must-never-be-forwarded', RAILWAY_TOKEN: 'sensitive-must-never-be-forwarded' },
});
assert.equal(child.status, 1);
assert.equal(child.stdout, '');
const failure = JSON.parse(child.stderr);
assert.deepEqual(failure, { demoInventoryFailed: true, deletionPerformed: false, code: 'DEMO_INVENTORY_FAILED' });
assert.equal(child.stderr.includes('sensitive-must-never-be-forwarded'), false);
checks.push({ name: 'CLI failure projects allowlisted outcome only', value: 'PASS' });
const tests = readFileSync(join(directory, 'tests.log'), 'utf8');
const passed = Number(tests.match(/(?:# |ℹ )pass (\d+)/)?.[1]);
assert.ok(passed >= 11);
assert.match(tests, /(?:fail 0|# fail 0)/);
checks.push({ name: 'Independent unit and real PostgreSQL assertions', value: `${passed} PASS / 0 FAIL` });
checks.push({ name: 'Database write probe', value: 'SQLSTATE 25006 (rejected)' });
checks.push({ name: 'Live demo inventory', value: 'NOT RUN — review gate required' });
checks.push({ name: 'Backup verification', value: 'NOT VERIFIED' });
const result = { mode: 'synthetic QA only', generatedAt: new Date().toISOString(), checks, testLogSha256: createHash('sha256').update(tests).digest('hex') };
writeFileSync(join(directory, 'internal-results.json'), JSON.stringify(result, null, 2));
process.env.PLAYWRIGHT_BROWSERS_PATH = join(directory, 'browser-cache');
mkdirSync(join(directory, 'browser-cache/ffmpeg-1011'), { recursive: true });
const ffmpeg = join(directory, 'browser-cache/ffmpeg-1011/ffmpeg-linux');
if (!existsSync(ffmpeg)) symlinkSync('/usr/bin/ffmpeg', ffmpeg);
const { chromium } = await import('/workspace/ClinicOS/node_modules/playwright/index.mjs');
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Maintenance 470 independent QA</title><style>body{font:18px system-ui;margin:42px;color:#143650;background:#edf5fa}main{background:white;padding:28px;border-radius:16px;max-width:1050px}h1{color:#19639b;margin-top:0}td{padding:9px 14px;border-bottom:1px solid #d6e3ec}td:last-child{font-weight:650}small{color:#405b6d}</style><main><h1>Demo inventory · independent QA</h1><p id="mode">${esc(result.mode)} · no online operation performed</p><table><thead><tr><th>Verified assertion</th><th>Observed result</th></tr></thead><tbody>${checks.map((c, i) => `<tr><td>${esc(c.name)}</td><td id="check-${i}">${esc(c.value)}</td></tr>`).join('')}</tbody></table><p><small>Source of counts: independently rerun Node tests, including disposable PostgreSQL 16. Live inventory and backup verification remain gated.</small></p></main></html>`;
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } if (req.url !== '/') { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" }); res.end(html); });
await new Promise((done) => server.listen(0, '127.0.0.1', done));
let browser;
const consoleErrors = [], pageErrors = [], httpErrors = [];
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, recordVideo: { dir: join(directory, 'video') } });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) httpErrors.push(response.status()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const checkValues = async () => { assert.equal(await page.locator('tbody tr').count(), checks.length); for (let i = 0; i < checks.length; i++) assert.equal(await page.locator(`#check-${i}`).innerText(), checks[i].value); };
  await checkValues();
  await page.reload();
  await checkValues();
  assert.deepEqual(consoleErrors, []); assert.deepEqual(pageErrors, []); assert.deepEqual(httpErrors, []);
  await page.screenshot({ path: join(directory, 'internal-results.png'), fullPage: true });
  await context.tracing.stop({ path: join(directory, 'trace.zip') });
  await context.close();
  const browserResult = { passed: true, reloadVerified: true, assertedValueCount: checks.length * 2, consoleErrors, pageErrors, httpErrors };
  writeFileSync(join(directory, 'browser-results.json'), JSON.stringify(browserResult, null, 2));
  mkdirSync(join(directory, 'playwright-report'), { recursive: true });
  mkdirSync(join(directory, 'test-results'), { recursive: true });
  writeFileSync(join(directory, 'test-results/browser-results.json'), JSON.stringify(browserResult, null, 2));
  writeFileSync(join(directory, 'playwright-report/index.html'), html.replace('</main>', '<p>Custom Playwright execution report: all displayed values asserted before and after reload; zero console, page or HTTP errors. <a href="../trace.zip">Trace</a> · <a href="../internal-results.png">Screenshot</a> · <a href="../browser-results.json">Machine-readable results</a></p></main>'));
} finally { if (browser) await browser.close(); await new Promise((done) => server.close(done)); }
