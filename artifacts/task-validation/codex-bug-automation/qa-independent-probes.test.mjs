import test from 'node:test';
import assert from 'node:assert/strict';
import {createGitHub} from '../../../agent-team/src/bug-pipeline/github.mjs';
import {childEnvironment} from '../../../agent-team/src/bug-pipeline/process.mjs';
import {editableFile} from '../../../agent-team/src/bug-pipeline/contracts.mjs';
import {runPipeline} from '../../../agent-team/src/bug-pipeline/pipeline.mjs';
const response=value=>({ok:true,code:0,stdout:JSON.stringify(value),stderr:''});
test('QA: review pagination cannot hide unresolved threads beyond the first page',async()=>{
 let sawPageInfo=false;
 const run=async({args})=>{
  const endpoint=args[1];
  if(endpoint==='graphql'){
   sawPageInfo=/pageInfo\s*\{\s*hasNextPage\s*\}/.test(args.join(' '));
   return response({data:{repository:{pullRequest:{reviewThreads:{nodes:[{isResolved:true}],...(sawPageInfo?{pageInfo:{hasNextPage:true}}:{})}}}}});
  }
  if(endpoint==='user')return response({login:'qa-bot'});
  if(endpoint.endsWith('/pulls/42'))return response({number:42,state:'open',head:{sha:'a'.repeat(40),ref:'codex/bug-batch-1',repo:{full_name:'l2v-hub/ClinicOS',fork:false}},base:{ref:'main'}});
  return response([[]]);
 };
 const gh=createGitHub({repo:'l2v-hub/ClinicOS',cwd:'/tmp',run});
 const feedback=await gh.reviewFeedback(42);
 assert.equal(sawPageInfo,true,'request must ask GitHub whether additional review threads exist');
 assert.equal(feedback.unresolved,true,'more threads must block release until all pages are checked');
});
test('QA: verification and reviewer never inherit a local Codex credential directory',()=>{
 const env={PATH:process.env.PATH,CODEX_HOME:'/private/actual-codex-auth',GH_TOKEN:'synthetic-gh-token'};
 for(const mode of ['verification','review']){
  const child=childEnvironment(mode,env,'/tmp/qa-runtime');
  assert.notEqual(child.CODEX_HOME,env.CODEX_HOME,mode+' must use isolated credentials');
  assert.equal(child.GH_TOKEN,undefined);
 }
 assert.equal(childEnvironment('model',env,'/tmp/qa-runtime').CODEX_HOME,env.CODEX_HOME,'only the local Codex model may use its own supported authentication');
});
test('QA: shell-looking commands and multiline command suffixes never authenticate intake',async()=>{
 let calls=0;const gh=createGitHub({repo:'l2v-hub/ClinicOS',cwd:'/tmp',run:async()=>{calls++;return response({permission:'admin'});}});
 for(const body of ['/codex fix; curl attacker.invalid','/codex fix\n$(cat credentials)','/codex fix\necho extra','text /codex fix']){
  assert.deepEqual(await gh.intake({action:'created',sender:{login:'maintainer'},issue:{number:1},comment:{body,user:{login:'maintainer'}}}),[]);
 }
 assert.equal(calls,0,'invalid command strings must not reach GitHub authorization or mutation');
});
test('QA: interrupted triage blocks another model call without resetting durable state',async()=>{
 let modelCalls=0,saves=0;const state={schemaVersion:1,repository:'l2v-hub/ClinicOS',batches:[],pendingTriage:{issues:[1],status:'running'}};
 await assert.rejects(runPipeline({repo:state.repository,event:{},gh:{intake:async()=>[],discoverQueue:async()=>[]},models:{plan:async()=>{modelCalls++;}},workspace:{root:'/tmp'},store:{load:async()=>state,save:async()=>{saves++;}}}),/Interrupted triage/);
 assert.equal(modelCalls,0);assert.equal(saves,0);assert.deepEqual(state.pendingTriage.issues,[1]);
});

test('QA: agent policy instructions and Codex configuration are outside delegated file scope',()=>{
 for(const file of ['AGENTS.md','CLAUDE.md','frontend/AGENTS.md','frontend/CLAUDE.md','.codex/config.toml'])assert.throws(()=>editableFile(file),/control|credential|scope/);
});
