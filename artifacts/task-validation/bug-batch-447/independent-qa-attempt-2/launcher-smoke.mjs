import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {openSync,closeSync,writeFileSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.resolve('package.json'));
const pg=require('pg');
const out=path.resolve('artifacts/task-validation/bug-batch-447/test-results');
const container='clinicos-qa-batch447';
const secret=randomBytes(24).toString('hex'),owner=randomBytes(16).toString('hex');
let containerId,client;
const proof={mode:'native-adapter-emulated-with-owned-postgres16',port:55447,parent:'clinicos_test'};
try{
 assert.notEqual(spawnSync('docker',['inspect',container],{stdio:'ignore'}).status,0,'Owned QA container name must be free');
 const created=spawnSync('docker',['run','--rm','-d','--name',container,'--label','clinicos.qa.batch=447','--label',`clinicos.qa.owner=${owner}`,'-p','127.0.0.1:55447:5432','-e',`POSTGRES_PASSWORD=${secret}`,'-e','POSTGRES_DB=clinicos_test','postgres:16'],{encoding:'utf8'});
 assert.equal(created.status,0,'Disposable synthetic PostgreSQL must start');containerId=created.stdout.trim();
 let ready=false;for(let i=0;i<60;i++){if(spawnSync('docker',['exec',containerId,'pg_isready','-h','127.0.0.1','-U','postgres','-d','clinicos_test'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
 const nativeUrl=`postgresql://postgres:${secret}@127.0.0.1:55447/clinicos_test?schema=public`;
 for(let attempt=0;attempt<60;attempt++){
  const candidate=new pg.Client({connectionString:nativeUrl});candidate.on('error',()=>{});
  try{await candidate.connect();const check=await candidate.query("SELECT current_setting('server_version_num')::int AS version");client=candidate;proof.version=check.rows[0].version;proof.sqlReadyAttempts=attempt+1;break;}
  catch{await candidate.end().catch(()=>{});await new Promise(r=>setTimeout(r,500));}
 }
 assert.ok(client,'Actual loopback SQL readiness is required');assert.ok(proof.version>=160000&&proof.version<170000);
 const before=await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'");assert.equal(before.rows[0].n,0);
 const fd=openSync(path.join(out,'browser-native-clear-scope.txt'),'w');
 const keys=['PATH','HOME','LANG','LC_ALL','TMPDIR','TZ','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','REQUESTS_CA_BUNDLE','CURL_CA_BUNDLE','npm_config_cafile','NPM_CONFIG_CAFILE'];
 const safeEnv=Object.fromEntries(keys.filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
 const child=spawn(process.execPath,['e2e/qa-bug-batch-447.mjs'],{env:{...safeEnv,CLINICOS_QA_LIFECYCLE_LOCK447:'held',QA_NATIVE_DATABASE_URL:nativeUrl,PLAYWRIGHT_BROWSERS_PATH:'/workspace/.cache/clinicos-batch447-playwright',PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:'/usr/bin/chromium'},stdio:['ignore',fd,fd]});
 const exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});closeSync(fd);
 const provenance=JSON.parse(readFileSync(path.join(out,'database-provenance.json'),'utf8'));
 const after=await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'");
 const remaining=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[provenance.ownedDatabase]);
 Object.assign(proof,{wrapperExit:exit,parentPublicTablesBefore:before.rows[0].n,parentPublicTablesAfter:after.rows[0].n,parentUntouched:before.rows[0].n===after.rows[0].n,ownedDatabaseRemoved:remaining.rowCount===0,ownershipVerified:provenance.cleanupOwnershipVerified===true});
 assert.equal(after.rows[0].n,0,'Parent must never be migrated');assert.equal(remaining.rowCount,0);assert.equal(provenance.cleanupOwnershipVerified,true);
 writeFileSync(path.join(out,'native-adapter-result.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify(proof));process.exitCode=exit??1;
}catch(error){
 writeFileSync(path.join(out,'native-adapter-failure.json'),JSON.stringify({...proof,status:'failed',message:error.message},null,2)+'\n');
 throw error;
}finally{
 if(client)await client.end().catch(()=>{});
 if(containerId){const pgLogs=spawnSync('docker',['logs',containerId],{encoding:'utf8'});writeFileSync(path.join(out,'postgres-native-emulator.log'),pgLogs.stdout+pgLogs.stderr);}
 if(containerId){const marker=spawnSync('docker',['inspect','--format','{{index .Config.Labels "clinicos.qa.owner"}}',containerId],{encoding:'utf8'});assert.equal(marker.stdout.trim(),owner,'Refuse cleanup if container ownership changed');const stop=spawnSync('docker',['stop',containerId],{stdio:'ignore'});assert.equal(stop.status,0);}
}
