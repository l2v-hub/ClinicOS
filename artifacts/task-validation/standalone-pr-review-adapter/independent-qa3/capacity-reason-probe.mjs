// Independently test whether new global8MiB cap can strand an already accepted comment.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {fixture,report,repo} from './fixture.mjs';
import {createGitHub,MAX_DURABLE_STATE_BYTES} from '../../../../agent-team/src/bug-pipeline/github.mjs';
import {createStandaloneReview,validateStandaloneState} from '../../../../agent-team/src/bug-pipeline/standalone-review.mjs';
const f=fixture();await f.controller.adopt(f.manifest);
const state=structuredClone(f.remote()),base=state.standaloneReviews[0];
for(let pr=82;pr<172;pr++){const s=structuredClone(base);s.pr={number:pr,url:`https://github.com/${repo}/pull/${pr}`};s.id=`standalone-pr-${pr}`;s.branch=`synthetic/pr-${pr}`;s.reason='x'.repeat(80000);state.standaloneReviews.push(s);}
const bytes=s=>Buffer.from(JSON.stringify(s,null,2)+'\n');
const target=MAX_DURABLE_STATE_BYTES-30000;
let missing=target-bytes(state).length;for(const s of state.standaloneReviews.slice(1)){if(missing<=0)break;const add=Math.min(missing,99000-(s.reason?.length??0));s.reason=(s.reason??'')+'x'.repeat(add);missing-=add;}
const excess=bytes(state).length-target;if(excess)state.standaloneReviews.at(-1).reason=state.standaloneReviews.at(-1).reason.slice(0,-excess);assert.equal(bytes(state).length,target);validateStandaloneState(state);
let remote=bytes(state),oid=createHash('sha1').update(`blob ${remote.length}\0`).update(remote).digest('hex'),writes=0;
const transport=createGitHub({cwd:'/tmp',repo,run:async call=>{const e=call.args[1];let value;if(call.args.includes('PUT')){const body=JSON.parse(call.input);assert.equal(body.sha,oid);remote=Buffer.from(body.content,'base64');oid=createHash('sha1').update(`blob ${remote.length}\0`).update(remote).digest('hex');writes++;value={content:{sha:oid}};}else if(e.includes('/git/ref/'))value={object:{sha:'1'.repeat(40)}};else if(e.includes('/contents/'))value={type:'file',sha:oid,size:remote.length,encoding:'none',content:''};else if(e.includes('/git/blobs/'))value={sha:oid,size:remote.length,encoding:'base64',content:remote.toString('base64')};else assert.fail(e);return{ok:true,stdout:JSON.stringify(value)};}});
const github={...f.github,createStateStore:transport.createStateStore};
const controller=createStandaloneReview({github,run:f.run,cwd:'/trusted'});
await controller.request(81);await controller.claim(81);
const result={subjects:state.standaloneReviews.length,initialStateBytes:target,runningStateBytes:remote.length,maximumStateBytes:MAX_DURABLE_STATE_BYTES,validState:true,actualGitHubWrites:0,actualModels:0};
await controller.submit(81,{...report(),summary:'x'.repeat(50000)});result.acceptedCommentChars=f.comments[0].body.length;
try{await controller.reconcilePR(81);result.import='PASS';}catch(e){result.import='REJECTED';result.error=e.message;}
result.durableReviewStatus=JSON.parse(remote).standaloneReviews[0].reviews[0].status;
await controller.submit(81,{...report(),summary:'Short replacement'});
try{await controller.reconcilePR(81);result.replacementImport='PASS';}catch(e){result.replacementImport='REJECTED';result.replacementError=e.message;}
result.durableReviewStatusAfterReplacement=JSON.parse(remote).standaloneReviews[0].reviews[0].status;
result.syntheticStateWrites=writes;
await writeFile(new URL('./test-results/capacity-reason-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
