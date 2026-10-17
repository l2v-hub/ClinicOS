import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {cases,probe} from '../independent-qa-attempt-3/identity-race-probes.mjs';
import {DEMO_TARGET,verifyLiveReady,validateActiveDeployment,validateTarget} from '../../../../agent-team/src/bug-pipeline/demo-deployment.mjs';
const folder=fileURLToPath(new URL('.',import.meta.url));
const root=fileURLToPath(new URL('../../../..',import.meta.url));
const source=JSON.parse(await readFile(new URL('../candidate-4/source-hashes.json',import.meta.url)));
async function hashes(){let result=[];for(const file of source.files){let bytes=await readFile(`${root}/${file.file}`);const sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,file.sha256,file.file);result.push({file:file.file,sha256});}return result;}
await hashes();
const proofCases=['healthy','old-instance','production-tier','cacheable','failed-db','cache-extension','cache-quoted-lookalike','cache-argument','cache-malformed','cache-valid-quoted','native-wrong-target','native-no-sha','native-overlap','native-transitional','native-duplicate'];
const all=[...cases,...proofCases];
const deploymentId='12345678-1234-4234-8234-123456789abc';
const sha='a'.repeat(40),rows=[];
const expected=(name)=>['healthy','cache-valid-quoted'].includes(name)?'VERIFIED':'BLOCKED';
function native(){return {projectToken:{project:{id:DEMO_TARGET.projectId},environment:{id:DEMO_TARGET.environmentId,name:'demo'}},deploymentTriggers:{edges:[{node:{...DEMO_TARGET,repository:'l2v-hub/ClinicOS',branch:'main'}}]},serviceInstance:{...DEMO_TARGET,source:{repo:'l2v-hub/ClinicOS'},domains:{serviceDomains:[{domain:DEMO_TARGET.domain}]},activeDeployments:[{id:deploymentId,status:'SUCCESS'}]},deployment:{...DEMO_TARGET,id:deploymentId,status:'SUCCESS',meta:{commitHash:sha}}};}
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Independent QA candidate 4</title><style>body{font:17px system-ui;background:#f3f7fb;color:#17324e;margin:28px}main{max-width:1260px;margin:auto}h1{font-size:27px}.notice{padding:16px;background:#e0ebf5;border-left:5px solid #27658f}button{background:#1c5785;color:white;padding:12px;margin:4px;border:0;border-radius:4px}table{background:white;border-collapse:collapse;width:100%;margin-top:18px}td,th{border-bottom:1px solid #ccd9e5;padding:10px;text-align:left;font-size:14px}td[data-kind=DEFECT]{font-weight:750;color:#a04413}td[data-kind=BLOCKED]{font-weight:700;color:#305e84}td[data-kind=VERIFIED]{font-weight:700;color:#17613e}#status{font-size:20px;font-weight:750}</style></head><body><main><h1>Independent QA · Candidate 4 release identity</h1><p class="notice">Synthetic data only. Actual frozen release and demo-validation helpers run through localhost HTTP. No GitHub/Railway mutation or credential. Observed outcome of the actual release and proof probes appears below.</p><p>Expected reviewed PR: <b id="expected-pr">9</b> · Source issues: <b id="expected-issues">[5]</b></p><button id="run">Execute all 25 actual probes</button><output id="status">0 / 25 scenarios</output><table><thead><tr><th>Scenario</th><th>Actual decision</th><th>Observed value</th></tr></thead><tbody id="results"></tbody></table><script>
function render(rows){document.querySelector('#results').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');tr.dataset.scenario=r.scenario;for(const text of [r.scenario,r.decision,r.detail]){const td=document.createElement('td');td.textContent=text;if(text===r.decision)td.dataset.kind=r.decision;tr.append(td)}return tr}));document.querySelector('#status').textContent=rows.length+' / 25 scenarios';}
document.querySelector('#run').onclick=async()=>{document.querySelector('#run').disabled=true;render(await(await fetch('/api/run',{method:'POST'})).json());};fetch('/api/results').then(r=>r.json()).then(render);
</script></main></body></html>`;
let base;
async function productionProbe(scenario){
 if(cases.includes(scenario)){const r=await probe(scenario);return {...r,detail:`verifiedPR=9; currentPR=${r.durablePr}; issues=${JSON.stringify(r.durableSourceIssues)}; merges=${JSON.stringify(r.actualMerges.map(x=>x[1]))}; closed=${JSON.stringify(r.actualClosures.map(x=>x[1]))}; commentCount=${r.completionComments}${r.error?'; '+r.error:''}`};}
 let decision='VERIFIED',detail='';
 try{
  if(scenario.startsWith('native-')){
   const d=native();
   if(scenario==='native-wrong-target')d.projectToken.environment.id='production';
   if(scenario==='native-no-sha')delete d.deployment.meta.commitHash;
   if(scenario==='native-overlap')d.serviceInstance.activeDeployments.push({id:'22345678-1234-4234-8234-123456789abc',status:'SUCCESS'});
   if(scenario==='native-transitional')d.serviceInstance.activeDeployments[0].status='DEPLOYING';
   if(scenario==='native-duplicate')d.serviceInstance.activeDeployments.push({...d.serviceInstance.activeDeployments[0]});
   validateTarget(d);validateActiveDeployment(d,sha,deploymentId);detail='Native target and source verified';
  }else{
   const result=await verifyLiveReady(deploymentId,{fetchImpl:async(url,opts)=>{assert.equal(url,`https://${DEMO_TARGET.domain}/ready`);assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,undefined);return fetch(`${base}/ready/${scenario}`,opts);}});detail=`${result.status}; ${result.tier}; deployment=${result.deploymentId}`;
  }
 }catch(error){decision='BLOCKED';detail=error.message;}
 return {scenario,decision,detail};
}
const server=createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');const url=new URL(req.url,'http://localhost');try{
 if(url.pathname.startsWith('/ready/')){
  const scenario=url.pathname.slice(7);const body={status:'ready',tier:'demo',deploymentId,checks:{database:'ok',policy:'ok'}};
  if(scenario==='old-instance')body.deploymentId='22345678-1234-4234-8234-123456789abc';
  if(scenario==='production-tier')body.tier='production';
  if(scenario==='failed-db')body.checks.database='fail';
  const cache={'cacheable':'max-age=3600','cache-extension':'public, max-age=3600, x-no-store-extension=1','cache-quoted-lookalike':'extension="x,no-store,y", public','cache-argument':'no-store=1','cache-malformed':'no-store, extension="unterminated','cache-valid-quoted':'private, extension="x,y", NO-STORE'};
  if(cache[scenario])res.setHeader('Cache-Control',cache[scenario]);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return;
 }
 if(url.pathname==='/api/run'){
  assert.equal(req.method,'POST');rows.length=0;for(const scenario of all){const row=await productionProbe(scenario);assert.equal(row.decision,expected(scenario));rows.push(row);}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(rows));return;
 }
 if(url.pathname==='/api/results'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(rows));return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
 }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}});
