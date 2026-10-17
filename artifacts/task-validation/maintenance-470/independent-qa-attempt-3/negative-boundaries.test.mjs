import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync, mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {storageFixture} from './storage-fixture.mjs';
import {runStorageMaintenance,inspectStorageBinding} from '../../../../scripts/maintenance/demo-storage-backups.mjs';
import {verifyOnlineDemo} from '../../../../scripts/maintenance/demo-online-empty-browser.mjs';
const qaDirectory=import.meta.dirname;
const outcomes=[];
const env={RAILWAY_TOKEN:'synthetic-only',GITHUB_REF_NAME:'codex/demo-470-completion'};
async function scenario({sshOutput,kind='stale-ready',erase=true}={}){
  const fixture=storageFixture();const calls=[];
  const native=async(query,variables,options)=>{
    calls.push({phase:'native',name:query.includes('deploymentRestart')?'restart':query.includes('volumeInstanceBackupList')?'backups':'metadata'});
    if(query.includes('volumeInstanceBackupList'))return {volumeInstanceBackupList:[]};
    if(query.includes('deploymentRestart'))return {deploymentRestart:true};
    return fixture.native(query,variables,options);
  };
  const call=(args,options)=>{
    if(args[0]==='ssh'){
      calls.push({phase:'ssh'});
      if(kind==='ssh-error')throw new Error('SYNTHETIC_SECRET_MUST_NOT_LEAK');
      return sshOutput??'CLINICOS_DEMO_SOURCES '+JSON.stringify({sourceDirectoryVerified:true,eraseRequested:erase,before:{files:0,directories:0,bytes:0},after:{files:0,directories:0,bytes:0},empty:true});
    }
    return fixture.call(args,options);
  };
  const report=await runStorageMaintenance({env,call,native,erase,now:()=>0,wait:async()=>{},fetchImpl:async()=>{calls.push({phase:'http',status:200,body:'old-process-ready'});return {status:200};}});
  return {report,calls};
}
test('REPRO: old process health200 plus restart acknowledgements falsely claims fresh cleared runtime caches',async()=>{
  const actual=await scenario();
  assert.equal(actual.report.sourceStorageVerified,true,'Reproduces defect rather than accepting the candidate');
  assert.equal(actual.calls.filter(c=>c.name==='restart').length,2);
  assert.equal(actual.calls.filter(c=>c.phase==='ssh').length,1,'No fresh postrestart source inspection');
  const lastMetadata=actual.calls.findLastIndex(c=>c.name==='metadata');
  const firstRestart=actual.calls.findIndex(c=>c.name==='restart');
  assert.ok(lastMetadata<firstRestart,'No postrestart native identity convergence check');
  outcomes.push({name:'Old process remains ready after restart ACK',expected:'sourceStorageVerified=false',observed:'sourceStorageVerified=true',finding:'F1',calls:actual.calls});
});
test('missing or inconsistent source marker never claims filesystem empty',async()=>{
  for(const sshOutput of ['', 'CLINICOS_DEMO_SOURCES {}','CLINICOS_DEMO_SOURCES '+JSON.stringify({sourceDirectoryVerified:true,eraseRequested:true,before:{files:1,directories:0,bytes:1},after:{files:1,directories:0,bytes:1},empty:true})]){
    const r=await scenario({sshOutput});assert.equal(r.report.sourceStorageVerified,false);assert.equal(r.report.sourceStorageBlocked,true);assert.equal(r.calls.filter(c=>c.name==='restart').length,0);
  }
  outcomes.push({name:'Missing/forged source emptiness refused',observed:'3 negative cases rejected'});
});
test('unexpected SSH errors expose only sanitized allowlist blocker',async()=>{
  const r=await scenario({kind:'ssh-error'});assert.equal(r.report.sourceStorageVerified,false);assert.equal(JSON.stringify(r.report).includes('SECRET'),false);assert.equal(r.report.sourceStorageBlocker,'DEMO_FILESYSTEM_OR_CACHE_ACCESS_UNVERIFIED');outcomes.push({name:'SSH raw sensitive errors sanitized',observed:'PASS'});
});
test('duplicate backend/runtime ambiguity is rejected before mutations',async()=>{
  const f=storageFixture();await assert.rejects(inspectStorageBinding(f.call,async(...args)=>{const r=await f.native(...args);if(r.environment){const node=r.environment.serviceInstances.edges[0].node;node.activeDeployments.push({id:'other'});}return r;}),/AMBIGUOUS_ACTIVE_DEPLOYMENT/);outcomes.push({name:'Multiple active deployments refused',observed:'PASS'});
});
test('wrong-context cannot invoke any target mutation',async()=>{
  let calls=0;await assert.rejects(runStorageMaintenance({env:{...env,GITHUB_REF_NAME:'main'},erase:true,call:()=>{calls++},native:()=>{calls++}}),/STORAGE_MAINTENANCE_CONTEXT_REQUIRED/);assert.equal(calls,0);outcomes.push({name:'Main branch rejected before metadata or mutation',observed:'PASS'});
});
test('online verifier rejects wrong auth mode before launching browser and sanitizes outcome',async()=>{
  let launch=0;const r=await verifyOnlineDemo({outputDirectory:qaDirectory+'/online-negative',chromium:{launch:async()=>{launch++;throw Error('should not launch')}},fetchImpl:async()=>({status:200,json:async()=>({mode:'production',simulator:true})})});assert.equal(launch,0);assert.equal(r.status,'failed');assert.equal(r.sessionRevoked,false);outcomes.push({name:'Wrong online auth mode rejected',observed:'PASS'});
});
test('REPRO: unrelated database-service volume mount accepted as verified database backup target',async()=>{
  const f=storageFixture();
  const binding=await inspectStorageBinding(f.call,async(...args)=>{const r=await f.native(...args);if(r.environment)r.environment.volumeInstances.edges[0].node.mountPath='/unrelated-not-postgres';return r;});
  assert.equal(binding.volume.mountPath,'/unrelated-not-postgres');
  outcomes.push({name:'Unrelated database-service volume mount accepted',expected:'Unverified database volume must be rejected',observed:'inspectStorageBinding returns verified binding',finding:'F2'});
});
test('REPRO: hard killed online verifier leaves pre-emptiness video in unconditional upload directory',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'clinicos-qa470-kill-'));
  const script=`import fs from 'node:fs/promises';import {join}from'node:path';import{verifyOnlineDemo}from${JSON.stringify(new URL('../../../../scripts/maintenance/demo-online-empty-browser.mjs',import.meta.url).href)};await verifyOnlineDemo({outputDirectory:${JSON.stringify(directory)},fetchImpl:async(url)=>({status:200,json:async()=>url.endsWith('/auth/status')?{mode:'demo',simulator:true}:{identities:[{id:'SIM-ADMIN',name:'Synthetic Admin'}]}}),chromium:{launch:async()=>({newContext:async(options)=>{await fs.mkdir(options.recordVideo.dir,{recursive:true});await fs.writeFile(join(options.recordVideo.dir,'synthetic-partial.webm'),'SYNTHETIC-SENSITIVE-PRECHECK-MEDIA');console.log('staged');return{newPage:async()=>await new Promise(()=>{})};}})}});await new Promise(()=>{});`;
  const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',x=>stderr+=x);
  try{
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('child not staged: '+stderr)),5000);child.stdout.on('data',x=>{if(String(x).includes('staged')){clearTimeout(timeout);resolve();}});child.on('exit',()=>{clearTimeout(timeout);reject(Error('child early exit: '+stderr));});});
    child.kill('SIGKILL');await new Promise(done=>child.once('exit',done));
    assert.equal(existsSync(join(directory,'video/synthetic-partial.webm')),true);
    assert.equal(existsSync(join(directory,'online-result.json')),false);
    outcomes.push({name:'Abrupt kill before proving emptiness',expected:'No media in unconditional artifact directory',observed:'Partial precheck video survives; no result verdict exists',finding:'F3'});
  }finally{child.kill('SIGKILL');rmSync(directory,{recursive:true,force:true});}
});
test.after(()=>writeFileSync(qaDirectory+'/negative-outcomes.json',JSON.stringify({synthetic:true,liveOperations:0,outcomes},null,2)));
