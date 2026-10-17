// Independent QA-only DOM adapter: this is not the actual application E2E.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const q=path.resolve('artifacts/task-validation/bug-batch-447/independent-qa-attempt-4');
const old=readFileSync(path.join(q,'../implementation-cycle-4/browser-before-cycle4.mjs'),'utf8');
const current=readFileSync('e2e/qa-bug-batch-447-browser.mjs','utf8');
const roster=readFileSync('frontend/src/components/operator/PatientRoster.tsx','utf8');
const extract=text=>/await page\.locator\('([^']+)'\)\.first\(\)\.waitFor\(\);\s*assert\.equal\(\(await page\.locator\('\.patient-roster th'/.exec(text)?.[1];
const before=extract(old),after=extract(current);
assert.equal(before,'.patient-roster tbody tr');assert.equal(after,'.patient-roster tbody tr.patient-roster__row');
assert.match(current,/page\.setDefaultTimeout\(30000\)/);assert.match(roster,/<tr>\s*<td[\s\S]*?className="patient-roster__empty"[\s\S]*?Caricamento…/);assert.match(roster,/className="patient-roster__row"/);
const dir=path.join(q,'selector-dom');mkdirSync(dir,{recursive:true});let populated=false;const errors=[];
const rows=()=>populated?'<tr class="patient-roster__row" tabindex="0" aria-label="Apri cartella di QA44 Resident"><td>Camera QA · Letto 7</td><td>QA44 Resident</td></tr>':'<tr><td colspan="2" class="patient-roster__empty"><span role="status" aria-live="polite">Caricamento…</span></td></tr>';
const html=()=>`<!doctype html><html lang="it"><meta charset="utf-8"><link rel="icon" href="data:,"><title>QA4 selettore roster</title><style>body{font:20px system-ui;margin:30px;color:#153a55}td,th{padding:14px;border:1px solid #b6ccd9}table{border-collapse:collapse}</style><h1>Fixture QA del selettore roster</h1><p>DOM sintetico dichiarato; la suite clinica reale viene eseguita separatamente.</p><table class="patient-roster"><thead><tr><th>Letto</th><th>Paziente</th></tr></thead><tbody>${rows()}</tbody></table></html>`;
const server=createServer((req,res)=>{if(req.url==='/release'&&req.method==='POST'){populated=true;res.writeHead(200,{'content-type':'text/html'});res.end(rows());return;}res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end(html());});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,context;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});context=await browser.newContext({viewport:{width:1180,height:820},recordVideo:{dir:path.join(dir,'video')}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();page.setDefaultTimeout(30000);page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',message:m.text()});});page.on('pageerror',e=>errors.push({type:'page',message:e.message}));page.on('response',r=>{if(r.status()>=400)errors.push({type:'http',status:r.status()});});const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url);
 const oldStart=performance.now();await page.locator(before).first().waitFor();const oldText=await page.locator('.patient-roster tbody').innerText();let oldRejected=false;try{assert.match(oldText,/QA44-/);}catch(e){oldRejected=e.code==='ERR_ASSERTION';}assert.ok(oldRejected);assert.equal(oldText,'Caricamento…');await page.screenshot({path:path.join(dir,'old-placeholder.png')});
 let newSettled=false;const newStart=performance.now();const wait=page.locator(after).first().waitFor().then(()=>{newSettled=true;});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.locator(after).count(),0);assert.equal(newSettled,false);await page.evaluate(async()=>{const response=await fetch('/release',{method:'POST'});if(!response.ok)throw new Error('release failed');document.querySelector('.patient-roster tbody').innerHTML=await response.text();});await wait;
 const newText=await page.locator('.patient-roster tbody').innerText();assert.match(newText,/QA44 Resident/);assert.match(newText,/Letto 7/);assert.ok(performance.now()-newStart<30000);await page.reload();await page.locator(after).first().waitFor();assert.match(await page.locator('.patient-roster tbody').innerText(),/QA44 Resident/);await page.screenshot({path:path.join(dir,'new-actual-row-after-reload.png')});assert.deepEqual(errors,[]);
 await context.tracing.stop({path:path.join(dir,'trace.zip')});const video=page.video();await context.close();context=null;await video.saveAs(path.join(dir,'selector.webm'));
 const receipt={surface:'Declared independent QA-only HTTP/DOM adapter; no application substitution',beforeSelector:before,afterSelector:after,originalTimeoutMs:30000,oldWaitMatchedPlaceholder:true,oldSameValueAssertionRejected:true,newWaitRemainedPendingWithoutActualRow:true,newWaitMatchedActualRow:true,newValue:newText,reloadPreserved:true,elapsedNewWaitMs:Math.round(performance.now()-newStart),errors,sourceSha256:createHash('sha256').update(current).digest('hex'),patientRosterSha256:createHash('sha256').update(roster).digest('hex'),productSourcesModified:false,actualCanonicalSuiteExecutedSeparately:true};writeFileSync(path.join(dir,'result.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{if(context)await context.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
