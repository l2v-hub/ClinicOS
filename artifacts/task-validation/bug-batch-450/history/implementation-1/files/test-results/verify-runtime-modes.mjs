// Local proof driver only. Native CI invokes the portable intake harness directly.
// Both real modes execute unchanged source. The native alternate owns a fresh synthetic
// PostgreSQL fixture on55450; it never touches the unrelated existing service on5432.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=process.cwd();
const packet=path.resolve('artifacts/task-validation/bug-batch-450');
const source=path.join(root,'scripts/e2e/issue-450-ingresso.mjs');
const digest=()=>createHash('sha256').update(readFileSync(source)).digest('hex');
const before=digest();
const allowed=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|LANG|LC_.+|TMPDIR|TEMP|TMP|SSL_CERT_FILE|SSL_CERT_DIR|REQUESTS_CA_BUNDLE|NODE_EXTRA_CA_CERTS|HTTPS?_PROXY|https?_proxy|ALL_PROXY|all_proxy|NO_PROXY|no_proxy|PLAYWRIGHT_BROWSERS_PATH)$/.test(key)));
const name='clinicos-qa-batch450-native-fixture';
const owner='clinicos-qa-batch450';
let container;
function docker(args){const result=spawnSync('docker',args,{encoding:'utf8',env:allowed});assert.equal(result.status,0,`Owned fixture Docker command failed: ${args[0]} ${result.stderr}`);return result.stdout.trim();}
function prove(mode,extra={}){
 console.log(`BEGIN real ${mode} mode, source SHA256 ${before}`);
 const result=spawnSync(process.execPath,[source,packet],{cwd:root,env:{...allowed,QA_POSTGRES_MODE:mode,...extra},stdio:'inherit'});
 assert.equal(result.status,0,`Actual ${mode} full-stack runtime failed`);
 assert.equal(digest(),before,'Source must remain identical between modes');
 const dir=path.join(packet,'test-results',`${mode}-mode`);mkdirSync(dir,{recursive:true});
 for(const file of ['fullstack.json','runtime-source-receipt.json','database-provenance.json','evidence-redaction.json'])copyFileSync(path.join(packet,'test-results',file),path.join(dir,file));
 for(const file of ['backend.log','frontend.log'])copyFileSync(path.join(packet,'logs',file),path.join(dir,file));
 console.log(`PASS real ${mode} mode`);
}
try{
 prove('docker');
 assert.notEqual(spawnSync('docker',['inspect',name],{env:allowed}).status,0,'Refuse existing native fixture');
 container=docker(['run','--detach','--rm','--name',name,'--label',`clinicos.qa.owner=${owner}`,'--publish','127.0.0.1:55450:5432','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_DB=clinicos_test','postgres:16-alpine']);
 for(let i=0;i<80;i++){
  if(spawnSync('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres','-d','clinicos_test'],{env:allowed,stdio:'ignore'}).status===0)break;
  assert.ok(i<79,'Native fixture PostgreSQL readiness');
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 docker(['exec',container,'psql','-U','postgres','-d','clinicos_test','-v','ON_ERROR_STOP=1','-c',`COMMENT ON DATABASE clinicos_test IS 'clinicos-qa-native-fixture:${owner}'`]);
 prove('native',{QA_NATIVE_DATABASE_URL:'postgresql://postgres@127.0.0.1:55450/clinicos_test'});
 const parent=docker(['exec',container,'psql','-U','postgres','-d','clinicos_test','-tAc',"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"]);
 assert.equal(parent,'0','The synthetic native parent must never be migrated');
 const child=docker(['exec',container,'psql','-U','postgres','-d','clinicos_test','-tAc',"SELECT count(*) FROM pg_database WHERE datname='clinicos_qa_batch450'"]);
 assert.equal(child,'0','Owned child database must be removed');
 writeFileSync(path.join(packet,'test-results','runtime-modes.json'),JSON.stringify({pass:true,unchangedHarnessSha256:before,modes:['docker','native'],nativeParentPublicTableCount:0,nativeChildDatabaseCountAfterCleanup:0},null,2)+'\n');
}finally{
 if(container){assert.equal(docker(['inspect','--format','{{ index .Config.Labels "clinicos.qa.owner" }}',container]),owner);docker(['stop','--time','2',container]);}
}
