import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { startPo05Postgres } from '../fixtures/po05-postgres.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evidence = resolve(
  root,
  process.env.IMPORT_E2E_ARTIFACTS || 'artifacts/task-validation/backend-regressions/import-e2e',
);
await mkdir(evidence, { recursive: true });
async function unusedPort() {
  const socket = createServer();
  await new Promise((ok, fail) => {
    socket.once('error', fail);
    socket.listen(0, '127.0.0.1', ok);
  });
  const port = socket.address().port;
  await new Promise((ok) => socket.close(ok));
  return port;
}
const port = await unusedPort();
const runtimeUrl = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  NODE_ENV: 'test',
  AUTH_MODE: 'demo',
  ROLE_SIMULATOR_ENABLED: 'false',
  AI_PROVIDER: 'mock',
  AI_RUNTIME_URL: runtimeUrl,
  AI_RUNTIME_SERVICE_TOKEN: 'local-synthetic-runtime',
  AI_OCR_MODEL: 'mock:mock',
  AI_EXTRACTION_MODEL: 'mock:mock',
  AI_AGENT_MODEL: 'mock:mock',
  AI_REPAIR_MODEL: 'mock:mock',
  PORT: String(port),
};
const database = await startPo05Postgres({
  artifactRoot: resolve(evidence, 'scratch'),
  repositoryRoot: root,
});
env.DATABASE_URL = database.url;
const runtime = spawn(process.env.IMPORT_E2E_PYTHON || 'python', ['-m', 'clinicos_ai.main'], {
  cwd: resolve(root, 'clinicos-ai-runtime'),
  env,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let runtimeOutput = '';
runtime.stdout.on('data', (data) => {
  runtimeOutput += data;
});
runtime.stderr.on('data', (data) => {
  runtimeOutput += data;
});
let startupError;
runtime.on('error', (error) => {
  startupError = error;
});
const services = [];
async function scriptRun(args, label, childEnv = env, cwd = root) {
  let output = '';
  const child = spawn(process.execPath, args, {
    cwd,
    env: childEnv,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => {
    output += data;
  });
  child.stderr.on('data', (data) => {
    output += data;
  });
  const status = await new Promise((ok, fail) => {
    child.once('error', fail);
    child.once('close', ok);
  });
  await writeFile(resolve(evidence, `${label}.txt`), output);
  console.log(`${label}: exit ${status}`);
  if (status !== 0) throw new Error(`${label} failed; see synthetic test log`);
}
function serviceRun(args, label, childEnv, cwd = root) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: childEnv,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const state = { child, label, output: '' };
  child.stdout.on('data', (data) => {
    state.output += data;
  });
  child.stderr.on('data', (data) => {
    state.output += data;
  });
  services.push(state);
  return child;
}
try {
  let healthy = false;
  for (let i = 0; i < 60; i++) {
    if (startupError) throw startupError;
    if (runtime.exitCode !== null) throw new Error('Local mock runtime exited during startup');
    healthy = await fetch(`${runtimeUrl}/v1/runtime/health`)
      .then((r) => r.ok)
      .catch(() => false);
    if (healthy) break;
    await new Promise((ok) => setTimeout(ok, 500));
  }
  if (!healthy) throw new Error('Local mock runtime did not become healthy');
  if (!process.argv.includes('--browser-only')) {
    for (const script of [
      'import-e2e',
      'new-vs-existing-smoke',
      'async-smoke',
      'therapy-import-api',
    ]) {
      await scriptRun(['--import', 'tsx', `e2e/${script}.mjs`], script);
    }
  }
  if (process.argv.includes('--browser') || process.argv.includes('--browser-only')) {
    const backendPort = await unusedPort();
    const frontendPort = await unusedPort();
    const backendUrl = `http://127.0.0.1:${backendPort}`;
    const frontendUrl = `http://127.0.0.1:${frontendPort}`;
    const browserEnv = {
      ...env,
      E2E_BACKEND_URL: backendUrl,
      E2E_FRONTEND_URL: frontendUrl,
      VITE_API_URL: backendUrl,
      PORT: String(backendPort),
      FRONTEND_URL: frontendUrl,
    };
    await scriptRun(['--import', 'tsx', 'backend/src/seed.ts'], 'seed', browserEnv);
    serviceRun(['--import', 'tsx', 'backend/src/server.ts'], 'backend', browserEnv);
    const require = createRequire(resolve(root, 'frontend/package.json'));
    const vite = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
    serviceRun(
      [vite, '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'],
      'frontend',
      browserEnv,
      resolve(root, 'frontend'),
    );
    for (const url of [`${backendUrl}/health`, frontendUrl]) {
      let ready = false;
      for (let i = 0; i < 60; i++) {
        ready = await fetch(url)
          .then((r) => r.ok)
          .catch(() => false);
        if (ready) break;
        await new Promise((ok) => setTimeout(ok, 500));
      }
      if (!ready) throw new Error('Synthetic browser stack did not start');
    }
    await scriptRun(['e2e/import-happy-path.mjs', evidence], 'browser', browserEnv);
  }
} finally {
  for (const { child, label, output } of services.reverse()) {
    if (child.exitCode === null && child.pid) {
      const closed = new Promise((ok) => child.once('close', ok));
      child.kill();
      await closed;
    }
    await writeFile(resolve(evidence, `${label}.txt`), output);
  }
  if (runtime.exitCode === null && runtime.pid) {
    const closed = new Promise((ok) => runtime.once('close', ok));
    runtime.kill();
    await closed;
  }
  await writeFile(resolve(evidence, 'runtime.txt'), runtimeOutput);
  await database.close();
}
