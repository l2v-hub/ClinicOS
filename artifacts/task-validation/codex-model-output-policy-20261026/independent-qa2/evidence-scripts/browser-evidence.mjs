import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('/workspace/ClinicOS/node_modules/playwright');
const output='/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics/runtime-output-policy-qa2';
const result=JSON.parse(await readFile(output+'/test-results/independent.json','utf8')), memory=JSON.parse(await readFile(output+'/test-results/memory-extra.json','utf8'));
assert.equal(result.passed,16);assert.equal(result.failed,0);assert.equal(memory.status,'PASS');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rows=result.results.map(r=>`<tr><td>${escape(r.name)}</td><td>${r.status}</td><td>${escape(JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>!['name','status'].includes(k)))))}</td></tr>`).join('');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Independent output policy QA2</title><style>body{font:16px system-ui;margin:36px;background:#eef1f6;color:#16202e}main{background:white;padding:28px;border-radius:12px}h1{color:#1645a0}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border:1px solid #b8c4d5;text-align:left}code{font-size:13px}.outcome{padding:14px;background:#e8f0ff;color:#1645a0;font-weight:bold}</style><main><h1>Independent output policy QA2</h1><p>Synthetic fixture evidence only · no online validation · no provider calls · no clinical replay</p><p>Source commit: <code>${result.code}</code></p><p>QA nonce: <code>${result.qaNonce}</code></p><p class="outcome" id="verdict">Local fixture validation PASS</p><p id="counts">16 PASS / 0 FAIL · provider calls: 0</p><p id="memory">Real runner: 65536 combined captured bytes; 32768 backing bytes per stream; 54 allocation transitions PASS; discarded marker reachable: false</p><table><thead><tr><th>Independent fixture</th><th>Outcome</th><th>Observed values</th></tr></thead><tbody>${rows}</tbody></table><p>This QA-only local report is not an application page. Source publication, CI, Claude review and final Codex gate remain separate.</p></main></html>`;
await writeFile(output+'/playwright-report/index.html',html);
const errors=[],httpErrors=[],requests=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1300}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});
const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)httpErrors.push(r.status());});page.on('request',r=>requests.push(r.url()));
await page.setContent(html);
for(const phase of ['before','after']) {
 if(phase==='after'){await page.reload();await page.setContent(await readFile(output+'/playwright-report/index.html','utf8'));}
 assert.equal(await page.locator('#verdict').isVisible(),true);assert.equal(await page.locator('#counts').textContent(),'16 PASS / 0 FAIL · provider calls: 0');
 assert.equal(await page.locator('tbody tr').count(),16);assert.match(await page.locator('tbody').textContent(),/82005/);
 assert.match(await page.locator('tbody').textContent(),/"visibleBytes":32768,"backingBytes":32768/);
 assert.match(await page.locator('#memory').textContent(),/65536 combined captured bytes; 32768 backing bytes per stream; 54 allocation transitions PASS; discarded marker reachable: false/);
}
assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);assert.deepEqual(requests,[]);
await page.screenshot({path:output+'/screenshots/result.png',fullPage:true});await context.tracing.stop({path:output+'/trace/trace.zip'});await browser.close();
const report={status:'PASS',source:result.code,synthetic:true,onlineValidation:false,surface:'page.setContent from generated local HTML; reload and rehydration from disk asserted; no application persistence claim',assertedFixtures:16,passedFixtures:16,failedFixtures:0,memoryTransitions:54,consoleErrors:errors.length,httpErrors:httpErrors.length,externalRequests:requests.length,video:'not required: internal-only runner change',screenshot:'screenshots/result.png',trace:'trace/trace.zip'};
await writeFile(output+'/test-results/playwright.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
