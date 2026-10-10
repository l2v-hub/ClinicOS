import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {verifyBrowser} from './browser-guards.mjs';
const root='artifacts/task-validation/427-agenda-identity',out=process.argv[2];assert.ok(out&&out.startsWith(root+'/'));const plan=JSON.parse(readFileSync(out+'/browser-plan.json')),app=JSON.parse(readFileSync(root+'/frozen-source.json')).applicationCommit,records=[];
for(const r of plan){assert.ok(!r.recipe.includes('..')&&!r.folder.includes('..'));const p=spawnSync(process.execPath,[resolve(out+'/recipes/'+r.recipe),resolve(out+'/'+r.folder)],{encoding:'utf8',maxBuffer:25e6,env:{...process.env,SOURCE_COMMIT:app},windowsHide:true});writeFileSync(out+'/'+r.folder+'.log',(p.stdout||'')+(p.stderr||''));assert.equal(p.status,0,'Frozen browser recipe failed; full artifacts retained');const result=JSON.parse(readFileSync(out+'/'+r.folder+'/test-results/browser-results.json'));verifyBrowser(result,app,r.cases);records.push({recipe:r.recipe,folder:r.folder,cases:r.cases,exit:p.status});console.log('PASS '+r.folder+' '+r.cases);}
writeFileSync(out+'/browser-replay-results.json',JSON.stringify({applicationCommit:app,records,cases:records.reduce((n,r)=>n+r.cases,0)},null,2));
