import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultBin = 'C:/Users/Claudio/AppData/Local/Temp/clinicos-sorting-pg-20260918/package/native/bin';

async function unusedPort() {
  const socket = createServer();
  await new Promise((ok, fail) => { socket.once('error', fail); socket.listen(0, '127.0.0.1', ok); });
  const port = socket.address().port;
  await new Promise((ok, fail) => socket.close(error => error ? fail(error) : ok()));
  return port;
}

/** Real PostgreSQL in a new synthetic cluster; never uses an inherited DATABASE_URL. */
export async function startPo05Postgres({ artifactRoot = resolve(root, 'artifacts/task-validation/po-05-scansioni-lunghe/scratch'), bin = process.env.PO05_PG_BIN || defaultBin, repositoryRoot = root } = {}) {
  await mkdir(artifactRoot, { recursive: true });
  const directory = await mkdtemp(resolve(artifactRoot, 'postgres-'));
  const dataDir = resolve(directory, 'data');
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const init = spawnSync(resolve(bin, `initdb${suffix}`), ['-D', dataDir, '--username=postgres', '--auth=trust', '--encoding=UTF8', '--locale=C'], { windowsHide: true, encoding: 'utf8' });
  await writeFile(resolve(directory, 'init.log'), `${init.stdout || ''}\n${init.stderr || ''}`);
  if (init.status !== 0) throw new Error(`Synthetic initdb failed (${init.status}); see ${directory}/init.log`);
  const port = await unusedPort();
  const url = `postgresql://postgres@127.0.0.1:${port}/postgres`;
  const log = createWriteStream(resolve(directory, 'postgres.log'));
  const processHandle = spawn(resolve(bin, `postgres${suffix}`), ['-D', dataDir, '-h', '127.0.0.1', '-p', String(port), '-c', 'timezone=Europe/Rome', '-c', 'max_connections=30'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  processHandle.stdout.pipe(log, { end: false });
  processHandle.stderr.pipe(log, { end: false });
  let startupError;
  processHandle.on('error', error => { startupError = error; });
  let client;
  let closed = false;
  const stop = async () => {
    if (closed) return;
    closed = true;
    if (client) await client.end();
    const result = spawnSync(resolve(bin, `pg_ctl${suffix}`), ['-D', dataDir, 'stop', '-m', 'fast', '-w', '-t', '15'], { windowsHide: true, encoding: 'utf8' });
    log.end();
    if (result.status !== 0 && processHandle.exitCode === null) throw new Error(`Could not stop synthetic PostgreSQL at ${directory}`);
  };
  try {
    for (let i = 0; i < 100; i++) {
      if (startupError) throw startupError;
      if (processHandle.exitCode !== null) throw new Error('Synthetic PostgreSQL exited during startup');
      const attempt = new pg.Client({ connectionString: url, connectionTimeoutMillis: 250 });
      try { await attempt.connect(); client = attempt; break; }
      catch { await attempt.end().catch(() => {}); await new Promise(ok => setTimeout(ok, 100)); }
    }
    if (!client) throw new Error('Synthetic PostgreSQL startup timed out');
    const migrationDir = resolve(repositoryRoot, 'prisma/migrations');
    const names = (await readdir(migrationDir, { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name).sort();
    const applied = [];
    for (const name of names) {
      const sql = await readFile(resolve(migrationDir, name, 'migration.sql'), 'utf8');
      await client.query(sql);
      applied.push({ name, sha256: createHash('sha256').update(sql).digest('hex') });
    }
    await writeFile(resolve(directory, 'migrations.json'), JSON.stringify(applied, null, 2));
    return { url, directory, applied, db: client, close: stop };
  } catch (error) {
    await stop().catch(() => {});
    throw error;
  }
}
