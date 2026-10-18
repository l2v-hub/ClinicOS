import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import ts from 'typescript';
const backend=readFileSync('backend/src/skills/__tests__/skills-e2e.test.ts','utf8');
const browser=readFileSync('e2e/qa-bug-batch-432-browser.mjs','utf8');
const tsSource=backend.slice(backend.indexOf('async function withHeldCorrection<T>'),backend.indexOf("test('QA H1 barrier failure paths"));
const jsSource=browser.slice(browser.indexOf('export async function withHeldCorrection('),browser.indexOf('// Supported alternate static distribution')).replace('export ','');
for(const [label,source] of [['full-suite',ts.transpileModule(tsSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText],['browser',jsSource]]) {
 const helper=new Function(source+'; return withHeldCorrection;')();
 test(label+': early resolve/reject, bounded entry and bounded failed cleanup preserve original errors',async()=>{
  const never=new Promise(()=>{});let released=0;const failure=new Error('independent correction failure');
  await assert.rejects(helper(Promise.reject(failure),never,()=>released++,async()=>assert.fail('must not run'),20),e=>e===failure);
  assert.equal(released,1);
  await assert.rejects(helper(Promise.resolve(),never,()=>released++,async()=>assert.fail('must not run'),20),/settled before interpreter entry/);
  assert.equal(released,2);
  let settle;let settled=false;const held=new Promise(r=>settle=r).then(()=>{settled=true});
  await assert.rejects(helper(held,never,()=>{released++;settle()},async()=>assert.fail('must not run'),20),/did not reach interpreter entry/);
  assert.equal(released,3);assert.equal(settled,true);
  const primary=new Error('independent assertion failure');
  await assert.rejects(helper(never,Promise.resolve(),()=>released++,async()=>{throw primary},20),e=>e instanceof AggregateError&&e.cause===primary&&e.errors[0]===primary&&/did not settle/.test(e.errors[1].message));
  assert.equal(released,4);
 });
}
