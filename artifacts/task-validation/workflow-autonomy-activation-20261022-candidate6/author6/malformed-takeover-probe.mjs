import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {runPipeline} from '../source6/agent-team/src/bug-pipeline/pipeline.mjs';
import {automationPaused} from '../source6/agent-team/src/bug-pipeline/operator-ownership.mjs';
test('malformed takeover active type cannot grant new unclaimed intake even with otherwise bound handback',async()=>{
 const state={schemaVersion:1,repository:'l2v-hub/ClinicOS',batches:[],operatorTakeover:{active:'true',nonce:'bound-N',automation:{enabled:true,mode:'new-unclaimed-only',takeoverNonce:'bound-N',authorizedActor:'maintainer',handedBackAt:'2026-10-23T00:00:00Z',protectedSubjects:[]}}};let intake=0,queue=0,error;try{await runPipeline({repo:state.repository,event:{},store:{load:async()=>structuredClone(state),observe:async()=>structuredClone(state),save:()=>assert.fail('no save')},gh:{intake:async()=>{intake++},discoverQueue:async()=>{queue++;return[]}},workspace:{},models:{}})}catch(e){error=e}
 await writeFile(new URL('malformed-takeover-observations.json',import.meta.url),JSON.stringify({takeoverActiveType:typeof state.operatorTakeover.active,automationPaused:automationPaused(state),intakeCalls:intake,queueCalls:queue,error:error?.message??null,modelCalls:0},null,2)+'\n');assert.ok(error||intake===0,'Invalid takeover.active must reject or pause before automatic intake');
});
