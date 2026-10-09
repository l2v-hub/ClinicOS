import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve('artifacts/task-validation/422-drug-results/independent-qa422'),attempt=process.argv[2];assert.match(attempt,/^[a-z0-9-]+$/);const out=root+'/'+attempt;assert.equal(existsSync(out),false);mkdirSync(out,{recursive:true});
const names=['fixture.mjs','after.mjs','extra.mjs','strong.mjs','qa-server.mjs','modal-surface.html','modal-entry.jsx','synthetic-reference.pdf','task-contract.md','source-before.json'];
for(const name of names)copyFileSync(root+'/'+name,out+'/'+name);writeFileSync(out+'/recipe-before.json',JSON.stringify({files:names.map(path=>({path,sha256:createHash('sha256').update(readFileSync(out+'/'+path)).digest('hex')}))},null,2));console.log(out);
