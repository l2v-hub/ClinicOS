// One isolated, reproducible PostgreSQL/HTTP/browser verification for therapy issues432..467.
// No production URL, model credential, host mount or privileged container is accepted.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';

// Docker veth changes can invalidate another Chromium session even on distinct ports.
// Hold the common QA lock across the complete owned stack lifecycle, including teardown.
if (!process.argv.includes('--stack-lock-held')) {
  const child = spawn(
    'flock',
    [
      '/tmp/clinicos-browser-qa.lock',
      process.execPath,
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
      '--stack-lock-held',
    ],
    { stdio: 'inherit', env: process.env },
  );
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  process.exit(code ?? 1);
}

const root = "/workspace/ClinicOS/agent-team/.worktrees/bug-batch-432";
const out = "/workspace/ClinicOS/agent-team/.worktrees/bug-batch-432/artifacts/task-validation/bug-batch-432/independent-qa-attempt-3/mobile-followup/stack";
const logs = resolve(out, 'test-results');
mkdirSync(logs, { recursive: true });
const sourceFiles = JSON.parse(readFileSync("/workspace/ClinicOS/agent-team/.worktrees/bug-batch-432/artifacts/task-validation/bug-batch-432/plan-proposal.json", 'utf8')).groups[0]
  .scope;
const fingerprint = () =>
  Object.fromEntries(
    sourceFiles.map((file) => [
      file,
      createHash('sha256')
        .update(readFileSync(resolve(root, file)))
        .digest('hex'),
    ]),
  );
const sourceBefore = fingerprint();
writeFileSync(resolve(logs, 'source-fingerprints.json'), JSON.stringify(sourceBefore, null, 2));
const owner = randomUUID();
const container = 'clinicos-qa-batch432';
const database = 'clinicos_qa_batch432';
const children = [];
const results = [];
let containerId;
let nativeClient;
let nativeDatabaseCreated = false;
let testsPassed = false;
const env = Object.fromEntries(
  [
    'PATH',
    'HOME',
    'LANG',
    'LC_ALL',
    'TMPDIR',
    'PLAYWRIGHT_BROWSERS_PATH',
    'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH',
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'https_proxy',
    'http_proxy',
    'NO_PROXY',
    'no_proxy',
    'NODE_EXTRA_CA_CERTS',
    'SSL_CERT_FILE',
  ]
    .filter((k) => process.env[k])
    .map((k) => [k, process.env[k]]),
);
Object.assign(env, {
  NODE_ENV: 'test',
  AUTH_MODE: 'demo',
  AI_PROVIDER: 'mock',
  AI_WORKER_INLINE: 'false',
  QA_KEEP_THERAPY_IMPORT_FIXTURE: '1',
  QA_THERAPY_IMPORT_RESULT_FILE: resolve(logs, 'therapy-import-results.json'),
  PORT: '3432',
  QA_BACKEND_URL: 'http://127.0.0.1:3432',
  QA_FRONTEND_URL: 'http://127.0.0.1:5433',
  VITE_API_URL: 'http://127.0.0.1:3432',
  AI_RUNTIME_URL: 'http://127.0.0.1:8432',
  AI_RUNTIME_SERVICE_TOKEN: 'synthetic-local-qa-runtime',
  AI_OCR_MODEL: 'mock:mock',
  AI_EXTRACTION_MODEL: 'mock:mock',
  AI_AGENT_MODEL: 'mock:mock',
  AI_REPAIR_MODEL: 'mock:mock',
  NODE_OPTIONS: '--max-old-space-size=4096',
  npm_config_cache: resolve(tmpdir(), 'clinicos-batch432-npm-cache'),
  ASSESSMENT_PDF_QA_DIRECTORY: resolve(logs, 'generated-pdfs/painad'),
  TRANSFERS_PDF_QA_DIRECTORY: resolve(logs, 'generated-pdfs/transfers'),
  TINETTI_PDF_QA_DIRECTORY: resolve(logs, 'generated-pdfs/tinetti'),
  MNA_PDF_QA_DIRECTORY: resolve(logs, 'generated-pdfs/mna'),
  GDS15_PDF_QA_DIRECTORY: resolve(logs, 'generated-pdfs/gds'),
});
// A few preexisting PDF suites have fixed output locations. Preserve their exact pre-run
// bytes and archive only this run's changed proof under our packet; no git metadata is written.
const generatedFixturePaths = [
  'artifacts/task-validation/po-16-giro/backend/fresh-v2-proof.json',
  'artifacts/task-validation/po-16-giro/backend/legacy-ready-retry-proof.json',
  'artifacts/task-validation/po-16-giro/backend/pdf-qa/mna-v2-half-point.pdf',
  'artifacts/task-validation/po-16-giro/backend/pdf-qa/mna-v2-half-point.snapshot.json',
  ...['barthel', 'gds15', 'mna', 'painad', 'tinetti', 'ucla_npi_sleep'].map(
    (name) => `artifacts/task-validation/ux-direct-access-cycle/w3/pdf-unit/${name}-paper.pdf`,
  ),
];
const fixtureBefore = new Map(
  generatedFixturePaths.map((file) => {
    const path = resolve(root, file);
    if (!existsSync(path)) return [file, null];
    const stat = lstatSync(path);
    assert.ok(
      stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
      `Unsafe generated-fixture target: ${file}`,
    );
    return [file, readFileSync(path)];
  }),
);
function restoreGeneratedFixtures() {
  const archived = [];
  for (const [file, before] of fixtureBefore) {
    const path = resolve(root, file);
    const present = existsSync(path);
    if (present) {
      const stat = lstatSync(path);
      assert.ok(
        stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
        `Generated-fixture target changed identity: ${file}`,
      );
    }
    const after = present ? readFileSync(path) : null;
    if (
      (before === null && after === null) ||
      (before !== null && after !== null && before.equals(after))
    )
      continue;
    if (after) {
      const destination = resolve(logs, 'generated-fixture-results', file);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, after);
      archived.push({
        source: file,
        sha256: createHash('sha256').update(after).digest('hex'),
        disposition: 'Fresh synthetic unit-suite output archived; original pre-run bytes restored.',
      });
    }
    if (before === null) unlinkSync(path);
    else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, before);
    }
  }
  writeFileSync(
    resolve(logs, 'generated-fixture-archive.json'),
    JSON.stringify({ archived }, null, 2),
  );
}

