import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {batchFor} from './pipeline-fixture.mjs';
import {feedbackFingerprint,sha256} from '../qa-source7/agent-team/src/bug-pipeline/contracts.mjs';
import {createCommentReviewHandoff} from '../qa-source7/agent-team/src/bug-pipeline/comment-review-handoff.mjs';
const repo='l2v-hub/ClinicOS',clone=structuredClone;
function feedback(b){return{state:'OPEN',isDraft:false,head:b.sha,headRef:b.branch,headRepo:repo,headIsFork:false,baseRef:'main',comments:[],unresolved:false,changesRequested:false}}
function batch(n,approved=true){const b=batchFor({issues:[n],phase:'waiting-review',reviews:approved?[{round:1,status:'approved',subjectSha:'a'.repeat(40)}]:[]});b.pr.number=n+64;
 if(approved){const raw=JSON.stringify({subject_sha:b.sha,verdict:'approved',summary:'Actual synthetic independent report',findings:[]});b.reviewLedger={rounds:[{round:1,subject_sha:b.sha,verdict:'approved',review_sha256:sha256(raw)}]};b.reviewReports={'claude-review-1.json':raw};b.externalReview={status:'published',subjectSha:b.sha,feedbackFingerprint:feedbackFingerprint(feedback(b))};}return b;}
async function actualPipeline(){
 const context=createContext({process:{env:{},argv:['node','/synthetic'],cwd:()=>'/synthetic'},console,structuredClone,Buffer,setTimeout,clearTimeout,URL});const cache=new Map();
 const synthetic=exports=>new SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v)},{context});
 async function load(url){if(cache.has(url))return cache.get(url);const mod=new SourceTextModule(await readFile(new URL(url),'utf8'),{context,identifier:url,initializeImportMeta:meta=>meta.url=url});cache.set(url,mod);await mod.link(async(spec,parent)=>{
  if(spec==='./external-review.mjs'&&parent.identifier.endsWith('/pipeline.mjs'))return load(new URL(spec,parent.identifier).href);
  if(spec==='./issue-review-communication.mjs')return synthetic({createIssueReviewCommunication:()=>({mirrorFeedback:async()=>{},publishState:async()=>{}})});
  if(spec==='./process.mjs')return synthetic({createRunner:()=>()=>assert.fail('No process/model allowed')});
  return synthetic(await import(spec.startsWith('.')?new URL(spec,parent.identifier).href:spec));});return mod;}
 const mod=await load(new URL('../qa-source7/agent-team/src/bug-pipeline/pipeline.mjs',import.meta.url).href);await mod.evaluate();return mod.namespace.runPipeline;
}
async function harness({draft=false,two=false}={}){
 let canonical={schemaVersion:1,repository:repo,batches:[batch(17,!draft),...(two?[batch(18,!draft)]:[])]};let observeHook=()=>{},qa=0,drafts=[];
 const store={load:async()=>clone(canonical),observe:async()=>{await observeHook();return clone(canonical)},save:async(state,options)=>{await options?.guard?.();canonical=clone(state)}};
 const gh={intake:async()=>{},discoverQueue:async()=>[],setIssueStatus:async()=>{},commentIssue:async()=>{},commentPR:async()=>{},
  viewIssue:async()=>({state:'open',comments:[]}),reviewFeedback:async n=>({...feedback(canonical.batches.find(b=>b.pr.number===n)),isDraft:draft}),
  requiredChecks:async()=>({ok:true}),draftReady:async n=>{drafts.push(n)},createStateStore:()=>store,authorized:async()=>true,authorizedMaintainer:async()=>true};
 const workspace={root:'/synthetic',prepare:async()=>{},finalQa:async()=>{qa++;return{status:'verified',summary:'Completed actual boundary QA'}}};
 const pipeline=await actualPipeline();
 return{store,gh,workspace,run:()=>pipeline({repo,event:{},gh,workspace,store,models:{},reviewMode:'external',triageWindowMs:0}),
  get state(){return canonical},setObserve:fn=>observeHook=fn,get qa(){return qa},drafts};
}
test('Author7 F5 actual external draftReady call stops A on new ownership and still requests B',async()=>{
 const h=await harness({draft:true,two:true});let owner;
 h.gh.requiredChecks=async()=>{if(!owner){h.state.batches[0].operatorCoordination={active:true,owner:'maintainer'};owner=clone(h.state.batches[0]);}return{ok:true}};
 await h.run();assert.deepEqual(h.drafts,[82]);assert.deepEqual(h.state.batches[0],owner);assert.equal(h.state.batches[1].externalReview.status,'requested');
});
test('Author7 F4 external real failure then block ownership race preserves A and continues B',async()=>{
 const h=await harness({two:true});let pending=false,owner;
 h.workspace.prepare=async b=>{if(b.id==='bug-batch-17'){pending=true;throw Error('Actual finite prepare failure')}};
 h.setObserve(()=>{if(pending&&!owner){h.state.batches[0].operatorCoordination={active:true,owner:'maintainer'};h.state.batches[0].remoteNote='Exact remote subject';owner=clone(h.state.batches[0]);}});
 await h.run();assert.deepEqual(h.state.batches[0],owner);assert.equal(h.state.batches[1].phase,'ready');assert.equal(h.qa,1);
});
for(const boundary of['before','after'])test(`Author7 F3 actual ${boundary} final-QA observation interruption preserves correct spend and progresses with trusted recovery`,async()=>{
 const h=await harness();let injected=false;
 h.setObserve(()=>{const attempts=h.state.batches[0].codexFinalQaInfrastructure?.attempts;if(!injected&&attempts?.length&&(boundary==='before'||h.qa===1)){
  injected=true;throw Object.assign(new Error('Sanitized timeout'),{code:'github-read-transient',operation:'read',retryable:true});}});
 await h.run();assert.equal(injected,true);const current=h.state.batches[0];
 assert.equal(h.qa,boundary==='before'?0:1);assert.equal(current.phase,'blocked');assert.equal(current.implementation.length,1);
 const actual=clone(current.codexFinalReview),ledger=clone(current.codexFinalQaInfrastructure.attempts);
 if(boundary==='before'){assert.equal(ledger[0].status,'not-started');assert.equal(actual.status,'blocked');}
 else {assert.equal(actual.status,'verified');assert.equal(ledger[0].status,'verified');}
 const handoff=createCommentReviewHandoff({github:h.gh,cwd:'/synthetic',run:async({args})=>{assert.equal(args[1],'user');return{ok:true,stdout:JSON.stringify({login:'maintainer'})}},
  authorizationVerifier:async({binding})=>({provenance:'user-session',grantId:'actual:session',consumptionNonce:`actual:${boundary}`,sourceRef:'test:host',binding})});
 const {historyDigest}=await import('../qa-source7/agent-team/src/bug-pipeline/attempt-budget.mjs');
 await handoff.recover(81,{action:'recover-final-qa',expectedSha:current.sha,token:actual.nonce??historyDigest(actual),reason:'Actual observed pre-publication fault recovered',authorizationRef:`test:${boundary}`});
 await h.run();assert.equal(h.qa,1,'Only one actual model inference across fault and recovery');assert.equal(h.state.batches[0].phase,'ready');
 if(boundary==='after')assert.deepEqual(h.state.batches[0].codexFinalReview,actual);
});

