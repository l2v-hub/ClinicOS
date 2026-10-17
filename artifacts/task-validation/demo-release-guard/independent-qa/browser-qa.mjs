import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { DEMO_TARGET, verifyLiveReady, validateTarget, validateActiveDeployment } from '../../../../agent-team/src/bug-pipeline/demo-deployment.mjs';

// Independent QA surface only. No application route, auth hook, external service or credential.
const folder = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../../../..', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../source-hashes.json', import.meta.url)));
async function hashes() {
  const result = [];
  for (const item of manifest.files) {
    const bytes = await readFile(`${root}/${item.file}`);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256, item.sha256, `Frozen source changed: ${item.file}`);
    result.push({ file: item.file, sha256 });
  }
  return result;
}
const before = await hashes();
const id = '12345678-1234-4234-8234-123456789abc';
const sha = 'a'.repeat(40);
const expected = new Map([
  ['healthy', 'VERIFIED'], ['old-instance', 'BLOCKED'], ['production-tier', 'BLOCKED'],
  ['cacheable', 'BLOCKED'], ['database-failed', 'BLOCKED'], ['redirect', 'BLOCKED'],
  ['oversized', 'BLOCKED'], ['cache-extension-defect', 'VERIFIED'], ['wrong-native-target', 'BLOCKED'], ['missing-native-sha', 'BLOCKED'],
]);
const results = [];
function native() {
  return {
    projectToken: { project: { id: DEMO_TARGET.projectId }, environment: { id: DEMO_TARGET.environmentId, name: 'demo' } },
    deploymentTriggers: { edges: [{ node: { ...DEMO_TARGET, repository: 'l2v-hub/ClinicOS', branch: 'main' } }] },
    serviceInstance: { ...DEMO_TARGET, source: { repo: 'l2v-hub/ClinicOS' }, domains: { serviceDomains: [{ domain: DEMO_TARGET.domain }] }, activeDeployments: [{ id, status: 'SUCCESS' }] },
    deployment: { ...DEMO_TARGET, id, status: 'SUCCESS', meta: { commitHash: sha } },
  };
}
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Independent release guard QA</title><style>
body{font:17px system-ui,sans-serif;background:#f1f5f9;color:#16324f;margin:32px}main{max-width:1240px;margin:auto}h1{font-size:28px}p{line-height:1.5}code{font-size:14px}button{padding:12px;margin:4px;background:#164e78;color:white;border:0;border-radius:5px;cursor:pointer}table{border-collapse:collapse;background:white;width:100%;margin-top:18px}td,th{text-align:left;padding:12px;border-bottom:1px solid #d6e1eb}.ok{color:#14643b;font-weight:700}.blocked{color:#874b0d;font-weight:700}.notice{padding:15px;background:#e1edf7;border-left:5px solid #27628b}</style></head><body><main><h1>Independent QA · Exact demo deployment guard</h1><p class="notice">Synthetic localhost HTTP responses exercise the actual production validation helpers. No live deployment, patient data, external request or credential is used.</p><p>Expected domain: <code id="domain">${DEMO_TARGET.domain}</code><br>Expected deployment: <code id="deployment">${id}</code><br>Expected native commit: <code>${sha}</code></p><div id="controls"></div><table><thead><tr><th>Scenario</th><th>Actual helper decision</th><th>Actual result / rejection reason</th></tr></thead><tbody id="rows"></tbody></table><p id="count">0 / 10 scenarios checked</p><script>
const cases=${JSON.stringify([...expected.keys()])};
function render(rows){document.querySelector('#rows').replaceChildren(...rows.map(row=>{const tr=document.createElement('tr');tr.dataset.scenario=row.scenario;for(const value of [row.scenario,row.decision,row.detail]){const td=document.createElement('td');td.textContent=value;if(value===row.decision)td.className=value==='VERIFIED'?'ok':'blocked';tr.append(td)}return tr}));document.querySelector('#count').textContent=rows.length+' / 10 scenarios checked'}
for(const scenario of cases){const button=document.createElement('button');button.textContent=scenario;button.dataset.case=scenario;button.addEventListener('click',async()=>{button.disabled=true;const r=await fetch('/api/probe?scenario='+encodeURIComponent(scenario));render(await r.json())});document.querySelector('#controls').append(button)}
fetch('/api/results').then(r=>r.json()).then(render);
</script></main></body></html>`;
let base;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname.startsWith('/ready/')) {
    const scenario = url.pathname.slice('/ready/'.length);
    if (scenario === 'redirect') { res.writeHead(302, { Location: '/ready/healthy' }); res.end(); return; }
    if (scenario === 'oversized') { res.end('x'.repeat(20_000)); return; }
    if (scenario === 'cache-extension-defect') res.setHeader('Cache-Control', 'public, max-age=3600, x-no-store-extension=1');
    if (scenario === 'cacheable') res.setHeader('Cache-Control', 'max-age=3600');
    const body = { status: 'ready', tier: 'demo', deploymentId: id, checks: { database: 'ok', policy: 'ok' } };
    if (scenario === 'old-instance') body.deploymentId = '22345678-1234-4234-8234-123456789abc';
    if (scenario === 'production-tier') body.tier = 'production';
    if (scenario === 'database-failed') body.checks.database = 'fail';
    res.setHeader('Content-Type', 'application/json');res.end(JSON.stringify(body));return;
  }
  if (url.pathname === '/api/probe') {
    const scenario = url.searchParams.get('scenario');
    if (!expected.has(scenario)) { res.writeHead(400);res.end();return; }
    let decision = 'VERIFIED', detail;
    try {
      if (scenario === 'wrong-native-target') { const data = native(); data.projectToken.environment.id = 'production'; validateTarget(data); }
      else if (scenario === 'missing-native-sha') { const data = native(); delete data.deployment.meta.commitHash; validateActiveDeployment(data, sha, id); }
      else {
        const proof = await verifyLiveReady(id, { fetchImpl: async (requested, options) => {
          assert.equal(requested, `https://${DEMO_TARGET.domain}/ready`);
          assert.equal(options.redirect, 'error');assert.equal(options.headers.Authorization, undefined);
          return fetch(`${base}/ready/${scenario}`, options);
        } });
        detail = `${proof.status} · ${proof.tier} · ${proof.deploymentId}`;
      }
    } catch (error) { decision = 'BLOCKED'; detail = error.name === 'TypeError' ? 'HTTP redirect rejected by production fetch options' : error.message; }
    assert.equal(decision, expected.get(scenario));
    results.push({ scenario, decision, detail });
  }
  if (url.pathname.startsWith('/api/')) { res.setHeader('Content-Type', 'application/json');res.end(JSON.stringify(results));return; }
  if (url.pathname === '/favicon.ico') { res.writeHead(204);res.end();return; }
  res.setHeader('Content-Type', 'text/html');res.end(html);
});
await mkdir(`${folder}/test-results`, { recursive: true });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
base = `http://127.0.0.1:${server.address().port}`;
let browser, context;
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  context = await browser.newContext({ viewport: { width: 1400, height: 1100 }, recordVideo: { dir: `${folder}/test-results`, size: { width: 1400, height: 1100 } } });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}`); });
  await page.goto(base);
  assert.equal(await page.locator('#domain').innerText(), DEMO_TARGET.domain);
  assert.equal(await page.locator('#deployment').innerText(), id);
  for (const [scenario, decision] of expected) {
    await page.locator(`button[data-case="${scenario}"]`).click();
    const row = page.locator(`tr[data-scenario="${scenario}"]`);
    await row.waitFor();
    assert.equal(await row.locator('td').nth(1).innerText(), decision);
    assert.ok((await row.locator('td').nth(2).innerText()).length > 10);
  }
  assert.equal(await page.locator('#count').innerText(), '10 / 10 scenarios checked');
  await page.reload();
  await page.locator('tr[data-scenario="missing-native-sha"]').waitFor();
  assert.equal(await page.locator('#rows tr').count(), 10);
  assert.match(await page.locator('tr[data-scenario="healthy"]').innerText(), /ready · demo · 12345678/);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await page.screenshot({ path: `${folder}/final-result.png`, fullPage: true });
  await context.tracing.stop({ path: `${folder}/trace.zip` });
  const after = await hashes();assert.deepEqual(after, before);
  await writeFile(`${folder}/browser-results.json`, JSON.stringify({ finding: 'cache-extension-defect wrongly VERIFIED; desired decision is BLOCKED', actualScenarios: results, consoleErrors: errors, sourceHashesBefore: before, sourceHashesAfter: after, liveExternalCalls: 0, evidence: 'Synthetic internal QA surface; actual production helpers; no product UI changed.' }, null, 2));
  console.log(JSON.stringify({ outcome: 'PASS', scenarios: results.length, browserErrors: errors.length }));
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  server.closeAllConnections();await new Promise(resolve => server.close(resolve));
}
