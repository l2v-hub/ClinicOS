// Read-only preparation for an explicitly requested production cleanup.
// No patient rows, credentials, document bytes or other clinical content are printed.
import pg from 'pg';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
  }),
);
const raw = process.env.CLINICOS_PRODUCTION_DATABASE_URL;
if (!raw)
  throw new Error('Configure CLINICOS_PRODUCTION_DATABASE_URL in secure environment settings');
let target;
try {
  target = new URL(raw);
} catch {
  throw new Error('Invalid production database configuration');
}
if (!['postgresql:', 'postgres:'].includes(target.protocol))
  throw new Error('PostgreSQL target required');
const database = decodeURIComponent(target.pathname.slice(1));
if (target.hostname !== args['--expected-host'] || database !== args['--expected-database'])
  throw new Error('Database identity does not match the explicitly selected host and database');
if (Object.keys(args).some((key) => !['--expected-host', '--expected-database'].includes(key)))
  throw new Error('Unsupported argument; this command performs inventory only');

const client = new pg.Client({ connectionString: raw, connectionTimeoutMillis: 10000 });
const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout = '15s'");
  const identity = await client.query(
    "SELECT current_database() AS database, current_setting('transaction_read_only') AS readonly, version() AS version",
  );
  if (identity.rows[0].database !== database || identity.rows[0].readonly !== 'on')
    throw new Error('Read-only database identity verification failed');
  const tables = await client.query(
    "SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  );
  const counts = [];
  for (const { schemaname, tablename } of tables.rows) {
    const result = await client.query(
      `SELECT count(*)::text AS count FROM ${quote(schemaname)}.${quote(tablename)}`,
    );
    counts.push({ table: tablename, rows: result.rows[0].count });
  }
  await client.query('ROLLBACK');
  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        host: target.hostname,
        database,
        mode: 'read-only',
        tables: counts,
        deletionPerformed: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  // Driver error messages can contain a connection URL. Keep diagnostics free of credentials.
  console.error(
    JSON.stringify({ inventoryFailed: true, code: error.code ?? 'verification_failed' }),
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
