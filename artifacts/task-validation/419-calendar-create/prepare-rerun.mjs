import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/419-calendar-create/root-rerun';
if(existsSync(root))throw Error('Immutable root rerun already exists');mkdirSync(`${root}/pre-run`,{recursive:true});
const source='C:/w-419-qa/artifacts/task-validation/419-calendar-create/independent-qa419';
const files=[];for(const path of ['recipe.mjs','fixture.mjs']){const bytes=readFileSync(`${source}/${path}`);writeFileSync(`${root}/${path}`,bytes);writeFileSync(`${root}/pre-run/${path}.source`,bytes);files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
const r=spawnSync(process.execPath,['artifacts/task-validation/419-calendar-create/source-receipt.mjs','fa028c11ffe5dbfe514df8110e6ccf7f6b977602',`${root}/pre-run/source`],{encoding:'utf8'});if(r.status!==0)throw Error('Frozen source prerequisite failed');
writeFileSync(`${root}/pre-run/snapshot.json`,JSON.stringify({createdAt:new Date().toISOString(),files,application:'fa028c11ffe5dbfe514df8110e6ccf7f6b977602',actualRuntime:'root-owned SPA actual compiler7491',recipeOrigin:'Readonly independent13-case recipe copied byte-identically; source physical differences individually canonical checked separately'},null,2));
