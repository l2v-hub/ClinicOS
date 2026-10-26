import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createRunner} from './snapshot/agent-team/src/bug-pipeline/process.mjs';
const owned='/tmp/clinicos-output-policy-qa3', output='/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics/runtime-output-policy-qa3';
const source=await readFile(owned+'/snapshot/agent-team/src/bug-pipeline/process.mjs','utf8');
const append=vm.runInNewContext('('+source.slice(source.indexOf('function appendCapture'),source.indexOf('// Models/tests')).trim()+')',{Buffer});
let transitions=0;
for(const limit of [0,1,2,7,32,32768]) {
 let tail=Buffer.alloc(0), total=Buffer.alloc(0);
 for(const n of [0,1,5,8192,65536,3,33000,0,200]) {
  const chunk=Buffer.alloc(n,65+transitions%25), prior=tail;
  total=Buffer.concat([total,chunk]);tail=append(tail,chunk,limit,true);
  assert.deepEqual(tail,limit===0?Buffer.alloc(0):total.subarray(-limit));
  assert.equal(tail.buffer.byteLength,tail.length);
  assert.notEqual(tail.buffer,chunk.buffer);
  if(prior.length)assert.notEqual(tail.buffer,prior.buffer);
  transitions++;
 }
}
const secret=Buffer.from('SYNTHETIC_DISCARDED_PRIVATE_BYTES');
let tail=append(Buffer.alloc(0),Buffer.concat([secret,Buffer.alloc(65536,120)]),32768,true);
assert.equal(Buffer.from(tail.buffer).includes(secret),false);
const script=owned+'/fixtures/backing-child.mjs';
await writeFile(script,"process.stdout.write('x'.repeat(3145728));process.stderr.write('y'.repeat(32768));");
const convert=Buffer.prototype.toString, observations=[];
Buffer.prototype.toString=function(...args){if(args[0]==='utf8'&&this.length===32768)observations.push({visible:this.length,backing:this.buffer.byteLength,offset:this.byteOffset});return Reflect.apply(convert,this,args);};
let r;
try {r=await createRunner({runtimeRoot:owned+'/fixtures/runtime',env:{PATH:process.env.PATH,CODEX_CLI_PATH:script}})({command:'codex',cwd:owned+'/fixtures/worktree',timeoutMs:3000,envMode:'model',maxOutputBytes:65536,limitStdout:false,maxCapturedBytesPerStream:32768,captureTail:true,maxStderrBytes:65536});} finally {Buffer.prototype.toString=convert;}
assert.equal(r.ok,true);assert.equal(r.stdoutBytes,3145728);assert.equal(r.stderrBytes,32768);assert.equal(observations.length,2);assert.ok(observations.every(x=>x.backing===32768&&x.offset===0));
const report={status:'PASS',synthetic:true,providerCalls:0,transitions,discardedMarkerReachableFromRetainedBacking:false,realRunner:{stdoutBytes:r.stdoutBytes,stderrBytes:r.stderrBytes,capturedBytes:r.stdoutCapturedBytes+r.stderrCapturedBytes,observations}};
await writeFile(output+'/test-results/memory-extra.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
