import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');
const config=JSON.parse(readFileSync(path.join(root,'frontend/vercel.json'),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
test('only the followup branch is vetoed; unspecified branches retain Vercel defaults',()=>{
 assert.deepEqual(config.git,{deploymentEnabled:{'codex/pr474-acl-rejection-followup':false}});
 for(const branch of ['main','foreign','codex/windows-claude-review'])assert.equal(Object.hasOwn(config.git.deploymentEnabled,branch),false);
});
test('all prior frontend configuration is unchanged',()=>{
 const {git,...rest}=config;assert.equal(hash(JSON.stringify(rest)),'497c7bc34e85f8b735d50076fca7f8bef49479826f25fb3e0452adf27109410a');
});
test('ACL test bytes are identical to the actual Claude Max approved093 commit',()=>{
 const file='agent-team/tests/bug-pipeline/windows-review.test.mjs';
 assert.equal(hash(readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n')),'082762f220976a73978ce5fb2deca9657eecaf7adb996552c9b5697b49f9cc1f');
});
