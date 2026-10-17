import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,sha,mergeSha} from '../independent-qa-cycle-2/publication-race-fixture.mjs';
import {createGitHub} from '../../../../agent-team/src/bug-pipeline/github.mjs';
import {releaseBatch,recordDeployment} from '../../../../agent-team/src/bug-pipeline/release.mjs';
const repo='l2v-hub/ClinicOS',railwayRunUrl=`https://github.com/${repo}/actions/runs/123`;
function addIssue(b){b.issues.push(6);b.plan.issues.push(6);b.plan.acceptance.push({issue:6,criteria:['Unreviewed source issue']});b.plan.evidence.push({issue:6,screenshot:'artifacts/task-validation/bug-batch-5/evidence/issue-6.png',trace:'artifacts/task-validation/bug-batch-5/evidence/issue-6.zip',video:''});}
function adapter(requests){return createGitHub({repo,cwd:'/tmp',run:async({args,input})=>{requests.push({args,body:input?JSON.parse(input):null});const value=args[0]==='api'&&args[1]===`repos/${repo}/pulls/10`?{state:'closed',merged:true,merge_commit_sha:mergeSha,html_url:`https://github.com/${repo}/pull/10`,base:{ref:'release'}}:{};return {ok:true,code:0,stdout:JSON.stringify(value),stderr:''};}});}
test('actual gh merge adapter cannot merge changed PR10 targeting another base after validating PR9/main',async()=>{
 const f=fixture(['backend/src/example.ts']),requests=[],real=adapter(requests);let calls=0;
 f.github.verifyDemoPreflight=async()=>{if(++calls===2)f.state.batches[0].pr={number:10,url:`https://github.com/${repo}/pull/10`};};
 f.github.mergePullRequest=real.mergePullRequest;
 let result,error;try{result=await releaseBatch({repo,github:f.github,store:f.store,batchId:f.batch.id,reviewedSha:sha,execute:true,configured:{botToken:true,railway:true}});}catch(e){error=e.message;}
 console.log(JSON.stringify({scenario:'actual-premerge-pr',verifiedPr:9,verifiedBase:'main',unverifiedPr:10,unverifiedBase:'release',requests,result,error}));
 assert.equal(requests.some(r=>r.args[0]==='pr'&&r.args[1]==='merge'),false);
});
for(const kind of ['pr','source-issue'])test(`actual issue adapter cannot close after record proof await changes ${kind}`,async()=>{
 const f=fixture(['backend/src/example.ts']),requests=[],real=adapter(requests);let checks=0;
 f.batch.release={status:'merged',reviewedSha:sha,mergeSha,prNumber:9};
 f.github.verifyDemoRelease=async()=>{if(++checks===1){if(kind==='pr')f.state.batches[0].pr={number:10,url:`https://github.com/${repo}/pull/10`};else addIssue(f.state.batches[0]);}return {receipt:{mergeSha},reviewedSha:sha,runUrl:railwayRunUrl,artifactDigest:`sha256:${'7'.repeat(64)}`,receiptSha256:'8'.repeat(64)};};
 Object.assign(f.github,{commentIssue:real.commentIssue,setIssueStatus:real.setIssueStatus});
 let result,error;try{result=await recordDeployment({repo,github:f.github,store:f.store,batchId:f.batch.id,mergeSha,railwayRunUrl});}catch(e){error=e.message;}
 const closed=requests.filter(r=>r.args.includes('PATCH')).map(r=>({route:r.args[1],body:r.body}));
 console.log(JSON.stringify({scenario:`actual-record-${kind}`,verifiedSourceIssues:[5],durableSourceIssues:f.getSaved().batches[0].issues,closed,result,error}));
 assert.deepEqual(closed,[]);
});
