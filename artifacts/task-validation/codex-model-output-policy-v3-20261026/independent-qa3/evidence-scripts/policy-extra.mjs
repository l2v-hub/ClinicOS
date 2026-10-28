import assert from 'node:assert/strict';
import {writeFile,readFile,stat,mkdir} from 'node:fs/promises';
import {createRunner} from './snapshot/agent-team/src/bug-pipeline/process.mjs';
import {createModels} from './snapshot/agent-team/src/bug-pipeline/models.mjs';
const owned='/tmp/clinicos-output-policy-qa3',output='/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics/runtime-output-policy-qa3';
const cwd=owned+'/fixtures/worktree',runtimeRoot=owned+'/fixtures/runtime',script=owned+'/fixtures/fakecodex-extra.mjs';
await mkdir(cwd,{recursive:true});await mkdir(runtimeRoot,{recursive:true});
const results=[];
async function check(name,fn){try{results.push({name,status:'PASS',...await fn()});}catch(e){results.push({name,status:'FAIL',reason:e.message});}}
function runner(){return createRunner({runtimeRoot,env:{PATH:process.env.PATH,CODEX_CLI_PATH:script}});}
const opts={command:'codex',cwd,envMode:'model',timeoutMs:5000,maxOutputBytes:65536,maxCapturedBytesPerStream:32768,maxStderrBytes:65536,captureTail:true,limitStdout:false};
await check('nonfatal stdout plus stderr exact bound and owned tails',async()=>{
 await writeFile(script,"process.stdout.write('DISCARDED_SYNTHETIC_MARKER'+'x'.repeat(3*1024*1024));process.stderr.write('y'.repeat(65536));");
 const orig=Buffer.prototype.toString,allocs=[];Buffer.prototype.toString=function(...a){if(a[0]==='utf8'&&this.length===32768)allocs.push({length:this.length,backing:this.buffer.byteLength,offset:this.byteOffset,discardedReachable:Buffer.from(this.buffer).includes(Buffer.from('DISCARDED_SYNTHETIC_MARKER'))});return Reflect.apply(orig,this,a);};
 let r;try{r=await runner()(opts);}finally{Buffer.prototype.toString=orig;}
 assert.equal(r.ok,true);assert.ok(r.stdoutBytes>3145728);assert.equal(r.stderrBytes,65536);assert.equal(r.stdoutCapturedBytes+r.stderrCapturedBytes,65536);assert.equal(allocs.length,2);assert.ok(allocs.every(x=>x.backing===32768&&x.offset===0&&!x.discardedReachable));return {stdoutBytes:r.stdoutBytes,stderrBytes:r.stderrBytes,capturedBytes:65536,allocs};
});
await check('nonfatal stdout retains fatal 64KiB stderr',async()=>{
 await writeFile(script,"process.stdout.write('x'.repeat(3*1024*1024));process.stderr.write('y'.repeat(65537));");const r=await runner()(opts);assert.equal(r.ok,false);assert.equal(r.error,'stderr-limit');return {runnerError:r.error,stderrBytes:r.stderrBytes};
});
await check('continuous stdout timeout kills descendant process group',async()=>{
 const marker=owned+'/fixtures/descendant-survived';await writeFile(script,`import {spawn} from 'node:child_process';spawn(process.execPath,['-e',${JSON.stringify("setTimeout(()=>require('node:fs').writeFileSync("+JSON.stringify(marker)+",'survived'),2000);setInterval(()=>{},1000);")}],{stdio:'ignore'});setInterval(()=>process.stdout.write('x'.repeat(65536)),5);`);
 const r=await runner()({...opts,timeoutMs:350});assert.equal(r.error,'timeout');assert.ok(r.stdoutBytes>65536);await new Promise(r=>setTimeout(r,2200));await assert.rejects(()=>stat(marker),{code:'ENOENT'});return {runnerError:r.error,stdoutBytes:r.stdoutBytes,descendantMarkerAbsent:true};
});
await check('controller default rejects >2MiB output',async()=>{await writeFile(script,"process.stdout.write('x'.repeat(3*1024*1024));");const r=await runner()({command:'codex',cwd,envMode:'controller',timeoutMs:3000});assert.equal(r.error,'output-limit');return {runnerError:r.error};});
await check('model-only flag not implied by envMode',async()=>{await writeFile(script,"process.stdout.write('x'.repeat(3*1024*1024));");const r=await runner()({command:'codex',cwd,envMode:'model',timeoutMs:3000});assert.equal(r.error,'output-limit');return {runnerError:r.error};});
await check('real-child typed-result failure matrix',async()=>{let cases=[];for(const kind of ['missing','malformed','oversize','symlink','schema']){
 const snippets={missing:'',malformed:`await writeFile(out,'{');`,oversize:`await writeFile(out,'x'.repeat(262145));`,symlink:`const target=${JSON.stringify(owned+'/fixtures/symlink-target.json')};await writeFile(target,'{"status":"implemented","summary":"Synthetic"}');await symlink(target,out);`,schema:`await writeFile(out,'{"status":"bad","summary":"Synthetic"}');`};
 await writeFile(script,`import {writeFile,symlink} from 'node:fs/promises';const out=process.argv[process.argv.indexOf('--output-last-message')+1];process.stdout.write('x'.repeat(3*1024*1024));${snippets[kind]}`);
 const m=createModels({plannerModel:'synthetic',executorModel:'synthetic',runtimeRoot,run:runner()});await assert.rejects(()=>m.execute({cwd,packet:{},plan:{}}),{code:'model-result-invalid'});cases.push(kind);
 }return {cases,rejected:cases.length};});
