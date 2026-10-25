import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {fixture as standaloneFixture} from './standalone-review-fixture.mjs';
import {fixture as releaseFixture} from './release-fixture.mjs';
import {runPipeline} from '../qa-source4/agent-team/src/bug-pipeline/pipeline.mjs';
const outcomes=[];
async function record(x){outcomes.push(x);await writeFile(new URL('observations.json',import.meta.url),JSON.stringify(outcomes,null,2)+'\n')}
test('S1: actual automatic standalone pipeline must not project labels after native current() reads new takeover',async()=>{
 const f=standaloneFixture();await f.controller.adopt(f.manifest);await f.controller.request(81);f.labels.splice(0);const originalStore=f.github.createStateStore;let reads=0;
 // Native controller's prebuilt store still points at the exact synthetic remote object.
 const originalAuthorized=f.github.authorized;let armed=true;f.github.authorized=async(...args)=>{if(armed){armed=false;f.remote().operatorTakeover={active:true}}return originalAuthorized(...args)};
 const gh={...f.github,intake:async()=>{},discoverQueue:async()=>[]};const store=originalStore();let error;
 try{await runPipeline({repo:'l2v-hub/ClinicOS',event:{},store:{load:async()=>{reads++;return store.load()},save:()=>assert.fail('No save should be needed for requested review projection')},gh,models:new Proxy({},{get:()=>()=>assert.fail('no model')}),workspace:{root:'/synthetic'},standaloneController:f.controller,reviewMode:'external'})}catch(e){error=e}
 await record({id:'S1',automaticChain:'runPipeline -> finalizeStandaloneSubject -> native standalone controller.publishState -> current -> handoff.load',newGlobalTakeover:f.remote().operatorTakeover?.active,nativeStoreReads:f.stateReads,labels:[...f.labels],pipelineError:error?.message??null,models:0});
 assert.equal(f.remote().operatorTakeover.active,true);assert.deepEqual(f.labels,[],'Native automatic standalone labels were written after its fresh load observed global takeover');
});
test('R1: actual workflow_run release main must not merge when native fresh state observes postselection takeover',async()=>{
 const f=releaseFixture();let reads=0,selected=false;const readStates=[];const originalLoad=f.store.load;
 f.store.load=async()=>{const s=await originalLoad();if(++reads>=2)s.operatorTakeover={active:true};readStates.push({read:reads,operatorTakeoverActive:s.operatorTakeover?.active===true});return s};
 const event={workflow_run:{conclusion:'success',name:'Codex bug pipeline',head_branch:'main',head_repository:{full_name:'l2v-hub/ClinicOS'}}};
 const env={GITHUB_REPOSITORY:'l2v-hub/ClinicOS',GITHUB_EVENT_NAME:'workflow_run',GITHUB_EVENT_PATH:'/synthetic/event.json',GITHUB_REF:'refs/heads/main',BUG_PIPELINE_AUTO_RELEASE:'true',BUG_PIPELINE_RELEASE_EXECUTE:'true',CLINICOS_BOT_TOKEN_CONFIGURED:'true',VERCEL_CONFIGURED:'true',RAILWAY_CONFIGURED:'true'};
 f.github.createStateStore=()=>f.store;const originalMerge=f.github.mergePullRequest;let adapterGuardChecked=false;f.github.mergePullRequest=async(n,sha,options)=>{assert.equal(typeof options.guard,'function');await options.guard();adapterGuardChecked=true;return originalMerge(n,sha)};
 const sourceUrl=new URL('../qa-source4/agent-team/src/bug-pipeline/release.mjs',import.meta.url);const source=await readFile(sourceUrl,'utf8');
 const logs=[];const context=createContext({process:{env:{},argv:['node','/synthetic/probe.mjs']},console:{log:x=>logs.push(x)},structuredClone,Buffer,setTimeout,clearTimeout,URL});
 const fsBoundary={readFile:async p=>{assert.equal(p,env.GITHUB_EVENT_PATH);return JSON.stringify(event)},mkdir:async()=>{},appendFile:async()=>assert.fail('no output/file writes'),writeFile:async()=>assert.fail('no diagnostic file writes')};
 const mod=new SourceTextModule(source,{context,identifier:sourceUrl.href,initializeImportMeta:m=>{m.url=sourceUrl.href}});
 await mod.link(async spec=>{
  let exports;if(spec==='./github.mjs')exports={createGitHub:()=>f.github};else if(spec==='./process.mjs')exports={createRunner:()=>()=>assert.fail('no subprocess')};else if(spec==='node:fs/promises')exports=fsBoundary;else exports=await import(spec.startsWith('.')?new URL(spec,sourceUrl).href:spec);
  const names=Object.keys(exports);return new SyntheticModule(names,function(){for(const n of names)this.setExport(n,exports[n])},{context});
 });await mod.evaluate();let error,result;try{result=await mod.namespace.main({env,args:[]})}catch(e){error=e}
 const merges=f.calls.filter(([name])=>name==='merge');await record({id:'R1',automaticChain:'main workflow_run -> selectAutoReleaseBatch -> releaseBatch -> freshReleaseGuard',storeReads:reads,readStates,adapterGuardChecked,selectionSawTakeover:false,laterReadsSawTakeover:true,merges,mainResult:result??null,error:error?.message??null,sourceBytesUnmodified:true,sideEffectImportsInjected:['github','process','fs/promises']});
 assert.equal(merges.length,0,'Automatic native workflow_run release merged despite fresh observed takeover');
});
