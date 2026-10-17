import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '/workspace/ClinicOS/agent-team/.runtime/all-open-issues/browser-isolated/playwright/index.mjs';
import { out, browserProbe, sourceHash } from './independent-probes.mjs';
assert.equal(process.env.CLINICOS_CI_NOTE_QA_LOCK, 'held');
const media=path.join(out,'browser');mkdirSync(media,{recursive:true});
let persisted=null;let executions=0;let browser;let context;
const failures=[];
const pageHtml=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Independent QA — notes scheduling</title><style>body{font:18px system-ui;background:#edf4fa;color:#153c5a;margin:0;padding:48px}main{background:white;border:1px solid #b4cddd;border-radius:14px;padding:32px;max-width:950px;margin:auto}h1{font-size:32px}button{background:#145983;color:white;padding:14px;border:0;border-radius:7px;font-size:17px}dl{display:grid;grid-template-columns:230px 1fr;gap:14px}dd{margin:0;font-family:monospace}#status{font-size:24px;color:#176241}small{display:block;margin-top:24px;color:#496176}code{overflow-wrap:anywhere}</style><main><h1>Notes test scheduling — independent QA</h1><p>Synthetic filesystem fixtures · production Node runner · no database</p><button id="run">Execute real runner</button><p id="status">Not run</p><dl><dt>Executed child tests</dt><dd id="count">—</dd><dt>Concurrent writer</dt><dd id="writer">—</dd><dt>Serial mailbox assertion</dt><dd id="reader">—</dd><dt>Actual process exit</dt><dd id="exit">—</dd><dt>Runner executions</dt><dd id="executions">0</dd></dl><p>Tested source SHA-256<br><code id="sha"></code></p><small>This is a local QA surface for orchestration evidence. Native full backend CI remains a separate required gate.</small></main><script>async function show(){const r=await fetch('/result');const x=await r.json();document.querySelector('#executions').textContent=x.executions;if(!x.result)return;const p=x.result;document.querySelector('#status').textContent='PASS — writer completed before mailbox read';document.querySelector('#count').textContent=p.executedTests;document.querySelector('#writer').textContent=p.events[1].kind;document.querySelector('#reader').textContent=p.events[2].kind;document.querySelector('#exit').textContent=p.exit;document.querySelector('#sha').textContent=p.sourceHash;}document.querySelector('#run').onclick=async()=>{document.querySelector('#status').textContent='Running real child processes…';const r=await fetch('/run',{method:'POST',headers:{'X-ClinicOS-QA':'local-synthetic'}});if(!r.ok)throw new Error('runner failed');await show();};show();</script></html>`;
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&req.url==='/favicon.ico'){res.statusCode=204;return res.end();}
 if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(pageHtml);}
 if(req.method==='GET'&&req.url==='/result'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({executions,result:persisted}));}
 if(req.method==='POST'&&req.url==='/run'&&req.headers['x-clinicos-qa']==='local-synthetic'){
  try{persisted=browserProbe();executions++;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true}));}catch(e){failures.push(String(e));res.statusCode=500;return res.end('QA runner assertion failed');}
 }
 res.statusCode=404;res.end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 context=await browser.newContext({viewport:{width:1280,height:850},recordVideo:{dir:media,size:{width:1280,height:850}}});
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const page=await context.newPage();page.on('pageerror',e=>failures.push('pageerror '+e.message));page.on('console',msg=>{if(msg.type()==='error')failures.push('console '+msg.text());});page.on('response',r=>{if(r.status()>=400)failures.push('HTTP '+r.status()+' '+new URL(r.url()).pathname);});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('PASS'),{timeout:15000});
 const expected={count:'2',writer:'writer-end',reader:'reader-verified',exit:'0',executions:'1',sha:sourceHash};
 const assertions=[];
 for(const [id,value]of Object.entries(expected)){assert.equal(await page.locator('#'+id).textContent(),value);assertions.push({stage:'before reload',id,value});}
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('PASS'));
 for(const [id,value]of Object.entries(expected)){assert.equal(await page.locator('#'+id).textContent(),value);assertions.push({stage:'after reload',id,value});}
 await page.screenshot({path:path.join(media,'result-after-reload.png'),fullPage:true});
 assert.deepEqual(failures,[]);assert.equal(executions,1);
 await context.tracing.stop({path:path.join(media,'trace.zip')});
 const video=page.video();await context.close();context=null;await video.saveAs(path.join(media,'real-runner.webm'));
 writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'PASS',realProductionRunner:true,sourceHash,executions,persistenceAfterReload:true,domValueAssertions:assertions.length,assertions,errors:failures,syntheticOnly:true,noDatabase:true},null,2)+'\n');
}finally{if(context)await context.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log('Independent actual-runner browser PASS: 12 exact DOM value assertions, reload, screenshot, trace and video.');
