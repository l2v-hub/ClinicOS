#!/usr/bin/env node
// Synthetic-only integrated voice validation. Run under the global browser stack lock:
// flock /tmp/clinicos-browser-qa.lock node artifacts/task-validation/standalone-pr-393/codex-followup-1/harness/qa-voice-pr-393.mjs
// Owns a disposable labelled PostgreSQL16 container; never reads a caller DATABASE_URL.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pg from '/workspace/ClinicOS/node_modules/pg/lib/index.js';

const root = process.cwd();
const packet = "/workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018";
const args = process.argv.slice(2);
const backendOnly = args.at(-1) === '--backend-only';
if (backendOnly) args.pop();
assert.ok(
  args.length === 0 || (args.length === 2 && args[0] === '--out'),
  'Use [--out <fresh-packet-subdirectory>] [--backend-only]',
);
const out = args.length ? path.resolve(args[1]) : path.join(packet, 'author-runtime-1');
assert.ok(
  out === packet || out.startsWith(`${packet}${path.sep}`),
  'QA output stays inside the owned task packet',
);
assert.ok(
  !existsSync(path.join(out, 'test-results', 'integrated-result.json')),
  'Archive prior evidence or choose a fresh --out directory before rerunning',
);
for (const directory of ['logs', 'test-results', 'screenshots', 'trace', 'video'])
  mkdirSync(path.join(out, directory), { recursive: true });
const owner = randomBytes(16).toString('hex'),
  secret = randomBytes(24).toString('hex');
const container = `clinicos-qa-voice393-${owner.slice(0, 8)}`;
const port = 55493,
  apiPort = 3093,
  frontPort = 5393,
  runtimePort = 8093;
const url = `postgresql://postgres:${secret}@127.0.0.1:${port}/clinicos_test`;
const children = [];
let containerId, client, runtime;
const proof = {
  mode: backendOnly
    ? 'synthetic-backend-only-owned-postgres16'
    : 'synthetic-provider-transport-real-app-and-owned-postgres16',
  parentDatabaseUsed: false,
  developmentDatabaseUsed: false,
  realProviderProof: false,
  checks: [],
};
const clean = (text) =>
  String(text)
    .replaceAll(url, '[OWNED_QA_DATABASE]')
    .replaceAll(secret, '[OWNED_QA_SECRET]')
    .replace(/sim\.[A-Za-z0-9._-]+/g, 'sim.[SYNTHETIC_SESSION]');
