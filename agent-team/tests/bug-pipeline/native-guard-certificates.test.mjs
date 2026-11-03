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
test('certificate commands keep all private keys in stdin BIO, only public CSR/CA filenames', () => {
  const c = certificateCommands('0123456789abcdef0123456789abcdef');
  assert.equal(c.length, 3);
  for (const args of c) {
    assert.ok(!args.some((x) => /BEGIN|PRIVATE KEY|\.key$|serial\.srl|\/dev\/fd\//.test(x)));
    assert.equal(args[args.indexOf('-out') + 1], '-');
  }
  assert.equal(c[0][c[0].indexOf('-key') + 1], '-');
  assert.equal(c[1][c[1].indexOf('-key') + 1], '-');
  assert.equal(c[2][c[2].indexOf('-CAkey') + 1], '-');
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
