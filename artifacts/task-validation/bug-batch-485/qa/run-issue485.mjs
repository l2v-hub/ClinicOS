// Aggregated450/472/473/475/476: real local app, fresh PostgreSQL, authenticated PDF upload,
// real storage/parser/review/persistence. Only the external OCR/extraction provider is a fixture.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile, copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const { chromium } = await import('/workspace/ClinicOS/node_modules/playwright/index.mjs');
import {
  PDFDocument,
  StandardFonts,
  PDFName,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  drawObject,
} from '/workspace/ClinicOS/node_modules/pdf-lib/cjs/index.js';
import pg from '/workspace/ClinicOS/node_modules/pg/lib/index.js';
import CodiceFiscale from '/workspace/ClinicOS/node_modules/codice-fiscale-js/dist/codice.fiscale.commonjs2.js';

const ROOT = "/workspace/clinicos-issue485-fullscreen";
const OUT = path.resolve(
  process.argv[2] ?? 'artifacts/task-validation/bug-batch-450/cycle4/runtime',
);
const FRONT_ORIGIN = 'http://127.0.0.1:5485';
const PREVIEW_BASE = '/qa-clinicos/';
const FRONT = FRONT_ORIGIN + PREVIEW_BASE;
const PREVIEW_ORIGIN = 'http://127.0.0.1:5486';
const BACK = 'http://127.0.0.1:3485';
const RUNTIME = 'http://127.0.0.1:8785';
const DATABASE_URL = 'postgresql://postgres@127.0.0.1:55485/clinicos_test';
const OWNER = 'clinicos-qa-issue485-cycle4-qa-20261018';
const children = [];
const errors = [];
const checks = [];
let containerId;
let nativeClient;
let nativeDatabaseCreated = false;
const nativeDatabase = 'clinicos_qa_batch450';
let browser;
let context;
let db;
let server;
let previewProxy;
let buildDir;
const pdfAssets = [];
let traceSaved = false;
let uploadDir;
let originalSource;
let lastConfirm;
let sourceReceipt;
const safeEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) =>
    /^(PATH|LANG|LC_.+|TMPDIR|TEMP|TMP|SSL_CERT_FILE|SSL_CERT_DIR|REQUESTS_CA_BUNDLE|NODE_EXTRA_CA_CERTS|HTTPS?_PROXY|https?_proxy|ALL_PROXY|all_proxy|NO_PROXY|no_proxy|PLAYWRIGHT_BROWSERS_PATH)$/.test(
      name,
    ),
  ),
);
const env = {
  ...safeEnv,
  NODE_ENV: 'test',
  AUTH_MODE: 'demo',
  ROLE_SIMULATOR_ENABLED: 'true',
  FRONTEND_URL: FRONT_ORIGIN,
  AI_PROVIDER: 'mock',
  AI_ENABLED: 'true',
  AI_RUNTIME_URL: RUNTIME,
  AI_RUNTIME_SERVICE_TOKEN: 'synthetic-local-only',
  DATABASE_URL,
  DOTENV_CONFIG_PATH: '/dev/null',
  npm_config_cache: path.join(OUT,'npm-cache'),
};
for (const folder of ['logs', 'evidence', 'test-results', 'video','screenshots','trace'])
  await mkdir(path.join(OUT, folder), { recursive: true });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, env, encoding: 'utf8', ...options });
  if (result.status !== 0)
    throw new Error(`${command} failed: ${(result.stderr ?? '').slice(-1200)}`);
  return result.stdout.trim();
}
function start(command, args, name, options = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  const chunks = [];
  child.stdout.on('data', (b) => chunks.push(b));
  child.stderr.on('data', (b) => chunks.push(b));
  child.on('error', (error) => errors.push(`${name}: ${error.message}`));
  children.push({ child, name, chunks });
  return child;
}
async function ready(url) {
  for (let i = 0; i < 150; i++) {
    if (children.some(({ child }) => child.exitCode !== null))
      throw new Error('A local service exited before readiness');
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await delay(400);
  }
  throw new Error(`Local readiness timeout: ${new URL(url).pathname}`);
}
// Evidence retains actual requests, responses and screenshots; only ephemeral local
// simulator bearer credentials are redacted before publishing a portable trace.
function sanitizeTrace(filename) {
  const result = run('python3', [
    '-c',
    `
import json, os, re, sys, zipfile
source = sys.argv[1]
target = source + '.redacted'
count = 0
with zipfile.ZipFile(source) as original, zipfile.ZipFile(target, 'w') as sanitized:
    for entry in original.infolist():
        data = original.read(entry.filename)
        try:
            text = data.decode('utf-8')
        except UnicodeDecodeError:
            pass
        else:
            text, changed = re.subn(r'sim\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+', 'REDACTED_LOCAL_SIMULATOR_TOKEN', text)
            count += changed
            data = text.encode('utf-8')
        sanitized.writestr(entry, data)
os.replace(target, source)
print(json.dumps({'trace': os.path.basename(source), 'redactedSyntheticTokens': count}))
`,
    filename,
  ]);
  return JSON.parse(result);
}
async function verifiedFontAssets() {
  const root = path.join(ROOT, 'artifacts/task-validation/bug-batch-450/font-assets');
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  const pinned = {
    '@fontsource/inter':
      'sha512-P6r5WnJoKiNVV+zvW2xM13gNdFhAEpQ9dQJHt3naLvfg+LkF2ldgSLiF4T41lf1SQCM9QmkqPTn4TH568IRagg==',
    '@fontsource/jetbrains-mono':
      'sha512-6w8/SG4kqvIMu7xd7wt6x3idn1Qux3p9N62s6G3rfldOUYHpWcc2FKrqf+Vo44jRvqWj2oAtTHrZXEP23oSKwQ==',
  };
  assert.equal(manifest.packages.length, 2);
  for (const pkg of manifest.packages) {
    assert.equal(pkg.version, '5.2.8');
    assert.equal(pkg.registryIntegrity, pinned[pkg.name]);
    assert.equal(path.basename(pkg.license.path), pkg.license.path);
    assert.equal(
      createHash('sha256')
        .update(await readFile(path.join(root, pkg.license.path)))
        .digest('hex'),
      pkg.license.sha256,
    );
  }
  assert.equal(Object.keys(manifest.files).length, 7);
  for (const [name, file] of Object.entries(manifest.files)) {
    assert.equal(path.basename(file.path), name);
    file.path = path.join(root, name);
    assert.equal(
      createHash('sha256')
        .update(await readFile(file.path))
        .digest('hex'),
      file.sha256,
    );
  }
  return manifest;
}
async function verify(id, fn) {
  await fn();
  checks.push({ id, status: 'PASS' });
  console.log(`PASS ${id}`);
}
async function screenshot(issue) {
  await page.screenshot({ path: path.join(OUT, 'evidence', `issue${issue}.png`) });
}
let page;
try {
  const scopeFile = 'artifacts/task-validation/bug-batch-450/cycle4/runtime-source-scope.json';
  const scopeBytes = await readFile(path.join(ROOT, scopeFile));
  const sourceScope = JSON.parse(scopeBytes.toString('utf8'));
  assert.equal(sourceScope.schemaVersion, 1);
  assert.equal(sourceScope.batchId, 'bug-batch-450');
  const files = sourceScope.scope;
  assert.ok(Array.isArray(files), 'Frozen runtime source scope must be an array');
  assert.ok(
    files.length >= 47,
    'Frozen runtime source scope includes original47 plus exact cycle4 amendment',
  );
  const originalScope = JSON.parse(
    await readFile(
      path.join(ROOT, 'artifacts/task-validation/bug-batch-450/runtime-source-scope.json'),
      'utf8',
    ),
  ).scope;
  assert.ok(
    originalScope.every((file) => files.includes(file)),
    'No historical source path may leave runtime verification',
  );
  assert.equal(new Set(files).size, files.length, 'Frozen source paths must be unique');
  for (const file of files) {
    assert.ok(
      typeof file === 'string' &&
        /^(?:frontend|backend|scripts)\/[A-Za-z0-9_./-]+$/.test(file) &&
        path.posix.normalize(file) === file &&
        !file.split('/').includes('..'),
      'Frozen source paths must be canonical relative application/test paths',
    );
  }
  sourceReceipt = {
    baseline: run('git', ['rev-parse', 'HEAD']),
    scopeFile,
    scopeSha256: createHash('sha256').update(scopeBytes).digest('hex'),
    files: {},
  };
  for (const file of files)
    sourceReceipt.files[file] = createHash('sha256')
      .update(await readFile(path.join(ROOT, file)))
      .digest('hex');
  await writeFile(
    path.join(OUT, 'test-results', 'runtime-source-receipt.json'),
    JSON.stringify(sourceReceipt, null, 2),
  );
  assert.ok([undefined, 'native', 'docker'].includes(process.env.QA_POSTGRES_MODE));
  assert.equal(process.env.QA_POSTGRES_MODE, 'docker', 'This runner requires explicit owned Docker mode');
  const nativeMode = false;
  let database = 'clinicos_test';
  if (nativeMode) {
    // CI supplies an isolated PostgreSQL16 parent. Never migrate/read/clear parent patient tables.
    // The explicit local alternate is only our independently owned synthetic fixture on55485.
    const alternate = process.env.QA_NATIVE_DATABASE_URL;
    const target = new URL(
      alternate ?? process.env.DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/clinicos_test',
    );
    assert.ok(['postgres:', 'postgresql:'].includes(target.protocol));
    assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
    assert.equal(target.pathname, '/clinicos_test');
    assert.equal(target.port || '5432', alternate ? '55485' : '5432');
    nativeClient = new pg.Client({ connectionString: target.toString() });
    await nativeClient.connect();
    const ready = (
      await nativeClient.query(
        "SELECT 1 AS ready, current_setting('server_version_num') AS version",
      )
    ).rows[0];
    assert.equal(ready.ready, 1);
    assert.ok(Number(ready.version) >= 160000 && Number(ready.version) < 170000);
    if (alternate) {
      const marker = await nativeClient.query(
        "SELECT shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname='clinicos_test'",
      );
      assert.equal(marker.rows[0]?.owner, `clinicos-qa-native-fixture:${OWNER}`);
    }
    await nativeClient.query('CREATE DATABASE "clinicos_qa_batch450"');
    nativeDatabaseCreated = true;
    await nativeClient.query(
      `COMMENT ON DATABASE "clinicos_qa_batch450" IS 'clinicos-qa:${OWNER}'`,
    );
    database = nativeDatabase;
    target.pathname = `/${nativeDatabase}`;
    env.DATABASE_URL = target.toString();
    await writeFile(
      path.join(OUT, 'test-results', 'database-provenance.json'),
      JSON.stringify(
        {
          mode: 'native-postgresql16',
          postgresSqlReady: true,
          version: Number(ready.version),
          host: '127.0.0.1',
          port: Number(target.port || 5432),
          database,
          parentUntouched: true,
        },
        null,
        2,
      ),
    );
  } else {
    // A preexisting container, even one with a matching name, is never replaced.
    const existing = spawnSync('docker', ['container', 'inspect', OWNER], { encoding: 'utf8' });
    assert.notEqual(existing.status, 0, 'Dedicated container name must be unoccupied');
    containerId = run('docker', [
      'run',
      '--detach',
      '--rm',
      '--name',
      OWNER,
      '--label',
      `clinicos.qa.owner=${OWNER}`,
      '--publish',
      '127.0.0.1:55485:5432',
      '--env',
      'POSTGRES_HOST_AUTH_METHOD=trust',
      '--env',
      'POSTGRES_DB=clinicos_test',
      'postgres:16-alpine',
    ]);
    for (let i = 0; i < 60; i++) {
      const r = spawnSync('docker', [
        'exec',
        containerId,
        'pg_isready',
        '-h',
        '127.0.0.1',
        '-U',
        'postgres',
        '-d',
        'clinicos_test',
      ]);
      if (r.status === 0) break;
      if (i === 59) throw new Error('Fresh PostgreSQL readiness failed');
      await delay(250);
    }
  }
  db = new pg.Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name, database);
  const version = Number(
    (await db.query("SELECT current_setting('server_version_num') AS version")).rows[0].version,
  );
  assert.ok(version >= 160000 && version < 170000);
  if (!nativeMode)
    await writeFile(
      path.join(OUT, 'test-results', 'database-provenance.json'),
      JSON.stringify(
        {
          mode: 'owned-docker-postgresql16',
          postgresSqlReady: true,
          version,
          host: '127.0.0.1',
          port: 55485,
          database,
          owner: OWNER,
        },
        null,
        2,
      ),
    );
  run(process.execPath, [
    'node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--config=prisma.config.ts',
  ]);
  // Honest provider stand-in, isolated from application code. No browser/API results are stubbed.
  const fiscalCode = new CodiceFiscale({
    name: 'Maria',
    surname: 'Sintetica',
    gender: 'F',
    day: 1,
    month: 1,
    year: 1980,
    birthplace: 'Roma',
    birthplaceProvincia: 'RM',
  }).toString();
  const text = `LETTERA SINTETICA DI COLLAUDO\nMaria Sintetica\nCodice fiscale ${fiscalCode}\nRamipril 5 mg 1 compressa ore 08:00\nParacetamolo 500 mg 1 compressa al bisogno\nControllo sintetico, nessun dato reale.`;
  const extracted = {
    anagrafica: { nome: 'Maria', cognome: 'Sintetica', dataNascita: '', sesso: '' },
    cartella: {
      codiceFiscale: fiscalCode,
      anamnesi: {},
      diagnosi: [],
      allergie: [],
      farmaci: [],
      terapie: [],
      parametriVitali: [],
    },
  };
  const units = new Map();
  const unitInputs = new Map();
  const providerCalls = [];
  let conflictMode = false;
  let conflictOcr = 0;
  const conflictNames = ['Prima', 'Corretto'];
  server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const respond = (status, value) => {
      res.statusCode = status;
      res.end(JSON.stringify(value));
    };
    if (req.url === '/v1/runtime/health')
      return respond(200, { status: 'ok', provider: 'synthetic-fixture' });
    if (req.headers.authorization !== 'Bearer synthetic-local-only')
      return respond(401, { error: 'unauthorized' });
    let raw = '';
    for await (const part of req) raw += part;
    const body = raw ? JSON.parse(raw) : {};
    if (req.url === '/v1/runtime/capabilities')
      return respond(200, { document_job_contract_version: 2, max_upload_bytes: 25000000 });
    if (req.url === '/v1/document-jobs' && req.method === 'POST') {
      assert.equal(typeof body.input_hash, 'string');
      const id = `synthetic-${units.size + 1}`;
      const unit = {
        job_id: id,
        input_hash: body.input_hash,
        attempt: 0,
        status: 'created',
        data: null,
        model: 'synthetic-fixture',
        truncated: false,
      };
      units.set(id, unit);
      unitInputs.set(id, body);
      providerCalls.push({ operation: 'create', files: body.files.length });
      return respond(201, unit);
    }
    const match = req.url.match(/^\/v1\/document-jobs\/([^/]+)(?:\/(run|retry|result))?$/);
    if (match) {
      const unit = units.get(match[1]);
      if (!unit) return respond(404, { error: 'unknown job' });
      if (match[2] === 'run' || match[2] === 'retry') {
        if (match[2] === 'retry' && body.expected_attempt !== unit.attempt)
          return respond(409, { error: 'stale attempt' });
        unit.attempt++;
        unit.status = 'review_ready';
        unit.data =
          body.mode === 'ocr'
            ? {
                rawText:
                  providerCalls.filter((call) => call.operation === 'ocr').length === 0
                    ? text
                    : 'PAGINA SCANSIONATA SINTETICA\nControllo pagina 2',
              }
            : extracted;
        if (conflictMode) {
          if (body.mode === 'ocr') {
            const name = conflictNames[conflictOcr++];
            assert.ok(name, 'Only the two actual synthetic conflict letters are processed');
            unit.data = {
              rawText: `LETTERA SINTETICA CONFLITTO\n${name} Conflitto\nNessun dato reale.`,
            };
          } else {
            const prompt = unitInputs.get(unit.job_id).prompt;
            const name = conflictNames.find((value) => prompt.includes(`${value} Conflitto`));
            assert.ok(name, 'Extraction fixture reads the actual OCR prompt of its own letter');
            unit.data = structuredClone(extracted);
            unit.data.anagrafica.nome = name;
            unit.data.anagrafica.cognome = 'Conflitto';
            unit.data.cartella.codiceFiscale = '';
          }
        }
        providerCalls.push({ operation: body.mode ?? 'retry', attempt: unit.attempt });
      }
      return respond(200, unit);
    }
    return respond(404, { error: 'unsupported fixture route' });
  });
  await new Promise((resolve) => server.listen(8785, '127.0.0.1', resolve));
  await mkdir(path.join(OUT, 'runtime'), {recursive:true});
  uploadDir = await mkdtemp(path.join(path.join(OUT, 'runtime'), 'clinicos-batch450-uploads-'));
  start(process.execPath, ['--import', 'tsx', 'src/server.ts'], 'backend', {
    cwd: path.join(ROOT, 'backend'),
    env: {
      ...env,
      PORT: '3485',
      AI_UPLOAD_DIR: uploadDir,
    },
  });
  await mkdir(path.join(OUT, 'runtime'), {recursive:true});
  buildDir = await mkdtemp(path.join(path.join(OUT, 'runtime'), 'clinicos-batch450-built-'));
  for (const config of ['tsconfig.app.json','tsconfig.node.json']) {
    const output=run(process.execPath,[path.join(ROOT,'node_modules/typescript/bin/tsc'),'-p',config,'--noEmit','--incremental','false'],{cwd:path.join(ROOT,'frontend')});
    await writeFile(path.join(OUT,'logs',config+'.log'),output+'\nExit: 0\n');
  }
  const build = run(
    process.execPath,
    [
      path.join(ROOT, 'node_modules/vite/bin/vite.js'),
      'build',
      '--base',
      PREVIEW_BASE,
      '--outDir',
      buildDir,
    ],
    {
      cwd: path.join(ROOT, 'frontend'),
      env: { ...env, NODE_ENV: 'production', VITE_API_URL: BACK },
    },
  );
  await writeFile(path.join(OUT, 'logs', 'production-build.log'), build);
  start(
    process.execPath,
    [
      path.join(ROOT, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--outDir',
      buildDir,
      '--base',
      PREVIEW_BASE,
      '--host',
      '127.0.0.1',
      '--port',
      '5486',
      '--strictPort',
    ],
    'frontend-preview',
    {
      cwd: path.join(ROOT, 'frontend'),
      env: { ...env, NODE_ENV: 'production', VITE_API_URL: BACK },
    },
  );
  await ready(PREVIEW_ORIGIN + PREVIEW_BASE);
  const vercel = JSON.parse(await readFile(path.join(ROOT, 'frontend/vercel.json'), 'utf8'));
  const prodCsp = vercel.headers
    .find((item) => item.source === '/(.*)')
    .headers.find((item) => item.key === 'Content-Security-Policy').value;
  // Preserve every production directive. Add only this owned loopback backend to connect-src;
  // HTTPS-only deployment upgrading is inapplicable on the loopback fixture.
  const localCsp = prodCsp.replace("connect-src 'self'", `connect-src 'self' ${BACK}`);
  await writeFile(
    path.join(OUT, 'test-results', 'built-preview-policy.json'),
    JSON.stringify(
      {
        base: PREVIEW_BASE,
        productionCsp: prodCsp,
        localCsp,
        soleTestOriginAddition: BACK,
        nodeEnv: 'production',
        viteMode: 'production',
        applicationApi: 'real isolated loopback backend',
        mode: 'actual vite build and preview, production script/worker CSP also applied to worker responses',
      },
      null,
      2,
    ),
  );
  previewProxy = createServer((request, response) => {
    const upstream = httpRequest(
      PREVIEW_ORIGIN + request.url,
      { method: request.method, headers: request.headers },
      (reply) => {
        response.writeHead(reply.statusCode, {
          ...reply.headers,
          'Content-Security-Policy': localCsp,
        });
        reply.pipe(response);
      },
    );
    upstream.on('error', () => {
      response.writeHead(502);
      response.end();
    });
    request.pipe(upstream);
  });
  await new Promise((resolve) => previewProxy.listen(5485, '127.0.0.1', resolve));
  await Promise.all([ready(`${BACK}/health`), ready(FRONT)]);
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? process.env.CLINICOS_CHROMIUM_PATH;
  browser = await chromium.launch(executablePath ? { executablePath } : {});
  context = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    recordVideo: { dir: path.join(OUT, 'video') },
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  // Supported alternate distribution of the real pinned font assets; no business response is mocked.
  const fontManifest = await verifiedFontAssets();
  const fontFiles = fontManifest.files;
  const fontCss = Object.keys(fontFiles)
    .map((file) => {
      const family = file.startsWith('inter-') ? 'Inter' : 'JetBrains Mono';
      const weight = file.match(/-(\d+)-normal/)[1];
      return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url("https://fonts.gstatic.com/clinicos-qa/${file}") format("woff2");}`;
    })
    .join('\n');
  await context.route('https://fonts.googleapis.com/**', async (route) => {
    const url = new URL(route.request().url());
    assert.equal(url.pathname, '/css2');
    assert.deepEqual(
      url.searchParams.getAll('family'),
      ['Inter:wght@400;500;600;700;800', 'JetBrains+Mono:wght@400;500'].map((value) =>
        value.replaceAll('+', ' '),
      ),
    );
    await route.fulfill({ status: 200, contentType: 'text/css', body: fontCss });
  });
  await context.route('https://fonts.gstatic.com/clinicos-qa/**', async (route) => {
    const file = new URL(route.request().url()).pathname.split('/').pop();
    assert.ok(fontFiles[file], 'Only pinned actual font bytes are served');
    const bytes = await readFile(fontFiles[file].path);
    assert.equal(
      (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex'),
      fontFiles[file].sha256,
    );
    await route.fulfill({
      status: 200,
      contentType: 'font/woff2',
      body: bytes,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });
  await writeFile(
    path.join(OUT, 'test-results', 'font-asset-mirror.json'),
    JSON.stringify(
      {
        ...fontManifest,
        distribution:
          'Exact Google font CSS requests mirror real pinned npm font bytes. Production CSS and API untouched.',
      },
      null,
      2,
    ),
  );
  page = await context.newPage();
  page.on('dialog', async (dialog) => {
    errors.push('Unexpected native application confirmation');
    await dialog.dismiss();
  });
  const draftCreates = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url() === `${BACK}/intake/drafts/from-import`)
      draftCreates.push(request.postData());
    if (request.url().startsWith(BACK) && /\/files\/[^/]+\/content$/.test(request.url()))
      originalSource = { url: request.url(), authorization: request.headers().authorization };
    if (
      request.url().startsWith(BACK) &&
      /\/intake\/drafts\/[^/]+\/confirm$/.test(request.url()) &&
      request.method() === 'POST'
    )
      lastConfirm = {
        url: request.url(),
        body: request.postData(),
        authorization: request.headers().authorization,
      };
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error' || /#instantiateWasm|WebAssembly.*Content Security/.test(msg.text()))
      errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(FRONT_ORIGIN) && /\/assets\//.test(request.url()))
      errors.push(
        `Asset request failed: ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`,
      );
  });
  page.on('response', (response) => {
    if (/\/assets\/.*(?:openjpeg\.wasm|pdf\.worker[^/]*\.mjs)/.test(response.url()))
      pdfAssets.push({
        path: new URL(response.url()).pathname,
        status: response.status(),
        contentType: response.headers()['content-type'] ?? '',
      });
    if (
      response.status() >= 400 &&
      [FRONT_ORIGIN, BACK].some((origin) => response.url().startsWith(origin))
    )
      errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
  });
  const video = page.video();
  await page.goto(FRONT);
  await verify('actual pinned normal and bold fonts load with distinct text geometry', async () => {
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('400 16px Inter'),
        document.fonts.load('700 16px Inter'),
        document.fonts.load('400 16px "JetBrains Mono"'),
      ]);
      await document.fonts.ready;
    });
    const metrics = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = '400 16px Inter';
      const normal = ctx.measureText('ClinicOS pazienti').width;
      ctx.font = '700 16px Inter';
      return {
        normal,
        bold: ctx.measureText('ClinicOS pazienti').width,
        loaded:
          document.fonts.check('400 16px Inter') &&
          document.fonts.check('700 16px Inter') &&
          Array.from(document.fonts).filter(
            (face) => face.family.replaceAll('\"', '') === 'Inter' && face.status === 'loaded',
          ).length >= 2,
      };
    });
    assert.ok(
      metrics.loaded && metrics.normal > 50 && metrics.bold > 50 && metrics.normal !== metrics.bold,
    );
  });

  await page
    .getByRole('button', { name: /Infermiere 1/ })
    .first()
    .click();
  await page
    .locator('.teams-sidebar')
    .getByRole('button', { name: 'Pazienti', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).click();
  const {expect}=await import('/workspace/ClinicOS/node_modules/playwright/test.mjs');
  const geometries=[];
  const viewportList=[{width:1903,height:1032},{width:820,height:1180},{width:390,height:844}];
  async function openEntry(method){
    await page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();
    await page.getByRole('button',{name:'Nuovo ingresso',exact:true}).click();
    await page.getByRole('button',{name:method}).click();
  }
  async function fieldCheck(locator,value){
    await expect(locator).toBeVisible();
    await expect(locator).toBeEnabled();
    await locator.scrollIntoViewIfNeeded();
    const hit=await locator.evaluate(el=>{const b=el.getBoundingClientRect();return [0.25,0.5,0.75].every(x=>document.elementFromPoint(b.x+b.width*x,b.y+b.height/2)===el)});
    assert.equal(hit,true,'Actual input receives painted hit tests');
    await locator.click();
    await expect(locator).toBeFocused();
    await locator.press('Control+A');
    await page.keyboard.insertText(value);
    await expect(locator).toHaveValue(value);
    const afterHit=await locator.evaluate(el=>{const b=el.getBoundingClientRect();return [.25,.5,.75].every(x=>document.elementFromPoint(b.x+b.width*x,b.y+b.height/2)===el)});assert.equal(afterHit,true,'Focused field remains painted and reachable');
    return {value:await locator.inputValue(),hitTest:hit,focusedHitTest:afterHit,box:await locator.boundingBox()};
  }

  async function sourceAudit(selector,label,viewport){
    const canvas=page.locator(selector).first();await expect(canvas).toBeVisible();
    const measureClip=async()=>await canvas.evaluate(canvas=>{
      const b=canvas.getBoundingClientRect();let clip={left:Math.max(0,b.left),top:Math.max(0,b.top),right:Math.min(innerWidth,b.right),bottom:Math.min(innerHeight,b.bottom)};const ancestors=[];
      for(let p=canvas.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),r=p.getBoundingClientRect();ancestors.push({tag:p.tagName,className:p.className,overflowX:s.overflowX,overflowY:s.overflowY,box:{x:r.x,y:r.y,width:r.width,height:r.height},clientHeight:p.clientHeight,scrollHeight:p.scrollHeight});if(/hidden|clip|auto|scroll/.test(s.overflowX)){clip.left=Math.max(clip.left,r.left);clip.right=Math.min(clip.right,r.right)}if(/hidden|clip|auto|scroll/.test(s.overflowY)){clip.top=Math.max(clip.top,r.top);clip.bottom=Math.min(clip.bottom,r.bottom)}}
      const width=Math.max(0,clip.right-clip.left),height=Math.max(0,clip.bottom-clip.top);let visibleDarkPixels=0;
      if(width>0&&height>0){const sx=canvas.width/b.width,sy=canvas.height/b.height;const x=Math.max(0,Math.floor((clip.left-b.left)*sx)),y=Math.max(0,Math.floor((clip.top-b.top)*sy));const rgba=canvas.getContext('2d').getImageData(x,y,Math.min(canvas.width-x,Math.max(1,Math.floor(width*sx))),Math.min(canvas.height-y,Math.max(1,Math.floor(height*sy)))).data;for(let i=0;i<rgba.length;i+=4)if((rgba[i]+rgba[i+1]+rgba[i+2])/3<100)visibleDarkPixels++}
      return {canvas:{x:b.x,y:b.y,width:b.width,height:b.height},clip,visibleWidth:width,visibleHeight:height,visibleDarkPixels,ancestors};
    });

    const rawInitial=await measureClip();
    const panel=selector.startsWith('.iw-doc')?'.iw-doc':'.intake-doc-panel';
    const toolbar=page.locator(panel+' .document-pdf-preview__toolbar');
    await toolbar.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest'}));
    const pairGeometry=await page.locator(panel).evaluate(el=>{
      const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
      return {controls:[...el.querySelectorAll('.document-pdf-preview__toolbar button')].map(n=>({text:n.textContent,box:box(n),disabled:n.disabled})),links:[...el.querySelectorAll('.import-page-preview > a')].map(n=>({text:n.textContent,...box(n)}))};
    });
    const minus=toolbar.getByRole('button',{name:'Riduci zoom',exact:true});
    const nativeFocusBounds=[];
    const captureNativeFocus=async(button)=>{
      await expect(button).toBeFocused();
      const snapshot=await button.evaluate(el=>{const b=el.getBoundingClientRect();return {text:el.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom},hits:[.25,.5,.75].map(y=>{const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height*y);return {fraction:y,self:el===hit||el.contains(hit)}})}});
      nativeFocusBounds.push(snapshot);
      assert.ok(snapshot.box.x>=0&&snapshot.box.y>=0&&snapshot.box.right<=viewport.width+1&&snapshot.box.bottom<=viewport.height+1&&snapshot.hits.every(h=>h.self),'Native focus leaves the entire control inside viewport and its 25/50/75 hit points painted');
    };
    await minus.focus();await captureNativeFocus(minus);await page.keyboard.press('Tab');
    await captureNativeFocus(toolbar.getByRole('button',{name:'Aumenta zoom',exact:true}));
    await page.keyboard.press('Tab');
    await captureNativeFocus(toolbar.getByRole('button',{name:'Adatta',exact:true}));
    const nativeKeyboardFit=await toolbar.getByRole('button',{name:'Adatta',exact:true}).evaluate(el=>{const b=el.getBoundingClientRect();return [.25,.5,.75].every(y=>{const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height*y);return el===hit||el.contains(hit)})});
    checks.push({id:label+' native keyboard Tab reveals full Adatta control',status:nativeKeyboardFit?'PASS':'FAIL'});
    const controls=[];
    for(const button of await toolbar.locator('button').all()){
      await button.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest'}));
      controls.push(await button.evaluate(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,disabled:el.disabled,box:{x:r.x,y:r.y,width:r.width,height:r.height},hits:[.25,.5,.75].map(y=>{const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height*y);return {fraction:y,isSelf:el===hit||el.contains(hit),tag:hit?.tagName,text:hit?.textContent?.slice(0,80)}})}}));
    }
    const fit=controls.find(c=>c.text.includes('Adatta'));const fitHit=!!fit&&fit.hits.every(h=>h.isSelf);
    const fitButton=toolbar.getByRole('button',{name:'Adatta',exact:true});await fitButton.scrollIntoViewIfNeeded();await expect(fitButton).toBeEnabled();if(fitHit)await fitButton.click();
    const link=page.locator(panel+' .import-page-preview > a').first();await expect(link).toBeVisible();await link.scrollIntoViewIfNeeded();
    const download=await link.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {download:el.download,hrefProtocol:new URL(el.href).protocol,hitSelf:el===hit||el.contains(hit),box:{x:r.x,y:r.y,width:r.width,height:r.height}}});
    if(download.hitSelf){
      const [downloadEvent]=await Promise.all([page.waitForEvent('download'),link.click()]);
      const downloadPath=await downloadEvent.path();assert.ok(downloadPath);assert.equal(downloadEvent.suggestedFilename(),'issue485-synthetic.pdf');
      const downloaded=await readFile(downloadPath);assert.equal(downloaded.subarray(0,5).toString(),'%PDF-');download.actualPdfDownload=true;
    }else download.actualPdfDownload=false;
    const links=pairGeometry.links;
    const noOverlap=pairGeometry.controls.every(c=>links.every(l=>Math.max(0,Math.min(c.box.right,l.right)-Math.max(c.box.x,l.x))*Math.max(0,Math.min(c.box.bottom,l.bottom)-Math.max(c.box.y,l.y))===0));
    const stage=page.locator(panel+' .document-pdf-preview__stage');
    await stage.evaluate(el=>{const c=el.querySelector('canvas');el.scrollTop+=c.getBoundingClientRect().top-el.getBoundingClientRect().top;const workspace=el.closest('.import-workspace,.intake-page__grid');if(workspace&&/auto|scroll/.test(getComputedStyle(workspace).overflowY))workspace.scrollTop+=el.getBoundingClientRect().top-workspace.getBoundingClientRect().top});
    await page.locator(selector).first().waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const defaultFit=await measureClip();
    // Verify actual minus activation as well as native Tab and plus activation.
    await minus.scrollIntoViewIfNeeded();await minus.click();
    await expect.poll(async()=>canvas.evaluate(el=>el.getBoundingClientRect().width)).toBeLessThan(defaultFit.canvas.width);
    await fitButton.scrollIntoViewIfNeeded();await fitButton.click();
    await expect.poll(async()=>canvas.evaluate(el=>el.getBoundingClientRect().width)).toBe(defaultFit.canvas.width);
    checks.push({id:label+' actual minus activation reduces paper and Adatta restores it',status:'PASS'});
    const zoomButton=toolbar.getByRole('button',{name:'Aumenta zoom',exact:true});
    await zoomButton.evaluate(el=>{const w=el.closest('.import-workspace,.intake-page__grid');if(w&&/auto|scroll/.test(getComputedStyle(w).overflowY)){const b=el.getBoundingClientRect(),r=w.getBoundingClientRect();w.scrollTop+=b.top-r.top-(w.clientHeight-b.height)/2}});await zoomButton.click();
    await expect.poll(async()=>canvas.evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(defaultFit.canvas.width);
    await page.locator(selector).first().waitFor();
    const pan=await stage.evaluate(el=>{const maxX=el.scrollWidth-el.clientWidth,maxY=el.scrollHeight-el.clientHeight;el.scrollLeft=Math.min(16,maxX);el.scrollTop=Math.min(24,maxY);return {maxX,maxY,x:el.scrollLeft,y:el.scrollTop}});
    assert.ok((pan.maxX<=0||pan.x>0)&&(pan.maxY<=0||pan.y>0),'Actual PDF stage pans internally after real zoom');
    await stage.evaluate(el=>{el.scrollLeft=0;const c=el.querySelector('canvas');el.scrollTop+=c.getBoundingClientRect().top-el.getBoundingClientRect().top;const workspace=el.closest('.import-workspace,.intake-page__grid');if(workspace&&/auto|scroll/.test(getComputedStyle(workspace).overflowY))workspace.scrollTop+=el.getBoundingClientRect().top-workspace.getBoundingClientRect().top});
    const clipping=await measureClip();
    await page.screenshot({path:path.join(OUT,'screenshots',label+'-zoom-reading.png')});
    await fitButton.evaluate(el=>{const w=el.closest('.import-workspace,.intake-page__grid');if(w&&/auto|scroll/.test(getComputedStyle(w).overflowY)){const b=el.getBoundingClientRect(),r=w.getBoundingClientRect();w.scrollTop+=b.top-r.top-(w.clientHeight-b.height)/2}});await fitButton.click();
    await expect.poll(async()=>canvas.evaluate(el=>el.getBoundingClientRect().width)).toBe(defaultFit.canvas.width);
    await page.locator(selector).first().waitFor();
    const fitRestored=await canvas.evaluate((el,width)=>el.getBoundingClientRect().width===width,defaultFit.canvas.width);
    const zoomWorks=clipping.canvas.width>defaultFit.canvas.width;
    assert.ok(Math.abs(clipping.canvas.width/defaultFit.canvas.width-1.25)<.02,'Real reading mode uses actual 125% scale');
    for(const [id,pass] of [['real zoom increases rendered paper size',zoomWorks],['real stage supports internal pan',(pan.maxX<=0||pan.x>0)&&(pan.maxY<=0||pan.y>0)],['real Adatta restores fit',fitRestored]])checks.push({id:label+' '+id,status:pass?'PASS':'FAIL'});
    const visible=clipping.visibleHeight>=80&&clipping.visibleWidth>=100&&clipping.visibleDarkPixels>=100;
    const allControls=controls.every(c=>c.hits.every(h=>h.isSelf));
    const row={label,viewport,rawInitial,defaultFit,readingMode:'actual 125% zoom then internal pan, followed by real Adatta restore',nativeFocusBounds,nativeKeyboardFit,pan,zoomWorks,fitRestored,clipping,controls,pairGeometry,links,download,meaningfulVisibleOriginal:visible,fitAllHitpointsSelf:fitHit,noToolbarDownloadOverlap:noOverlap,allControlsReachable:allControls};
    for(const [id,pass] of [['original meaningful visible height and actual ink',visible],['Adatta all25/50/75 hitpoints self',fitHit],['toolbar download no overlap',noOverlap],['all toolbar controls deliberately scrolled and painted reachable',allControls],['actual original PDF download',download.actualPdfDownload&&download.hrefProtocol==='blob:']])checks.push({id:label+' '+id,status:pass?'PASS':'FAIL',visibleHeight:clipping.visibleHeight,visibleDarkPixels:clipping.visibleDarkPixels});
    await writeFile(path.join(OUT,'test-results',label+'-source-audit.json'),JSON.stringify(row,null,2));
    await page.screenshot({path:path.join(OUT,'screenshots',label+'-source.png')});
    assert.ok([visible,fitHit,noOverlap,allControls,download.actualPdfDownload,nativeKeyboardFit,zoomWorks,fitRestored].every(Boolean),'Independent source audit must pass every unchanged requirement');
    return row;
  }

  async function inspectGeometry(phase,selector,viewport){
    const root=page.locator(selector);await expect(root).toBeVisible();
    await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all([...document.querySelectorAll('.teams-sidebar')].flatMap(el=>el.getAnimations()).map(a=>a.finished.catch(()=>{})))});
    const geometry=await root.boundingBox();
    const exact=Math.abs(geometry.x)<=1&&Math.abs(geometry.y)<=1&&Math.abs(geometry.width-viewport.width)<=1&&Math.abs(geometry.height-viewport.height)<=1;
    const overflow=await page.evaluate(()=>({html:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth}));
    await writeFile(path.join(OUT,'test-results',`${phase}-${viewport.width}-overflow.json`),JSON.stringify({overflow,elements:await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el);return {tag:el.tagName,className:el.className,x:b.x,y:b.y,right:b.right,width:b.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:s.overflowX,text:el.children.length?undefined:el.textContent?.slice(0,90)}}).filter(b=>b.right>innerWidth+1&&b.width>0))},null,2));
    assert.ok(overflow.html<=viewport.width+1&&overflow.body<=viewport.width+1,'No page-width overflow');
    const chromeHits=await root.evaluate(el=>{const r=el.getBoundingClientRect();return [[.05,.05],[.95,.05],[.05,.8],[.95,.8]].map(([x,y])=>{const px=r.x+r.width*x,py=r.y+r.height*y;const hit=document.elementFromPoint(px,py);return {x:px,y:py,insideViewport:px>=0&&py>=0&&px<innerWidth&&py<innerHeight,insideWorkspace:el.contains(hit),appChrome:!!hit?.closest('.teams-sidebar,.compact-topbar'),tag:hit?.tagName,className:hit?.className}})});
    const chromeCovered=chromeHits.every(hit=>!hit.insideViewport||!hit.appChrome);
    checks.push({id:`${phase} ${viewport.width} workspace surface points avoid application chrome`,status:chromeCovered?'PASS':'FAIL',chromeHits});
    const layout=await root.evaluate(el=>Object.fromEntries(['.intake-page__body','.intake-page__sections','.intake-index'].map(sel=>{const n=el.querySelector(sel);if(!n)return [sel,null];const r=n.getBoundingClientRect();return [sel,{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}]})));
    const row={phase,viewport,geometry,layout,chromeHits,exactFullscreen:exact,overflow,chromeCovered,fields:[]};
    if(phase==='manual'){
      row.sectionFill=await root.evaluate(el=>{const b=el.querySelector('.intake-page__body'),s=el.querySelector('.intake-page__sections'),r=b.getBoundingClientRect(),t=s.getBoundingClientRect(),p=getComputedStyle(b);return {bodyWidth:r.width,clientWidth:b.clientWidth,nativeScrollbar:r.width-b.clientWidth,sectionsWidth:t.width,paddingLeft:parseFloat(p.paddingLeft),paddingRight:parseFloat(p.paddingRight),leftGap:t.left-r.left,rightGap:r.right-t.right,fill:Math.abs(t.width-(b.clientWidth-parseFloat(p.paddingLeft)-parseFloat(p.paddingRight)))<=1}});
      checks.push({id:`manual ${viewport.width} sections fill body within padding`,status:row.sectionFill.fill?'PASS':'FAIL',actual:row.sectionFill});
    }
    geometries.push(row);
    await writeFile(path.join(OUT,'test-results','geometry.json'),JSON.stringify(geometries,null,2));
    checks.push({id:`${phase} ${viewport.width} exact viewport rectangle`,status:exact?'PASS':'FAIL',actual:geometry});
    return row;
  }
  await page.getByRole('button',{name:/^A mano/}).click();
  await page.locator('[data-demographic-field=firstName]').waitFor();
  for(const viewport of viewportList){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const row=await inspectGeometry('manual','.intake-page',viewport);
    const details=page.locator('details.intake-index__missing');
    assert.equal(await details.evaluate(el=>el.open),false);
    row.fields.push(await fieldCheck(page.locator('[data-demographic-field=firstName]'),`Prova${viewport.width}`));
    row.fields.push(await fieldCheck(page.locator('[data-demographic-field=lastName]'),'Sintetico485'));
    row.hiddenMissingPainted=await details.evaluate(el=>el.querySelector('ul').checkVisibility({contentVisibilityAuto:true}));
    assert.equal(row.hiddenMissingPainted,false);
    await page.locator('[data-demographic-field=firstName]').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(OUT,'screenshots',`manual-${viewport.width}.png`)});
    await writeFile(path.join(OUT,'test-results','geometry.json'),JSON.stringify(geometries,null,2));
    console.log(`${row.exactFullscreen?'PASS':'FAIL'} manual ${viewport.width}: ${JSON.stringify(row.geometry)}`);
  }
  await page.setViewportSize(viewportList[0]);
  await page.getByRole('button',{name:'Salva bozza e chiudi',exact:true}).click();
  await page.locator('.intake-page').waitFor({state:'detached'});
  await page.reload();
  await page.getByRole('button',{name:/Infermiere 1/}).first().click();
  await openEntry(/^A mano/);
  await expect(page.locator('[data-demographic-field=firstName]')).toHaveValue('Prova390');
  await expect(page.locator('[data-demographic-field=lastName]')).toHaveValue('Sintetico485');
  const manualRows=(await db.query('SELECT data FROM "PatientIntakeDraft" WHERE source=$1',['manual'])).rows;
  assert.equal(manualRows.length,1);assert.equal(manualRows[0].data.anagrafica.firstName,'Prova390');
  assert.equal(manualRows[0].data.anagrafica.lastName,'Sintetico485');
  await writeFile(path.join(OUT,'test-results','manual-persistence.json'),JSON.stringify(manualRows,null,2));
  await page.screenshot({path:path.join(OUT,'screenshots','manual-draft-reloaded-1903.png')});
  checks.push({id:'manual actual saved draft survives browser reload and reopening; SQL readback',status:'PASS'});
  await page.getByRole('button',{name:'Salva bozza e chiudi',exact:true}).click();
  await page.locator('.intake-page').waitFor({state:'detached'});
  await openEntry(/^Lettera o trasferimento/);
  await page.locator('input[type=file]').first().waitFor({state:'attached'});
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const pdfPage=pdf.addPage([595,842]);
  text.split('\n').forEach((line,i)=>pdfPage.drawText(line,{x:35,y:790-i*28,size:14,font}));
  const pdfBytes=Buffer.from(await pdf.save());
  await writeFile(path.join(OUT,'synthetic-letter.pdf'),pdfBytes);
  await page.locator('input[type=file]').first().setInputFiles({name:'issue485-synthetic.pdf',mimeType:'application/pdf',buffer:pdfBytes});
  await page.getByRole('button',{name:'Avvia elaborazione',exact:true}).waitFor();
  await page.locator('.import-page__thumbnail img').first().waitFor();
  await page.getByRole('button',{name:'Avvia elaborazione',exact:true}).click();
  await page.locator('.import-workspace').waitFor({timeout:45000});
  await page.locator('.iw-doc canvas[data-ready=true]').waitFor({timeout:30000});
  await expect(page.locator('#import-demographic-firstName')).toHaveValue('Maria');
  for(const viewport of viewportList){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const row=await inspectGeometry('import-review','.import-session',viewport);
    row.fields.push(await fieldCheck(page.locator('#import-demographic-firstName'),`Import${viewport.width}`));
    row.fields.push(await fieldCheck(page.locator('#import-demographic-lastName'),'Sintetica485'));
    const source=page.locator('.iw-doc canvas[data-ready=true]');await expect(source).toBeVisible();
    row.source=await source.boundingBox();
    row.nonblank=await source.evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4!==3&&v<100));
    assert.equal(row.nonblank,true,'Actual original synthetic PDF contains rendered text pixels');
    assert.ok(row.source.width>100&&row.source.height>80,'Actual source dimensions before deliberate workspace scroll');
    const panes=await page.locator('.iw-doc,.iw-data').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}));
    row.sourceAudit=await sourceAudit('.iw-doc canvas[data-ready=true]',`review-${viewport.width}x${viewport.height}`,viewport);
    row.panes=panes;
    const [a,b]=panes;row.paneOverlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
    assert.equal(row.paneOverlap,0,'Original and editable pane do not paint over each other');
    assert.ok(panes.every(p=>p.x>=-1&&p.right<=viewport.width+1));
    await page.locator('#import-demographic-firstName').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(OUT,'screenshots',`import-review-${viewport.width}.png`)});
    console.log(`PASS import-review ${viewport.width}: ${JSON.stringify(row.geometry)}`);
  }
  // Exercise mutable review while it has no draftId, including source/fields/source.
  for(const viewport of [{width:390,height:600},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    const row=await inspectGeometry('short-mutable-review','.import-session',viewport);
    await expect(page.locator('#import-demographic-firstName')).toBeEnabled();
    row.sourceBefore=await sourceAudit('.iw-doc canvas[data-ready=true]',`mutable-${viewport.width}x${viewport.height}-before`,viewport);
    row.fields.push(await fieldCheck(page.locator('#import-demographic-firstName'),`Short${viewport.width}`));
    row.fields.push(await fieldCheck(page.locator('#import-demographic-lastName'),'Sintetica485'));
    row.sourceAfter=await sourceAudit('.iw-doc canvas[data-ready=true]',`mutable-${viewport.width}x${viewport.height}-return`,viewport);
    await writeFile(path.join(OUT,'test-results','geometry.json'),JSON.stringify(geometries,null,2));
  }
  await page.setViewportSize(viewportList[0]);
  await page.getByRole('button',{name:'Salva bozza e chiudi',exact:true}).click();
  await page.locator('.import-session').waitFor({state:'detached'});
  await page.reload();
  await page.getByRole('button',{name:/Infermiere 1/}).first().click();
  await page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();
  {
  await page.setViewportSize({width:320,height:568});
  const resumeAction=page.getByRole('button',{name:/Riprendi bozza.*Sintetica485/});
  await resumeAction.scrollIntoViewIfNeeded();
  const resumeGeometry=await resumeAction.evaluate(el=>{const b=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const textRects=[...range.getClientRects()].map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}));const style=getComputedStyle(el);return {text:el.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom},textRects,whiteSpace:style.whiteSpace,height:style.height,minHeight:style.minHeight,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth,hitSelf:[.25,.5,.75].every(y=>{const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height*y);return el===hit||el.contains(hit)}),textInside:textRects.every(r=>r.x>=b.x&&r.right<=b.right+1&&r.y>=b.y&&r.bottom<=b.bottom+1)}});
  assert.ok(resumeGeometry.html<=320&&resumeGeometry.body<=320&&resumeGeometry.box.right<=320&&resumeGeometry.box.height>=44&&resumeGeometry.textInside&&resumeGeometry.hitSelf,'Long draft label wraps fully inside its actual reachable resume button');
  checks.push({id:'320 long-name draft resume label readable, page width fits and actual button self-hits',status:'PASS',actual:resumeGeometry});
  await page.screenshot({path:path.join(OUT,'screenshots',`long-draft-resume-${checks.length}.png`)});
  await writeFile(path.join(OUT,'test-results',`long-draft-resume-${checks.length}.json`),JSON.stringify(resumeGeometry,null,2));
  await resumeAction.click();
  }

  await expect(page.locator('[data-demographic-field=firstName]')).toHaveValue('Short320');
  await expect(page.locator('[data-demographic-field=lastName]')).toHaveValue('Sintetica485');
  const importRows=(await db.query('SELECT data FROM "PatientIntakeDraft" WHERE source=$1',['import'])).rows;
  assert.equal(importRows.length,1);assert.equal(importRows[0].data.anagrafica.firstName,'Short320');
  assert.equal(importRows[0].data.anagrafica.lastName,'Sintetica485');
  await writeFile(path.join(OUT,'test-results','import-persistence.json'),JSON.stringify(importRows,null,2));
  await page.screenshot({path:path.join(OUT,'screenshots','import-draft-reloaded-320.png')});
  checks.push({id:'import actual saved draft survives browser reload and UI resume; SQL readback',status:'PASS'});
  for(const viewport of viewportList){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const row=await inspectGeometry('import-editable-workspace','.intake-page--import',viewport);
    row.fields.push(await fieldCheck(page.locator('[data-demographic-field=firstName]'),`Workspace${viewport.width}`));
    row.fields.push(await fieldCheck(page.locator('[data-demographic-field=lastName]'),'Sintetica485'));
    const canvas=page.locator('.intake-doc-panel canvas[data-ready=true]');
    await expect(canvas.first()).toBeVisible();row.source=await canvas.first().boundingBox();
    row.sourceAudit=await sourceAudit('.intake-doc-panel canvas[data-ready=true]',`editing-${viewport.width}x${viewport.height}`,viewport);
    await page.locator('[data-demographic-field=firstName]').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(OUT,'screenshots',`import-editable-workspace-${viewport.width}.png`)});
    await writeFile(path.join(OUT,'test-results','geometry.json'),JSON.stringify(geometries,null,2));
    console.log(`${row.exactFullscreen?'PASS':'FAIL'} import-editable-workspace ${viewport.width}: ${JSON.stringify(row.geometry)}`);
  }
  // Imported editing keeps a usable data viewport and content-sized original below.
  for(const viewport of [{width:390,height:600},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    const row=await inspectGeometry('short-import-editing','.intake-page--import',viewport);
    row.sourceBefore=await sourceAudit('.intake-doc-panel canvas[data-ready=true]',`short-editing-${viewport.width}x${viewport.height}-before`,viewport);
    row.fields.push(await fieldCheck(page.locator('[data-demographic-field=firstName]'),`WorkspaceShort${viewport.width}`));
    row.fields.push(await fieldCheck(page.locator('[data-demographic-field=lastName]'),'Sintetica485'));
    row.sourceAfter=await sourceAudit('.intake-doc-panel canvas[data-ready=true]',`short-editing-${viewport.width}x${viewport.height}-return`,viewport);
    await writeFile(path.join(OUT,'test-results','geometry.json'),JSON.stringify(geometries,null,2));
  }
  await page.setViewportSize(viewportList[0]);
  await page.getByRole('button',{name:'Annulla ingresso e salva la bozza',exact:true}).click();
  await page.locator('.intake-page').waitFor({state:'detached'});
  await page.reload();
  await page.getByRole('button',{name:/Infermiere 1/}).first().click();
  await page.locator('.teams-sidebar').getByRole('button',{name:'Pazienti',exact:true}).click();
  {
  await page.setViewportSize({width:320,height:568});
  const resumeAction=page.getByRole('button',{name:/Riprendi bozza.*Sintetica485/});
  await resumeAction.scrollIntoViewIfNeeded();
  const resumeGeometry=await resumeAction.evaluate(el=>{const b=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const textRects=[...range.getClientRects()].map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}));const style=getComputedStyle(el);return {text:el.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom},textRects,whiteSpace:style.whiteSpace,height:style.height,minHeight:style.minHeight,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth,hitSelf:[.25,.5,.75].every(y=>{const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height*y);return el===hit||el.contains(hit)}),textInside:textRects.every(r=>r.x>=b.x&&r.right<=b.right+1&&r.y>=b.y&&r.bottom<=b.bottom+1)}});
  assert.ok(resumeGeometry.html<=320&&resumeGeometry.body<=320&&resumeGeometry.box.right<=320&&resumeGeometry.box.height>=44&&resumeGeometry.textInside&&resumeGeometry.hitSelf,'Long draft label wraps fully inside its actual reachable resume button');
  checks.push({id:'320 long-name draft resume label readable, page width fits and actual button self-hits',status:'PASS',actual:resumeGeometry});
  await page.screenshot({path:path.join(OUT,'screenshots',`long-draft-resume-${checks.length}.png`)});
  await writeFile(path.join(OUT,'test-results',`long-draft-resume-${checks.length}.json`),JSON.stringify(resumeGeometry,null,2));
  await resumeAction.click();
  }

  await expect(page.locator('[data-demographic-field=firstName]')).toHaveValue('WorkspaceShort320');
  const editedRows=(await db.query('SELECT data FROM "PatientIntakeDraft" WHERE source=$1',['import'])).rows;assert.equal(editedRows.length,1);assert.equal(editedRows[0].data.anagrafica.firstName,'WorkspaceShort320');
  assert.equal(editedRows[0].data.anagrafica.lastName,'Sintetica485');
  await writeFile(path.join(OUT,'test-results','post-import-persistence.json'),JSON.stringify(editedRows,null,2));
  checks.push({id:'post-import edits survive save/reload/UI resume and SQL readback',status:'PASS'});
  await page.locator('.intake-doc-panel canvas[data-ready=true]').first().waitFor();
  await page.screenshot({path:path.join(OUT,'screenshots','post-import-draft-reloaded-320.png')});
  await writeFile(path.join(OUT,'test-results','geometry.json'),JSON.stringify(geometries,null,2));

  // Independent QA: resumed saved review is intentionally readonly.
  await page.setViewportSize(viewportList[0]);
  await page.getByRole('button',{name:/Torna alla revisione/}).click();
  await page.locator('.iw-doc canvas[data-ready=true]').first().waitFor({timeout:45000});
  await expect(page.locator('#import-demographic-firstName')).toBeDisabled();
  for(const viewport of [{width:390,height:844},{width:390,height:600},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    await inspectGeometry('readonly-resumed-review','.import-session',viewport);
    await sourceAudit('.iw-doc canvas[data-ready=true]',`readonly-${viewport.width}x${viewport.height}`,viewport);
  }
  checks.push({id:'saved review retains expected readonly controls',status:'PASS'});

  await writeFile(path.join(OUT,'test-results','provider-fixture-calls.json'),JSON.stringify(providerCalls,null,2));
  assert.ok(providerCalls.some(c=>c.operation==='ocr')&&providerCalls.some(c=>c.operation==='extraction'));
  assert.deepEqual(errors,[],'No console, page or relevant HTTP failures');
  await context.tracing.stop({path:path.join(OUT,'trace','trace.zip')});traceSaved=true;
  await writeFile(path.join(OUT,'test-results','evidence-redaction.json'),JSON.stringify(sanitizeTrace(path.join(OUT,'trace','trace.zip')),null,2));
  await context.close();context=null;
  await copyFile(await video.path(),path.join(OUT,'video','issue485.webm'));
  await writeFile(path.join(OUT,'test-results','execution-boundaries.json'),JSON.stringify({subject:'6d2cc7919a86e3896426a7281f28f3406d8418e4',actualFrontendProductionBuild:true,actualVitePreview:true,nonrootBase:PREVIEW_BASE,actualOwnedBackend:true,actualOwnedPostgreSQL:true,actualUploadedSyntheticPdf:true,onlyExternalOcrExtractionFixture:true,geometryOnly:false,applicationSourceChanged:true,releaseVerified:false},null,2));
} catch (error) {
  errors.push(error.stack ?? error.message);
  if (page)
    await page.screenshot({ path: path.join(OUT, 'test-results', 'failure.png') }).catch(() => {});
  console.error(error.message);
} finally {
  await writeFile(
    path.join(OUT, 'test-results', 'built-pdf-assets.json'),
    JSON.stringify(pdfAssets, null, 2),
  );
  if (context && !traceSaved) {
    const failureTrace = path.join(OUT, 'test-results', 'failure-trace.zip');
    await context.tracing
      .stop({ path: failureTrace })
      .then(() => sanitizeTrace(failureTrace))
      .catch((error) => errors.push(`Failure trace cleanup: ${error.message}`));
  }
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await db?.end().catch(() => {});
  for (const { child } of children) child.kill('SIGTERM');
  await delay(500);
  for (const { child, name, chunks } of children) {
    if (child.exitCode === null) child.kill('SIGKILL');
    await writeFile(path.join(OUT, 'logs', `${name}.log`), Buffer.concat(chunks));
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  if (previewProxy) await new Promise((resolve) => previewProxy.close(resolve));
  if (buildDir) await rm(buildDir, { recursive: true, force: true });
  if (nativeClient) {
    try {
      if (nativeDatabaseCreated) {
        const marker = await nativeClient.query(
          "SELECT shobj_description(oid,'pg_database') AS owner FROM pg_database WHERE datname=$1",
          [nativeDatabase],
        );
        assert.equal(
          marker.rows[0]?.owner,
          `clinicos-qa:${OWNER}`,
          'QA child database ownership changed; refusing cleanup',
        );
        await nativeClient.query('DROP DATABASE "clinicos_qa_batch450" WITH (FORCE)');
      }
    } catch (error) {
      errors.push(`Native database cleanup: ${error.message}`);
    } finally {
      await nativeClient.end();
    }
  }
  if (containerId) {
    const label = run('docker', [
      'inspect',
      '--format',
      '{{ index .Config.Labels "clinicos.qa.owner" }}',
      containerId,
    ]);
    assert.equal(label, OWNER);
    run('docker', ['stop', '--time', '2', containerId]);
  }
  if (uploadDir) {
    assert.equal(path.dirname(uploadDir), path.join(OUT, 'runtime'));
    assert.ok(path.basename(uploadDir).startsWith('clinicos-batch450-uploads-'));
    await rm(uploadDir, { recursive: true, force: true });
  }
  if (sourceReceipt)
    for (const [file, digest] of Object.entries(sourceReceipt.files)) {
      if (
        createHash('sha256')
          .update(await readFile(path.join(ROOT, file)))
          .digest('hex') !== digest
      )
        errors.push(`Source changed during runtime verification: ${file}`);
    }
  await writeFile(
    path.join(OUT, 'test-results', 'fullstack.json'),
    JSON.stringify({ pass: errors.length === 0 && checks.every(c=>c.status==='PASS'), checks, errors }, null, 2),
  );
}
process.exitCode = errors.length || checks.some(c=>c.status==='FAIL') ? 1 : 0;
