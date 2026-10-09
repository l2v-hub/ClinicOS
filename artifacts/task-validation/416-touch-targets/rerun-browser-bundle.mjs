import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='C:/w-416/artifacts/task-validation/416-touch-targets';
const qa='C:/w-416-qa/artifacts/task-validation/416-touch-targets/independent';
const jobs=[
  ['baseline-verified',root+'/inspect-baseline.mjs','http://127.0.0.1:7477','C:/w-416'],
  ['root-rerun/browser',root+'/qa-browser-416.mjs','http://127.0.0.1:7478','C:/w-416'],
  ['root-rerun/independent-browser',qa+'/independent-browser.mjs','http://127.0.0.1:7478','C:/w-416-qa'],
  ['root-rerun/adversarial',qa+'/adversarial-browser.mjs','http://127.0.0.1:7478','C:/w-416-qa'],
  ['root-rerun/form-inventory',qa+'/form-inventory-browser.mjs','http://127.0.0.1:7478','C:/w-416-qa'],
];
for(const [name,script,url,cwd] of jobs){
  const out=root+'/'+name;mkdirSync(out,{recursive:true});
  const args=['node_modules/tsx/dist/cli.mjs',script,out];
  writeFileSync(out+'/command.json',JSON.stringify({cwd,args,QA_BASE_URL:url,TSX_TSCONFIG_PATH:cwd+'/frontend/tsconfig.app.json',physicalTouch:'UNVERIFIED'},null,2));
  writeFileSync(out+'/script-at-run.mjs',readFileSync(script));
  const r=spawnSync(process.execPath,args,{cwd,env:{...process.env,QA_BASE_URL:url,TSX_TSCONFIG_PATH:cwd+'/frontend/tsconfig.app.json'},encoding:'utf8',maxBuffer:20*1024*1024});
  writeFileSync(out+'/run.log',(r.stdout||'')+(r.stderr||''));
  writeFileSync(out+'/exit.json',JSON.stringify({exit:r.status}));
  console.log(name+': exit'+r.status);if(r.status!==0)console.log((r.stderr||'').slice(-5000));
  assert.equal(r.status,0,name+' failed; preserved artifacts');
}
