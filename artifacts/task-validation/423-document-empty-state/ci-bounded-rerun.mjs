import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/423-document-empty-state',run=38018242472;
const app=JSON.parse(readFileSync(root+'/frozen-source.json')).applicationCommit;
const configured=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
function gh(args){const r=spawnSync('gh',args,{encoding:'utf8',maxBuffer:30e6,windowsHide:true,env:{...process.env,GH_TOKEN:configured.GITHUB_TOKEN||configured.GH_TOKEN}});assert.equal(r.status,0,'Bounded diagnostic CI operation failed safely');return r.stdout;}
assert.equal(existsSync(root+'/ci-rerun-receipt.json'),false,'Never automatically repeat a diagnostic rerun');
const current=JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/actions/runs/'+run]));
assert.equal(current.head_sha,app);assert.equal(current.status,'completed');assert.equal(current.conclusion,'failure');assert.equal(current.run_attempt,1);
const diff=spawnSync('git',['diff','--name-only','3cd984a5a40f1fe5cdc368dbcc4bb629bd6d1510',app,'--','backend','prisma','scripts','package.json','package-lock.json','.github','railway.toml'],{encoding:'utf8',windowsHide:true});assert.equal(diff.status,0);assert.equal(diff.stdout.trim(),'');
const initial=JSON.parse(readFileSync(root+'/ci-unexpected-failures.json'));assert.equal(initial.receipts[0].run,run);assert.equal(initial.receipts[0].failureBlocks.length,7);
const policy={decision:'AUTHORIZED ONE BOUNDED EXACT-SOURCE FAILED-JOB DIAGNOSTIC RERUN',authority:'Direct human-authorized QA continuation, root after independent read-only diagnosis; no changed workflow/env/test/DB credentials',applicationCommit:app,run,initialAttempt:1,maximumNewAttempts:1,initialFailures:7,reason:'Shared public-schema synthetic suites race actor-wide unread counts; failed scope assertion leaves registered_by_me active and causes two later404. Application backend, runner, dependencies, migrations and workflow identical to accepted3cd.',independentReviewer:'bug423_release_helper_review',acceptance:'No waiver: final native workflows must either succeed or match the exact single existing accepted therapy failure/stage; preserve initial failures and disclose harness flakiness',productionPatientTestMutations:0,at:new Date().toISOString()};
writeFileSync(root+'/ci-rerun-policy.json',JSON.stringify(policy,null,2));
gh(['run','rerun',String(run),'--repo','l2v-hub/ClinicOS','--failed']);
writeFileSync(root+'/ci-rerun-receipt.json',JSON.stringify({applicationCommit:app,run,requestedAttempt:2,decision:'ONE DIAGNOSTIC RERUN REQUESTED, NOT A TEST VERDICT',initialFailuresPreserved:'ci-unexpected-failures.json',at:new Date().toISOString()},null,2));
console.log('One source-identical diagnostic rerun requested; no automatic further retries');