const keys = [
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
];
const safe = Object.fromEntries(keys.filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
const env = {
  ...safe,
  DATABASE_URL: url,
  NODE_ENV: 'test',
  AUTH_MODE: 'demo',
  AI_ENABLED: 'true',
  VOICE_CHANNEL_ENABLED: 'true',
  ROLE_SIMULATOR_ENABLED: 'true',
  AI_WORKER_INLINE: 'false',
  SKILLS_INTERPRETER: 'deterministic',
  AI_PROVIDER: 'mock',
  AI_RUNTIME_URL: `http://127.0.0.1:${runtimePort}`,
  AI_RUNTIME_SERVICE_TOKEN: secret,
  FRONTEND_URL: `http://127.0.0.1:${frontPort}`,
  VITE_API_URL: `http://127.0.0.1:${apiPort}`,
  PORT: String(apiPort),
  PLAYWRIGHT_BROWSERS_PATH: '/workspace/.cache/clinicos-batch450-playwright',
};
async function run(name, command, args) {
  const child = spawn(command, args, { env, cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (b) => (logs += b));
  child.stderr.on('data', (b) => (logs += b));
  const code = await new Promise((r, j) => {
    child.once('error', j);
    child.once('close', r);
  });
  writeFileSync(path.join(out, 'logs', `${name}.log`), clean(logs));
  assert.equal(code, 0, `${name} failed; see sanitized log`);
}
function start(name, command, args) {
  const child = spawn(command, args, { env, cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (b) => (logs += b));
  child.stderr.on('data', (b) => (logs += b));
  children.push({ child, name, logs: () => logs });
  return child;
}
async function readiness(url) {
  let last;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Loopback readiness failed ${new URL(url).port}: ${last?.name ?? 'HTTP'}`);
}
try {
  // Do not touch a resource on an occupied port, including the shared development stack.
  for (const p of [port, apiPort, frontPort, runtimePort])
    await new Promise((resolve, reject) => {
      const s = createServer();
      s.once('error', () => reject(new Error(`QA port occupied: ${p}`)));
      s.listen(p, '127.0.0.1', () => s.close(resolve));
    });
  const image = spawnSync('docker', ['image', 'inspect', 'postgres:16', '--format', '{{.Id}}'], {
    encoding: 'utf8',
  });
  assert.equal(image.status, 0, 'Required QA image must already be available; no implicit pull');
  proof.containerImage = image.stdout.trim();
  const created = spawnSync(
    'docker',
    [
      'run',
      '--pull=never',
      '--rm',
      '-d',
      '--name',
      container,
      '--label',
      'clinicos.qa.task=voice393',
      '--label',
      `clinicos.qa.owner=${owner}`,
      '-p',
      `127.0.0.1:${port}:5432`,
      '-e',
      `POSTGRES_PASSWORD=${secret}`,
      '-e',
      'POSTGRES_DB=clinicos_test',
      'postgres:16',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(created.status, 0, 'owned container must start');
  containerId = created.stdout.trim();
  for (let i = 0; i < 90; i++) {
    const c = new pg.Client({ connectionString: url });
    c.on('error', () => {});
    try {
      await c.connect();
      await c.query('SELECT 1');
      client = c;
      break;
    } catch {
      await c.end().catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  assert.ok(client, 'actual SQL readiness');
  const before = await client.query(
    "SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'",
  );
  assert.equal(before.rows[0].n, 0);
  await client.query(`COMMENT ON DATABASE clinicos_test IS 'clinicos.qa.voice393.${owner}'`);
  await run('migrate', process.execPath, [
    'node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--schema',
    'prisma/schema.prisma',
  ]);
  await run('backend-voice', process.execPath, [
    '--import',
    'tsx',
    '--test',
    '--test-concurrency=1',
    'backend/src/voice/__tests__/voice-e2e.test.ts',
    'backend/src/voice/__tests__/realtime-client.test.ts',
  ]);
  proof.checks.push({ name: 'focused backend voice suites', status: 'PASS' });
  if (!backendOnly) {
    await run('seed-assistant', process.execPath, [
      '--import',
      'tsx',
      'scripts/assistant/seed-assistant-demo.mts',
    ]);
    let providerFailure = false;
    runtime = createServer(async (req, res) => {
      if (req.headers.authorization !== `Bearer ${secret}`) {
        res.writeHead(401);
        res.end();
        return;
      }
      if (req.url === '/v1/voice/stt-status') {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            available: true,
            realtime: {
              enabled: true,
              available: true,
              model: 'synthetic-live',
              transports: ['webrtc'],
            },
          }),
        );
        return;
      }
      if (req.url === '/v1/voice/realtime-call') {
        let bytes = 0;
        for await (const c of req) {
          bytes += c.length;
          if (bytes > 70000) {
            res.writeHead(413);
            res.end();
            return;
          }
        }
        res.writeHead(providerFailure ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            providerFailure
              ? { detail: { kind: 'unavailable', message: 'synthetic failure' } }
              : {
                  sdp: 'v=0\r\nsynthetic-answer',
                  model: 'synthetic-live',
                  deployment: 'synthetic-live',
                  expiresAt: 123,
                },
          ),
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((resolve) => runtime.listen(runtimePort, '127.0.0.1', resolve));
    start('backend-server', process.execPath, ['--import', 'tsx', 'backend/src/server.ts']);
    start('frontend-server', process.execPath, [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      String(frontPort),
      '--strictPort',
      '--config',
      'frontend/vite.config.ts',
      'frontend',
    ]);
    await readiness(`http://127.0.0.1:${apiPort}/health`);
    await readiness(`http://127.0.0.1:${frontPort}`);
    process.env.PLAYWRIGHT_BROWSERS_PATH = env.PLAYWRIGHT_BROWSERS_PATH;
    const { runVoiceBrowser } = await import('./qa-voice-pr-393-browser.mjs');
    const browserProof = await runVoiceBrowser({
      front: `http://127.0.0.1:${frontPort}`,
      api: `http://127.0.0.1:${apiPort}`,
      out,
      fontRoot: path.resolve('artifacts/task-validation/voice-pr-393/font-assets'),
      sql: client,
      setProviderFailure: (value) => {
        providerFailure = value;
      },
    });
    Object.assign(proof, browserProof);
  }
  proof.status = 'PASS';
} catch (error) {
  proof.status = 'FAILED';
  proof.failure = clean(error.message);
  proof.failureStack = clean(error.stack);
  throw error;
} finally {
  for (const c of children.reverse()) {
    c.child.kill('SIGTERM');
    await Promise.race([
      new Promise((r) => c.child.once('close', r)),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    if (c.child.exitCode === null) c.child.kill('SIGKILL');
    writeFileSync(path.join(out, 'logs', `${c.name}.log`), clean(c.logs()));
  }
  if (runtime) await new Promise((r) => runtime.close(r));
  if (client) {
    const marker = await client.query(
      "SELECT shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()",
    );
    assert.equal(marker.rows[0].marker, `clinicos.qa.voice393.${owner}`);
    await client.end();
    proof.databaseOwnershipVerified = true;
  }
  if (containerId) {
    const check = spawnSync(
      'docker',
      ['inspect', '--format', '{{index .Config.Labels "clinicos.qa.owner"}}', containerId],
      { encoding: 'utf8' },
    );
    assert.equal(check.stdout.trim(), owner, 'cleanup must verify owner');
    assert.equal(
      spawnSync('docker', ['stop', '--time', '3', containerId], { stdio: 'ignore' }).status,
      0,
    );
    for (let i = 0; i < 30; i++) {
      proof.ownedContainerRemoved =
        spawnSync('docker', ['inspect', containerId], { stdio: 'ignore' }).status !== 0;
      if (proof.ownedContainerRemoved) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(proof.ownedContainerRemoved, true);
  }
  writeFileSync(
    path.join(out, 'test-results', 'integrated-result.json'),
    JSON.stringify(proof, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      status: proof.status,
      checks: proof.checks?.length,
      ownedContainerRemoved: proof.ownedContainerRemoved,
      realProviderProof: false,
    }),
  );
}
