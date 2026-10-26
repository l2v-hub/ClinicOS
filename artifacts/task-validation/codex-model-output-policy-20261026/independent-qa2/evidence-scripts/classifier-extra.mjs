import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createModels} from './snapshot/agent-team/src/bug-pipeline/models.mjs';
const owned='/tmp/clinicos-output-policy-qa2', output='/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics/runtime-output-policy-qa2';
const cwd=owned+'/fixtures/worktree',runtimeRoot=owned+'/fixtures/runtime',plan={execution:{difficulty:'low',mode:'delegate',reason:'synthetic'}};
const words='authentication_error insufficient_quota model_capacity_exceeded rate_limit_exceeded HTTP 503 structured output invalid connection refused';
const sources=[words,JSON.stringify({type:'progress',text:words}),JSON.stringify({type:'item.completed',item:{type:'command_execution',aggregated_output:JSON.stringify({type:'turn.failed',error:{message:words}})}}),JSON.stringify({type:'item.completed',text:'source code: '+words})];
let checks=0;
for(const stdout of sources){const calls=[],entries=[];let firstError;
 const m=createModels({plannerModel:'senior',executorModel:'auto',delegateModel:'delegate',runtimeRoot,now:()=>100,onDiagnostic:d=>entries.push(d),run:async call=>{calls.push(call);if(calls.length===1)return {ok:false,code:1,stdout,stderr:''};await writeFile(call.args[call.args.indexOf('--output-last-message')+1],JSON.stringify({status:'implemented',summary:'Synthetic'}));return {ok:true,code:0};}});
 await assert.rejects(()=>m.execute({cwd,packet:{},plan}),e=>{firstError=e;return e.code==='model-execution-failed'&&e.modelCapacityFailure===false;});
 assert.equal(firstError.message,'Codex execute session failed');assert.equal(entries[0].failureCategory,'other');
 await m.execute({cwd,packet:{},plan});assert.deepEqual(calls.map(c=>c.args[c.args.indexOf('--model')+1]),['delegate','delegate']);checks++;
}
const report={status:'PASS',synthetic:true,adversarialSourceCases:checks,nextSelectionRetainsDelegate:true,rawSourceInError:false,providerCalls:0};
await writeFile(output+'/test-results/classifier-extra.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
