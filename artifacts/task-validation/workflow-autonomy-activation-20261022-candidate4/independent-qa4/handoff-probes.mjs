import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './handoff-fixture.mjs';
import {createCommentReviewHandoff} from '../qa-source4/agent-team/src/bug-pipeline/comment-review-handoff.mjs';
test('actual automatic handoff CAS rebase callback rejects fresh protected identity before commit or comment',async()=>{
 const f=fixture();const before=structuredClone(f.remote);let callbacks=0;f.github.createStateStore=()=>({load:async()=>structuredClone(f.remote),save:async(state,o)=>{const fresh=structuredClone(state);fresh.operatorTakeover={active:true,automation:{enabled:true,mode:'new-unclaimed-only',protectedSubjects:[{collection:'batches',id:f.batch.id}]}};callbacks++;await o.rebaseIndependentSubjects(fresh);assert.fail('new owner must prevent commit')}});
 const handoff=createCommentReviewHandoff({github:f.github,cwd:'/synthetic',automatic:()=>true,run:async c=>{assert.equal(c.args[1],'user');return{ok:true,stdout:JSON.stringify({login:'review-bot'})}}});await assert.rejects(handoff.request(81),e=>e.code==='review-operator-owned');assert.equal(callbacks,1);assert.deepEqual(f.remote,before);assert.equal(f.pr.comments.length,0);
});
test('default explicit batch handoff remains authorized during takeover, but revoked authorization cannot claim',async()=>{
 const f=fixture();f.remote.operatorTakeover={active:true};const request=await f.handoff.request(81);assert.equal(request.externalReview.status,'comment-requested');f.setPermission('read');await assert.rejects(f.handoff.claim(81),/Unauthorized/);assert.equal(f.remote.batches[0].reviews.length,0);f.setPermission('write');const claimed=await f.handoff.claim(81);assert.equal(claimed.reviews[0].status,'running');assert.equal(f.remote.operatorTakeover.active,true);
});
