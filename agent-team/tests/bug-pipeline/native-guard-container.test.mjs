import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeContainerArguments, NATIVE_GUARD_IMAGE, createPrivateCapture } from '../../src/bug-pipeline/native-guard-container.mjs';
const paths={cli:'/safe/claude',launcher:'/safe/launcher.mjs',ca:'/safe/public-ca.pem',socketDirectory:'/safe/socket'};
test('container arguments have immutable image, no network, no secrets or repo mounts',()=>{
 const a=nativeContainerArguments(paths);const v=k=>a[a.indexOf(k)+1];assert.equal(v('--network'),'none');assert.ok(a.includes('--read-only'));assert.equal(v('--user'),'1000:1000');assert.equal(v('--cap-drop'),'ALL');assert.equal(v('--log-driver'),'none');assert.equal(v('--security-opt'),'no-new-privileges=true');assert.equal(v('--platform'),'linux/amd64');assert.ok(a.includes(NATIVE_GUARD_IMAGE));
 assert.ok(!a.some(x=>/docker.sock|--env|--privileged|--publish/.test(x)));assert.equal(a.filter(x=>x==='--mount').length,4);
 for(const value of a.filter(x=>x.startsWith('type=bind')))assert.ok(value.endsWith(',readonly'));
 assert.ok(NATIVE_GUARD_IMAGE.endsWith('@sha256:9f0dde62d10e7ff7a310ecaebd66225f6b46c17e6cb778449a77b05d3541bea2'));
});
test('mount path injection, duplicate/public mount alias, socket traversal fail',()=>{
 for(const p of [{...paths,cli:'/safe,x=/etc'},{...paths,ca:'/safe/../secret'},{...paths,launcher:paths.cli},{...paths,socketDirectory:'relative'}])assert.throws(()=>nativeContainerArguments(p));
});
test('combined private output cap is hard and sanitized receipt never returns raw output',()=>{
 const c=createPrivateCapture(20);c.push('stdout',Buffer.from('private-token'));c.push('stderr',Buffer.from('raw-error'));assert.equal(c.receipt().overflow,true);assert.ok(!JSON.stringify(c.receipt()).includes('private-token'));assert.ok(!JSON.stringify(c.receipt()).includes('raw-error'));assert.throws(()=>c.take());
});
