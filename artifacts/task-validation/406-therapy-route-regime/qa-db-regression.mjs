import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync,writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { startPo05Postgres } from '../../../tests/fixtures/po05-postgres.mjs';
const out=resolve(process.env.QA406_OUTPUT || 'artifacts/task-validation/406-therapy-route-regime/independent');mkdirSync(out,{recursive:true});
const pg=await startPo05Postgres({artifactRoot:resolve(tmpdir(),'clinicos-bug406-regression-synthetic'),repositoryRoot:process.cwd()});
const records=[];
try{
 for(const name of ['therapy-authoritative-write','therapy-prn-confirmation','patient-clinical-scope']){
  const result=await new Promise((ok,fail)=>{
   const child=spawn(process.execPath,['--import','tsx','--test',`backend/src/routes/__tests__/${name}.test.ts`],{windowsHide:true,env:{...process.env,DATABASE_URL:pg.url,NODE_ENV:'test',AUTH_MODE:'demo',ROLE_SIMULATOR_ENABLED:name==='therapy-prn-confirmation'?'true':'false',RESIDENT_SCOPE_CONFIG:JSON.stringify({fallback:'registered_by_me'}),AI_MOCK_MODE:'true',OPENAI_API_KEY:'',PORT:'0'}});
   let log='';child.stdout.on('data',c=>log+=c);child.stderr.on('data',c=>log+=c);child.on('error',fail);child.on('close',exit=>ok({exit,log}));
  });
  writeFileSync(resolve(out,`db-regression-${name}.log`),result.log);
  const stats=Object.fromEntries([...result.log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m=>[m[1],Number(m[2])]));records.push({name,exit:result.exit,...stats});console.log(`${name}: exit${result.exit} ${JSON.stringify(stats)}`);
 }
 writeFileSync(resolve(out,'db-regression-results.json'),JSON.stringify({kind:'Existing scoped backend regression tests against new isolated loopback PostgreSQL, no ambient URL/provider credential',version:(await pg.db.query('select version()')).rows[0].version,records},null,2));
 if(records.some(r=>r.exit!==0))process.exitCode=1;
}finally{await pg.close();}
