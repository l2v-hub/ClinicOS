import pg from 'pg';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resetPatientData,signatures} from './patient-data-reset.mjs';
const root='/backup/patient-reset-2026-10-15';
function command(file,args,env={}) {
 const r=spawnSync(file,args,{encoding:'utf8',env:{...process.env,...env},timeout:300000,maxBuffer:1024*1024});
 if(r.status!==0) throw new Error('CLEANUP_'+file.replaceAll('-','_').toUpperCase()+'_FAILED');
 return r.stdout;
}
async function triggerStates(client) {
 return (await client.query("SELECT c.relname,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY 1,2")).rows;
}
let source,restored,localStarted=false,committed=false;
try {
 process.umask(0o077);
 if(process.env.RAILWAY_SERVICE_ID!==process.env.EXPECTED_BACKUP_SERVICE_ID || !process.env.EXPECTED_BACKUP_SERVICE_ID) throw new Error('BACKUP_SERVICE_ID_MISMATCH');
 const url=new URL(process.env.DATABASE_URL);
 if(url.hostname!=='postgres.railway.internal'||url.pathname!=='/railway') throw new Error('TARGET_CHANGED');
 const baseline=JSON.parse(readFileSync(root+'/baseline-private.json','utf8'));
 if(!baseline.report.restoreVerified||baseline.report.host!==url.hostname||baseline.report.database!=='railway') throw new Error('VERIFIED_BACKUP_REQUIRED');
 const actualSha=createHash('sha256').update(readFileSync(root+'/database.dump')).digest('hex');
 if(actualSha!==baseline.report.dumpSha256) throw new Error('BACKUP_SHA_MISMATCH');
 command('install',['-d','-o','postgres','-g','postgres','-m','700','/tmp/clinicos-reset-test','/tmp/clinicos-reset-socket']);
 command('runuser',['-u','postgres','--','initdb','-D','/tmp/clinicos-reset-test','--auth-local=trust','--auth-host=reject','--no-instructions']);
 command('runuser',['-u','postgres','--','pg_ctl','-D','/tmp/clinicos-reset-test','-l','/tmp/clinicos-reset-test/server.log','-o',"-c listen_addresses='' -k /tmp/clinicos-reset-socket -p 55433",'-w','start']);localStarted=true;
 const localEnv={PGHOST:'/tmp/clinicos-reset-socket',PGPORT:'55433',PGUSER:'postgres',PGDATABASE:'postgres',PGPASSWORD:''};
 command('createdb',['clinicos_reset_test'],localEnv);
 command('pg_restore',['--exit-on-error','--no-owner','--no-privileges','--dbname=clinicos_reset_test',root+'/database.dump'],localEnv);
 restored=new pg.Client({host:localEnv.PGHOST,port:55433,user:'postgres',database:'clinicos_reset_test'});await restored.connect();
 const tables=baseline.signatures.map(r=>r.table);
 if(JSON.stringify(await signatures(restored,tables))!==JSON.stringify(baseline.signatures)) throw new Error('BACKUP_RESTORE_MISMATCH');
 const beforeTriggers=await triggerStates(restored);
 let rollbackObserved=false;
 try {await resetPatientData(restored,{expectedBaseline:baseline.signatures,simulateFailure:true});}
 catch(error) {if(error.message==='SIMULATED_FAILURE_AFTER_DELETE') rollbackObserved=true;else throw error;}
 if(!rollbackObserved||JSON.stringify(await signatures(restored,tables))!==JSON.stringify(baseline.signatures)||JSON.stringify(await triggerStates(restored))!==JSON.stringify(beforeTriggers)) throw new Error('ROLLBACK_VERIFICATION_FAILED');
 const rehearsal=await resetPatientData(restored,{expectedBaseline:baseline.signatures});
 if(!rehearsal.committed) throw new Error('REHEARSAL_FAILED');
 console.log('CLINICOS_CLEANUP_PROGRESS '+JSON.stringify({phase:'isolated_rehearsal_verified',rollbackVerified:true,preservedDataUnchanged:true}));
 source=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});await source.connect();
 const identity=(await source.query("SELECT current_database() AS database,current_setting('server_version_num') AS version")).rows[0];
 if(identity.database!=='railway'||!identity.version.startsWith('18')) throw new Error('PRODUCTION_IDENTITY_FAILED');
 const production=await resetPatientData(source,{expectedBaseline:baseline.signatures});committed=production.committed;
 const report={operationRunId:process.env.MAINTENANCE_RUN_ID,at:new Date().toISOString(),host:url.hostname,database:'railway',backupSha256:actualSha,backupRestoreVerified:true,rollbackVerified:true,isolatedRehearsalVerified:true,production,deletionPerformed:committed};
 writeFileSync(root+'/cleanup-result.json',JSON.stringify(report,null,2),{mode:0o600});
 console.log('CLINICOS_MAINTENANCE_RESULT '+JSON.stringify(report));
} catch(error) {
 console.log('CLINICOS_MAINTENANCE_RESULT '+JSON.stringify({operationRunId:process.env.MAINTENANCE_RUN_ID,failed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CLEANUP_FAILED',deletionPerformed:committed}));process.exitCode=1;
} finally {
 if(restored) await restored.end().catch(()=>{});
 if(source) await source.end().catch(()=>{});
 if(localStarted) {try{command('runuser',['-u','postgres','--','pg_ctl','-D','/tmp/clinicos-reset-test','-m','immediate','stop']);}catch{}}
}
