import pg from 'pg';
const client = new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
const q = (s) => '"' + s.replaceAll('"','""') + '"';
try {
  const url = new URL(process.env.DATABASE_URL);
  if(url.hostname !== 'postgres.railway.internal' || url.pathname !== '/railway') throw new Error('TARGET_CHANGED');
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='30s'");
  const identity=(await client.query("SELECT current_database() AS database,current_setting('transaction_read_only') AS readonly,current_setting('server_version_num') AS version,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser")).rows[0];
  if(identity.database !== 'railway' || identity.readonly !== 'on') throw new Error('IDENTITY_FAILED');
  const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  const counts=[];
  for(const {tablename} of tables) counts.push({table:tablename,rows:(await client.query(`SELECT count(*)::text AS n FROM public.${q(tablename)}`)).rows[0].n});
  const foreignKeys=(await client.query("SELECT conrelid::regclass::text AS source,confrelid::regclass::text AS target,conname AS name,confdeltype AS deletion FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY 1,2")).rows;
  const triggers=(await client.query("SELECT c.relname AS table,t.tgname AS name,t.tgenabled AS enabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' ORDER BY 1,2")).rows;
  const archival=(await client.query('SELECT count(*)::text AS total,count(*) FILTER (WHERE "dataBase64" IS NULL)::text AS missingDurableCopy FROM "ImportDocument"')).rows[0];
  await client.query('ROLLBACK');
  console.log('CLINICOS_MAINTENANCE_RESULT '+JSON.stringify({mode:'read-only',identity,counts,foreignKeys,triggers,archival,deletionPerformed:false}));
} catch(error) {
  console.log('CLINICOS_MAINTENANCE_RESULT '+JSON.stringify({failed:true,code:/^[A-Z0-9_]+$/.test(error.code ?? '')?error.code:'INVENTORY_FAILED',deletionPerformed:false}));process.exitCode=1;
} finally {await client.end().catch(()=>{});}
