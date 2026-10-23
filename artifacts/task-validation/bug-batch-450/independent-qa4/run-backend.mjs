import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const owner='clinicos-qa4-481-backend';const root=process.cwd();const out=root+'/artifacts/task-validation/bug-batch-450/independent-qa4';
const env={PATH:process.env.PATH,NODE_ENV:'test',AUTH_MODE:'demo',DOTENV_CONFIG_PATH:'/dev/null',DATABASE_URL:'postgresql://postgres@127.0.0.1:55451/clinicos_qa4',npm_config_cache:'/workspace/.cache/npm'};
const run=(args,options={})=>{const r=spawnSync(args[0],args.slice(1),{env,encoding:'utf8',...options});assert.equal(r.status,0,(r.stderr||r.stdout).slice(-2000));return r.stdout};
assert.notEqual(spawnSync('docker',['inspect',owner],{stdio:'ignore'}).status,0);
let id;
try{id=run(['docker','run','--detach','--rm','--name',owner,'--label','clinicos.qa.owner='+owner,'--publish','127.0.0.1:55451:5432','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_DB=clinicos_qa4','postgres:16-alpine']).trim();
for(let i=0;i<80;i++){if(spawnSync('docker',['exec',id,'pg_isready','-U','postgres','-d','clinicos_qa4'],{stdio:'ignore'}).status===0)break;await new Promise(r=>setTimeout(r,250));if(i===79)throw Error('readiness');}
writeFileSync(out+'/logs/backend-migrate.log',run([process.execPath,'node_modules/prisma/build/index.js','migrate','deploy','--config=prisma.config.ts']));
const files=['src/intake/__tests__/seed-draft-from-import.test.ts','src/intake/__tests__/confirm-draft-guards.test.ts','src/intake/__tests__/parse-discharge-therapy.test.ts'];
const r=spawnSync(process.execPath,['--import','tsx','--test','--test-force-exit',...files],{env,cwd:root+'/backend',encoding:'utf8',timeout:90000});writeFileSync(out+'/logs/backend-tests.log',(r.stdout||'')+(r.stderr||''));assert.equal(r.status,0,(r.stdout||'').slice(-3000));console.log((r.stdout||'').slice(-800));
writeFileSync(out+'/test-results/backend-provenance.json',JSON.stringify({owner,port:55451,database:'clinicos_qa4',freshOwnedContainer:true,files,result:'PASS',actualExit:r.status},null,2));
}finally{if(id){const label=run(['docker','inspect','--format','{{index .Config.Labels "clinicos.qa.owner"}}',id]).trim();assert.equal(label,owner);run(['docker','stop','--time','2',id]);}}
