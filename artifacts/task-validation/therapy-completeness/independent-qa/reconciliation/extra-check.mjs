import { spawnSync, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const dir=resolve('artifacts/task-validation/therapy-reconciliation-qa');
const name=process.argv[2];
if(!/^[a-z0-9-]+$/.test(name??''))throw Error('Explicit run required');
const commands={
 adversarial:['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',dir+'/adversarial.test.ts'],
 service:['--import','tsx','--test',dir+'/service-defense.test.ts'],
 fullfrontend:[resolve('scripts/run-node-tests.mjs')],
 security:[resolve('scripts/security/scan-frontend-secrets.mjs'),'frontend/src','frontend/dist','backend/src/intake/therapy-source-inventory.ts',dir+'/qa-dist'],
 browser:[resolve('node_modules/playwright/cli.js'),'test','--config',dir+'/native.config.mjs'],
};
const key=process.argv[3]; if(!commands[key])throw Error('Unknown case');
const env={...process.env,DATABASE_URL:'postgresql://unit:unit@127.0.0.1:1/unit_no_db',TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')};
if(key==='browser'){env.RECONCILE='1';env.RUN=name;}
mkdirSync(dir+'/logs',{recursive:true});
const run=spawnSync(process.execPath,commands[key],{cwd:key==='fullfrontend'?resolve('frontend'):resolve('.'),env,encoding:'utf8',windowsHide:true,maxBuffer:40e6,timeout:240000});
writeFileSync(dir+'/logs/'+name+'.log',(run.stdout??'')+(run.stderr??''));
const receipt={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),key,args:commands[key],exit:run.status,timedOut:run.error?.code==='ETIMEDOUT',noRealDatabase:true,noProviders:true,at:new Date().toISOString()};
writeFileSync(dir+'/logs/'+name+'.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));process.exitCode=run.status??1;
