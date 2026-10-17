// Independent reproduction: execute the exact production App.updateCartella function,
// with the actual queue and mapping helpers. Only network timing and React setter are controlled.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { CartellaWriteQueue, mergeCartellaPatch, cartellaWriteData } from '../../../../frontend/src/lib/cartellaWriteQueue.ts';
import { createDefaultCartella } from '../../../../frontend/src/mockData.ts';
const require=createRequire(path.resolve('frontend/package.json'));
const ts=require('typescript');const appPath='frontend/src/App.tsx',bytes=readFileSync(appPath);const ast=ts.createSourceFile(appPath,bytes.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let node;
function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='updateCartella')node=n;ts.forEachChild(n,visit);}visit(ast);assert(node);
const exact=node.getText(ast),compiled=ts.transpileModule(exact,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const epoch={current:1}, cartellaWrites={current:new CartellaWriteQueue()};let visible=[createDefaultCartella('synthetic-old-session-patient')];let release,started;const bodyStarted=new Promise(resolve=>started=resolve);const deferredBody=new Promise(resolve=>release=resolve);const writes=[];
const fakeFetch=async()=>({ok:true,json:()=>{started();return deferredBody;}});
const args={sessionEpochRef:epoch,cartelle:visible,createDefaultCartella,mergeCartellaPatch,operatorHeaders:()=>({}),cartellaWrites,cartellaWriteData,API_URL:'http://127.0.0.1:1',fetch:fakeFetch,setCartelle:update=>{visible=typeof update==='function'?update(visible):update;writes.push(visible.map(row=>row.pazienteId));},showToast:()=>{}};
const productionFunction=new Function(...Object.keys(args),`${compiled};return updateCartella;`)(...Object.values(args));
const save=productionFunction('synthetic-old-session-patient',{note:'synthetic stale clinical receipt'},{optimistic:false});
await bodyStarted;
// Headers were accepted while session1 was current. Logout/new session occurs during json().
epoch.current=2;visible=[];
release({patientId:'synthetic-old-session-patient',data:{note:'synthetic stale clinical receipt'}});
const result=await save;
const proof={appSourceSha256:createHash('sha256').update(bytes).digest('hex'),productionFunctionSha256:createHash('sha256').update(exact).digest('hex'),line:ast.getLineAndCharacterOfPosition(node.pos).line+1,actualFunctionExecuted:true,actualQueueAndMappingHelpers:true,networkOnlyControlled:true,epochBeforeHeaders:1,epochDuringJson:2,saveReturned:result,newSessionPatientIds:visible.map(row=>row.pazienteId),stateWrites:writes};
writeFileSync(new URL('./late-session-receipt-result.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');
assert.equal(result,false,'The outer epoch guard does see the changed session');
assert.equal(visible.length,0,'An old clinical receipt must not populate the new session after its JSON body resolves');
