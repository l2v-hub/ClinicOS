import {createGitHub} from '../../../../agent-team/src/bug-pipeline/github.mjs';
import {fixture,sha as fixtureSha,mergeSha,publishDeploymentCompletion} from './publication-race-fixture.mjs';
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
const manifest = JSON.parse(await readFile(new URL('../candidate-2/source-hashes.json', import.meta.url)));
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
  ['oversized', 'BLOCKED'], ['cache-extension-defect', 'BLOCKED'], ['wrong-native-target', 'BLOCKED'], ['missing-native-sha', 'BLOCKED'], ['quoted-cache-lookalike','BLOCKED'], ['argument-no-store','BLOCKED'], ['malformed-cache','BLOCKED'], ['valid-quoted-cache','VERIFIED'], ['old-new-overlap','BLOCKED'], ['duplicate-active','BLOCKED'], ['transitional-active','BLOCKED'], ['hold-during-issue-read','DEFECT'], ['hold-inside-status-adapter','DEFECT'], ['failed-close-claim','DEFECT'],
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
body{font:17px system-ui,sans-serif;background:#f1f5f9;color:#16324f;margin:32px}main{max-width:1240px;margin:auto}h1{font-size:28px}p{line-height:1.5}code{font-size:14px}button{padding:12px;margin:4px;background:#164e78;color:white;border:0;border-radius:5px;cursor:pointer}table{border-collapse:collapse;background:white;width:100%;margin-top:18px}td,th{text-align:left;padding:12px;border-bottom:1px solid #d6e1eb}.ok{color:#14643b;font-weight:700}.blocked{color:#874b0d;font-weight:700}.notice{padding:15px;background:#e1edf7;border-left:5px solid #27628b}</style></head><body><main><h1>Independent QA · Exact demo deployment guard</h1><p class="notice">Synthetic localhost HTTP responses exercise the actual production validation helpers. No live deployment, patient data, external request or credential is used.</p><p>Expected domain: <code id="domain">${DEMO_TARGET.domain}</code><br>Expected deployment: <code id="deployment">${id}</code><br>Expected native commit: <code>${sha}</code></p><div id="controls"></div><table><thead><tr><th>Scenario</th><th>Actual helper decision</th><th>Actual result / rejection reason</th></tr></thead><tbody id="rows"></tbody></table><p id="count">0 / 20 scenarios checked</p><script>
const cases=${JSON.stringify([...expected.keys()])};
function render(rows){document.querySelector('#rows').replaceChildren(...rows.map(row=>{const tr=document.createElement('tr');tr.dataset.scenario=row.scenario;for(const value of [row.scenario,row.decision,row.detail]){const td=document.createElement('td');td.textContent=value;if(value===row.decision)td.className=value==='VERIFIED'?'ok':'blocked';tr.append(td)}return tr}));document.querySelector('#count').textContent=rows.length+' / 20 scenarios checked'}
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
    if (scenario === 'quoted-cache-lookalike') res.setHeader('Cache-Control', 'extension="x,no-store,y", max-age=3600');
    if (scenario === 'argument-no-store') res.setHeader('Cache-Control', 'no-store=1');
    if (scenario === 'malformed-cache') res.setHeader('Cache-Control', 'no-store, extension="unterminated');
    if (scenario === 'valid-quoted-cache') res.setHeader('Cache-Control', 'private, extension="x,y", NO-STORE');
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
      else if (['old-new-overlap','duplicate-active','transitional-active'].includes(scenario)) { const data=native(); if(scenario==='old-new-overlap')data.serviceInstance.activeDeployments.unshift({id:'22345678-1234-4234-8234-123456789abc',status:'SUCCESS'});if(scenario==='duplicate-active')data.serviceInstance.activeDeployments.push({id,status:'SUCCESS'});if(scenario==='transitional-active')data.serviceInstance.activeDeployments[0].status='DEPLOYING';validateActiveDeployment(data,sha,id);}
      else if(scenario==='hold-during-issue-read'){
        const f=fixture();f.batch.release={status:'deployed',reviewedSha:fixtureSha,mergeSha,deployment:{status:'deployed',reviewedSha:fixtureSha,mergeSha,vercelUrl:'https://clinicos-eosin.vercel.app'}};
        f.github.viewIssue=async(number)=>{f.state.batches[0].releaseHold={reason:'Synthetic independent review hold during awaited issue read'};return{number,state:'open',comments:[]};};
        await assert.rejects(publishDeploymentCompletion({batch:f.batch,github:f.github,store:f.store,repo:'l2v-hub/ClinicOS'}),/releaseHold/);
        const comments=f.calls.filter(([type])=>type==='comment').length,closed=f.calls.filter(([type])=>type==='status').length;
        decision=comments===0?'BLOCKED':'DEFECT';detail=`completionComments=${comments} · closedIssues=${closed} · durableHold=active`;assert.equal(closed,0);
      }
      else if(['hold-inside-status-adapter','failed-close-claim'].includes(scenario)){
        const f=fixture();f.batch.release={status:'deployed',reviewedSha:fixtureSha,mergeSha,deployment:{status:'deployed',reviewedSha:fixtureSha,mergeSha,vercelUrl:'https://clinicos-eosin.vercel.app'}};
        if(scenario==='hold-inside-status-adapter'){
          let heldClose=0;const real=createGitHub({repo:f.state.repository,cwd:'/tmp',run:async({args})=>{if(args[1].endsWith('/labels/Risolto'))f.state.batches[0].releaseHold=true;if(args.includes('PATCH')&&f.state.batches[0].releaseHold)heldClose++;return{ok:true,code:0,stdout:'{}',stderr:''};}});
          f.github.setIssueStatus=real.setIssueStatus;await publishDeploymentCompletion({batch:f.batch,github:f.github,store:f.store,repo:f.state.repository});decision=heldClose?'DEFECT':'BLOCKED';detail=`actualClosePatchWithHold=${heldClose} · durableHold=active`;
        }else{
          f.github.setIssueStatus=async()=>{throw Error('Synthetic close HTTP503')};await assert.rejects(publishDeploymentCompletion({batch:f.batch,github:f.github,store:f.store,repo:f.state.repository}),/HTTP503/);
          const body=f.calls.find(([type])=>type==='comment')[2];const falseClaim=body.includes('issue chiusa come completata');decision=falseClaim?'DEFECT':'BLOCKED';detail=`closedIssues=0 · closeHTTP=503 · alreadyClosedClaim=${falseClaim}`;
        }
      }
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
  assert.equal(await page.locator('#count').innerText(), '20 / 20 scenarios checked');
  await page.reload();
  await page.locator('tr[data-scenario="failed-close-claim"]').waitFor();
  assert.equal(await page.locator('#rows tr').count(), 20);
  assert.match(await page.locator('tr[data-scenario="healthy"]').innerText(), /ready · demo · 12345678/);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await page.locator('tr[data-scenario="failed-close-claim"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${folder}/final-result.png`, fullPage: true });
  await context.tracing.stop({ path: `${folder}/trace.zip` });
  const after = await hashes();assert.deepEqual(after, before);
  await writeFile(`${folder}/browser-results.json`, JSON.stringify({ finding: 'QA2-F1: completion comment is published after a hold arrives during awaited issue read; final closure is blocked', actualScenarios: results, consoleErrors: errors, sourceHashesBefore: before, sourceHashesAfter: after, liveExternalCalls: 0, evidence: 'Synthetic internal QA surface; actual production helpers; no product UI changed.' }, null, 2));
  console.log(JSON.stringify({ outcome: 'PASS', scenarios: results.length, browserErrors: errors.length }));
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  server.closeAllConnections();await new Promise(resolve => server.close(resolve));
}
