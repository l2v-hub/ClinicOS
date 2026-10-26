import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { createRunner } from './snapshot/agent-team/src/bug-pipeline/process.mjs';
import { createModels } from './snapshot/agent-team/src/bug-pipeline/models.mjs';
import { createRunner as oldRunner } from './baseline/agent-team/src/bug-pipeline/process.mjs';
import { createModels as oldModels } from './baseline/agent-team/src/bug-pipeline/models.mjs';

const owned = '/tmp/clinicos-output-policy-qa2';
const output = '/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics/runtime-output-policy-qa2';
const cwd = path.join(owned, 'fixtures/worktree');
const runtimeRoot = path.join(owned, 'fixtures/runtime');
await Promise.all([mkdir(cwd,{recursive:true}),mkdir(runtimeRoot,{recursive:true})]);
const results=[];
async function check(name, fn) { try { const values=await fn(); results.push({name,status:'PASS',...(values||{})}); } catch(e) { results.push({name,status:'FAIL',reason:e.message}); } }
const valid={status:'implemented',summary:'Synthetic accepted result'};
const cli=path.join(owned,'fixtures/child.mjs');
await writeFile(cli, `import {writeFile} from 'node:fs/promises';
const output=process.argv[process.argv.indexOf('--output-last-message')+1];
process.stdout.write(JSON.stringify({type:'item.completed',item:{type:'command_execution',aggregated_output:'x'.repeat(80*1024)}})+'\\n');
await new Promise(resolve=>setTimeout(resolve,180));
await writeFile(output,JSON.stringify(${JSON.stringify(valid)}));`);
const env={PATH:process.env.PATH,CODEX_CLI_PATH:cli};
await check('real-child baseline RED 80 KiB progress',async()=>{
 const run=oldRunner({runtimeRoot,env}); const m=oldModels({plannerModel:'synthetic',executorModel:'synthetic',runtimeRoot,run});
 await assert.rejects(()=>m.execute({cwd,packet:{},plan:{},round:1}),{code:'model-execution-failed'});
 return {expectedFailure:true,progressBytes:80*1024};
});
await check('real-child candidate GREEN 80 KiB progress',async()=>{
 let diagnostic;const run=createRunner({runtimeRoot,env});const m=createModels({plannerModel:'synthetic',executorModel:'synthetic',runtimeRoot,run,onDiagnostic:d=>diagnostic=d});
 assert.deepEqual(await m.execute({cwd,packet:{},plan:{},round:1}),valid);
 assert.ok(diagnostic.stdoutBytes>80*1024);assert.equal(diagnostic.stdoutCapturedBytes,32768);
 return {stdoutBytes:diagnostic.stdoutBytes,capturedBytes:diagnostic.stdoutCapturedBytes};
});
const script=path.join(owned,'fixtures/runner.mjs');
async function child(code,options={}) {await writeFile(script,code); return createRunner({runtimeRoot,env:{PATH:process.env.PATH,CODEX_CLI_PATH:script}})({command:'codex',cwd,timeoutMs:3000,envMode:'model',maxOutputBytes:2*1024*1024,maxCapturedBytesPerStream:32768,captureTail:true,maxStderrBytes:65536,...options});}
await check('real-child exact stderr boundary accepts',async()=>{const r=await child("process.stderr.write('z'.repeat(65536));");assert.equal(r.ok,true);assert.equal(r.stderrBytes,65536);assert.equal(r.stderrCapturedBytes,32768);return {stderrBytes:r.stderrBytes,capturedBytes:r.stderrCapturedBytes};});
await check('real-child stderr overflow fails',async()=>{const r=await child("process.stderr.write('z'.repeat(65537));");assert.equal(r.error,'stderr-limit');return {runnerError:r.error};});
await check('real-child exact total boundary accepts',async()=>{const r=await child("process.stdout.write('z'.repeat(2097152));");assert.equal(r.ok,true);assert.equal(r.stdoutBytes,2097152);assert.equal(r.stdoutCapturedBytes,32768);return {stdoutBytes:r.stdoutBytes,capturedBytes:r.stdoutCapturedBytes};});
await check('real-child total overflow fails',async()=>{const r=await child("process.stdout.write('z'.repeat(2097153));");assert.equal(r.error,'output-limit');return {runnerError:r.error};});
await check('real-child multibyte split and byte accounting',async()=>{const r=await child("const b=Buffer.from('é😀終');process.stdout.write(b.subarray(0,3));setTimeout(()=>process.stdout.write(b.subarray(3)),30);",{maxCapturedBytesPerStream:32});assert.equal(r.stdout,'é😀終');assert.equal(r.stdoutBytes,9);assert.equal(r.stdoutCapturedBytes,9);return {stdoutBytes:r.stdoutBytes};});
await check('real-child zero capture retains zero',async()=>{const r=await child("process.stdout.write('synthetic');process.stderr.write('synthetic');",{maxCapturedBytesPerStream:0});assert.equal(r.ok,true);assert.equal(r.stdout,'');assert.equal(r.stderr,'');assert.equal(r.stdoutCapturedBytes+r.stderrCapturedBytes,0);return {capturedBytes:0};});
await check('runner option negative validation matrix',async()=>{const run=createRunner({runtimeRoot,env});let count=0;for(const field of ['maxOutputBytes','maxCapturedBytesPerStream','maxStderrBytes'])for(const value of [-1,NaN,Infinity,1.5,'5',null,67108865]) {if(field==='maxCapturedBytesPerStream'&&value===null)continue;await assert.rejects(()=>run({command:'codex',cwd,[field]:value}));count++;}await assert.rejects(()=>run({command:'codex',cwd,captureTail:'yes'}));return {invalidInputsRejected:count+1};});
const schema={type:'object',additionalProperties:false,required:['groups'],properties:{groups:{type:'array',items:{type:'string'}}}};
function models(run,onDiagnostic,options={}){return createModels({plannerModel:'synthetic',executorModel:'synthetic',runtimeRoot,run,onDiagnostic,...options});}
await check('typed-result negatives and cleanup',async()=>{let count=0;for(const kind of ['missing','empty','malformed','oversized','symlink','additional','required','wrong-type','wrong-item']){const m=models(async call=>{const out=call.args[call.args.indexOf('--output-last-message')+1];if(kind==='symlink'){const outside=path.join(owned,'fixtures/outside.json');await writeFile(outside,'{"groups":[]}');await symlink(outside,out);}else if(kind!=='missing'){const text={empty:'',malformed:'{',oversized:'x'.repeat(262145),additional:'{"groups":[],"extra":1}',required:'{}','wrong-type':'{"groups":"no"}','wrong-item':'{"groups":[3]}'}[kind];await writeFile(out,text);}return {ok:true,code:0};});await assert.rejects(()=>m.plan({cwd,issues:[],scopeSchema:schema}),{code:'model-result-invalid'});count++;}return {typedNegativesRejected:count};});
await check('model input size and serialization guards',async()=>{let calls=0;const m=models(async()=>{calls++;});const circular={};circular.self=circular;await assert.rejects(()=>m.plan({cwd,issues:[circular],scopeSchema:schema}),/serializable/);await assert.rejects(()=>m.plan({cwd,issues:['x'.repeat(524289)],scopeSchema:schema}),/size limit/);await assert.rejects(()=>m.plan({cwd:'relative',issues:[],scopeSchema:schema}),/absolute/);assert.equal(calls,0);return {inputsRejected:3};});
await check('finite diagnostics and raw-secret exclusion',async()=>{const entries=[];const secret='SYNTHETIC_PRIVATE_MARKER_269';for(const event of [{type:'item.completed',item:{aggregated_output:JSON.stringify({type:'error',message:'authentication_error'})}},{type:'progress',text:'rate_limit_exceeded insufficient_quota authentication_error'}]){const m=models(async()=>({ok:false,code:Infinity,error:secret,stdout:JSON.stringify(event),stderr:secret,stdoutBytes:-1,stderrBytes:Infinity,stdoutCapturedBytes:NaN,stderrCapturedBytes:'1'}),d=>entries.push(d));await assert.rejects(()=>m.plan({cwd,issues:[],scopeSchema:schema}),e=>e.code==='model-execution-failed'&&!e.message.includes(secret)&&e.modelCapacityFailure===false);}for(const d of entries){assert.deepEqual(d,{operation:'plan',runnerError:null,exitCode:null,failureCategory:'other',stdoutBytes:null,stderrBytes:null,stdoutCapturedBytes:null,stderrCapturedBytes:null});}assert.ok(!JSON.stringify(entries).includes(secret));return {diagnosticsChecked:entries.length};});
await check('terminal failure classifier and capacity cooldown',async()=>{let now=100,calls=[];const plan={execution:{difficulty:'low',mode:'delegate',reason:'synthetic'}};const m=models(async call=>{const model=call.args[call.args.indexOf('--model')+1];calls.push(model);if(calls.length===1)return {ok:false,code:1,stdout:JSON.stringify({type:'turn.failed',error:{message:'model_capacity_exceeded'}}),stderr:''};const out=call.args[call.args.indexOf('--output-last-message')+1];await writeFile(out,JSON.stringify(valid));return {ok:true,code:0};},undefined,{executorModel:'auto',delegateModel:'delegate',now:()=>now});await assert.rejects(()=>m.execute({cwd,packet:{},plan}),e=>e.modelCapacityFailure===true);await m.execute({cwd,packet:{},plan});now+=60001;await m.execute({cwd,packet:{},plan});assert.deepEqual(calls,['delegate','synthetic','delegate']);return {modelsSelected:calls};});
await check('diagnostic callback exception cannot alter success',async()=>{const m=models(async call=>{await writeFile(call.args[call.args.indexOf('--output-last-message')+1],JSON.stringify(valid));return {ok:true,code:0};},()=>{throw Error('synthetic callback');});assert.deepEqual(await m.execute({cwd,packet:{},plan:{}}),valid);return {callbackErrorIgnored:true};});
const source=await readFile(path.join(owned,'snapshot/agent-team/src/bug-pipeline/process.mjs'),'utf8');
const fnSource=source.slice(source.indexOf('function appendCapture'),source.indexOf('// Models/tests'));
const append=vm.runInNewContext('('+fnSource.trim()+')',{Buffer});
await check('tail retained backing allocation respects 32 KiB limit',async()=>{const limit=32768;let tail=append(Buffer.alloc(0),Buffer.alloc(65536),limit,true);tail=append(tail,Buffer.alloc(65536),limit,true);const visible=tail.length,backing=tail.buffer.byteLength;assert.equal(visible,limit);assert.ok(backing<=limit,`Visible tail ${visible} bytes retains ${backing}-byte backing allocation; expected <= ${limit}`);return {visibleBytes:visible,backingBytes:backing};});
await check('source-extracted CLI collector stays at 64 entries',async()=>{const source=await readFile(path.join(owned,'snapshot/agent-team/src/bug-pipeline/cli.mjs'),'utf8');const callback=source.match(/onDiagnostic: \(diagnostic\) => \{([\s\S]*?)\n    \},/)[1];const modelDiagnostics=[],logs=[];const collect=vm.runInNewContext('(diagnostic)=>{'+callback+'}',{modelDiagnostics,console:{log:s=>logs.push(JSON.parse(s))}});for(let i=0;i<100;i++)collect({operation:'plan',runnerError:null,exitCode:0,failureCategory:null,stdoutBytes:i,stderrBytes:0,stdoutCapturedBytes:i,stderrCapturedBytes:0});assert.equal(modelDiagnostics.length,64);assert.equal(modelDiagnostics[0].stdoutBytes,36);assert.equal(logs.length,100);assert.ok(logs.every(d=>d.type==='model-diagnostic'));return {retainedEntries:64,stdoutDiagnosticEvents:100};});
const report={code:'3f1311dbdf2bc17d2ae5a1ec42e8adb4ea9ba94b',qaNonce:'e26aaa1a-0d6a-4cea-a582-ab66a5a9cdda',synthetic:true,providerCalls:0,results,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length};
await writeFile(path.join(output,'test-results/independent.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exitCode=report.failed?1:0;
