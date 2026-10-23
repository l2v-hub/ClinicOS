import {readFileSync,writeFileSync} from 'node:fs';
import {test} from 'node:test';
import ts from 'typescript';
const backend=readFileSync('backend/src/skills/__tests__/skills-e2e.test.ts','utf8');
const source=backend.slice(backend.indexOf('async function withHeldCorrection<T>'),backend.indexOf("test('QA H1 barrier failure paths"));
const javascript=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const helper=new Function(javascript+'; return withHeldCorrection;')();
let released=false;let settle;const correction=new Promise(r=>settle=r);const never=new Promise(()=>{});
test('actual H1 helper must release a held correction when confirmation times out',{timeout:25},async()=>{
 await helper(correction,Promise.resolve(),()=>{released=true;settle()},async()=>never,10);
});
setTimeout(()=>writeFileSync(new URL('./barrier-run-timeout-observation.json',import.meta.url),JSON.stringify({cleanupCalledAfterOuterTimeout:released,source:'backend/src/skills/__tests__/skills-e2e.test.ts',reproduction:'Actual extracted source; interpreter entry reached, confirmation callback never settles; node:test expires while release is held.'},null,2)),60);
