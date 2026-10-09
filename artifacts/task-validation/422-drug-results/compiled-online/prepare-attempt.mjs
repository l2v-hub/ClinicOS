import assert from 'node:assert/strict';
import {mkdirSync,copyFileSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/422-drug-results',out=root+'/'+process.argv[2];assert.ok(process.argv[2]);assert.equal(existsSync(out),false);mkdirSync(out+'/pre-run',{recursive:true});
const files=[];for(const name of ['fixture.mjs','after.mjs','qa-server.mjs','synthetic-reference.pdf','task-contract.md','execution-policy.md','prepare-attempt.mjs']){copyFileSync(root+'/'+name,out+'/'+name);files.push({path:name,sha256:createHash('sha256').update(readFileSync(out+'/'+name)).digest('hex')});}
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8'});assert.equal(r.status,0);return r.stdout;};
const paths=[...git(['ls-files','-z','--','frontend/src','backend/src','prisma','package.json','package-lock.json','frontend/package.json','frontend/vite.config.ts','frontend/tsconfig.app.json','frontend/tsconfig.node.json','scripts/run-node-tests.mjs']).split('\0'),...git(['ls-files','--others','--exclude-standard','-z','--','frontend/src']).split('\0')].filter(Boolean).sort();
const source=paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(out+'/pre-run/snapshot.json',JSON.stringify({head:git(['rev-parse','HEAD']).trim(),capturedAt:new Date().toISOString(),files,source,applicationDiff:git(['diff','HEAD','--','frontend/src']),note:'Development attempts bind physical tracked AND untracked source, not a clean commit claim unless diff empty and no untracked source'},null,2));
