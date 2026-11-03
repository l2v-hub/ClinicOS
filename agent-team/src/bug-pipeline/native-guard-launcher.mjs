// Trusted container bootstrap only. No caller-provided executable, env or flags.
import assert from 'node:assert/strict';
import { createServer, connect } from 'node:net';
import { spawn } from 'node:child_process';
import { lstat, mkdir, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CAPS = new Set([32768, 49152, 65536]);
const MAX_BOOTSTRAP = 2 * 1024 * 1024;
export function parseNativeBootstrap(raw) {
  assert.ok(
    Buffer.isBuffer(raw) && raw.length > 0 && raw.length <= MAX_BOOTSTRAP,
    'native-bootstrap-invalid',
  );
  const b = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  assert.equal(raw.toString('utf8'), JSON.stringify(b), 'native-bootstrap-noncanonical');
  assert.ok(b && Object.getPrototypeOf(b) === Object.prototype);
  assert.deepEqual(
    Object.keys(b).sort(),
    ['input', 'model', 'oauthToken', 'outputCap', 'schema'].sort(),
  );
  assert.ok(typeof b.oauthToken === 'string' && /^[\x21-\x7e]{8,8192}$/.test(b.oauthToken));
  assert.ok(typeof b.model === 'string' && /^claude-opus-[0-9]+(?:-[0-9]+){1,3}$/.test(b.model));
  assert.ok(
    typeof b.input === 'string' &&
      Buffer.byteLength(b.input) > 0 &&
      Buffer.byteLength(b.input) <= 1000000 &&
      !b.input.includes('\0'),
  );
  assert.equal(Buffer.from(b.input, 'utf8').toString('utf8'), b.input);
  assert.ok(
    b.schema &&
      Object.getPrototypeOf(b.schema) === Object.prototype &&
      Buffer.byteLength(JSON.stringify(b.schema)) <= 16384,
  );
  assert.ok(CAPS.has(b.outputCap));
  return b;
}
export function nativeGuardArguments(bootstrap) {
  const b = parseNativeBootstrap(Buffer.from(JSON.stringify(bootstrap)));
  return [
    '--print',
    '--model',
    `${b.model}[1m]`,
    '--restricted',
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(b.schema),
    '--permission-mode',
    'plan',
    '--tools',
    '',
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
    '--disable-slash-commands',
    '--no-session-persistence',
    '--max-turns',
    '1',
    '--debug-to-stderr',
    '--settings',
    JSON.stringify({
      env: {
        CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(b.outputCap),
        DISABLE_COMPACT: '1',
        MAX_STRUCTURED_OUTPUT_RETRIES: '1',
        CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES: 'false',
        CLAUDE_CODE_GZIP_REQUEST_BODIES: '0',
      },
    }),
  ];
}
export function nativeGuardEnvironment(oauthToken) {
  assert.ok(typeof oauthToken === 'string' && /^[\x21-\x7e]{8,8192}$/.test(oauthToken));
  return {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    LANG: 'C.UTF-8',
    HOME: '/tmp/native-home',
    TMPDIR: '/tmp/native-tmp',
    CI: 'true',
    DISABLE_AUTOUPDATER: '1',
    CLAUDE_CODE_ENTRYPOINT: 'cli',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ENABLE_CLAUDEAI_MCP_SERVERS: 'false',
    HTTPS_PROXY: 'http://127.0.0.1:43193',
    HTTP_PROXY: 'http://127.0.0.1:43193',
    NODE_EXTRA_CA_CERTS: '/guard/public-ca.pem',
    CLAUDE_CODE_OAUTH_TOKEN: oauthToken,
  };
}
export async function assertNoMachinePolicy({ stat = lstat } = {}) {
  for (const p of [
    '/etc/claude-code/managed-settings.json',
    '/etc/claude-code/managed-settings.d',
    '/etc/claude-code/managed-mcp.json',
  ]) {
    try {
      await stat(p);
      throw Error('native-managed-policy-present');
    } catch (e) {
      if (e.code !== 'ENOENT') throw Error('native-managed-policy-not-absent');
    }
  }
}
export async function createNativeLoopbackBridge({ socketPath = '/guard/socket/data.sock' } = {}) {
  assert.equal(socketPath, '/guard/socket/data.sock');
  const sockets = new Set();
  const server = createServer((s) => {
    sockets.add(s);
    const upstream = connect(socketPath);
    sockets.add(upstream);
    const end = () => {
      s.destroy();
      upstream.destroy();
      sockets.delete(s);
      sockets.delete(upstream);
    };
    s.setTimeout(20 * 60000, end);
    upstream.setTimeout(20 * 60000, end);
    s.on('error', end);
    upstream.on('error', end);
    s.on('close', end);
    upstream.on('close', end);
    s.pipe(upstream);
    upstream.pipe(s);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(43193, '127.0.0.1', resolve);
  });
  return {
    close: async () => {
      for (const s of sockets) s.destroy();
      await new Promise((r) => server.close(r));
    },
  };
}
export async function launchNativeGuard({
  stdin = process.stdin,
  stdout = process.stdout,
  stderr = process.stderr,
  spawnImpl = spawn,
} = {}) {
  assert.equal(process.platform, 'linux', 'native-linux-required');
  let length = 0,
    chunks = [];
  for await (const chunk of stdin) {
    length += chunk.length;
    assert.ok(length <= MAX_BOOTSTRAP);
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks),
    b = parseNativeBootstrap(raw);
  raw.fill(0);
  chunks = [];
  await assertNoMachinePolicy();
  for (const p of ['/tmp/native-home', '/tmp/native-work', '/tmp/native-tmp']) {
    await mkdir(p, { mode: 0o700 });
    assert.deepEqual(await readdir(p), []);
  }
  const bridge = await createNativeLoopbackBridge();
  let child;
  try {
    child = spawnImpl('/guard/claude', nativeGuardArguments(b), {
      cwd: '/tmp/native-work',
      env: nativeGuardEnvironment(b.oauthToken),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdout.pipe(stdout, { end: false });
    child.stderr.pipe(stderr, { end: false });
    child.stdin.on('error', () => {});
    child.stdin.end(b.input);
    b.oauthToken = '';
    return await new Promise((resolve) => {
      let settled = false;
      const done = (code) => {
        if (!settled) {
          settled = true;
          resolve(Number.isInteger(code) ? code : 1);
        }
      };
      child.once('error', () => done(1));
      child.once('close', done);
    });
  } finally {
    b.oauthToken = '';
    child?.kill('SIGKILL');
    await bridge.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  launchNativeGuard().then(
    (code) => {
      process.exitCode = code;
    },
    () => {
      process.stderr.write('native-bootstrap-failed\n');
      process.exitCode = 1;
    },
  );
}
