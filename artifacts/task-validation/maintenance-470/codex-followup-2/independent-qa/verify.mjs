import {createRunner,childEnvironment} from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const own='/workspace/.clinicos-cloud/maintenance470-sparse6-independent-qa-20261018',repo='/workspace/ClinicOS/agent-team/.worktrees/maintenance-470',sha='a9377cf2f2e66e42de246a604ce902496e4358da';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await fs.readFile(repo+'/artifacts/task-validation/maintenance-470/codex-followup-1/prior-present-proof-manifest.json'));
async function proof(){let bytes=0;for(const [p,h]of Object.entries(manifest)){let b=await fs.readFile(repo+'/'+p);assert.equal(digest(b),h,p);bytes+=b.length;}return {files:Object.keys(manifest).length,bytes,manifestSha:digest(await fs.readFile(repo+'/artifacts/task-validation/maintenance-470/codex-followup-1/prior-present-proof-manifest.json'))};}
await fs.writeFile(own+'/proof-before.json',JSON.stringify(await proof(),null,2));
const paths=['.github/workflows/deploy-backend.yml','scripts/maintenance/demo-storage-inspect.test.mjs','scripts/maintenance/demo-storage-inspect.mjs','scripts/maintenance/demo-storage-backups.mjs','scripts/maintenance/demo-patient-inventory.mjs'];const inputs={};for(const p of paths)inputs[p]=digest(await fs.readFile(repo+'/'+p));await fs.writeFile(own+'/source-before.json',JSON.stringify(inputs,null,2));
assert.equal(inputs[paths[2]],'ef67dc97b06c9bc7e7d9157240dbb71f913eb216e28ff0a28c00bce5e5d29429');
const run=createRunner({env:{PATH:'/usr/local/bin:/usr/bin:/bin'},runtimeRoot:own+'/runtime'});
await fs.writeFile(own+'/environment.json',JSON.stringify({input:['PATH'],mode:'verification',names:Object.keys(childEnvironment('verification',{PATH:'/usr/local/bin:/usr/bin:/bin'},own+'/runtime'))}));
async function cmd(name,command,args,cwd=repo){const invocation={command,args,cwd,envMode:'verification',timeoutMs:60000};let r=await run(invocation);await fs.writeFile(own+'/'+name+'.json',JSON.stringify({invocation,...r},null,2));assert.equal(r.code,0,name);assert.equal(r.ok,true,name);return r;}
assert.equal((await cmd('head','git',['rev-parse','HEAD'])).stdout.trim(),sha);
await cmd('diff-check','git',['diff','--check']);
await cmd('source-diff','git',['diff','5babff63c52ef8935a9eccf654efe3aabe770a98',sha,'--',...paths]);
const full=await cmd('full-tests',process.execPath,['--test',paths[1]]);
const sparse=own+'/sparse';await cmd('clone','git',['clone','--local','--shared','--no-checkout',repo,sparse],own);await cmd('sparse-set','git',['sparse-checkout','set','--cone','scripts/maintenance','.github/workflows'],sparse);await cmd('checkout','git',['checkout','--detach',sha],sparse);
assert.equal((await cmd('sparse-head','git',['rev-parse','HEAD'],sparse)).stdout.trim(),sha);assert.equal((await cmd('sparse-status','git',['status','--porcelain'],sparse)).stdout.trim(),'');
for(const p of paths)assert.equal(digest(await fs.readFile(sparse+'/'+p)),inputs[p]);for(const p of ['frontend','backend','artifacts/task-validation'])await assert.rejects(fs.access(sparse+'/'+p));
await fs.writeFile(own+'/sparse-patterns.txt',await fs.readFile(sparse+'/.git/info/sparse-checkout'));
const sp=await cmd('sparse-tests',process.execPath,['--test',paths[1]],sparse);
for(const [name,r]of [['full',full],['sparse',sp]]){assert.match(r.stdout,/# tests 115/);assert.match(r.stdout,/# pass 115/);assert.match(r.stdout,/# fail 0/);}
console.log('Full115 and exact committed cone sparse115 PASS');
