import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/425-chart-scroll',app='b7ae14d120c1e70ccf72784206a505f8c48f975e',branch='codex/bug-425-chart-scroll',sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:100e6});assert.equal(r.status,0,'Protected proof operation failed safely');return r.stdout.trim();};
const manifest=JSON.parse(readFileSync(root+'/publication-manifest.json'));assert.equal(manifest.applicationCommit,app);assert.equal(manifest.originalIndependentManifestFrozen,true);assert.equal(git(['branch','--show-current']),branch);
assert.match(git(['ls-remote','origin','refs/heads/main']),new RegExp('^'+app+'\\s'));
const staged=git(['diff','--cached','--name-only']).split('\n').filter(Boolean);assert.ok(staged.length);assert.ok(staged.every(p=>p.startsWith(root+'/')));
for(const row of manifest.files){const r=spawnSync('git',['show',':'+row.path],{maxBuffer:100e6});assert.equal(r.status,0);assert.equal(sha(r.stdout),row.gitBlobSha256);}
const online=JSON.parse(readFileSync(root+'/compiled-online/online-receipt.json'));assert.equal(online.cases,16);assert.equal(online.applicationCommit,app);
const parentProof=git(['rev-parse','HEAD']),remote=git(['ls-remote','origin','refs/heads/'+branch]);assert.ok(remote.startsWith(parentProof+'\t')||(parentProof===app&&remote===''));
const policy={decision:'AUTHORIZED SOURCE-BOUND SYNTHETIC EVIDENCE COMMIT/PUSH',authority:'Direct human authorization; source/QA/root/compiled/deployment verified; this action alone does not close issue',applicationCommit:app,parentProof,branch,scope:root,canonicalFiles:manifest.files.length,secretChecks:manifest.secretChecks,zipMembers:manifest.zipEntriesChecked,productionPatientTestMutations:0,at:new Date().toISOString()};
const policyPath=root+'/proof-push-policy-'+parentProof.slice(0,12)+'.json',policyBytes=Buffer.from(JSON.stringify(policy,null,2));
const configured=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
let boundedChecks=0;for(const [key,value]of Object.entries(configured))if(/TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|CONNECTION_STRING|DATABASE_URL/.test(key)&&typeof value==='string'&&value.length>=8){assert.equal(policyBytes.toString('utf8').includes(value),false,'Bounded policy credential detected; no value emitted');boundedChecks++;}
writeFileSync(policyPath,policyBytes);git(['add','-f','--',policyPath]);const raw=spawnSync('git',['show',':'+policyPath],{maxBuffer:100e6});assert.equal(raw.status,0);assert.equal(sha(raw.stdout),sha(policyBytes));manifest.files.push({path:policyPath,sha256:sha(policyBytes),gitBlobSha256:sha(raw.stdout),exportNormalization:'none'});manifest.secretChecks+=boundedChecks;
writeFileSync(root+'/publication-manifest.json',JSON.stringify(manifest,null,2));git(['add','-f','--',root+'/publication-manifest.json']);git(['commit','-m','test(chart): publish source-bound issue 425 validation evidence']);const proof=git(['rev-parse','HEAD']);assert.ok(git(['diff','--name-only',app,proof]).split('\n').every(p=>p.startsWith(root+'/')));git(['push','origin','HEAD:refs/heads/'+branch]);assert.match(git(['ls-remote','origin','refs/heads/'+branch]),new RegExp('^'+proof+'\\s'));console.log(JSON.stringify({applicationCommit:app,proofCommit:proof,branch,decision:'PROOF BRANCH VERIFIED; ISSUE CLOSURE SEPARATELY GATED'}));
