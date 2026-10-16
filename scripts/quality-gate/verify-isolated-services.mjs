import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import dgram from 'node:dgram';
import { appendFile, readFile, rm, writeFile } from 'node:fs/promises';
import { writeSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { verificationArguments } from '../../agent-team/src/bug-pipeline/verification.mjs';

const FILE = fileURLToPath(import.meta.url);
const connectDenied = () =>
  new Promise((resolve, reject) => {
    const socket = net.connect({ host: '1.1.1.1', port: 443 });
    socket.setTimeout(3000);
    socket.once('connect', () => {
      socket.destroy();
      reject(new Error('Direct external TCP escaped policy'));
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('A timeout does not prove TCP containment'));
    });
    socket.once('error', (error) => {
      socket.destroy();
      assert.ok(['ENETUNREACH', 'EACCES', 'EPERM'].includes(error.code), error.code);
      resolve();
    });
  });
const udpDenied = () =>
  new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    socket.send(Buffer.from('synthetic-egress-probe'), 53, '1.1.1.1', (error) => {
      socket.close();
      if (error && ['ENETUNREACH', 'EACCES', 'EPERM'].includes(error.code)) resolve();
      else reject(new Error('External UDP was not explicitly denied'));
    });
    socket.once('error', reject);
  });
const proxyStatus = (method) =>
  new Promise((resolve, reject) => {
    const proxy = new URL(process.env.HTTP_PROXY || process.env.http_proxy);
    assert.equal(proxy.protocol, 'http:');
    const request = http.request({
      hostname: proxy.hostname,
      port: proxy.port,
      method,
      path: method === 'CONNECT' ? 'example.com:443' : 'http://example.com/',
      headers: { Host: 'example.com' },
    });
    request.setTimeout(3000, () => request.destroy(new Error('Proxy probe timed out')));
    request.once('error', reject);
    request.once(method === 'CONNECT' ? 'connect' : 'response', (response, socket) => {
      if (method === 'CONNECT') socket.destroy();
      else response.resume();
      resolve(response.statusCode);
    });
    request.end();
  });

if (process.argv[2] === '--inside') {
  for (const name of [
    'GH_TOKEN',
    'GITHUB_TOKEN',
    'CODEX_API_KEY',
    'ANTHROPIC_API_KEY',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'VERCEL_TOKEN',
    'RAILWAY_TOKEN',
  ])
    assert.equal(process.env[name], undefined);
  const server = http.createServer((request, response) => response.end('isolated-local-ready'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}`);
    assert.equal(await response.text(), 'isolated-local-ready');
    const sql = execFileSync(
      '/usr/lib/postgresql/16/bin/psql',
      [
        '-h',
        '127.0.0.1',
        '-p',
        '5432',
        '-U',
        'postgres',
        '-d',
        'clinicos_test',
        '-Atqc',
        'SELECT current_database(), to_regclass(\'public."Patient"\') IS NOT NULL, (SELECT count(*) > 0 FROM "_prisma_migrations")',
      ],
      { encoding: 'utf8' },
    ).trim();
    assert.equal(sql, 'clinicos_test|t|t');
    await connectDenied();
    await udpDenied();
    assert.equal(await proxyStatus('GET'), 403);
    assert.equal(await proxyStatus('CONNECT'), 403);
    await assert.rejects(appendFile(process.argv[3], 'escaped'), (error) =>
      ['EROFS', 'EACCES', 'EPERM'].includes(error.code),
    );
    writeSync(
      1,
      'Isolated HTTP, PostgreSQL and migrations: PASS; external TCP/UDP/proxy and outside writes: DENIED\n',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
} else {
  const cwd = process.cwd();
  const outside = path.join(path.dirname(cwd), `clinicos-verification-proof-${process.pid}`);
  await writeFile(outside, 'preserved', { flag: 'wx' });
  try {
    const run = createRunner({
      env: process.env,
      runtimeRoot: path.join(process.env.RUNNER_TEMP, 'verification-services'),
    });
    const result = await run({
      command: 'codex',
      args: verificationArguments(cwd, process.execPath, [FILE, '--inside', outside]),
      cwd,
      envMode: 'verification',
      timeoutMs: 180000,
      maxOutputBytes: 2 * 1024 * 1024,
    });
    console.log(JSON.stringify(result));
    assert.equal(result.ok, true, result.stderr || result.error);
    assert.ok(result.stdout.includes('Isolated HTTP, PostgreSQL and migrations: PASS'));
    assert.equal(await readFile(outside, 'utf8'), 'preserved');
    const failure = await run({
      command: 'codex',
      args: verificationArguments(cwd, process.execPath, ['-e', 'process.exit(7)']),
      cwd,
      envMode: 'verification',
      timeoutMs: 180000,
      maxOutputBytes: 2 * 1024 * 1024,
    });
    assert.equal(failure.ok, false);
    assert.equal(failure.code, 7, 'A failed planned test must fail isolated verification');
    console.log('Isolated failing-command exit propagation: PASS');
  } finally {
    await rm(outside, { force: true });
  }
}
