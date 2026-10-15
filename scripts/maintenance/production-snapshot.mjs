import pg from 'pg';
import {spawnSync} from 'node:child_process';
import {mkdirSync,chmodSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/backup/patient-reset-2026-10-15';
const quote=s=>'"'+s.replaceAll('"','""')+'"';
function command(file,args,env={}) {
 const r=spawnSync(file,args,{encoding:'utf8',env:{...process.env,...env},timeout:300000,maxBuffer:1024*1024});
 if(r.status!==0) throw new Error('BACKUP_'+file.replaceAll('-','_').toUpperCase()+'_FAILED');
 return r.stdout;
}
async function signatures(client) {
 const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
 const result=[];
 for(const {tablename} of tables) {
  const row=(await client.query(`SELECT count(*)::text AS rows,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS digest FROM (SELECT md5(to_jsonb(t)::text) AS h FROM public.${quote(tablename)} t) s`)).rows[0];
  result.push({table:tablename,...row});
 }
 return result;
}
let source,restored,localStarted=false;
try {
 process.umask(0o077);
 const url=new URL(process.env.DATABASE_URL);
 if(url.hostname!=='postgres.railway.internal'||url.pathname!=='/railway') throw new Error('TARGET_CHANGED');
 if(existsSync(root+'/database.dump')) throw new Error('BACKUP_ALREADY_EXISTS');
 mkdirSync(root,{recursive:true,mode:0o700});chmodSync(root,0o700);
 source=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});await source.connect();
 await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await source.query("SET LOCAL statement_timeout='120s'");
 const identity=(await source.query("SELECT current_database() AS database,current_setting('server_version_num') AS version,current_setting('transaction_read_only') AS readonly")).rows[0];
 if(identity.database!=='railway'||identity.readonly!=='on'||!identity.version.startsWith('18')) throw new Error('SOURCE_IDENTITY_FAILED');
 const snapshot=(await source.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
 const before=await signatures(source);
 const pgEnv={PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1))};
 if(url.searchParams.has('sslmode')) pgEnv.PGSSLMODE=url.searchParams.get('sslmode');
 console.log('CLINICOS_BACKUP_PROGRESS '+JSON.stringify({phase:'consistent_snapshot',tables:before.length}));
 command('pg_dump',['--format=custom','--file='+root+'/database.dump','--snapshot='+snapshot,'--no-password'],pgEnv);
 await source.query('ROLLBACK');
 const dumpSha256=createHash('sha256').update(readFileSync(root+'/database.dump')).digest('hex');
 command('install',['-d','-o','postgres','-g','postgres','-m','700','/tmp/clinicos-restore','/tmp/clinicos-restore-socket']);
 command('runuser',['-u','postgres','--','initdb','-D','/tmp/clinicos-restore','--auth-local=trust','--auth-host=reject','--no-instructions']);
 command('runuser',['-u','postgres','--','pg_ctl','-D','/tmp/clinicos-restore','-l','/tmp/clinicos-restore/server.log','-o',"-c listen_addresses='' -k /tmp/clinicos-restore-socket -p 55432",'-w','start']);localStarted=true;
 const restoreEnv={PGHOST:'/tmp/clinicos-restore-socket',PGPORT:'55432',PGUSER:'postgres',PGDATABASE:'postgres',PGPASSWORD:''};
 command('createdb',['clinicos_restore'],restoreEnv);
 command('pg_restore',['--exit-on-error','--no-owner','--no-privileges','--dbname=clinicos_restore',root+'/database.dump'],restoreEnv);
 restored=new pg.Client({host:'/tmp/clinicos-restore-socket',port:55432,user:'postgres',database:'clinicos_restore'});await restored.connect();
 const after=await signatures(restored);
 if(JSON.stringify(before)!==JSON.stringify(after)) throw new Error('RESTORE_DATA_MISMATCH');
 const constraints=(await restored.query("SELECT count(*)::int AS invalid FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated")).rows[0];
 if(constraints.invalid!==0) throw new Error('RESTORED_CONSTRAINTS_INVALID');
 const report={createdAt:new Date().toISOString(),host:url.hostname,database:'railway',dumpSha256,restoreVerified:true,verifiedTables:before.length,counts:before.map(({table,rows})=>({table,rows}))};
 writeFileSync(root+'/baseline-private.json',JSON.stringify({report,signatures:before},null,2),{mode:0o600});
 writeFileSync(root+'/restore-verified.json',JSON.stringify(report,null,2),{mode:0o600});
 console.log('CLINICOS_MAINTENANCE_RESULT '+JSON.stringify({backup:report,path:root+'/database.dump',deletionPerformed:false}));
} catch(error) {
 console.log('CLINICOS_MAINTENANCE_RESULT '+JSON.stringify({failed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'BACKUP_FAILED',deletionPerformed:false}));process.exitCode=1;
} finally {
 if(restored) await restored.end().catch(()=>{});
 if(source) await source.end().catch(()=>{});
 if(localStarted) {try{command('runuser',['-u','postgres','--','pg_ctl','-D','/tmp/clinicos-restore','-m','immediate','stop']);}catch{}}
}