await check('bare numeric statuses do not cause classification or next-selection cooldown',async()=>{let cases=[];for(const n of [401,403,402,429,502,503,504]){
 let calls=[],diagnostics=[];const m=createModels({plannerModel:'senior',executorModel:'auto',delegateModel:'delegate',runtimeRoot,now:()=>100,onDiagnostic:d=>diagnostics.push(d),run:async c=>{calls.push(c.args[c.args.indexOf('--model')+1]);if(calls.length===1)return {ok:false,code:1,stderr:'validation failed at fixture line '+n};await writeFile(c.args[c.args.indexOf('--output-last-message')+1],'{"status":"implemented","summary":"Synthetic"}');return {ok:true,code:0};}});
 await assert.rejects(()=>m.execute({cwd,packet:{},plan:{execution:{mode:'delegate',difficulty:'low',reason:'Synthetic'}}}),e=>e.modelCapacityFailure===false);assert.equal(diagnostics[0].failureCategory,'other');await m.execute({cwd,packet:{},plan:{execution:{mode:'delegate',difficulty:'low',reason:'Synthetic'}}});assert.deepEqual(calls,['delegate','delegate']);cases.push({n,category:'other',nextSelection:calls[1]});
 }return {cases};});
await check('anchored HTTP status matrix preserves categories',async()=>{let cases=[];for(const [text,expected] of [['HTTP 401','auth'],['HTTP/2 403','auth'],['status_code=402','quota'],['status-code:429','rate'],['HTTP 502','network'],['HTTP/2 503','network'],['status 504','network']]){
 let diagnostic;const m=createModels({plannerModel:'synthetic',executorModel:'synthetic',runtimeRoot,onDiagnostic:d=>diagnostic=d,run:async()=>({ok:false,code:1,stderr:text})});await assert.rejects(()=>m.execute({cwd,packet:{},plan:{}}));assert.equal(diagnostic.failureCategory,expected);cases.push({text,category:expected});}return {cases};});
const report={status:results.every(x=>x.status==='PASS')?'PASS':'FAIL',synthetic:true,providerCalls:0,code:'31b11f09331249a93468bf00d8cc3d1313004a72',results};await writeFile(output+'/test-results/policy-extra.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exitCode=report.status==='PASS'?0:1;
