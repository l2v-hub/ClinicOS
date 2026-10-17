import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createStandaloneReview} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/standalone-review.mjs';
import {createGitHub} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/github.mjs';
import {createRunner} from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
const cwd='/workspace/clinicos-standalone-pr-review', repo='l2v-hub/ClinicOS';
const rawRun=createRunner({env:process.env,runtimeRoot:'/workspace/.clinicos-cloud/qa4-standalone-live-readonly'});
let reads=0;
const run=async(q)=>{assert.equal(q.command,'gh');assert(!q.args.includes('-X'),'No write methods');assert(!q.args.includes('--input'),'No writes');assert(['api','pr'].includes(q.args[0]));if(q.args[0]==='pr')assert.equal(q.args[1],'checks');reads++;return rawRun(q);};
const gh=createGitHub({cwd,repo,run}),controller=createStandaloneReview({github:gh,run,cwd});
const results=[];
for(const pr of [393,491]){const m=JSON.parse(await fs.readFile(`/workspace/.clinicos-cloud/standalone-${pr}-adopt.json`,'utf8'));const s={...m,kind:'standalone-pr-review',id:`standalone-pr-${pr}`,phase:'waiting-review',adoption:{actor:'l2v-hub',at:new Date().toISOString(),manifestSha256:createHash('sha256').update(JSON.stringify(m)).digest('hex')}};await controller.verify(s);const checks=await controller.checks(pr);results.push({pr,sha:m.sha,actualGitHubReadOnlyVerification:'PASS',packetFiles:Object.keys(m.packet.files).length,requiredAndCurrentChecks:checks.ok,realAdoptionPerformed:false});console.log(JSON.stringify(results.at(-1)));}
await fs.writeFile('/workspace/clinicos-standalone-pr-review/artifacts/task-validation/standalone-pr-review-adapter/independent-qa4/test-results/live-readonly-receipt.json',JSON.stringify({at:new Date().toISOString(),reads,results,writes:0,modelCalls:0,providerCalls:0},null,2)+'\n');
