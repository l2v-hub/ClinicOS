import test from 'node:test';
import assert from 'node:assert/strict';
import {
  certificateCommands,
  validatePublicCertificate,
  collectOpenSSL,
  createNativeGuardCertificates,
} from '../../src/bug-pipeline/native-guard-certificates.mjs';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
test('certificate commands use anonymous FIFO stdin key path, only public CSR/CA filenames', () => {
  const c = certificateCommands('0123456789abcdef0123456789abcdef');
  assert.equal(c.length, 3);
  for (const args of c) {
    assert.ok(!args.some((x) => /BEGIN|PRIVATE KEY|\.key$|serial\.srl|\/dev\/fd\//.test(x)));
    assert.equal(args[args.indexOf('-out') + 1], '-');
  }
  assert.equal(c[0][c[0].indexOf('-key') + 1], '/dev/stdin');
  assert.equal(c[1][c[1].indexOf('-key') + 1], '/dev/stdin');
  assert.equal(c[2][c[2].indexOf('-CAkey') + 1], '/dev/stdin');
});
test('fixed shell creates a real anonymous FIFO; key and shell syntax are never interpolated', async () => {
  const args = ['req', '-key', '/dev/stdin', '-subj', '/CN=public $(not-executed)'];
  let called = 0;
  const spawnImpl = (command, actual, options) => {
    called++;
    assert.equal(command, '/bin/bash');
    assert.deepEqual(actual, [
      '--noprofile',
      '--norc',
      '-o',
      'pipefail',
      '-c',
      '/bin/cat | /usr/bin/openssl "$@"',
      'native-guard-openssl',
      ...args,
    ]);
    assert.deepEqual(options.env, { PATH: '/usr/bin:/bin', LANG: 'C', OPENSSL_CONF: '/dev/null' });
    assert.equal(options.detached, true);
    assert.deepEqual(options.stdio, ['pipe', 'pipe', 'pipe']);
    assert.ok(!JSON.stringify({ command, actual, options }).includes('synthetic-private-key'));
    const p = new EventEmitter();
    p.stdin = new PassThrough();
    p.stdout = new PassThrough();
    p.stderr = new PassThrough();
    p.kill = () => {};
    let input = '';
    p.stdin.on('data', (chunk) => {
      input += chunk.toString();
    });
    queueMicrotask(() => {
      assert.equal(input, 'synthetic-private-key');
      p.stdout.end('synthetic-public-output');
      p.emit('close', 0);
    });
    return p;
  };
  assert.equal(
    (await collectOpenSSL(args, [Buffer.from('synthetic-private-key')], { spawnImpl })).toString(),
    'synthetic-public-output',
  );
  assert.equal(called, 1);
});
test('public CA rejects private keys and extra PEM objects before any mount', () => {
  assert.throws(() =>
    validatePublicCertificate(Buffer.from('-----BEGIN PRIVATE KEY-----\nsecret')),
  );
  assert.throws(() =>
    validatePublicCertificate(
      Buffer.from('-----BEGIN CERTIFICATE-----\nmalformed\n-----END CERTIFICATE-----'),
    ),
  );
});
test('OpenSSL failure never leaks raw stderr or supplied key into errors', async () => {
  const spawnImpl = () => {
    const p = new EventEmitter();
    p.stdin = new PassThrough();
    p.stdout = new PassThrough();
    p.stderr = new PassThrough();
    p.stdio = [p.stdin, p.stdout, p.stderr];
    p.kill = () => {};
    queueMicrotask(() => {
      p.stdout.end('synthetic-private-key-on-stdout');
      p.stderr.end('private-key-provider-error');
      p.emit('close', 1);
    });
    return p;
  };
  await assert.rejects(
    collectOpenSSL(['req'], [Buffer.from('synthetic-private')], { spawnImpl }),
    (e) =>
      e.message === 'native-certificate-generation-failed' &&
      !JSON.stringify(e).includes('private'),
  );
});
test(
  'Linux actual OpenSSL cert chain works with stdin keys; Windows never pretends this proof',
  { skip: process.platform !== 'linux' },
  async () => {
    const c = await createNativeGuardCertificates();
    try {
      assert.equal(validatePublicCertificate(c.publicCA).ca, true);
      assert.ok(c.tlsOptions.key.length > 1000);
    } finally {
      c.dispose();
    }
  },
);
