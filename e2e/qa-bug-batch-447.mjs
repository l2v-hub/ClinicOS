// Owned, disposable synthetic PostgreSQL + HTTP + Chromium acceptance stack.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import pg from 'pg';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'artifacts/task-validation/bug-batch-447');
mkdirSync(path.join(out, 'test-results'), { recursive: true });
const container = 'clinicos-qa-batch447';
const dbName = 'clinicos_qa_batch447';
const password = randomBytes(24).toString('hex');
const nativeMode =
  Boolean(process.env.QA_NATIVE_DATABASE_URL) ||
  process.env.QA_POSTGRES_MODE === 'native' ||
  existsSync('/usr/lib/postgresql/16/bin/psql');
let nativeTarget;
if (nativeMode) {
  nativeTarget = new URL(
    process.env.QA_NATIVE_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@127.0.0.1:5432/clinicos_test',
  );
  assert.ok(['postgresql:', 'postgres:'].includes(nativeTarget.protocol));
  assert.ok(['localhost', '127.0.0.1'].includes(nativeTarget.hostname));
  assert.equal(nativeTarget.pathname, '/clinicos_test');
  assert.ok(
    (nativeTarget.port || '5432') === '5432' ||
      (Boolean(process.env.QA_NATIVE_DATABASE_URL) && nativeTarget.port === '55447'),
    'Only trusted CI5432 or the explicit owned synthetic55447 service is accepted',
  );
}
const children = [],
  logs = [];
let ownedContainer = false;
let browserPassed = false;
let databaseTestsPassed = false;
const fullBackendOnly = process.argv.includes('--full-backend-tests-only');
const databaseOnly = process.argv.includes('--database-tests-only') || fullBackendOnly;
let nativeClient;
let nativeDatabaseCreated = false;
const nativeOwner = randomBytes(16).toString('hex');
const nativeDatabase = nativeMode ? `clinicos_qa_batch447_${nativeOwner}` : dbName;
const databaseReceipt = {
  mode: nativeMode ? 'native-postgresql16' : 'owned-docker-postgresql16',
  syntheticOnly: true,
};
const inherited = Object.fromEntries(
  [
    'PATH',
    'HOME',
    'LANG',
    'LC_ALL',
    'TMPDIR',
    'TZ',
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'ALL_PROXY',
    'NO_PROXY',
    'NODE_EXTRA_CA_CERTS',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR',
    'REQUESTS_CA_BUNDLE',
    'CURL_CA_BUNDLE',
    'npm_config_cafile',
    'NPM_CONFIG_CAFILE',
    'PLAYWRIGHT_BROWSERS_PATH',
    'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH',
  ]
    .filter((key) => process.env[key])
    .map((key) => [key, process.env[key]]),
);
// One lock covers container networking, services, browser and teardown. Never nest it.
if (process.env.CLINICOS_QA_LIFECYCLE_LOCK447 !== 'held') {
  const locked = spawn(
    'flock',
    [
      '/tmp/clinicos-browser-qa.lock',
      process.execPath,
      path.join(root, 'e2e/qa-bug-batch-447.mjs'),
      ...process.argv.slice(2),
    ],
    {
      cwd: root,
      env: {
        ...inherited,
        CLINICOS_QA_LIFECYCLE_LOCK447: 'held',
        ...(nativeMode
          ? { QA_POSTGRES_MODE: 'native', QA_NATIVE_DATABASE_URL: nativeTarget.toString() }
          : {}),
      },
      stdio: 'inherit',
    },
  );
  const status = await new Promise((resolve) => locked.on('exit', resolve));
  process.exit(status ?? 1);
}
const cacheRoot = existsSync('/workspace/.cache')
  ? '/workspace/.cache'
  : path.join(tmpdir(), 'clinicos-qa-cache');
const browserCache =
  process.env.PLAYWRIGHT_BROWSERS_PATH ??
  (nativeMode
    ? path.join(homedir(), '.cache', 'ms-playwright')
    : path.join(cacheRoot, 'clinicos-batch447-playwright'));
