import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const root='artifacts/task-validation/415-catalog-purpose',records=[];
function run(name,script,output){
  const result=spawnSync(process.execPath,['--import','tsx',script,output],{encoding:'utf8',maxBuffer:40*1024*1024});
  mkdirSync(root+'/root-rerun',{recursive:true});writeFileSync(root+`/root-rerun/${name}.log`,(result.stdout||'')+(result.stderr||''));
  records.push({name,script,output,exit:result.status});console.log(`${name}: ${result.status}`);
}
run('ordinary-browser',root+'/qa-browser-415.mjs',root+'/root-rerun/browser');
writeFileSync(root+'/root-rerun/browser-run-results.json',JSON.stringify(records,null,2));
if(records.some(r=>r.exit!==0))process.exitCode=1;