test('Author7 F3 external correction resumes exact pending publish after checkpoint without reexecuting models',async()=>{
 const {authorizeObservationResume}=await import('../qa-source7/agent-team/src/bug-pipeline/operator-authorization.mjs');
 const h=await harness(), b=h.state.batches[0];
 const raw=JSON.stringify({subject_sha:b.sha,verdict:'changes-requested',summary:'Bounded actual correction',findings:[{severity:'medium',file:'frontend/src/features/patients/filter.ts',line:1,problem:'Synthetic bug',requested_change:'Fix',test_expectation:'Pass'}]});
 b.reviews[0].status='changes-requested';b.reviewLedger.rounds[0].verdict='changes-requested';b.reviewLedger.rounds[0].review_sha256=sha256(raw);b.reviewReports['claude-review-1.json']=raw;
 const originalSha=b.sha;let execute=0,simplify=0,publish=0,checkpoint=0,injected=false;
 Object.assign(h.workspace,{captureCheckpoint:async()=>({schemaVersion:1,head:checkpoint?'b'.repeat(40):originalSha,output:'owned-synthetic-boundary'}),
  resume:async(_batch,snapshot)=>assert.equal(snapshot.output,'owned-synthetic-boundary'),
  execute:async()=>{execute++;return{status:'implemented'}},simplify:async()=>{simplify++;return{status:'implemented'}},verify:async()=>{},qa:async()=>({status:'verified'}),
  checkpoint:async()=>{checkpoint++;return'b'.repeat(40)},publish:async()=>{publish++},issueEvidence:async()=> 'Actual synthetic evidence'});
 h.setObserve(()=>{const current=h.state.batches[0];if(!injected&&current.controllerProgress?.pending==='publish'){
  injected=true;throw Object.assign(new Error('Finite ownership observation timeout'),{code:'github-read-transient',operation:'read'});}});
 await h.run();assert.equal(injected,true);let current=h.state.batches[0];
 assert.equal(current.controllerProgress.next,6);assert.equal(current.phase,'blocked');assert.equal(current.sha,'b'.repeat(40));
 assert.equal(execute,1);assert.equal(simplify,1);assert.equal(publish,0);assert.equal(current.implementation.length,2);
 await authorizeObservationResume({state:h.state,subject:current,actor:'maintainer',reference:'test:publish-resume',reason:'Exact retained boundary fixture',
  verifier:async({binding})=>({provenance:'user-session',grantId:'test:grant',sourceRef:'test:host',consumptionNonce:'test:publish-once',binding})});
 // Native PR still has the old published head until the pending push actually runs.
 h.gh.reviewFeedback=async()=>feedback({...h.state.batches[0],sha:publish?'b'.repeat(40):originalSha});
 await h.run();current=h.state.batches[0];
 assert.equal(execute,1);assert.equal(simplify,1);assert.equal(checkpoint,1);assert.equal(publish,1);
 assert.equal(current.implementation.length,2);assert.equal(current.implementation[1].status,'passed');
 assert.equal(current.externalReview.subjectSha,'b'.repeat(40));assert.equal(current.phase,'waiting-review');
});
