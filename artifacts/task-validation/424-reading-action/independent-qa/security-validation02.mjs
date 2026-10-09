import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {writeFileSync,readFileSync,readdirSync,statSync,mkdirSync,copyFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve('artifacts/task-validation/424-reading-action/independent-qa/security02');mkdirSync(root,{recursive:true});
const changed=spawnSync('git',['diff','--name-only','b5f471cd2cd56839e7ebbd0d3daf0bbf04791468..HEAD'],{encoding:'utf8'}).stdout.trim().split('\n');assert.equal(changed.length,5);
const records=[];
for(const kind of ['baseline','candidate']){
 const dir=root+'/'+kind;mkdirSync(dir,{recursive:true});
 for(const p of changed){const target=dir+'/'+p;mkdirSync(dirname(target),{recursive:true});if(kind==='candidate')copyFileSync(p,target);else{const r=spawnSync('git',['show','b5f471cd2cd56839e7ebbd0d3daf0bbf04791468:'+p],{maxBuffer:20e6});assert.equal(r.status,0);writeFileSync(target,r.stdout);}}
 const r=spawnSync(process.execPath,['C:/Users/Claudio/AppData/Roaming/npm/node_modules/ruflo/bin/ruflo.js','security','scan','--target',dir,'--depth','deep','--type','code','--output','json'],{cwd:dir,encoding:'utf8',maxBuffer:20e6,windowsHide:true});
 writeFileSync(root+'/'+kind+'-cli.log',(r.stdout||'')+(r.stderr||''));
 const files=[];function walk(d){for(const n of readdirSync(d)){const p=d+'/'+n;if(statSync(p).isDirectory())walk(p);else if(n.endsWith('.json'))files.push(p);}}
 walk(dir+'/.claude/security-scans');const scan=JSON.parse(readFileSync(files.find(p=>p.includes('code'))));records.push({kind,summary:scan.summary,findings:scan.findings});
}
assert.deepEqual(records[0].summary,records[1].summary);assert.deepEqual(records[0].findings,records[1].findings);
writeFileSync(root+'/comparison.json',JSON.stringify({candidate:'67d21c3e9257a5acb8c9b25130c9417fb92185fb',baseline:'b5f471cd2cd56839e7ebbd0d3daf0bbf04791468',changed,records,newFindings:[],scope:'Five changed files only, copied into QA-owned artifact samples before native scan to keep application readonly. No global vulnerability/CVE certification.'},null,2));console.log('Independent native scoped scan compared baseline: zero new');
