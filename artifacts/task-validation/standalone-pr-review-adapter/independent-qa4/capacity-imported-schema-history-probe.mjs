// Independently test whether new global8MiB cap can strand an already accepted comment.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {fixture,report,repo} from './fixture.mjs';
import {createGitHub,MAX_DURABLE_STATE_BYTES} from '../../../../agent-team/src/bug-pipeline/github.mjs';
import {createStandaloneReview,validateStandaloneState} from '../../../../agent-team/src/bug-pipeline/standalone-review.mjs';
const f=fixture();await f.controller.adopt(f.manifest);
const state=structuredClone(f.remote()),base=state.standaloneReviews[0];
const sha256=s=>createHash('sha256').update(s).digest('hex');
for(let pr=82;pr<105;pr++){const s=structuredClone(base);s.pr={number:pr,url:`https://github.com/${repo}/pull/${pr}`};s.id=`standalone-pr-${pr}`;s.branch=`synthetic/pr-${pr}`;s.reviewLedger={schema_version:1,max_rounds:4,rounds:[]};s.reviewReports={};for(let round=1;round<=4;round++){const content=JSON.stringify({...report(),summary:'Reviewed synthetic frozen source. '+ 'x'.repeat(88000)});s.reviews.push({round,status:'approved',subjectSha:s.sha});s.reviewLedger.rounds.push({round,verdict:'approved',subject_sha:s.sha,review_sha256:sha256(content)});s.reviewReports[`claude-review-${round}.json`]=content;}state.standaloneReviews.push(s);}
const bytes=s=>Buffer.from(JSON.stringify(s,null,2)+'\n');
const target=MAX_DURABLE_STATE_BYTES-30000;
let missing=target-bytes(state).length;assert.ok(missing>0);for(const s of state.standaloneReviews.slice(1)){for(let round=1;round<=4&&missing>0;round++){const name=`claude-review-${round}.json`,r=JSON.parse(s.reviewReports[name]);const add=Math.min(missing,99000-r.summary.length);r.summary+='x'.repeat(add);s.reviewReports[name]=JSON.stringify(r);s.reviewLedger.rounds[round-1].review_sha256=sha256(s.reviewReports[name]);missing-=add;}}
assert.equal(bytes(state).length,target);validateStandaloneState(state);
let remote=bytes(state),oid=createHash('sha1').update(`blob ${remote.length}\0`).update(remote).digest('hex'),writes=0;
const transport=createGitHub({cwd:'/tmp',repo,run:async call=>{const e=call.args[1];let value;if(call.args.includes('PUT')){const body=JSON.parse(call.input);assert.equal(body.sha,oid);remote=Buffer.from(body.content,'base64');oid=createHash('sha1').update(`blob ${remote.length}\0`).update(remote).digest('hex');writes++;value={content:{sha:oid}};}else if(e.includes('/git/ref/'))value={object:{sha:'1'.repeat(40)}};else if(e.includes('/contents/'))value={type:'file',sha:oid,size:remote.length,encoding:'none',content:''};else if(e.includes('/git/blobs/'))value={sha:oid,size:remote.length,encoding:'base64',content:remote.toString('base64')};else assert.fail(e);return{ok:true,stdout:JSON.stringify(value)};}});
const github={...f.github,createStateStore:transport.createStateStore};
const controller=createStandaloneReview({github,run:f.run,cwd:'/trusted'});
await controller.request(81);const writesBefore=writes;
await assert.rejects(controller.claim(81),error=>error.code==='state-capacity-exhausted');
assert.equal(writes,writesBefore);const current=JSON.parse(remote).standaloneReviews[0];assert.equal(current.reviews.length,0);assert.equal(current.externalReview.status,'comment-requested');
await assert.rejects(controller.submit(81,{...report(),summary:'No accepted claim means no review'}),/owned review/);
const result={result:'PASS_PREINFERENCE_CAPACITY_REFUSAL',subjects:state.standaloneReviews.length,initialStateBytes:target,maximumStateBytes:MAX_DURABLE_STATE_BYTES,priorReportCount:92,reasonPadding:false,validState:true,durableRoundsConsumed:0,resultComments:0,actualGitHubWrites:0,actualModels:0,syntheticStateWrites:writes};
await writeFile(new URL('./test-results/capacity-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