const ffmpeg = path.join(browserCache, 'ffmpeg-1011/ffmpeg-linux');
mkdirSync(path.dirname(ffmpeg), { recursive: true });
if (!existsSync(ffmpeg) && existsSync('/usr/bin/ffmpeg')) symlinkSync('/usr/bin/ffmpeg', ffmpeg);
const env = {
  ...inherited,
  XDG_CACHE_HOME: cacheRoot,
  PLAYWRIGHT_BROWSERS_PATH: browserCache,
  NODE_ENV: 'test',
  AUTH_MODE: 'demo',
  ROLE_SIMULATOR_ENABLED: 'true',
  AI_WORKER_INLINE: 'false',
  AI_PROVIDER: 'disabled',
  PORT: '3447',
  FRONTEND_URL: 'http://127.0.0.1:5447',
  VITE_API_URL: 'http://127.0.0.1:3447',
  QA_FRONTEND_URL: 'http://127.0.0.1:5447',
  QA_BACKEND_URL: 'http://127.0.0.1:3447',
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || existsSync('/usr/bin/chromium')
    ? {
        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium',
      }
    : {}),
};
function run(command, args, options = {}) {
  const { logName, ...spawnOptions } = options;
  const p = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', ...spawnOptions });
  if (logName) {
    let output = `${p.stdout ?? ''}${p.stderr ?? ''}`;
    for (const secret of [env.DATABASE_URL, env.DATABASE_URL && new URL(env.DATABASE_URL).password])
      if (secret) output = output.split(secret).join('[redacted database credential]');
    writeFileSync(path.join(out, 'test-results', logName), output);
  }
  if (p.status !== 0)
    throw new Error(
      `QA stack command failed: ${command} ${args[0] ?? ''} (${p.status}); inspect sanitized local output`,
    );
  return p.stdout;
}
async function ready(url) {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`QA service did not become ready: ${new URL(url).pathname}`);
}
async function verifyOwnedDatabase() {
  assert.match(
    nativeDatabase,
    nativeMode ? /^clinicos_qa_batch447_[a-f0-9]{32}$/ : /^clinicos_qa_batch447$/,
  );
  if (ownedContainer) {
    const owner = spawnSync(
      'docker',
      ['inspect', '--format', '{{index .Config.Labels "clinicos.qa.owner"}}', container],
      { encoding: 'utf8' },
    );
    assert.equal(owner.status, 0);
    assert.equal(
      owner.stdout.trim(),
      nativeOwner,
      'QA container ownership changed; refusing database mutation',
    );
  }
  const marker = await nativeClient.query(
    "SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=$1",
    [nativeDatabase],
  );
  assert.equal(
    marker.rows[0]?.marker,
    `clinicos-qa-batch447:${nativeOwner}`,
    'QA database ownership changed; refusing DROP',
  );
}
async function waitForOwnedConnectionsToClose() {
  const deadline = Date.now() + 2_000;
  do {
    const connections = await nativeClient.query(
      'SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=$1',
      [nativeDatabase],
    );
    if (connections.rows[0].count === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  } while (Date.now() < deadline);
  throw new Error('Owned child connections did not close; refusing DROP');
}
function service(label, args, cwd) {
  const fd = openSync(path.join(out, 'test-results', `${label}.local.log`), 'w');
  logs.push(fd);
  const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', fd, fd] });
  children.push(child);
  return child;
}
writeFileSync(
  path.join(out, 'test-results', 'stack-result.json'),
  JSON.stringify({ status: 'running', syntheticOnly: true }) + '\n',
);
try {
  // Native CI supplies isolated PostgreSQL. A developer run owns a uniquely labelled ephemeral container.
  if (nativeMode) {
    nativeClient = new pg.Client({
      connectionString: nativeTarget.toString(),
      connectionTimeoutMillis: 5_000,
      query_timeout: 10_000,
    });
    await nativeClient.connect();
    const result = await nativeClient.query(
      "SELECT current_database() AS parent, current_setting('server_version_num')::int AS version",
    );
    assert.equal(result.rows[0].parent, 'clinicos_test');
    assert.ok(result.rows[0].version >= 160000 && result.rows[0].version < 170000);
    await nativeClient.query(`CREATE DATABASE "${nativeDatabase}"`);
    nativeDatabaseCreated = true;
    await nativeClient.query(
      `COMMENT ON DATABASE "${nativeDatabase}" IS 'clinicos-qa-batch447:${nativeOwner}'`,
    );
    await verifyOwnedDatabase();
    const local = new URL(nativeTarget);
    local.pathname = `/${nativeDatabase}`;
    env.DATABASE_URL = local.toString();
    Object.assign(databaseReceipt, {
      version: result.rows[0].version,
      host: local.hostname,
      port: Number(local.port || 5432),
      parentDatabase: 'clinicos_test',
      ownedDatabase: nativeDatabase,
      parentNeverMigrated: true,
      ownershipMarkerInstalled: true,
    });
  } else {
    assert.equal(
      spawnSync('docker', ['inspect', container], { stdio: 'ignore' }).status === 0,
      false,
      'Refuse to replace an occupied QA container',
    );
    run('docker', [
      'run',
      '--rm',
      '-d',
      '--name',
      container,
      '--label',
      'clinicos.qa.batch=447',
      '--label',
      `clinicos.qa.owner=${nativeOwner}`,
      '-p',
      '127.0.0.1:55447:5432',
      '-e',
      `POSTGRES_PASSWORD=${password}`,
      '-e',
      `POSTGRES_DB=${dbName}`,
      'postgres:16',
    ]);
    ownedContainer = true;
    env.DATABASE_URL = `postgresql://postgres:${password}@127.0.0.1:55447/${dbName}`;
    let sqlReady = false;
    for (let i = 0; i < 60; i++) {
      if (
        spawnSync(
          'docker',
          ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', dbName],
          {
            stdio: 'ignore',
          },
        ).status === 0
      ) {
        sqlReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.ok(sqlReady, 'Actual PostgreSQL readiness required');
    const controlTarget = new URL(env.DATABASE_URL);
    controlTarget.pathname = '/postgres';
    nativeClient = new pg.Client({
      connectionString: controlTarget.toString(),
      connectionTimeoutMillis: 5_000,
      query_timeout: 10_000,
    });
    await nativeClient.connect();
    const server = await nativeClient.query(
      "SELECT current_database() AS parent, current_setting('server_version_num')::int AS version",
    );
    assert.equal(server.rows[0].parent, 'postgres');
    assert.ok(server.rows[0].version >= 160000 && server.rows[0].version < 170000);
    await nativeClient.query(
      `COMMENT ON DATABASE "${nativeDatabase}" IS 'clinicos-qa-batch447:${nativeOwner}'`,
    );
    nativeDatabaseCreated = true;
    await verifyOwnedDatabase();
    Object.assign(databaseReceipt, {
      version: server.rows[0].version,
      host: '127.0.0.1',
      port: 55447,
      parentDatabase: 'postgres',
      ownedDatabase: nativeDatabase,
      parentNeverMigrated: true,
      ownershipMarkerInstalled: true,
    });
  }
  writeFileSync(
    path.join(out, 'test-results', 'database-provenance.json'),
    JSON.stringify(databaseReceipt, null, 2) + '\n',
  );
  const prismaCli = require.resolve('prisma/build/index.js');
  run(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts']);
  if (fullBackendOnly) {
    run(process.execPath, [path.join(root, 'scripts/run-node-tests.mjs')], {
      cwd: path.join(root, 'backend'),
      env: { ...env, ROLE_SIMULATOR_ENABLED: 'false' },
      logName: 'full-backend-tests.txt',
      maxBuffer: 16 * 1024 * 1024,
    });
  } else
    run(
      process.execPath,
      [
        '--import',
        'tsx',
        '--test',
        'backend/src/patients/__tests__/temporary-ps-exits.test.ts',
        'backend/src/patients/__tests__/temporary-ps-exits-db.test.ts',
        'backend/src/intake/__tests__/patient-review-db.test.ts',
      ],
      { logName: 'temporary-ps-database-tests.txt' },
    );
  databaseTestsPassed = true;
  if (!databaseOnly) {
    // Focused suites have their own fixtures. Their exited workers must not contaminate
    // browser counts, roster completion or clinical first-view assertions.
    const target = new URL(env.DATABASE_URL);
    assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname));
    assert.equal(target.pathname, `/${nativeDatabase}`);
    assert.equal(
      Number(target.port || 5432),
      nativeMode ? Number(nativeTarget.port || 5432) : 55447,
    );
    await verifyOwnedDatabase();
    await waitForOwnedConnectionsToClose();
    databaseReceipt.browserFixtureIsolation = {
      focusedWorkersExited: true,
      connectionsBeforeDrop: 0,
      markerVerifiedBeforeDrop: true,
      forcedDrop: false,
      parentNeverMigrated: true,
    };
    await nativeClient.query(`DROP DATABASE "${nativeDatabase}"`);
    nativeDatabaseCreated = false;
    await nativeClient.query(`CREATE DATABASE "${nativeDatabase}"`);
    nativeDatabaseCreated = true;
    await nativeClient.query(
      `COMMENT ON DATABASE "${nativeDatabase}" IS 'clinicos-qa-batch447:${nativeOwner}'`,
    );
    await verifyOwnedDatabase();
    Object.assign(databaseReceipt.browserFixtureIsolation, {
      recreated: true,
      markerVerifiedAfterCreate: true,
    });
    run(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts']);
    databaseReceipt.browserFixtureIsolation.migrationsReapplied = true;
    writeFileSync(
      path.join(out, 'test-results', 'database-provenance.json'),
      JSON.stringify(databaseReceipt, null, 2) + '\n',
    );
    service('backend', ['--import', 'tsx', 'src/server.ts'], path.join(root, 'backend'));
    service(
      'frontend',
      [
        path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        '5447',
        '--strictPort',
      ],
      path.join(root, 'frontend'),
    );
    await Promise.all([ready(`${env.QA_BACKEND_URL}/health`), ready(env.QA_FRONTEND_URL)]);
    const browserScript = path.join(root, 'e2e/qa-bug-batch-447-browser.mjs');
    const execution = spawn(
      process.execPath,
      ['--import', 'tsx', browserScript, ...process.argv.slice(2)],
      { cwd: root, env, stdio: 'inherit' },
    );
    const status = await new Promise((resolve) => execution.on('exit', resolve));
    assert.equal(status, 0, 'Real browser acceptance failed');
    browserPassed = true;
  }
} finally {
  for (const c of children.reverse()) c.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 500));
  for (const c of children) if (c.exitCode === null) c.kill('SIGKILL');
  for (const fd of logs) closeSync(fd);
  const cleanupErrors = [];
  if (nativeClient) {
    try {
      if (nativeDatabaseCreated) {
        await verifyOwnedDatabase();
        await waitForOwnedConnectionsToClose();
        await nativeClient.query(`DROP DATABASE "${nativeDatabase}"`);
        const remaining = await nativeClient.query('SELECT 1 FROM pg_database WHERE datname=$1', [
          nativeDatabase,
        ]);
        assert.equal(remaining.rowCount, 0);
        Object.assign(databaseReceipt, {
          cleanupOwnershipVerified: true,
          ownedDatabaseRemoved: true,
        });
      }
    } catch (error) {
      cleanupErrors.push({ stage: 'owned-database', code: error.code ?? error.name });
    } finally {
      try {
        await nativeClient.end();
      } catch (error) {
        cleanupErrors.push({ stage: 'control-connection', code: error.code ?? error.name });
      }
    }
  }
  if (ownedContainer) {
    const label = spawnSync(
      'docker',
      ['inspect', '--format', '{{index .Config.Labels "clinicos.qa.owner"}}', container],
      { encoding: 'utf8' },
    );
    if (label.status !== 0 || label.stdout.trim() !== nativeOwner)
      cleanupErrors.push({ stage: 'container-owner', code: 'ownership_mismatch' });
    else if (spawnSync('docker', ['stop', container], { stdio: 'ignore' }).status !== 0)
      cleanupErrors.push({ stage: 'owned-container', code: 'stop_failed' });
  }
  databaseReceipt.cleanupErrors = cleanupErrors;
  writeFileSync(
    path.join(out, 'test-results', 'database-provenance.json'),
    JSON.stringify(databaseReceipt, null, 2) + '\n',
  );
  writeFileSync(
    path.join(out, 'test-results', 'stack-result.json'),
    JSON.stringify(
      {
        status:
          (databaseOnly ? databaseTestsPassed : browserPassed) && cleanupErrors.length === 0
            ? 'passed'
            : 'failed',
        browser: databaseOnly ? 'not-run' : browserPassed ? 'passed' : 'failed',
        databaseTests: databaseTestsPassed ? 'passed' : 'failed',
        syntheticOnly: true,
        databaseMode: databaseReceipt.mode,
      },
      null,
      2,
    ) + '\n',
  );
  if (cleanupErrors.length)
    throw new Error('Synthetic QA cleanup failed; inspect sanitized database provenance');
}