const docker = (args) => spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 2 ** 20 });
async function run(label, command, args, options = {}) {
  const stream = createWriteStream(resolve(logs, `${label}.txt`));
  const child = spawn(command, args, {
    cwd: root,
    env,
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(stream, { end: false });
  child.stderr.pipe(stream, { end: false });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  await new Promise((resolve) => stream.end(resolve));
  results.push({ label, ...status });
  writeFileSync(resolve(logs, 'run-results.json'), JSON.stringify({ results }, null, 2));
  assert.equal(status.code, 0, `${label} failed; see test-results/${label}.txt`);
}
function service(label, command, args, options = {}) {
  const stream = createWriteStream(resolve(logs, `${label}.txt`));
  const child = spawn(command, args, {
    cwd: root,
    env,
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(stream);
  child.stderr.pipe(stream);
  children.push(child);
  return child;
}
async function waitFor(url, child) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child?.exitCode !== null && child?.exitCode !== undefined)
      throw new Error(`Service exited before readiness: ${url}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* startup */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local service readiness timeout: ${url}`);
}
try {
  assert.ok(
    existsSync(resolve(root, 'node_modules/prisma/build/index.js')),
    'Run frozen npm ci with a writable cache first',
  );
  const nativeMode =
    process.env.QA_POSTGRES_MODE === 'native' || existsSync('/usr/lib/postgresql/16/bin/psql');
  if (nativeMode) {
    // The trusted verification provider supplies a disposable PostgreSQL16 instance. Create
    // a separate owned QA database; never read or mutate existing application patient tables.
    const target = new URL(process.env.DATABASE_URL ?? '');
    assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
    assert.equal(target.pathname, '/clinicos_test');
    assert.equal(target.port || '5432', '5432');
    nativeClient = new pg.Client({ connectionString: target.toString() });
    await nativeClient.connect();
    const ready = await nativeClient.query(
      "SELECT 1 AS ready, current_setting('server_version_num') AS version",
    );
    assert.equal(ready.rows[0].ready, 1);
    assert.ok(Number(ready.rows[0].version) >= 160000 && Number(ready.rows[0].version) < 170000);
    await nativeClient.query('CREATE DATABASE "clinicos_qa_batch432"');
    nativeDatabaseCreated = true;
    await nativeClient.query(
      `COMMENT ON DATABASE "clinicos_qa_batch432" IS 'clinicos-qa:${owner}'`,
    );
    target.pathname = '/clinicos_qa_batch432';
    env.DATABASE_URL = target.toString();
    writeFileSync(
      resolve(logs, 'database-provenance.json'),
      JSON.stringify(
        {
          mode: 'trusted-native-postgresql16',
          postgresSqlReady: true,
          version: Number(ready.rows[0].version),
          host: '127.0.0.1',
          port: 5432,
          database,
        },
        null,
        2,
      ),
    );
  } else {
    assert.notEqual(
      docker(['inspect', container]).status,
      0,
      'Refusing to replace an existing container',
    );
    const image =
      'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d';
    const inspected = docker(['image', 'inspect', image, '--format', '{{json .RepoDigests}}']);
    assert.equal(inspected.status, 0, 'Pull the trusted pinned postgres:16 image first');
    const password = randomUUID();
    const started = docker([
      'run',
      '--detach',
      '--name',
      container,
      '--label',
      `clinicos.qa.owner=${owner}`,
      '--publish',
      '127.0.0.1:55432:5432',
      '--env',
      'POSTGRES_USER=postgres',
      '--env',
      `POSTGRES_PASSWORD=${password}`,
      '--env',
      `POSTGRES_DB=${database}`,
      image,
    ]);
    assert.equal(started.status, 0, started.stderr);
    containerId = started.stdout.trim();
    env.DATABASE_URL = `postgresql://postgres:${password}@127.0.0.1:55432/${database}?schema=public`;
    for (let attempt = 0; attempt < 120; attempt++) {
      const sql = docker([
        'exec',
        containerId,
        'psql',
        '-U',
        'postgres',
        '-d',
        database,
        '-Atc',
        'SELECT 1',
      ]);
      if (sql.status === 0 && sql.stdout.trim() === '1') break;
      if (attempt === 119) throw new Error('PostgreSQL SQL readiness failed');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    writeFileSync(
      resolve(logs, 'database-provenance.json'),
      JSON.stringify(
        {
          image,
          digests: JSON.parse(inspected.stdout),
          postgresSqlReady: true,
          host: '127.0.0.1',
          port: 55432,
          database,
        },
        null,
        2,
      ),
    );
  }
  // Bind synthetic-fixture cleanup to this invocation, including Docker and native modes.
  const ownershipClient = new pg.Client({ connectionString: env.DATABASE_URL });
  await ownershipClient.connect();
  try {
    if (!nativeMode)
      await ownershipClient.query(
        `COMMENT ON DATABASE "clinicos_qa_batch432" IS 'clinicos-qa:${owner}'`,
      );
    const marker = await ownershipClient.query(
      "SELECT current_database() AS database, shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname=current_database()",
    );
    assert.deepEqual(marker.rows, [{ database, owner: `clinicos-qa:${owner}` }]);
    env.QA_RUN_OWNER = owner;
  } finally {
    await ownershipClient.end();
  }
  await run('migration', process.execPath, [
    'node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
  ]);
  // Focused QA3 visual followup: existing exact-source build/client reused; no suite/seed repeat.
  const runtime = service(
    'mock-runtime',
    process.env.QA_PYTHON || 'python3',
    ['-m', 'uvicorn', 'clinicos_ai.api.app:app', '--host', '127.0.0.1', '--port', '8432'],
    { cwd: resolve(root, 'clinicos-ai-runtime'), env: { ...env, PORT: '8432' } },
  );
  await waitFor(`${env.AI_RUNTIME_URL}/v1/runtime/health`, runtime);
  // Focused QA3 visual followup: existing exact-source build/client reused; no suite/seed repeat.
  const backend = service(
    'backend-service',
    process.execPath,
    [
      '--input-type=module',
      '--import',
      'tsx',
      '-e',
      "import app from './src/app.ts'; import {prisma} from './src/lib/prisma.ts'; const server=app.listen(3432,'127.0.0.1'); process.once('SIGTERM',()=>server.close(async()=>{await prisma.$disconnect();process.exit(0)}));",
    ],
    {
      cwd: resolve(root, 'backend'),
      env: { ...env, ROLE_SIMULATOR_ENABLED: 'true', FRONTEND_URL: env.QA_FRONTEND_URL },
    },
  );
  await waitFor(`${env.QA_BACKEND_URL}/health`, backend);
  const frontend = service('frontend-service', process.execPath, [
    'node_modules/vite/bin/vite.js',
    'frontend',
    '--host',
    '127.0.0.1',
    '--port',
    '5433',
    '--strictPort',
  ]);
  await waitFor(env.QA_FRONTEND_URL, frontend);
  await run('browser-e2e', process.execPath, [
    '--import',
    'tsx',
    "/workspace/ClinicOS/agent-team/.worktrees/bug-batch-432/artifacts/task-validation/bug-batch-432/independent-qa-attempt-3/mobile-followup-browser.mjs",
  ]);
  assert.deepEqual(
    fingerprint(),
    sourceBefore,
    'Source changed during verification; rerun the full harness',
  );
  testsPassed = true;
} catch (error) {
  writeFileSync(
    resolve(logs, 'failure.json'),
    JSON.stringify({ verified: false, error: error.message, results }, null, 2),
  );
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        new Promise((resolve) => setTimeout(resolve, 10_000)),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
  }
  if (nativeClient) {
    try {
      if (nativeDatabaseCreated) {
        const marker = await nativeClient.query(
          "SELECT shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname=$1",
          [database],
        );
        assert.equal(
          marker.rows[0]?.owner,
          `clinicos-qa:${owner}`,
          'QA database ownership changed; refusing cleanup',
        );
        await nativeClient.query('DROP DATABASE "clinicos_qa_batch432" WITH (FORCE)');
      }
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      await nativeClient.end();
    }
  }
  if (containerId) {
    const actualOwner = docker([
      'inspect',
      containerId,
      '--format',
      '{{index .Config.Labels "clinicos.qa.owner"}}',
    ]);
    if (actualOwner.status === 0 && actualOwner.stdout.trim() === owner) {
      const removed = docker(['rm', '--force', '--volumes', containerId]);
      if (removed.status !== 0) {
        console.error('Owned QA container cleanup failed');
        process.exitCode = 1;
      }
    } else {
      console.error('QA container ownership changed; refusing cleanup');
      process.exitCode = 1;
    }
  }
  try {
    restoreGeneratedFixtures();
    const status = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(status.status, 0, 'Cannot verify worktree scope after tests');
    const outside = status.stdout
      .split('\0')
      .filter(Boolean)
      .map((record) => record.slice(3))
      .filter(
        (file) =>
          !sourceFiles.includes(file) &&
          !file.startsWith('artifacts/task-validation/bug-batch-432/'),
      );
    assert.deepEqual(
      outside,
      [],
      'Unexpected files outside the frozen source scope and evidence packet',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
  writeFileSync(
    resolve(logs, 'validation-summary.json'),
    JSON.stringify(
      {
        verified: false,
        focusedOnly: true,
        focusedMobileAssertionsPassed: testsPassed && !process.exitCode,
        results,
        evidence: 'evidence/',
        lifecycleAndScopeClean: !process.exitCode,
        limitations: [
          'Independent QA, exact-SHA Claude review and production deployment are separate root-owned gates.',
        ],
      },
      null,
      2,
    ),
  );
}
