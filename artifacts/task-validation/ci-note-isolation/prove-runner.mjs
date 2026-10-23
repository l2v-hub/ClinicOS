import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const packet=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(packet,'../../..');
const candidate=path.join(root,'scripts/run-node-tests.mjs');
const baseline=path.join(packet,'baseline/run-node-tests.mjs');
const fixtureRoot=mkdtempSync(path.join(tmpdir(),'clinicos-ci-notes-proof-'));
const writer=`import {test} from 'node:test';import{writeFileSync,existsSync}from'node:fs';import{setTimeout as delay}from'node:timers/promises';test('synthetic shared broadcast writer finishes',{timeout:6500},async()=>{writeFileSync('writer.started','yes');const until=Date.now()+5000;while(!existsSync('reader.started')&&Date.now()<until)await delay(10);writeFileSync('writer.finished','yes');});`;
const reader=`import{test}from'node:test';import assert from'node:assert/strict';import{writeFileSync,existsSync}from'node:fs';import{setTimeout as delay}from'node:timers/promises';test('global mailbox assertion waits for concurrent writers',{timeout:6500},async()=>{const until=Date.now()+5000;while(!existsSync('writer.started')&&Date.now()<until)await delay(10);const writerFinished=existsSync('writer.finished');writeFileSync('reader.started','yes');assert.equal(writerFinished,true,'global assertions must follow completed shared-state writers');});`;
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:fixtureRoot,CI:'true',NODE_ENV:'test'};
function invoke(script,name,failExpected){
 const cwd=path.join(fixtureRoot,name,'backend');mkdirSync(path.join(cwd,'src/routes/__tests__'),{recursive:true});symlinkSync('/workspace/ClinicOS/node_modules',path.join(cwd,'node_modules'),'dir');
 writeFileSync(path.join(cwd,'src/writer.test.ts'),writer);writeFileSync(path.join(cwd,'src/routes/__tests__/notes-privacy.test.ts'),reader);
 const r=spawnSync(process.execPath,[script],{cwd,env,encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
 writeFileSync(path.join(packet,'test-results',name+'.log'),r.stdout+r.stderr);
 assert.equal(r.error,undefined,'Actual runner must terminate without external kill');
 const counts=[...r.stdout.matchAll(/^(?:#|ℹ) tests (\d+)$/gm)].reduce((sum,m)=>sum+Number(m[1]),0);
 assert.equal(counts,2,'Both actual fixture tests must execute');assert.equal(r.status,failExpected?1:0,'Preserve expected underlying test exit');
 return {name,exit:r.status,executedTests:counts,writerFinished:readFileSync(path.join(cwd,'writer.finished'),'utf8')==='yes',readerRan:readFileSync(path.join(cwd,'reader.started'),'utf8')==='yes',isolationPhase:r.stdout.includes('isolated pass for 1 global-database suite(s)')};
}
let proof;
try{
 const results=[invoke(baseline,'original-red',true),invoke(candidate,'candidate-green',false)];
 assert.equal(results[0].isolationPhase,false);assert.equal(results[1].isolationPhase,true);
 proof={actualProductionRunner:true,unchangedFixtureTestBodies:true,realChildProcesses:true,syntheticFilesystemSharedStateOnly:true,networkOrDatabaseAccess:false,results,cleanupCompleted:false};
}finally{rmSync(fixtureRoot,{recursive:true,force:true});}
proof.cleanupCompleted=!existsSync(fixtureRoot);assert.equal(proof.cleanupCompleted,true);
writeFileSync(path.join(packet,'test-results/actual-scheduling-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
