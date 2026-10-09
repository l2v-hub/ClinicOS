import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('artifacts/task-validation/420-import-recovery/independent-qa420');
mkdirSync(root+'/commands',{recursive:true});
const specs=[['frontend-types',['node_modules/typescript/bin/tsc','--noEmit','-p','frontend/tsconfig.app.json']],['backend-types',['node_modules/typescript/bin/tsc','--noEmit','-p','backend/tsconfig.json']],['build',['node_modules/typescript/bin/tsc','-b','frontend/tsconfig.json']],['vite-build',['node_modules/vite/bin/vite.js','build','frontend']],['import-focused',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',...spawnSync('rg',['--files','frontend/src/components/shared/import/__tests__'],{encoding:'utf8'}).stdout.trim().split(/\r?\n/).filter(x=>x.endsWith('.test.ts')),'frontend/src/lib/__tests__/capabilities.test.ts']],['full-regression',['../scripts/run-node-tests.mjs'],'frontend'],['secret-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src','frontend/index.html']]];
const results=[];
for(const [name,args,cwd]of specs){const r=spawnSync(process.execPath,args,{cwd:cwd?resolve(cwd):resolve('.'),encoding:'utf8',maxBuffer:30e6,env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json'),NODE_OPTIONS:'--max-old-space-size=4096'}});writeFileSync(root+'/commands/'+name+'.log',r.stdout+'\n'+r.stderr);results.push({name,args,exitCode:r.status});console.log(JSON.stringify(results.at(-1)));}
const baseline=spawnSync('git',['show','0cc2056fc952a42d40a97d1005e4fc948e468032:artifacts/task-validation/419-calendar-create/root-final/commands/full-regression.log'],{encoding:'utf8',maxBuffer:30e6});assert.equal(baseline.status,0);
writeFileSync(root+'/commands/accepted419-full-regression.log',baseline.stdout);
const failed=s=>[...new Set([...s.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(x=>x[1]))].sort();
const current=readFileSync(root+'/commands/full-regression.log','utf8');const comparison={baseline:'0cc2056fc952a42d40a97d1005e4fc948e468032',baselineFailures:failed(baseline.stdout),currentFailures:failed(current),sameFailures:JSON.stringify(failed(baseline.stdout))===JSON.stringify(failed(current))};
writeFileSync(root+'/commands/regression-comparison.json',JSON.stringify(comparison,null,2));writeFileSync(root+'/commands/results.json',JSON.stringify(results,null,2));
assert.ok(comparison.sameFailures,'New full regression failure');for(const r of results)if(r.name!=='full-regression')assert.equal(r.exitCode,0,r.name);
