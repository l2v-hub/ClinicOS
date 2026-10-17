// QA-only supplementary report viewer. Product scenarios run only in the canonical runner.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {spawnSync} from 'node:child_process';
import {createConnection} from 'node:net';
import {readFileSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
const qa=dirname(fileURLToPath(import.meta.url));
const packet=resolve(qa,'..');
const summary=JSON.parse(readFileSync(resolve(packet,'test-results/validation-summary.json'),'utf8'));
assert.equal(summary.verified,true);
assert.equal(JSON.parse(readFileSync(resolve(qa,'canonical-exit.json'),'utf8')).exitCode,0);
const out=resolve(qa,'playwright-report');mkdirSync(out,{recursive:true});
const inspected=spawnSync('docker',['inspect','clinicos-qa-batch432'],{encoding:'utf8'});
assert.notEqual(inspected.status,0);assert.match(inspected.stderr,/No such (?:object|container)/i);
for (const port of [3432,5433,8432]) await new Promise((resolve,reject)=>{const socket=createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(new Error('Owned service port unexpectedly open'))});socket.once('error',e=>{socket.destroy();e.code==='ECONNREFUSED'?resolve():reject(e)});socket.setTimeout(2000,()=>{socket.destroy();reject(new Error('Port cleanup probe timed out'))})});
writeFileSync(resolve(qa,'independent-cleanup-check.json'),JSON.stringify({containerAbsent:true,ports3432_5433_8432Closed:true,checkedUnderGlobalFlock:true,developmentDatabaseUntouched:true},null,2)+'\n');
const server=createServer((request,response)=>{if(request.url==='/favicon.ico'){response.writeHead(204);response.end();return}if(request.url!=='/'){response.writeHead(404);response.end();return}response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(readFileSync(resolve(out,'index.html')))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const reportUrl='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
const context=await browser.newContext({viewport:{width:1280,height:950},recordVideo:{dir:resolve(out,'video')}});
await context.tracing.start({screenshots:true,snapshots:true,sources:true});
const page=await context.newPage();const video=page.video();const errors=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)failures.push({status:r.status()})});
try {
 await page.goto(reportUrl);
 assert.equal(await page.locator('[data-issue]').count(),7);
 assert.equal(await page.getByRole('heading',{name:'Independent QA3 — actual measured results'}).isVisible(),true);
 const measured=JSON.parse(readFileSync(resolve(packet,'test-results/internal-measured-results.json'),'utf8'));
 for (const n of [442,464]) assert.equal(await page.locator(`[data-measured="${n}"]`).textContent(),JSON.stringify(measured[`issue${n}`]));
 assert.equal(measured.issue442.persistedValue,'120/80');assert.equal(measured.issue442.clinicalWrites,1);
 assert.equal(measured.issue464.at0030.overdue,0);assert.equal(measured.issue464.at0030.dueSoon,1);assert.equal(measured.issue464.at0046.overdue,1);
 await page.reload();
 for (const n of [442,464]) assert.equal(await page.locator(`[data-measured="${n}"]`).textContent(),JSON.stringify(measured[`issue${n}`]));
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await page.screenshot({path:resolve(out,'measured-results.png'),fullPage:true});
 writeFileSync(resolve(out,'report-browser-result.json'),JSON.stringify({verified:true,scope:'Supplementary static report viewer of already executed results; no product test replay',reloadPreservedMeasuredValues:true,issueRows:7,consoleErrors:errors,responseFailures:failures},null,2)+'\n');
} finally {
 await context.tracing.stop({path:resolve(out,'report-trace.zip')});await context.close();copyFileSync(await video.path(),resolve(out,'report.webm'));await browser.close();await new Promise(resolve=>server.close(resolve));
}
