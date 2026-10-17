import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '/workspace/ClinicOS/node_modules/playwright/index.mjs';
import { expect } from '/workspace/ClinicOS/node_modules/playwright/test.mjs';
import { TARGET, INVENTORY_QUERY, createClient } from '../../../../scripts/automation/configure-demo-source.mjs';
import { ENVIRONMENTS_QUERY, SERVICES_QUERY, INSTANCES_QUERY, TRIGGERS_QUERY, inspectTopology, serializeTopologyReceipt } from '../../../../scripts/automation/inspect-demo-source-topology.mjs';

// QA-only loopback surface: production inspector and production HTTP client,
// synthetic topology, no Railway/GitHub endpoint or real identity is contacted.
const out=path.dirname(new URL(import.meta.url).pathname);
const scenarios=['singleton','multipage','inaccessible','repeat-cursor','drift','private-error','unsafe-metadata','foreign-owner','mutation-denied'];
const results=[], observations=[];
const counters=new Map();
const safeContext={repository:TARGET.repository,reviewedSha:'b'.repeat(40),runId:'987654321',runAttempt:'1'};
const page=(nodes,after,size=50)=>{
  const offset=after===null?0:Number(after.slice(2));
  const chunk=nodes.slice(offset,offset+size),more=offset+chunk.length<nodes.length;
  return {edges:chunk.map(node=>({node})),pageInfo:{hasNextPage:more,endCursor:more?'c-'+(offset+chunk.length):null}};
};
function fixture(scenario,query,v){
  const n=(counters.get(scenario+query)||0)+1;counters.set(scenario+query,n);
  const demo={id:TARGET.environmentId,projectId:TARGET.projectId,name:'demo',canAccess:true,isEphemeral:false,sourceEnvironment:null};
  const extra={id:'qa-visible-second',projectId:TARGET.projectId,name:'qa preview',canAccess:scenario!=='inaccessible',isEphemeral:true,sourceEnvironment:{id:demo.id,projectId:TARGET.projectId}};
  const environments=scenario==='multipage'||scenario==='inaccessible'?[demo,extra]:[demo];
  const services=[{id:TARGET.serviceId,name:scenario==='drift'&&n===2?'changed':'backend',projectId:TARGET.projectId},...(scenario==='multipage'?[{id:'qa-extra-service',name:'aux',projectId:TARGET.projectId}]:[])];
  if(query===ENVIRONMENTS_QUERY){
    if(scenario==='unsafe-metadata')demo.name=['gh','p_'].join('')+'syntheticOnly';
    if(scenario==='foreign-owner')demo.projectId='qa-foreign';
    const connection=page(environments,v.after,scenario==='multipage'?1:50);
    if(scenario==='repeat-cursor')connection.pageInfo={hasNextPage:true,endCursor:'same'};
    return {project:{id:TARGET.projectId,environments:connection,unrequestedPrivate:'MUST_NOT_APPEAR'}};
  }
  if(query===SERVICES_QUERY)return {project:{id:TARGET.projectId,services:page(services,v.after,scenario==='multipage'?1:50)}};
  if(query===INSTANCES_QUERY)return {environment:{id:v.environmentId,projectId:TARGET.projectId,serviceInstances:page([{id:'instance-'+v.environmentId,serviceId:TARGET.serviceId,environmentId:v.environmentId,rootDirectory:'/',source:{repo:TARGET.repository}}],v.after)}};
  if(query===TRIGGERS_QUERY)return {environment:{id:v.environmentId,projectId:TARGET.projectId,deploymentTriggers:page([],v.after)}};
  if(query===INVENTORY_QUERY)return {projectToken:{project:{id:TARGET.projectId},environment:{id:TARGET.environmentId,name:'demo'}},serviceInstance:{serviceId:TARGET.serviceId,environmentId:TARGET.environmentId,rootDirectory:'/',source:{repo:TARGET.repository},domains:{serviceDomains:[{domain:TARGET.domain}],customDomains:[]}},deploymentTriggers:{edges:[],pageInfo:{hasNextPage:false}},unrequestedPrivate:'MUST_NOT_APPEAR'};
  throw Error('QA_UNEXPECTED_QUERY');
}
let server,browser,context;
const errors=[];
try{
  server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname==='/graphql'){
        const chunks=[];for await(const c of req)chunks.push(c);
        const {query,variables}=JSON.parse(Buffer.concat(chunks));
        const scenario=url.searchParams.get('scenario');
        assert.ok(scenarios.includes(scenario));assert.ok([ENVIRONMENTS_QUERY,SERVICES_QUERY,INSTANCES_QUERY,TRIGGERS_QUERY,INVENTORY_QUERY].includes(query));
        assert.equal(variables.projectId,TARGET.projectId);assert.doesNotMatch(query,/mutation|serviceConnect/i);
        observations.push({scenario,queryType:query===ENVIRONMENTS_QUERY?'environments':query===SERVICES_QUERY?'services':query===INSTANCES_QUERY?'instances':query===TRIGGERS_QUERY?'triggers':'scoped',environmentId:variables.environmentId??null,after:variables.after??null});
        res.setHeader('Content-Type','application/json');
        if(scenario==='private-error'){res.end(JSON.stringify({errors:[{message:'SYNTHETIC_PROVIDER_PRIVATE'}]}));return;}
        res.end(JSON.stringify({data:fixture(scenario,query,variables)}));return;
      }
      if(url.pathname==='/run'){
        const scenario=url.searchParams.get('scenario');assert.ok(scenarios.includes(scenario));
        let checks=0,record;
        const before=observations.length;
        try{
          const client=createClient({token:'qa-transport-placeholder',fetchImpl:async(_endpoint,opts)=>{
            const response=await fetch(`http://127.0.0.1:${server.address().port}/graphql?scenario=${scenario}`,opts);
            return new Response(response.body,{status:response.status,headers:response.headers});
          }});
          const result=await inspectTopology({operation:scenario==='mutation-denied'?'connect':'inspect',client,assertFreshContext:async()=>{checks++;}});
          const receipt=JSON.parse(serializeTopologyReceipt(safeContext,result,{forbiddenValues:['qa-transport-placeholder','MUST_NOT_APPEAR']}));
          assert.equal(receipt.inventory.serviceConnectAllowed,false);assert.equal(receipt.inventory.projectWideVisibility,'unproven');assert.equal(checks,3);
          assert.equal(Object.isFrozen(result.inventory.environments),true);
          assert.throws(()=>serializeTopologyReceipt(safeContext,structuredClone(result)),e=>e.code==='DEMO_TOPOLOGY_INVALID_RECEIPT');
          record={scenario,status:'inspected',projectWideVisibility:receipt.inventory.projectWideVisibility,serviceConnectAllowed:receipt.inventory.serviceConnectAllowed,paginationComplete:receipt.inventory.visiblePaginationComplete,reads:observations.length-before,environments:receipt.inventory.environments.length,receipt};
        }catch(e){record={scenario,status:'rejected',code:e.code,reads:observations.length-before};assert.match(record.code,/^DEMO_TOPOLOGY_[A-Z_]+$/);}
        results.push(record);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(record));return;
      }
      res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><meta charset="utf-8"><title>Topology QA</title><style>body{font:20px system-ui;margin:42px;max-width:1250px;color:#10223f}h1{color:#2f6bed}button{font-size:18px;margin:5px;padding:10px}pre{padding:25px;background:#edf3ff;white-space:pre-wrap;overflow-wrap:anywhere}#warning{background:#fff0cc;padding:18px}</style><h1>ClinicOS · topology inspector · independent QA</h1><p id="warning">LOCAL SYNTHETIC HTTP FIXTURE — no live Railway, credentials, connection or deployment.</p><p>Production inspectTopology + createClient. Project-wide visibility stays unproven.</p>${scenarios.map(s=>`<button data-scenario="${s}">${s}</button>`).join('')}<h2 id="scenario">Choose scenario</h2><pre id="result">Pending</pre><script>for(const button of document.querySelectorAll('button'))button.onclick=async()=>{document.querySelector('#scenario').textContent=button.dataset.scenario;const r=await fetch('/run?scenario='+button.dataset.scenario);const data=await r.json();document.querySelector('#result').textContent=JSON.stringify({...data,receipt:data.receipt?{inventorySha256:data.receipt.inventorySha256,refusalReason:data.receipt.inventory.refusalReason,observedConstraints:data.receipt.inventory.observedConstraints}:undefined},null,2);};</script></html>`);
    }catch(e){errors.push('QA_SERVER_ASSERTION '+e.message);res.writeHead(500);res.end('QA_SERVER_ASSERTION');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  context=await browser.newContext({viewport:{width:1440,height:1080},recordVideo:{dir:path.join(out,'video'),size:{width:1440,height:1080}}});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const p=await context.newPage();p.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text());});p.on('pageerror',e=>errors.push('page '+e.message));p.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status());});
  await p.goto(`http://127.0.0.1:${server.address().port}`);
  const codes={'repeat-cursor':'DEMO_TOPOLOGY_PAGINATION_STALLED',drift:'DEMO_TOPOLOGY_INVENTORY_DRIFT','private-error':'DEMO_TOPOLOGY_ENVIRONMENTS_QUERY_REJECTED','unsafe-metadata':'DEMO_TOPOLOGY_INVALID_METADATA','foreign-owner':'DEMO_TOPOLOGY_OWNERSHIP_MISMATCH','mutation-denied':'DEMO_TOPOLOGY_READ_ONLY_OPERATION_REQUIRED'};
  for(const scenario of scenarios){
    await p.locator(`[data-scenario="${scenario}"]`).click();await expect(p.locator('#scenario')).toHaveText(scenario);
    const success=['singleton','multipage','inaccessible'].includes(scenario);
    await expect(p.locator('#result')).toContainText(`"status": "${success?'inspected':'rejected'}"`);
    await expect(p.locator('#result')).toBeVisible();
    const record=results.at(-1);assert.equal(record.scenario,scenario);
    if(success){assert.equal(record.serviceConnectAllowed,false);assert.equal(record.projectWideVisibility,'unproven');assert.equal(record.paginationComplete,scenario!=='inaccessible');await expect(p.locator('#result')).toContainText('"serviceConnectAllowed": false');}
    else {assert.equal(record.code,codes[scenario]);await expect(p.locator('#result')).toContainText(record.code);}
    if(scenario==='private-error')assert.equal(record.reads,1);
    if(scenario==='mutation-denied')assert.equal(record.reads,0);
    if(scenario==='multipage'){assert.equal(record.reads,18);assert.equal(record.environments,2);const requests=observations.filter(x=>x.scenario===scenario);assert.equal(requests.filter(x=>x.after==='c-1').length,4);}
    if(scenario==='inaccessible')assert.equal(observations.some(x=>x.scenario===scenario&&x.environmentId==='qa-visible-second'),false);
    assert.doesNotMatch(await p.locator('#result').innerText(),/SYNTHETIC_PROVIDER_PRIVATE|MUST_NOT_APPEAR|qa-transport-placeholder/);
    await p.screenshot({path:path.join(out,'screenshots',scenario+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  await context.tracing.stop({path:path.join(out,'trace','trace.zip')});
  await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify({outcome:'PASS',scenarioCount:scenarios.length,unexpectedErrors:errors,results,observations},null,2));
  await fs.mkdir(path.join(out,'playwright-report'),{recursive:true});
  await fs.writeFile(path.join(out,'playwright-report','index.html'),'<meta charset="utf-8"><h1>Independent topology QA: PASS</h1><p>9 browser scenarios; actual production inspector/client with a loopback-only synthetic HTTP fixture. No live Railway or deployment.</p><pre>'+JSON.stringify(results.map(({receipt,...r})=>r),null,2)+'</pre>');
  console.log(JSON.stringify({outcome:'PASS',browserScenarios:scenarios.length,actualLoopbackRequests:observations.length,unexpectedErrors:errors.length}));
}finally{
  await context?.close();await browser?.close();if(server)await new Promise(r=>server.close(r));
}
