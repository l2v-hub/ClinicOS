import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
const out=fileURLToPath(new URL('.',import.meta.url));
const repo='/workspace/clinicos-demo-secret-scope';
const sourceSha='34996816c9b8149a4a90f9ccfc7eabec230d2828';
const modulePath='scripts/automation/protect-demo-secret.mjs';
const bytes=await fs.readFile(repo+'/'+modulePath);
const committed=execFileSync('git',['show',sourceSha+':'+modulePath],{cwd:repo,maxBuffer:500000});
assert.ok(bytes.equals(committed),'Reviewed helper no longer matches reserved source');
const sourceHash=createHash('sha256').update(bytes).digest('hex');
const {main,writeEnvironmentSecretWithGh,TARGET,PINNED_GH_VERSION}=await import(pathToFileURL(repo+'/'+modulePath));
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('UNEXPECTED_NETWORK_FORBIDDEN');};
const ephemeralValues=[];
function value(){const result=randomUUID();ephemeralValues.push(result);return result;}
function fixtureEnv(operation='ensure-environment',binding=value()){
 return {GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:TARGET.repository,GITHUB_REF:'refs/heads/main',GITHUB_WORKFLOW_REF:TARGET.workflowRef,GITHUB_SHA:sourceSha,GITHUB_WORKFLOW_SHA:sourceSha,GITHUB_ACTOR:TARGET.actor,GITHUB_TRIGGERING_ACTOR:TARGET.actor,PROTECT_DEMO_REVIEWED_SHA:sourceSha,PROTECT_DEMO_OPERATION:operation,RAILWAY_DEMO_TOKEN:binding,GH_TOKEN:value(),PROTECT_DEMO_GH_PATH:'/synthetic/gh-2.103.0',PATH:'/synthetic/bin'};
}
function memory({repoPresent=true,environmentPresent=false,environmentValue=null,versionOk=true}={}){
 const state={repoPresent,environmentPresent,environmentValue,mainSha:sourceSha,phase:'ensure',events:[],apiCalls:0,versionChecks:0,secretSetCalls:0,deletes:0,versionChildNoCredentials:true,secretOnlyOnWriterStdin:true,versionGateCode:null};
 function event(operation){state.events.push({sequence:state.events.length+1,phase:state.phase,operation,repoPresent:state.repoPresent,environmentPresent:state.environmentPresent});}
 const inventory=present=>({total_count:present?1:0,secrets:present?[{name:TARGET.secretName}]:[]});
 const api={
  async getMainRef(){state.apiCalls++;event('fresh-main-read');return{ref:'refs/heads/main',object:{sha:state.mainSha}};},
  async getCollaboratorPermission(){state.apiCalls++;event('fresh-admin-read');return{permission:'admin',user:{login:TARGET.actor}};},
  async getEnvironment(){state.apiCalls++;event('fresh-environment-read');return{id:TARGET.environmentId,name:TARGET.environmentName,deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}};},
  async getEnvironmentPolicies(){state.apiCalls++;event('fresh-policy-read');return{total_count:1,branch_policies:[{name:'main',type:'branch'}]};},
  async listRepoSecrets(page){assert.equal(page,1);state.apiCalls++;event('repository-inventory');return inventory(state.repoPresent);},
  async listEnvironmentSecrets(page){assert.equal(page,1);state.apiCalls++;event('environment-inventory');return inventory(state.environmentPresent);},
  async deleteRepoSecret(){state.apiCalls++;event('repository-delete');assert.equal(state.phase,'fresh-remove');assert.equal(state.environmentPresent,true);const phaseEvents=state.events.filter(x=>x.phase===state.phase);assert.ok(phaseEvents.some(x=>x.operation==='fresh-main-read'));assert.ok(phaseEvents.some(x=>x.operation==='fresh-environment-read'));assert.ok(phaseEvents.filter(x=>x.operation==='environment-inventory').length>=2);state.deletes++;state.repoPresent=false;},
 };
 const runnerFactory=({env})=>async request=>{
  assert.equal(request.command,'/synthetic/gh-2.103.0');
  if(request.args.length===1&&request.args[0]==='--version'){
   state.versionChecks++;event('synthetic-version-check');
   assert.ok(!Object.hasOwn(env,'GH_TOKEN')&&!Object.hasOwn(env,'RAILWAY_DEMO_TOKEN'),'Version check received a credential variable');assert.ok(request.input===undefined,'Version check received secret stdin');
   return{ok:versionOk,stdout:versionOk?`gh version ${PINNED_GH_VERSION} (synthetic runner)\n`:'',stderr:versionOk?'':'SYNTHETIC_VERSION_PROCESS_FAILURE'};
  }
  assert.deepEqual(request.args,['secret','set',TARGET.secretName,'--env',TARGET.environmentName,'--repo',TARGET.repository]);
  assert.ok(versionOk&&state.versionChecks===1,'Writer reached before version gate');assert.ok(!Object.hasOwn(env,'RAILWAY_DEMO_TOKEN'),'Writer environment received secret value variable');assert.ok(typeof env.GH_TOKEN==='string','Synthetic writer lacked bot binding');assert.ok(request.input===state.expectedBinding,'Writer stdin changed synthetic binding');
  state.secretSetCalls++;event('synthetic-environment-write');state.environmentValue=request.input;state.environmentPresent=true;return{ok:true,stdout:'',stderr:''};
 };
 const dependencies={api,writeEnvironmentSecret:async binding=>{
  try{return await writeEnvironmentSecretWithGh({secretValue:binding,env:state.activeEnv,runnerFactory});}
  catch(error){state.versionGateCode=error.code??'UNEXPECTED';throw error;}
 }};
 async function invoke(env){state.activeEnv=env;state.expectedBinding=env.RAILWAY_DEMO_TOKEN;return main(env,dependencies);}
 return{state,api,dependencies,invoke,event};
}
function snapshot(s){return{repoPresent:s.repoPresent,environmentPresent:s.environmentPresent,versionChecks:s.versionChecks,secretSetCalls:s.secretSetCalls,deletes:s.deletes,apiCalls:s.apiCalls};}
async function rejectCode(operation,code){let actual=null;try{await operation();}catch(error){actual=error.code??'UNEXPECTED_ERROR';}assert.equal(actual,code);return actual;}
const cases=[];
try{
 const f=memory();const ensureEnv=fixtureEnv();const ensured=await f.invoke(ensureEnv);assert.deepEqual(ensured,{schemaVersion:1,operation:'ensure-environment',result:'written-and-listed',writes:1});assert.equal(f.state.repoPresent,true);assert.equal(f.state.environmentPresent,true);assert.equal(f.state.deletes,0);const afterEnsure=snapshot(f.state);
 f.state.phase='stale-remove';f.state.mainSha='0'.repeat(40);const staleCode=await rejectCode(()=>f.invoke(fixtureEnv('remove-repository',value())),'FRESH_MAIN_SHA_MISMATCH');assert.equal(f.state.repoPresent,true);assert.equal(f.state.deletes,0);const afterStale=snapshot(f.state);
 f.state.phase='fresh-remove';f.state.mainSha=sourceSha;const removed=await f.invoke(fixtureEnv('remove-repository',f.state.environmentValue));assert.deepEqual(removed,{schemaVersion:1,operation:'remove-repository',result:'deleted-and-absent',deletes:1});assert.equal(f.state.environmentPresent,true);assert.equal(f.state.repoPresent,false);assert.equal(f.state.secretSetCalls,1);assert.equal(f.state.deletes,1);
 cases.push({id:'repo-only',title:'Repository copy retained until fresh verification',result:'PASS',summary:'Ensure preserves the repository copy; stale verification blocks deletion; a separate fresh invocation deletes once.',afterEnsure,staleVerificationCode:staleCode,afterStale,final:snapshot(f.state),receipts:[ensured,removed],events:f.state.events});
 const originalEnvironment=value(),existing=memory({repoPresent:true,environmentPresent:true,environmentValue:originalEnvironment});const existingEnv=fixtureEnv('ensure-environment',originalEnvironment);const existingReceipt=await existing.invoke(existingEnv);assert.deepEqual(existingReceipt,{schemaVersion:1,operation:'ensure-environment',result:'already-present',writes:0});assert.equal(existing.state.secretSetCalls,0);assert.ok(existing.state.environmentValue===originalEnvironment,'Existing environment binding was overwritten');assert.equal(existing.state.repoPresent,true);
 cases.push({id:'already-present',title:'Existing environment copy is never overwritten',result:'PASS',summary:'An existing environment binding stays intact; the repository copy is preserved.',receipt:existingReceipt,final:snapshot(existing.state),events:existing.state.events});
 const failed=memory({versionOk:false});const mainCode=await rejectCode(()=>failed.invoke(fixtureEnv()),'ENVIRONMENT_WRITE_UNCERTAIN');assert.equal(failed.state.versionGateCode,'GH_VERSION_CHECK_FAILED');assert.equal(failed.state.versionChecks,1);assert.equal(failed.state.secretSetCalls,0);assert.equal(failed.state.deletes,0);assert.equal(failed.state.repoPresent,true);assert.equal(failed.state.environmentPresent,false);
 cases.push({id:'version-failure',title:'Version-check failure stops the writer',result:'PASS',summary:'The actual writer gate reaches only a simulated credential-free version check; no secret-set command runs.',mainCode,versionGateCode:failed.state.versionGateCode,final:snapshot(failed.state),events:failed.state.events});
 const nonmain=memory();let dependencyReads=0;const guarded={get api(){dependencyReads++;return nonmain.api;},get writeEnvironmentSecret(){dependencyReads++;return nonmain.dependencies.writeEnvironmentSecret;}};const nonmainEnv=fixtureEnv();nonmainEnv.GITHUB_REF='refs/heads/synthetic-non-main';const nonmainCode=await rejectCode(()=>main(nonmainEnv,guarded),'TRUSTED_MAIN_CONTEXT_REQUIRED');assert.equal(dependencyReads,0);assert.equal(nonmain.state.apiCalls,0);assert.equal(nonmain.state.versionChecks,0);assert.equal(nonmain.state.secretSetCalls,0);assert.equal(nonmain.state.deletes,0);
 cases.push({id:'non-main',title:'Non-main context is rejected before API access',result:'PASS',summary:'Context validation refuses the request before reading API dependencies or invoking a process.',mainCode:nonmainCode,apiDependencyReads:dependencyReads,final:snapshot(nonmain.state),events:nonmain.state.events});
 const results={schemaVersion:1,scope:'SYNTHETIC_HELPER_QA_NO_MIGRATION',sourceSha,sourcePath:modulePath,sourceSha256:sourceHash,pinnedGhVersion:PINNED_GH_VERSION,generatedAt:new Date().toISOString(),realGitHubApiCalls:0,realWriterProcesses:0,browser:'UNRUN',cases};
 const serialized=JSON.stringify(results,null,2)+'\n';assert.ok(ephemeralValues.every(v=>!serialized.includes(v)),'A synthetic credential value reached report output');
 await fs.writeFile(out+'helper-outcomes.json',serialized);
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const facts=[
  [['After ensure','Repository retained',String(cases[0].afterEnsure.repoPresent)],['Stale verification',cases[0].staleVerificationCode,'blocked'],['Final repository','Absent after fresh verification',String(cases[0].final.repoPresent)],['Environment writes / repo deletes',`${cases[0].final.secretSetCalls} / ${cases[0].final.deletes}`,'1 / 1']],
  [['Result',cases[1].receipt.result,'already-present'],['Environment writes',String(cases[1].final.secretSetCalls),'0'],['Repository retained',String(cases[1].final.repoPresent),'true']],
  [['Version checks',String(cases[2].final.versionChecks),'1'],['Secret-set commands',String(cases[2].final.secretSetCalls),'0'],['Version gate',cases[2].versionGateCode,'GH_VERSION_CHECK_FAILED'],['Repository retained',String(cases[2].final.repoPresent),'true']],
  [['API dependency reads',String(cases[3].apiDependencyReads),'0'],['API calls',String(cases[3].final.apiCalls),'0'],['Context error',cases[3].mainCode,'TRUSTED_MAIN_CONTEXT_REQUIRED'],['Secret-set commands',String(cases[3].final.secretSetCalls),'0']],
 ];
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; base-uri 'none'"><title>Synthetic helper QA · #499</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#182b43;font:16px/1.5 system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:40px 32px}header{margin-bottom:24px}.eyebrow{font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#34516f;font-size:13px}h1{font-size:34px;line-height:1.2;margin:8px 0 12px}p{margin:8px 0}.notice{border:1px solid #b6c7dc;background:#eaf1fa;border-radius:12px;padding:14px 18px;color:#243f60}.binding{font-size:13px;color:#4c617b;word-break:break-all}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{background:white;border:1px solid #d6dfeb;border-radius:16px;padding:22px;box-shadow:0 3px 12px #17335508}.card h2{font-size:19px;line-height:1.35;margin:0 0 10px}.card p{font-size:14px;color:#4c617b;min-height:42px}.head{display:flex;gap:14px;justify-content:space-between;align-items:flex-start}.pass{font-size:12px;font-weight:800;color:#145e44;background:#e2f4ec;padding:5px 10px;border-radius:20px}.facts{display:grid;grid-template-columns:1fr 1fr;margin-top:16px;gap:10px}.fact{background:#f5f8fc;border:1px solid #e2e9f2;padding:10px 12px;border-radius:9px;overflow-wrap:anywhere}.fact dt{font-size:12px;color:#526b86}.fact dd{margin:4px 0 0;font-size:14px;font-weight:700}details{margin-top:14px;font-size:13px;color:#36516e}pre{white-space:pre-wrap;font-size:11px}footer{margin-top:24px;font-size:13px;color:#526b86}@media(max-width:800px){.grid{grid-template-columns:1fr}main{padding:24px 16px}}</style><main data-qa-source="${sourceSha}"><header><div class="eyebrow">Independent QA · internal helper · issue #499</div><h1>Synthetic helper QA</h1><p class="notice" data-synthetic-notice><strong>No migration performed.</strong> Results below come from actual <code>main(env, dependencies)</code> execution with in-memory APIs and a fake command runner. No GitHub requests or writer processes ran.</p><p class="binding" data-source-binding>Source ${sourceSha} · pinned CLI ${PINNED_GH_VERSION} · 4 asserted scenarios</p></header><div class="grid">${cases.map((c,i)=>`<section class="card" data-case="${c.id}"><div class="head"><h2>${esc(c.title)}</h2><span class="pass" data-result>${c.result}</span></div><p>${esc(c.summary)}</p><dl class="facts">${facts[i].map(([label,text,raw],n)=>`<div class="fact"><dt>${esc(label)}</dt><dd data-fact="${n}" data-value="${esc(raw)}">${esc(text)}</dd></div>`).join('')}</dl><details><summary>Actual synthetic execution metadata</summary><pre>${esc(JSON.stringify(c,null,2))}</pre></details></section>`).join('')}</div><footer><p><strong>Evidence scope:</strong> metadata and counts only. Values, value hashes and fingerprints are excluded. This page is a QA artifact, not a product screen or proof of a live secret migration.</p><p data-browser-status>Browser capture: UNRUN — pending root reservation and serialized runtime grant.</p></footer></main></html>`;
 assert.ok(ephemeralValues.every(v=>!html.includes(v)),'A synthetic credential value reached HTML');await fs.writeFile(out+'helper-qa.html',html+'\n');
 await fs.writeFile(out+'generation-receipt.json',JSON.stringify({status:'PREPARATION_HELPER_EXECUTION_PASS',sourceSha,sourceSha256:sourceHash,actualHelperMainInvocations:6,assertedScenarios:cases.length,realGitHubApiCalls:0,realWriterProcesses:0,nativeTestSuitesRun:0,browser:'UNRUN',outcomeSha256:createHash('sha256').update(serialized).digest('hex'),htmlSha256:createHash('sha256').update(html+'\n').digest('hex')},null,2)+'\n');
 console.log(JSON.stringify({status:'PREPARATION_HELPER_EXECUTION_PASS',sourceSha,assertedScenarios:cases.length,browser:'UNRUN',realGitHubApiCalls:0,realWriterProcesses:0}));
}catch(error){await fs.writeFile(out+'preparation-failure.json',JSON.stringify({code:typeof error.code==='string'?error.code:'QA_PREPARATION_ASSERTION_FAILED',message:'Synthetic helper QA preparation failed; inspect harness without exposing fixture values.'},null,2)+'\n');throw Error('QA_PREPARATION_FAILED');}
finally{globalThis.fetch=originalFetch;}
