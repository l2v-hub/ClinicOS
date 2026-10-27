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
const { chromium } = await import('playwright');
import {
  PDFDocument,
  StandardFonts,
  PDFName,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  drawObject,
} from 'pdf-lib';
import pg from 'pg';
import CodiceFiscale from 'codice-fiscale-js';

const ROOT = process.cwd();
const OUT = path.resolve(
  process.argv[2] ?? 'artifacts/task-validation/bug-batch-450/cycle4/runtime',
);
const FRONT_ORIGIN = 'http://127.0.0.1:5450';
const PREVIEW_BASE = '/qa-clinicos/';
const FRONT = FRONT_ORIGIN + PREVIEW_BASE;
const PREVIEW_ORIGIN = 'http://127.0.0.1:5451';
const BACK = 'http://127.0.0.1:3450';
const RUNTIME = 'http://127.0.0.1:8795';
const DATABASE_URL = 'postgresql://postgres@127.0.0.1:55450/clinicos_test';
const OWNER = 'clinicos-qa-batch450';
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
  npm_config_cache: '/workspace/.cache/npm',
};
for (const folder of ['logs', 'evidence', 'test-results', 'video'])
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
  const nativeMode =
    process.env.QA_POSTGRES_MODE !== 'docker' &&
    (process.env.QA_POSTGRES_MODE === 'native' || existsSync('/usr/lib/postgresql/16/bin/psql'));
  let database = 'clinicos_test';
  if (nativeMode) {
    // CI supplies an isolated PostgreSQL16 parent. Never migrate/read/clear parent patient tables.
    // The explicit local alternate is only our independently owned synthetic fixture on55450.
    const alternate = process.env.QA_NATIVE_DATABASE_URL;
    const target = new URL(
      alternate ?? process.env.DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/clinicos_test',
    );
    assert.ok(['postgres:', 'postgresql:'].includes(target.protocol));
    assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
    assert.equal(target.pathname, '/clinicos_test');
    assert.equal(target.port || '5432', alternate ? '55450' : '5432');
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
      '127.0.0.1:55450:5432',
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
          port: 55450,
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
  await new Promise((resolve) => server.listen(8795, '127.0.0.1', resolve));
  uploadDir = await mkdtemp(path.join(os.tmpdir(), 'clinicos-batch450-uploads-'));
  start(process.execPath, ['--import', 'tsx', 'src/server.ts'], 'backend', {
    cwd: path.join(ROOT, 'backend'),
    env: {
      ...env,
      PORT: '3450',
      AI_UPLOAD_DIR: uploadDir,
    },
  });
  buildDir = await mkdtemp(path.join(os.tmpdir(), 'clinicos-batch450-built-'));
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
      '5451',
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
  await new Promise((resolve) => previewProxy.listen(5450, '127.0.0.1', resolve));
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
  await verify('450 two real responsive entry choices', async () => {
    await page.locator('.nps-option:not([disabled])').first().waitFor();
    assert.equal(await page.locator('.nps-option').count(), 2);
    for (const viewport of [
      { width: 1180, height: 820 },
      { width: 820, height: 1180 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const boxes = await page.locator('.nps-option').evaluateAll((items) =>
        items.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, right: r.right, y: r.y, width: r.width };
        }),
      );
      assert.ok(boxes.every((b) => b.x >= 0 && b.right <= viewport.width + 1 && b.width > 200));
      if (viewport.width < 1024) assert.ok(boxes[1].y > boxes[0].y);
    }
    await page.setViewportSize({ width: 1180, height: 820 });
  });
  await verify('450 keyboard Tab and Enter activate manual entry', async () => {
    await page.getByRole('button', { name: /^Lettera o trasferimento/ }).focus();
    await page.keyboard.press('Tab');
    assert.ok(
      await page
        .getByRole('button', { name: /^A mano/ })
        .evaluate((element) => element === document.activeElement),
    );
    await page.keyboard.press('Enter');
  });
  await page.locator('[data-demographic-field=firstName]').waitFor();
  await verify(
    'Claude2 manual missing steps stay closed with zero field overlap at tablet and phone',
    async () => {
      for (const viewport of [
        { width: 820, height: 1180 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        const details = page.locator('details.intake-index__missing');
        await details.waitFor();
        assert.equal(await details.evaluate((element) => element.open), false);
        const overlap = await page.evaluate(() => {
          const list = document.querySelector('.intake-index__missing ul');
          const first = document.querySelector('[data-demographic-field=firstName]');
          const section = document.querySelector('#intake-sec-anagrafica');
          const details = list.closest('details');
          if (!details.open || !list.checkVisibility({ contentVisibilityAuto: true }))
            return { first: 0, section: 0 };
          const a = list.getBoundingClientRect();
          const intersection = (element) => {
            const b = element.getBoundingClientRect();
            return (
              Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
              Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
            );
          };
          return { first: intersection(first), section: intersection(section) };
        });
        assert.deepEqual(overlap, { first: 0, section: 0 });
        const firstField = page.locator('[data-demographic-field=firstName]');
        await firstField.scrollIntoViewIfNeeded();
        assert.ok(
          await firstField.evaluate((element) => {
            const box = element.getBoundingClientRect();
            return (
              document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element
            );
          }),
          'Closed missing list never intercepts the actual first field',
        );
        await firstField.fill('Prova tastiera');
        assert.equal(await firstField.inputValue(), 'Prova tastiera');
        await firstField.fill('');
        await page.screenshot({
          path: path.join(OUT, 'evidence', `manual-no-overlap-${viewport.width}.png`),
        });
      }
      await page.setViewportSize({ width: 1180, height: 820 });
    },
  );
  await verify('450 automatic-only admission remains empty', async () => {
    assert.equal(
      await page
        .locator('.intake-index__item', { hasText: 'Ingresso' })
        .locator('.intake-index__mark--done')
        .count(),
      0,
    );
    assert.equal(
      await page
        .locator('#intake-sec-anagrafica')
        .getByText('Anagrafica da completare', { exact: false })
        .count(),
      0,
    );
  });
  await page.locator('[data-demographic-field=firstName]').fill('Manuele');
  await page.locator('[data-demographic-field=lastName]').fill('Sintetico');
  await page.locator('[data-demographic-field=dateOfBirth]').fill('1980-01-01');
  const manualCF = new CodiceFiscale({
    name: 'Manuele',
    surname: 'Sintetico',
    gender: 'M',
    day: 1,
    month: 1,
    year: 1980,
    birthplace: 'Roma',
    birthplaceProvincia: 'RM',
  }).toString();
  await page.locator('[data-demographic-field=codiceFiscale]').fill(manualCF);
  await page.getByRole('button', { name: 'Crea paziente', exact: true }).click();
  await page
    .getByRole('heading', { name: /Sintetico/ })
    .first()
    .waitFor({ timeout: 20000 });
  await page.reload();
  await page
    .getByRole('button', { name: /Infermiere 1/ })
    .first()
    .click();
  await page
    .locator('.teams-sidebar')
    .getByRole('button', { name: 'Pazienti', exact: true })
    .click();
  await page
    .getByText(/Sintetico.*Manuele/)
    .first()
    .click();
  await verify(
    '450 saved patient identity survives real browser reload and DB readback',
    async () => {
      await page
        .getByRole('heading', { name: /Sintetico/ })
        .first()
        .waitFor();
      const row = (
        await db.query('SELECT "firstName", "codiceFiscale" FROM "Patient" WHERE "lastName"=$1', [
          'Sintetico',
        ])
      ).rows[0];
      assert.equal(row.firstName, 'Manuele');
      assert.equal(row.codiceFiscale, manualCF);
      await screenshot(450);
    },
  );
  await page
    .locator('.teams-sidebar')
    .getByRole('button', { name: 'Pazienti', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).click();
  await verify('450 keyboard ShiftTab and Enter activate document entry', async () => {
    await page.getByRole('button', { name: /^A mano/ }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.ok(
      await page
        .getByRole('button', { name: /^Lettera o trasferimento/ })
        .evaluate((element) => element === document.activeElement),
    );
    await page.keyboard.press('Enter');
  });
  await page.locator('input[type=file]').first().waitFor({ state: 'attached' });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const first = pdf.addPage([595, 842]);
  text
    .split('\n')
    .forEach((line, index) => first.drawText(line, { x: 35, y: 790 - index * 28, size: 14, font }));
  // Scanned-page equivalent: rasterize a synthetic page into PNG, embed the bytes into page2.
  const imageBytes = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 800;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#000';
    ctx.font = '25px sans-serif';
    ctx.fillText('PAGINA SCANSIONATA SINTETICA', 25, 80);
    ctx.fillText('Controllo pagina 2', 25, 130);
    return c.toDataURL('image/png').split(',')[1];
  });
  const encodedScan = spawnSync(
    'python3',
    [
      '-c',
      'from PIL import Image;import sys,io; image=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB");image.save(sys.stdout.buffer,format="JPEG2000",no_jp2=True)',
    ],
    { input: Buffer.from(imageBytes, 'base64') },
  );
  assert.equal(encodedScan.status, 0, 'Synthetic JPEG2000 fixture encoder must succeed');
  const scan = pdf.context.stream(encodedScan.stdout, {
    Type: PDFName.of('XObject'),
    Subtype: PDFName.of('Image'),
    Width: 600,
    Height: 800,
    ColorSpace: PDFName.of('DeviceRGB'),
    BitsPerComponent: 8,
    Filter: PDFName.of('JPXDecode'),
  });
  const scanRef = pdf.context.register(scan);
  const scannedPage = pdf.addPage([595, 842]);
  const scanName = scannedPage.node.newXObject('SyntheticScannedPage', scanRef);
  scannedPage.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(595, 0, 0, 842, 0, 0),
    drawObject(scanName),
    popGraphicsState(),
  );
  const pdfBytes = Buffer.from(await pdf.save());
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'lettera-sintetica.pdf',
    mimeType: 'application/pdf',
    buffer: pdfBytes,
  });
  await page.getByRole('button', { name: 'Avvia elaborazione', exact: true }).waitFor();
  await page.locator('.import-page__thumbnail img').nth(1).waitFor({ timeout: 30000 });
  await verify('475 both authentic source thumbnails contain rendered pixels', async () => {
    assert.equal(await page.locator('.import-page__thumbnail img').count(), 2);
    const thumbnailPixels = await page
      .locator('.import-page__thumbnail img')
      .evaluateAll(async (images) => {
        const measure = (ctx, width, height) => {
          const rgba = ctx.getImageData(0, 0, width, height).data;
          let ink = 0,
            dark = 0;
          for (let i = 0; i < rgba.length; i += 4) {
            const luminance = (rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3;
            ink += 255 - luminance;
            if (luminance < 100) dark++;
          }
          return { ink, dark };
        };
        return Promise.all(
          images.map(async (img) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const actual = measure(ctx, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const blankJpeg = await new Promise((resolve) =>
              canvas.toBlob(resolve, 'image/jpeg', 0.8),
            );
            const blank = await createImageBitmap(blankJpeg);
            ctx.drawImage(blank, 0, 0);
            blank.close();
            return {
              width: canvas.width,
              height: canvas.height,
              actual,
              whiteJpegControl: measure(ctx, canvas.width, canvas.height),
            };
          }),
        );
      });
    await writeFile(
      path.join(OUT, 'test-results', 'thumbnail-pixel-controls.json'),
      JSON.stringify(thumbnailPixels, null, 2),
    );
    const nonblank = (sample) => sample.dark > 0 && sample.ink > 1000;
    assert.ok(
      thumbnailPixels.every((sample) => !nonblank(sample.whiteJpegControl)),
      'Real same-size encoded whiteJPEG controls must fail the nonblank criterion',
    );
    assert.ok(
      thumbnailPixels.every((sample) => nonblank(sample.actual)),
      'Both rendered thumbnails must contain integrated text/image ink distinct from whiteJPEG controls',
    );
    assert.ok(
      (
        await page
          .locator('.import-page__thumbnail img')
          .evaluateAll((images) => images.map((img) => img.naturalWidth))
      ).every((width) => width > 100),
    );
  });
  await page.getByRole('button', { name: 'Avvia elaborazione', exact: true }).click();
  await page.locator('.import-workspace').waitFor({ timeout: 45000 });
  await page.locator('canvas[data-ready=true]').first().waitFor({ timeout: 30000 });
  await verify(
    '472/473 full viewport, real source canvas and reviewed extracted identity',
    async () => {
      const rect = await page.locator('.import-session').boundingBox();
      assert.ok(rect.width >= 1178 && rect.height >= 818);
      assert.equal(
        await page
          .locator('.import-workspace .srev-anag-grid input[data-demographic-field="firstName"]')
          .inputValue(),
        'Maria',
      );
      assert.equal(
        await page
          .locator('.import-workspace .srev-anag-grid input[data-demographic-field="sex"]')
          .inputValue(),
        '',
      );
      assert.ok(
        await page.getByText('Sesso proposto dal codice fiscale:', { exact: false }).isVisible(),
      );
      assert.ok(
        await page.locator('.iw-doc canvas').evaluate((canvas) => {
          const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          return data.some((value, index) => index % 4 !== 3 && value < 100);
        }),
      );
      await page.locator('.iw-data').evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      const source = await page.locator('.iw-doc canvas').boundingBox();
      assert.ok(source && source.y < 820 && source.y + source.height > 50);
      await screenshot(473);
    },
  );
  await verify(
    '485 contextual runtime only: same import review fills1903x1032 viewport',
    async () => {
      await page.setViewportSize({ width: 1903, height: 1032 });
      const geometry = await page.locator('.import-session').boundingBox();
      assert.ok(
        geometry.x === 0 && geometry.y === 0 && geometry.width >= 1901 && geometry.height >= 1030,
      );
      await page.locator('.iw-doc canvas[data-ready=true]').waitFor();
      assert.ok(
        await page
          .locator('.import-workspace .srev-anag-grid input[data-demographic-field="firstName"]')
          .isVisible(),
      );
      await writeFile(
        path.join(OUT, 'test-results', 'issue485-context-geometry.json'),
        JSON.stringify(
          {
            viewport: { width: 1903, height: 1032 },
            geometry,
            phase: 'same letter import review as batch450; other issue485 phases not inferred',
            issueClosure: false,
          },
          null,
          2,
        ),
      );
      await page.screenshot({
        path: path.join(OUT, 'evidence', 'issue485-context-import-fullscreen-1903.png'),
      });
      await page.setViewportSize({ width: 1180, height: 820 });
    },
  );
  await verify(
    '475 selected scanned JPX page loads real OpenJPEG decoder and nonblank source pixels',
    async () => {
      const values = await page
        .locator('.iw-doc')
        .getByRole('combobox', { name: 'Pagina', exact: true })
        .locator('option')
        .evaluateAll((options) => options.map((option) => option.value));
      assert.equal(values.length, 2);
      await page
        .locator('.iw-doc')
        .getByRole('combobox', { name: 'Pagina', exact: true })
        .selectOption(values[1]);
      await page.locator('.iw-doc canvas[data-ready=true][aria-label$="pagina 2"]').waitFor();
      const pixels = await page.locator('.iw-doc canvas').evaluate((canvas) => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let dark = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70) dark++;
        return dark;
      });
      assert.ok(pixels > 100, 'The synthetic raster text must be rendered, not a white canvas');
      await screenshot(475);
    },
  );
  await verify(
    '472/473 source remains visible beside editable fields at tablet and phone',
    async () => {
      for (const viewport of [
        { width: 820, height: 1180 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await page.locator('.iw-data').evaluate((element) => {
          element.scrollTop = 0;
        });
        await page
          .locator('.import-workspace .srev-anag-grid input[data-demographic-field="firstName"]')
          .fill('Maria');
        await page.locator('.iw-doc canvas[data-ready=true]').waitFor();
        const layout = await page.evaluate(() => {
          const doc = document.querySelector('.iw-doc').getBoundingClientRect();
          const data = document.querySelector('.iw-data').getBoundingClientRect();
          return {
            doc: {
              x: doc.x,
              y: doc.y,
              right: doc.right,
              bottom: doc.bottom,
              width: doc.width,
              height: doc.height,
            },
            data: { width: data.width, height: data.height },
          };
        });
        assert.ok(
          layout.doc.width > 150 &&
            layout.doc.height > 100 &&
            layout.data.width > 150 &&
            layout.data.height > 100,
        );
        assert.ok(
          layout.doc.x >= 0 &&
            layout.doc.right <= viewport.width + 1 &&
            layout.doc.y >= 0 &&
            layout.doc.bottom <= viewport.height + 1,
        );
        await page.screenshot({
          path: path.join(OUT, 'evidence', `issue472-${viewport.width}.png`),
        });
      }
      await page.setViewportSize({ width: 1180, height: 820 });
    },
  );
  await verify(
    '475 authenticated source cannot be read anonymously or by another operator',
    async () => {
      assert.ok(originalSource?.authorization);
      const anonymous = await fetch(originalSource.url);
      assert.ok([401, 403].includes(anonymous.status));
      const session = await fetch(`${BACK}/auth/simulator/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId: 'SIM-DOCTOR-1' }),
      });
      assert.equal(session.status, 201);
      const token = (await session.json()).token;
      const foreign = await fetch(originalSource.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.ok([403, 404].includes(foreign.status));
      assert.doesNotMatch(await foreign.text(), /Maria|Sintetica|lettera-sintetica/);
    },
  );
  await verify(
    '472 closing review saves actual edited fields into a visible resumable draft',
    async () => {
      await page
        .locator('.import-workspace .srev-anag-grid input[data-demographic-field="address"]')
        .fill('Via sintetica QA 12');
      await page.getByRole('button', { name: 'Chiudi importazione', exact: true }).last().click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Salva bozza e chiudi', exact: true })
        .click();
      await page
        .locator('.teams-sidebar')
        .getByRole('button', { name: 'Pazienti', exact: true })
        .click();
      await page.getByRole('button', { name: /Riprendi bozza · Sintetica Maria/ }).click();
      const saved = (
        await db.query('SELECT data FROM "PatientIntakeDraft" WHERE source=$1', ['import'])
      ).rows[0];
      assert.equal(saved.data.anagrafica.address, 'Via sintetica QA 12');
    },
  );
  await page.locator('[data-testid=patient-intake-header]').waitFor({ timeout: 20000 });
  await page.locator('[data-testid=intake-document-panel] canvas[data-ready=true]').waitFor();
  await verify(
    '473 heading-free prescriptions survive actual parser and import handoff',
    async () => {
      const rows = await db.query('SELECT data FROM "PatientIntakeDraft" WHERE source=$1', [
        'import',
      ]);
      const data = rows.rows[0].data;
      assert.equal(data.anagrafica.sex, 'F');
      assert.equal(data._derivedFields.anagrafica.sex.reviewRequired, true);
      await page.getByTestId('derived-sex-review').waitFor();
      await page.getByRole('button', { name: 'Conferma sesso', exact: true }).click();
      await page.getByTestId('derived-sex-review').waitFor({ state: 'detached' });
      assert.ok(
        data.terapiaImport.some(
          (row) => /Ramipril/i.test(row.farmacoNome) && row.orari.includes('08:00'),
        ),
      );
      assert.equal(
        (await db.query('SELECT count(*)::int AS total FROM "MedicationAdministration"')).rows[0]
          .total,
        0,
      );
    },
  );
  await verify(
    '473 original remains visible while actual demographic and therapy fields are edited at desktop, tablet and phone',
    async () => {
      for (const viewport of [
        { width: 1180, height: 820 },
        { width: 820, height: 1180 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await page.locator('[data-demographic-field=firstName]').fill('Maria');
        await page.locator('.intake-index__item').filter({ hasText: 'Terapia' }).click();
        const notes = page
          .getByTestId('discharge-therapy-row')
          .first()
          .getByRole('textbox', { name: 'Note e indicazioni' });
        await notes.fill(`Nota sintetica QA ${viewport.width}`);
        assert.equal(await notes.inputValue(), `Nota sintetica QA ${viewport.width}`);
        const field = await notes.boundingBox();
        assert.ok(
          field &&
            field.width >= 170 &&
            field.x >= 0 &&
            field.x + field.width <= viewport.width + 1,
          'Actual therapy field must be editable without clipped horizontal geometry',
        );
        const bodyGeometry = await page
          .locator('.intake-page__body')
          .evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
        assert.ok(
          bodyGeometry.scroll <= bodyGeometry.width + 1,
          'Intake therapy body must not overflow horizontally',
        );
        const panel = page.getByTestId('intake-document-panel');
        assert.equal(await panel.getAttribute('role'), 'complementary');
        const rect = await panel.boundingBox();
        assert.ok(
          rect &&
            rect.width > 150 &&
            rect.height > 100 &&
            rect.y >= 0 &&
            rect.y + rect.height <= viewport.height + 1,
          `Persistent original must stay in the viewport: ${JSON.stringify({ viewport, rect })}`,
        );
        assert.ok(
          await panel.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return [0.25, 0.5, 0.75].every((fraction) =>
              element.contains(
                document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height * fraction),
              ),
            );
          }),
          'Original must not be occluded by fixed validation/action overlays while editing therapy',
        );
        const shell = await page.locator('.intake-page--import').evaluate((element) => ({
          scrollTop: element.scrollTop,
          y: element.getBoundingClientRect().y,
          bottom: element.getBoundingClientRect().bottom,
        }));
        assert.ok(
          shell.scrollTop === 0 && shell.y >= 0 && shell.bottom <= viewport.height + 1,
          `Only inner panes may scroll: ${JSON.stringify(shell)}`,
        );
        const visiblePage = await panel.locator('canvas[data-ready=true]').evaluate((canvas) => {
          const image = canvas.getBoundingClientRect();
          const stage = canvas.closest('.document-pdf-preview__stage').getBoundingClientRect();
          const host = canvas.closest('.intake-doc-panel__body').getBoundingClientRect();
          const left = Math.max(image.left, stage.left, host.left, 0),
            top = Math.max(image.top, stage.top, host.top, 0);
          const right = Math.min(image.right, stage.right, host.right, innerWidth),
            bottom = Math.min(image.bottom, stage.bottom, host.bottom, innerHeight);
          const width = Math.max(0, right - left),
            height = Math.max(0, bottom - top);
          if (width < 1 || height < 1) return { width, height, dark: 0 };
          const sx = Math.max(0, Math.floor(((left - image.left) * canvas.width) / image.width));
          const sy = Math.max(0, Math.floor(((top - image.top) * canvas.height) / image.height));
          const sw = Math.min(canvas.width - sx, Math.floor((width * canvas.width) / image.width));
          const sh = Math.min(
            canvas.height - sy,
            Math.floor((height * canvas.height) / image.height),
          );
          const pixels = canvas.getContext('2d').getImageData(sx, sy, sw, sh).data;
          let dark = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i] < 100 && pixels[i + 1] < 100 && pixels[i + 2] < 100) dark++;
          return { width, height, dark };
        });
        await writeFile(
          path.join(OUT, 'test-results', `original-visible-${viewport.width}.json`),
          JSON.stringify({ viewport, shell, visiblePage }, null, 2),
        );
        assert.ok(
          visiblePage.width >= 100 && visiblePage.height >= 60 && visiblePage.dark > 20,
          `Actual original text pixels must remain visible while editing: ${JSON.stringify(visiblePage)}`,
        );
        assert.equal(
          await page.locator('[data-demographic-field=firstName]').inputValue(),
          'Maria',
        );
        await page.screenshot({
          path: path.join(OUT, 'evidence', `issue473-handoff-${viewport.width}.png`),
        });
      }
      await page.setViewportSize({ width: 1180, height: 820 });
    },
  );
  await page.locator('.intake-index__item').filter({ hasText: 'Terapia' }).click();
  await screenshot(473);
  await page.getByRole('button', { name: '← Torna alla revisione', exact: true }).click();
  await page.getByRole('button', { name: 'Chiudi', exact: false }).last().click();
  await page
    .locator('.teams-sidebar')
    .getByRole('button', { name: 'Pazienti', exact: true })
    .click();
  await page.reload();
  await page
    .getByRole('button', { name: /Infermiere 1/ })
    .first()
    .click();
  await page
    .locator('.teams-sidebar')
    .getByRole('button', { name: 'Pazienti', exact: true })
    .click();
  await page.getByRole('button', { name: /Riprendi bozza · Sintetica Maria/ }).waitFor();
  await screenshot(472);
  await page.getByRole('button', { name: /Riprendi bozza · Sintetica Maria/ }).click();
  await page.locator('[data-demographic-field=firstName]').waitFor();
  await verify(
    '476 incomplete identity persists and exact draft resumes with actionable blockers',
    async () => {
      assert.equal(await page.locator('[data-demographic-field=firstName]').inputValue(), 'Maria');
      assert.equal(await page.locator('[data-demographic-field=dateOfBirth]').inputValue(), '');
      assert.equal(
        await page.getByTestId('derived-sex-review').count(),
        0,
        'Acknowledged provenance stays clear after reload',
      );
      assert.equal(
        (await db.query('SELECT data FROM "PatientIntakeDraft" WHERE source=$1', ['import']))
          .rows[0].data._derivedFields.anagrafica.sex.reviewRequired,
        false,
      );
      const savedTherapies = (
        await db.query('SELECT data FROM "PatientIntakeDraft" WHERE source=$1', ['import'])
      ).rows[0].data.terapiaImport;
      assert.equal(
        savedTherapies[0].note,
        'Nota sintetica QA 390',
        'Actual edited therapy note must survive close, reload and exact draft resume',
      );
      const missing = await page.locator('[data-testid=intake-missing]').innerText();
      assert.doesNotMatch(missing, /Data di nascita obbligatoria/);
      assert.match(missing, /terapia|Terapia/);
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int AS total FROM "PatientIntakeDraft" WHERE source=$1',
            ['import'],
          )
        ).rows[0].total,
        1,
      );
      await screenshot(476);
    },
  );
  await verify(
    '476 invalid fiscal code and supplied future birthdate have actionable real blockers',
    async () => {
      await page.locator('[data-demographic-field=codiceFiscale]').fill('INVALID');
      assert.match(
        await page.locator('[data-testid=intake-missing]').innerText(),
        /Codice fiscale non valido/,
      );
      assert.ok(
        await page.getByRole('button', { name: 'Crea paziente', exact: true }).isDisabled(),
      );
      await page.locator('[data-demographic-field=codiceFiscale]').fill(fiscalCode);
      await page.locator('[data-demographic-field=dateOfBirth]').fill('2999-01-01');
      assert.match(
        await page.locator('[data-testid=intake-missing]').innerText(),
        /data di nascita valida e non futura/,
      );
      await page.locator('[data-demographic-field=dateOfBirth]').fill('');
    },
  );
  await verify(
    '476 three identity fields create an incomplete patient only after unsafe prescriptions are explicitly left in draft',
    async () => {
      while (await page.getByRole('button', { name: /^Lascia in bozza / }).count())
        await page
          .getByRole('button', { name: /^Lascia in bozza / })
          .first()
          .click();
      const committed = page.waitForResponse(
        (response) =>
          /\/intake\/drafts\/[^/]+\/confirm$/.test(response.url()) &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Crea paziente', exact: true }).click();
      const response = await committed;
      assert.equal(
        response.status(),
        201,
        'Actual import confirmation commits before persistence checks',
      );
      const confirmed = await response.json();
      await page.locator('[data-testid=patient-intake-header]').waitFor({ state: 'detached' });
      await page
        .getByRole('heading', { name: /Sintetica/ })
        .first()
        .waitFor();
      const row = (
        await db.query(
          'SELECT id, "dateOfBirth", "codiceFiscale", sex FROM "Patient" WHERE id=$1',
          [confirmed.patient.id],
        )
      ).rows[0];
      assert.equal(row.dateOfBirth, null);
      assert.equal(row.codiceFiscale, fiscalCode);
      assert.equal(row.sex, 'F');
      const replay = await fetch(lastConfirm.url, {
        method: 'POST',
        headers: { Authorization: lastConfirm.authorization, 'Content-Type': 'application/json' },
        body: lastConfirm.body,
      });
      assert.equal(replay.status, 200);
      assert.equal((await replay.json()).patient.id, row.id);
      assert.equal(
        (
          await db.query('SELECT count(*)::int AS total FROM "Patient" WHERE "codiceFiscale"=$1', [
            fiscalCode,
          ])
        ).rows[0].total,
        1,
      );
      assert.equal(
        (await db.query('SELECT count(*)::int AS total FROM "MedicationAdministration"')).rows[0]
          .total,
        0,
      );
      await page.reload();
      await page
        .getByRole('button', { name: /Infermiere 1/ })
        .first()
        .click();
      await page
        .locator('.teams-sidebar')
        .getByRole('button', { name: 'Pazienti', exact: true })
        .click();
      await page.getByRole('button', { name: /Filtra anagrafiche da completare/ }).click();
      const completionDisclosure = page.locator('details.patient-list-incomplete');
      if (!(await completionDisclosure.evaluate((element) => element.open)))
        await completionDisclosure.locator('summary').click();
      await page.getByRole('button', { name: /Completa anagrafica · Sintetica Maria/ }).click();
      await page
        .getByRole('heading', { name: /Sintetica/ })
        .first()
        .waitFor();
      await screenshot(476);
    },
  );
  // QA450-1: real conflicting letters, actual close/footer/Escape handlers and SQL persistence.
  conflictMode = true;
  await page
    .locator('.teams-sidebar')
    .getByRole('button', { name: 'Pazienti', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nuovo ingresso', exact: true }).click();
  await page.getByRole('button', { name: /^Lettera o trasferimento/ }).click();
  for (const [index, name] of conflictNames.entries()) {
    if (index) {
      await page.getByRole('button', { name: '+ Nuova lettera', exact: true }).click();
      await page.getByRole('tab', { name: /Lettera 2/, selected: true }).waitFor();
    }
    const letter = await PDFDocument.create();
    const face = await letter.embedFont(StandardFonts.Helvetica);
    const sheet = letter.addPage([595, 842]);
    ['LETTERA SINTETICA CONFLITTO', `${name} Conflitto`, 'Nessun dato reale.'].forEach(
      (line, row) => sheet.drawText(line, { x: 35, y: 790 - row * 28, size: 14, font: face }),
    );
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: `conflitto-${index + 1}.pdf`,
        mimeType: 'application/pdf',
        buffer: Buffer.from(await letter.save()),
      });
    await page.locator('.import-page__thumbnail img').first().waitFor();
  }
  await page.getByRole('button', { name: 'Avvia elaborazione', exact: true }).click();
  await page.getByRole('region', { name: 'Conflitti tra lettere' }).waitFor({ timeout: 45000 });
  await page.locator('.iw-doc canvas[data-ready=true]').waitFor();
  const createsBeforeConflict = draftCreates.length;
  const draftsBeforeConflict = Number(
    (
      await db.query('SELECT count(*)::int AS total FROM "PatientIntakeDraft" WHERE status=$1', [
        'draft',
      ])
    ).rows[0].total,
  );
  await verify(
    'Claude2 unresolved X/footer/Escape offer disabled save, continue intact and close without a draft',
    async () => {
      for (const close of [
        () => page.getByRole('button', { name: 'Chiudi importazione', exact: true }).last().click(),
        () =>
          page.locator('.import-session > .import-modal__head [data-dialog-initial-focus]').click(),
        () => page.keyboard.press('Escape'),
      ]) {
        await close();
        const dialog = page.getByRole('alertdialog');
        await dialog.waitFor();
        assert.equal(
          await dialog
            .getByRole('button', { name: 'Salva bozza e chiudi', exact: true })
            .isDisabled(),
          true,
        );
        assert.ok(
          await dialog
            .getByRole('button', { name: 'Continua la revisione', exact: true })
            .evaluate((element) => element === document.activeElement),
          'Disabled save gives initial focus to Continue',
        );
        await page.keyboard.press('Shift+Tab');
        assert.ok(
          await dialog
            .getByRole('button', { name: 'Chiudi senza salvare', exact: true })
            .evaluate((element) => element === document.activeElement),
          'ShiftTab wraps inside dialog',
        );
        await page.keyboard.press('Tab');
        assert.ok(
          await dialog
            .getByRole('button', { name: 'Continua la revisione', exact: true })
            .evaluate((element) => element === document.activeElement),
          'Tab wraps inside dialog',
        );
        assert.equal(draftCreates.length, createsBeforeConflict);
        await dialog.getByRole('button', { name: 'Continua la revisione', exact: true }).click();
        assert.ok(await page.locator('.iw-doc canvas[data-ready=true]').isVisible());
      }
      await page.keyboard.press('Escape');
      await page.getByRole('alertdialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('alertdialog').waitFor({ state: 'detached' });
      assert.ok(
        await page.locator('.import-workspace').isVisible(),
        'Escape dismisses only top confirmation',
      );
      await page.getByRole('button', { name: 'Chiudi importazione', exact: true }).last().click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Chiudi senza salvare', exact: true })
        .click();
      await page.locator('.import-session').waitFor({ state: 'detached' });
      assert.equal(draftCreates.length, createsBeforeConflict);
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int AS total FROM "PatientIntakeDraft" WHERE status=$1',
            ['draft'],
          )
        ).rows[0].total,
        draftsBeforeConflict,
      );
      await page.getByRole('button', { name: /^Lettera o trasferimento/ }).click();
      await page.getByRole('region', { name: 'Conflitti tra lettere' }).waitFor();
      await page.getByRole('radio', { name: 'Corretto', exact: true }).check();
      await page.getByRole('button', { name: 'Chiudi importazione', exact: true }).last().click();
      const dialog = page.getByRole('alertdialog');
      assert.equal(
        await dialog
          .getByRole('button', { name: 'Salva bozza e chiudi', exact: true })
          .isDisabled(),
        true,
      );
      await dialog.getByRole('button', { name: 'Continua la revisione', exact: true }).click();
      assert.ok(await page.getByRole('radio', { name: 'Corretto', exact: true }).isChecked());
      await page.screenshot({
        path: path.join(OUT, 'evidence', 'unresolved-close-session-recovered.png'),
      });
    },
  );
  await verify(
    'QA450-1 only the saved corrected decision and current manual edits reach the real draft',
    async () => {
      const decision = page.waitForResponse(
        (response) => /\/review$/.test(response.url()) && response.request().method() === 'PUT',
      );
      await page
        .getByRole('button', { name: 'Salva decisioni sui conflitti', exact: true })
        .click();
      assert.equal((await decision).status(), 200);
      await page.waitForFunction(
        () =>
          document.querySelector(
            '.import-workspace .srev-anag-grid input[data-demographic-field="firstName"]',
          )?.value === 'Corretto',
      );
      assert.equal(
        await page
          .locator('.import-workspace .srev-anag-grid input[data-demographic-field="firstName"]')
          .inputValue(),
        'Corretto',
      );
      await page
        .locator('.import-workspace .srev-anag-grid input[data-demographic-field="address"]')
        .fill('Solo correzione attuale');
      await page.getByRole('button', { name: 'Chiudi importazione', exact: true }).last().click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Salva bozza e chiudi', exact: true })
        .click();
      await page
        .locator('.teams-sidebar')
        .getByRole('button', { name: 'Pazienti', exact: true })
        .click();
      await page.getByRole('button', { name: /Riprendi bozza · Conflitto Corretto/ }).waitFor();
      const saved = (
        await db.query('SELECT data FROM "PatientIntakeDraft" WHERE status=$1', ['draft'])
      ).rows;
      assert.equal(saved.length, draftsBeforeConflict + 1);
      const actual = saved.find((row) => row.data.anagrafica?.lastName === 'Conflitto').data;
      assert.equal(actual.anagrafica.firstName, 'Corretto');
      assert.equal(actual.anagrafica.address, 'Solo correzione attuale');
      assert.equal(draftCreates.length, createsBeforeConflict + 1);
      await page.screenshot({ path: path.join(OUT, 'evidence', 'qa450-1-corrected-draft.png') });
    },
  );
  await verify(
    'Claude2 thirty incomplete identities have one bounded filter and complete-only search remains escapable',
    async () => {
      for (let index = 0; index < 30; index++)
        await db.query(
          'INSERT INTO "Patient" (id,"medicalRecordNumber","firstName","lastName","updatedAt") VALUES ($1,$2,$3,$4,NOW())',
          [
            `cycle4-incomplete-${index}`,
            `C4-I-${index}`,
            `Persona${String(index).padStart(2, '0')}`,
            'SintesiCoda',
          ],
        );
      await page.reload();
      await page
        .getByRole('button', { name: /Infermiere 1/ })
        .first()
        .click();
      await page
        .locator('.teams-sidebar')
        .getByRole('button', { name: 'Pazienti', exact: true })
        .click();
      const search = page.getByRole('searchbox', {
        name: 'Cerca paziente per nome o codice fiscale',
        exact: true,
      });
      await search.fill('SintesiCoda');
      await page.waitForFunction(
        () => document.querySelectorAll('.patient-roster tbody tr[aria-label]').length === 30,
      );
      const list = page.getByRole('region', { name: 'Elenco pazienti', exact: true });
      const incompleteFilter = list.locator('.plist-toolbar').getByRole('button', {
        name: /^(Filtra anagrafiche da completare|Mostra tutti i pazienti)$/,
      });
      const incompleteSummary = list.locator('details.patient-list-incomplete');
      const rosterRows = list.locator('.patient-roster tbody tr[aria-label]');
      const expectedIncompleteLabels = Array.from(
        { length: 30 },
        (_, index) => `Apri cartella di Persona${String(index).padStart(2, '0')} SintesiCoda`,
      );
      const assertIncompleteRoster = async () => {
        assert.deepEqual(
          await rosterRows.evaluateAll((rows) =>
            rows.map((row) => row.getAttribute('aria-label')).sort(),
          ),
          expectedIncompleteLabels,
          'The roster contains all thirty exact seeded identities, without substitutions',
        );
      };
      assert.equal(await incompleteFilter.count(), 1, 'One bounded incomplete-identity filter');
      assert.equal(await incompleteFilter.getAttribute('aria-pressed'), 'false');
      assert.equal(
        await incompleteSummary.count(),
        1,
        'One aggregate incomplete-identity disclosure',
      );
      assert.equal(await incompleteSummary.evaluate((element) => element.open), false);
      assert.match(await incompleteSummary.locator('summary').innerText(), /30 pazienti/);
      assert.match(
        await incompleteSummary.locator('summary').innerText(),
        /\(tra 30 caricati(?:, elenco parziale)?\)/,
      );
      assert.equal(
        await incompleteSummary.getByRole('button', { includeHidden: true }).count(),
        30,
      );
      assert.equal(await incompleteSummary.locator('button:visible').count(), 0);
      await assertIncompleteRoster();
      await incompleteFilter.click();
      assert.equal(await incompleteFilter.getAttribute('aria-pressed'), 'true');
      await assertIncompleteRoster();
      await incompleteFilter.click();
      assert.equal(await incompleteFilter.getAttribute('aria-pressed'), 'false');
      await assertIncompleteRoster();
      await incompleteFilter.click();
      assert.equal(await incompleteFilter.getAttribute('aria-pressed'), 'true');
      await assertIncompleteRoster();
      await page.screenshot({
        path: path.join(OUT, 'evidence', 'thirty-incomplete-bounded-filter.png'),
      });
      await search.fill('Manuele');
      await page.waitForFunction(
        () => document.querySelectorAll('.patient-roster tbody tr[aria-label]').length === 1,
      );
      assert.equal(
        await incompleteFilter.count(),
        0,
        'Complete-only search escapes the active incomplete filter and hides its control',
      );
      assert.equal(
        await incompleteSummary.count(),
        0,
        'Complete-only subset hides the aggregate incomplete-identity disclosure',
      );
      assert.deepEqual(
        await rosterRows.evaluateAll((rows) => rows.map((row) => row.getAttribute('aria-label'))),
        ['Apri cartella di Manuele Sintetico'],
        'Complete-only search retains the exact previously persisted complete patient',
      );
      assert.match(await list.locator('.patient-roster tbody').innerText(), /Manuele/);
      await page.screenshot({
        path: path.join(OUT, 'evidence', 'zero-incomplete-summary-absent.png'),
      });
    },
  );
  await writeFile(
    path.join(OUT, 'test-results', 'built-pdf-assets.json'),
    JSON.stringify(pdfAssets, null, 2),
  );
  assert.ok(
    pdfAssets.some(
      (item) =>
        item.path.startsWith(PREVIEW_BASE + 'assets/pdfjs-') &&
        item.path.endsWith('/openjpeg.wasm') &&
        item.status === 200 &&
        /application\/wasm/.test(item.contentType),
    ),
    'Actual built nonroot OpenJPEG wasm HTTP200 MIME receipt required',
  );
  assert.ok(providerCalls.some((call) => call.operation === 'ocr'));
  assert.ok(providerCalls.some((call) => call.operation === 'extraction'));
  assert.deepEqual(errors, [], 'No console, page or relevant HTTP errors');
  await context.tracing.stop({ path: path.join(OUT, 'evidence', 'issue450.zip') });
  traceSaved = true;
  const redaction = sanitizeTrace(path.join(OUT, 'evidence', 'issue450.zip'));
  await writeFile(
    path.join(OUT, 'test-results', 'evidence-redaction.json'),
    JSON.stringify(redaction, null, 2),
  );
  await context.close();
  context = null;
  const videoPath = await video.path();
  for (const issue of [450, 472, 473, 475, 476]) {
    if (issue !== 450)
      await copyFile(
        path.join(OUT, 'evidence', 'issue450.zip'),
        path.join(OUT, 'evidence', `issue${issue}.zip`),
      );
    await copyFile(videoPath, path.join(OUT, 'evidence', `issue${issue}.webm`));
  }
  await writeFile(
    path.join(OUT, 'test-results', 'runtime-provider-contract.md'),
    '# Runtime provider contract\n\nOnly OCR/extraction is deterministic synthetic external-provider fixture. Actual HTTP upload, authenticated source bytes, worker/version2 hash+attempt lifecycle, parser, review UI, PDF.js pixels, draft and SQL persistence are real. Paid vendor inference is not verified.\n',
  );
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
    assert.equal(path.dirname(uploadDir), os.tmpdir());
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
    JSON.stringify({ pass: errors.length === 0, checks, errors }, null, 2),
  );
}
process.exitCode = errors.length ? 1 : 0;