await mkdir(`${folder}/test-results`,{recursive:true});await mkdir(`${folder}/playwright-report`,{recursive:true});
await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
let browser,context;const errors=[];let result;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:`${folder}/test-results`,size:{width:1440,height:1000}}});await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 await context.route('**/*',route=>{if(route.request().url().startsWith(`${base}/`))return route.continue();errors.push('Unexpected external browser request');return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()}`);});
 await page.goto(base);assert.equal(await page.locator('#expected-pr').textContent(),'9');assert.equal(await page.locator('#status').textContent(),'0 / 25 scenarios');await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='25 / 25 scenarios');
 for(const row of rows){const values=await page.locator(`tr[data-scenario="${row.scenario}"] td`).allTextContents();assert.deepEqual(values,[row.scenario,row.decision,row.detail]);}
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent==='25 / 25 scenarios');
 assert.equal(await page.locator('td[data-kind="DEFECT"]').count(),0);assert.equal(await page.locator('td[data-kind="VERIFIED"]').count(),2);assert.equal(await page.locator('td[data-kind="BLOCKED"]').count(),23);
 for(const row of rows)assert.equal(await page.locator(`tr[data-scenario="${row.scenario}"] td`).last().textContent(),row.detail);
 assert.deepEqual(errors,[]);await page.screenshot({path:`${folder}/final-result.png`,fullPage:true});
 result={status:'READY FOR CODEX QA',candidate:4,scenarios:rows.length,defects:0,verified:2,blocked:23,domValueAssertions:55,errors,rows,sourceHashes:await hashes()};
 await writeFile(`${folder}/browser-results.json`,JSON.stringify(result,null,2)+'\n');await context.tracing.stop({path:`${folder}/trace.zip`});await context.close();context=null;
 await writeFile(`${folder}/playwright-report/run-summary.json`,JSON.stringify({scenarios:25,defects:0,consoleErrors:0,httpErrors:0,reloadVerified:true},null,2)+'\n');await writeFile(`${folder}/playwright-report/index.html`,html.replace('<tbody id="results"></tbody>', '<tbody id="results">'+rows.map(r=>'<tr>'+[r.scenario,r.decision,r.detail].map(v=>'<td>'+String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</td>').join('')+'</tr>').join('')+'</tbody>').replace('0 / 25 scenarios','25 / 25 scenarios').replace('<script>','<script type="application/x-disabled">'));
 console.log(JSON.stringify({scenarios:25,defects:0,verified:2,blocked:19,reloadVerified:true,errors}));
}finally{if(context)await context.close();if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
