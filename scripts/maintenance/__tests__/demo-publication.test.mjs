// Controlled synthetic failure fixtures, not live browser evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { verifyOnlineDemo, assertPublishedBundle, BACKEND } from '../demo-online-empty-browser.mjs';
const token = 'synthetic-private-session-do-not-publish';
function browserFixture({ logoutFails = false } = {}) {
  const listeners = new Map();
  let videoDirectory;
  const response = {
    url: () => BACKEND + '/patients/page',
    ok: () => true,
    status: () => 200,
    json: async () => ({ items: [] }),
  };
  const emit = () => listeners.get('response')?.(response);
  const page = {
    setDefaultTimeout() {},
    on: (name, cb) => listeners.set(name, cb),
    goto: async () => {},
    waitForResponse: async () => ({ status: () => 201, json: async () => ({ token }) }),
    locator: () => ({
      filter: () => ({ waitFor: async () => {}, count: async () => 1, click: async () => emit() }),
    }),
    getByRole: () => ({ waitFor: async () => {} }),
    reload: async () => emit(),
    screenshot: async ({ path }) =>
      fs.writeFile(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])),
  };
  const context = {
    newPage: async () => page,
    close: async () => {},
    tracing: {
      start: async (options) => assert.equal(options.snapshots, false),
      stop: async (options) => {
        if (options?.path)
          execFileSync(
            'python3',
            [
              '-c',
              "import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],'w') as z:\n z.writestr('trace.network','')\n z.writestr('trace.trace','{\"type\":\"after\",\"method\":\"reload\"}\\n')",
              options.path,
            ],
            { stdio: 'pipe' },
          );
      },
    },
  };
  const chromium = {
    launch: async () => ({
      newContext: async (options) => {
        videoDirectory = options.recordVideo.dir;
        await fs.mkdir(videoDirectory, { recursive: true });
        await fs.writeFile(
          join(videoDirectory, 'synthetic.webm'),
          Buffer.from([26, 69, 223, 163, 0, 0]),
        );
        return context;
      },
      close: async () => {},
    }),
  };
  const fetchImpl = async (url) => ({
    status: url.endsWith('/logout') ? (logoutFails ? 500 : 204) : 200,
    json: async () =>
      url.endsWith('/auth/status')
        ? { mode: 'demo', simulator: true }
        : url.endsWith('/identities')
          ? { identities: [{ id: 'SIM-ADMIN', name: 'Synthetic Admin' }] }
          : url.endsWith('/auth/me')
            ? { id: 'synthetic-admin' }
            : url.includes('/patients/page')
              ? { items: [] }
              : { slots: [] },
  });
  return { chromium, fetchImpl, getVideoDirectory: () => videoDirectory };
}
test('complete media bundle publishes atomically only after real verifier assertions and successful revocation', async () => {
  const base = await fs.mkdtemp(join(tmpdir(), 'clinicos-publish470-')),
    output = join(base, 'out');
  try {
    const fixture = browserFixture(),
      result = await verifyOnlineDemo({ ...fixture, outputDirectory: output });
    assert.equal(result.bundlePublished, true);
    assert.equal(result.sessionRevoked, true);
    assert.equal(await assertPublishedBundle(output), true);
    assert.ok(!fixture.getVideoDirectory().startsWith(output + '/'));
    assert.equal(
      (await fs.readdir(base)).filter((f) => f.startsWith('.private-online-')).length,
      0,
    );
    assert.equal(existsSync(join(base, 'out-failure.json')), false);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});
test('failed logout cannot publish any video/trace/screenshot and emits only safe failure summary', async () => {
  const base = await fs.mkdtemp(join(tmpdir(), 'clinicos-publish470-negative-')),
    output = join(base, 'out');
  try {
    const result = await verifyOnlineDemo({
      ...browserFixture({ logoutFails: true }),
      outputDirectory: output,
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.sessionRevoked, false);
    assert.equal(existsSync(output), false);
    const failure = await fs.readFile(join(base, 'out-failure.json'), 'utf8');
    assert.equal(failure.includes(token), false);
    assert.equal(JSON.parse(failure).failureCode, 'SESSION_REVOCATION_FAILED');
    assert.equal(
      (await fs.readdir(base)).filter((f) => f.startsWith('.private-online-')).length,
      0,
    );
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});
test('SIGKILL before proving emptiness leaves media only in private staging outside every upload path', async () => {
  const base = await fs.mkdtemp(join(tmpdir(), 'clinicos-publish470-kill-')),
    output = join(base, 'out');
  const source = `import fs from 'node:fs/promises';import{join}from'node:path';import{verifyOnlineDemo}from${JSON.stringify(new URL('../demo-online-empty-browser.mjs', import.meta.url).href)};setInterval(()=>{},1000);await verifyOnlineDemo({outputDirectory:${JSON.stringify(output)},fetchImpl:async url=>({status:200,json:async()=>url.endsWith('/auth/status')?{mode:'demo',simulator:true}:{identities:[{id:'SIM-ADMIN',name:'Synthetic Admin'}]}}),chromium:{launch:async()=>({newContext:async options=>{await fs.mkdir(options.recordVideo.dir,{recursive:true});await fs.writeFile(join(options.recordVideo.dir,'partial.webm'),'SYNTHETIC-PRECHECK-MEDIA');console.log('STAGED');return{newPage:async()=>await new Promise(()=>{})};}})}});`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('child staging timeout')), 5000);
      child.stdout.on('data', (data) => {
        if (String(data).includes('STAGED')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.on('exit', () => {
        clearTimeout(timer);
        reject(Error('child terminated early'));
      });
    });
    child.kill('SIGKILL');
    await new Promise((resolve) => child.once('exit', resolve));
    assert.equal(existsSync(output), false);
    assert.equal(existsSync(join(base, 'out-failure.json')), false);
    const files = await fs.readdir(base);
    assert.equal(files.filter((f) => f.startsWith('.private-online-')).length, 1);
    assert.equal(
      files.some((f) => f === 'video' || f === 'trace.zip'),
      false,
    );
  } finally {
    child.kill('SIGKILL');
    await fs.rm(base, { recursive: true, force: true });
  }
});
test('workflow independently gates media on successful verifier and published-bundle check, failures upload JSON only', () => {
  const source = readFileSync(
    new URL('../../../.github/workflows/deploy-backend.yml', import.meta.url),
    'utf8',
  );
  assert.match(source, /id: online_verification/);
  assert.match(source, /id: online_artifact_gate/);
  assert.match(
    source,
    /run: node scripts\/maintenance\/demo-online-empty-browser.mjs --check-published/,
  );
  assert.match(
    source,
    /if: success\(\) && steps.online_verification.outcome == 'success' && steps.online_artifact_gate.outcome == 'success'/,
  );
  assert.match(
    source,
    /path: artifacts\/task-validation\/maintenance-470\/actual-online-failure.json/,
  );
  assert.match(source, /group: railway-backend\n      cancel-in-progress: false/);
});
