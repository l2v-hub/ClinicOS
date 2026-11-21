// Ephemeral interception credentials stay in parent memory; only the public CA is mountable.
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, X509Certificate, createPrivateKey } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile, mkdtemp, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { cleanupFailure } from './native-guard-outcome.mjs';

export function certificateCommands(serial, directory = '/tmp/native-public-certificate') {
  assert.match(serial, /^[a-f0-9]{32}$/);
  assert.ok(path.isAbsolute(directory) && !/[\x00-\x1f,]/.test(directory));
  const common = [
    'req',
    '-new',
    '-sha256',
    '-config',
    '/dev/null',
    '-key',
    '/dev/stdin',
    '-out',
    '-',
  ];
  return [
    [
      ...common,
      '-x509',
      '-days',
      '1',
      '-set_serial',
      `0x${serial}`,
      '-subj',
      '/CN=ClinicOS Native Guard Ephemeral CA',
      '-addext',
      'basicConstraints=critical,CA:TRUE',
      '-addext',
      'keyUsage=critical,keyCertSign,cRLSign',
    ],
    [...common, '-subj', '/CN=api.anthropic.com'],
    [
      'x509',
      '-req',
      '-in',
      path.join(directory, 'leaf-public.csr'),
      '-CA',
      path.join(directory, 'ca-public.pem'),
      '-CAkey',
      '/dev/stdin',
      '-set_serial',
      `0x${serial.slice(0, -1)}${(parseInt(serial.at(-1), 16) ^ 1).toString(16)}`,
      '-days',
      '1',
      '-sha256',
      '-extfile',
      path.join(directory, 'public-extensions.cnf'),
      '-out',
      '-',
    ],
  ];
}
export function collectOpenSSL(args, inputs, { spawnImpl = spawn } = {}) {
  assert.ok(Array.isArray(args) && args.every((x) => typeof x === 'string' && !/[\r\n\0]/.test(x)));
  assert.ok(Array.isArray(inputs) && inputs.length === 1 && inputs.every(Buffer.isBuffer));
  return new Promise((resolve, reject) => {
    let p,
      settled = false,
      size = 0,
      errorSize = 0;
    const chunks = [];
    const done = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!ok) {
        p?.stdin.destroy();
        // Bash owns an isolated pipeline process group. Never leave a key-reading orphan.
        if (spawnImpl === spawn && Number.isSafeInteger(p?.pid) && p.pid > 0) {
          try {
            process.kill(-p.pid, 'SIGKILL');
          } catch {}
        }
        try {
          p?.kill('SIGKILL');
        } catch {}
        for (const chunk of chunks) chunk.fill(0);
        chunks.length = 0;
        reject(Error('native-certificate-generation-failed'));
      } else resolve(Buffer.concat(chunks));
    };
    const timer = setTimeout(() => done(false), 15000);
    timer.unref?.();
    try {
      // OpenSSL 3 treats key '-' as a filename. Reopening Node's socket-backed stdin
      // through /dev/stdin also fails on Linux; cat supplies a real anonymous FIFO.
      // This script is fixed; every argument is positional and quoted, never evaluated.
      p = spawnImpl(
        '/bin/bash',
        [
          '--noprofile',
          '--norc',
          '-o',
          'pipefail',
          '-c',
          '/bin/cat | /usr/bin/openssl "$@"',
          'native-guard-openssl',
          ...args,
        ],
        {
          env: { PATH: '/usr/bin:/bin', LANG: 'C', OPENSSL_CONF: '/dev/null' },
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: true,
        },
      );
    } catch {
      return done(false);
    }
    p.once('error', () => done(false));
    p.stdout.on('data', (chunk) => {
      size += chunk.length;
      if (size > 16384) return done(false);
      chunks.push(Buffer.from(chunk));
    });
    p.stderr.on('data', (chunk) => {
      errorSize += chunk.length;
      if (errorSize > 16384) done(false);
    });
    p.once('close', (code) => done(code === 0 && size > 0));
    p.stdin.on('error', () => done(false));
    p.stdin.end(inputs[0]);
  });
}
export function validatePublicCertificate(bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 16384);
  const pem = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  assert.match(
    pem,
    /^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----\r?\n?$/,
  );
  assert.equal((pem.match(/BEGIN CERTIFICATE/g) ?? []).length, 1);
  const cert = new X509Certificate(bytes);
  assert.equal(cert.ca, true);
  return cert;
}
export async function createNativeGuardCertificates({
  spawnImpl = spawn,
  parentDirectory = os.tmpdir(),
  removeImpl = rm,
} = {}) {
  if (spawnImpl === spawn) assert.equal(process.platform, 'linux', 'native-linux-required');
  const key = () =>
    generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    });
  let caKey = Buffer.from(key()),
    leafKey = Buffer.from(key());
  let removePublic;
  try {
    const parent = await realpath(parentDirectory);
    const publicDirectory = await mkdtemp(path.join(parent, 'native-guard-public-cert-'));
    let removal;
    removePublic = () =>
      (removal ??= (async () => {
        assert.equal(path.dirname(publicDirectory), parent);
        assert.match(path.basename(publicDirectory), /^native-guard-public-cert-[A-Za-z0-9]+$/);
        assert.equal(await realpath(publicDirectory), publicDirectory);
        await removeImpl(publicDirectory, { recursive: true, force: true });
      })());
    assert.equal(await realpath(publicDirectory), publicDirectory);
    const commands = certificateCommands(randomBytes(16).toString('hex'), publicDirectory);
    const ca = await collectOpenSSL(commands[0], [caKey], { spawnImpl });
    const publicCA = validatePublicCertificate(ca);
    const csr = await collectOpenSSL(commands[1], [leafKey], { spawnImpl });
    assert.match(
      csr.toString('ascii'),
      /^-----BEGIN CERTIFICATE REQUEST-----\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE REQUEST-----\r?\n?$/,
    );
    await writeFile(path.join(publicDirectory, 'ca-public.pem'), ca, { flag: 'wx', mode: 0o444 });
    await writeFile(path.join(publicDirectory, 'leaf-public.csr'), csr, {
      flag: 'wx',
      mode: 0o444,
    });
    await writeFile(
      path.join(publicDirectory, 'public-extensions.cnf'),
      'subjectAltName=DNS:api.anthropic.com\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n',
      { flag: 'wx', mode: 0o444 },
    );
    const cert = await collectOpenSSL(commands[2], [caKey], { spawnImpl });
    const leaf = new X509Certificate(cert);
    assert.equal(leaf.ca, false);
    assert.equal(leaf.checkHost('api.anthropic.com'), 'api.anthropic.com');
    assert.equal(leaf.verify(publicCA.publicKey), true);
    assert.equal(leaf.checkPrivateKey(createPrivateKey(leafKey)), true);
    const tlsOptions = {
      key: Buffer.from(leafKey),
      cert: Buffer.from(cert),
      minVersion: 'TLSv1.2',
      ALPNProtocols: ['http/1.1'],
    };
    return {
      publicCA: Buffer.from(ca),
      tlsOptions,
      publicDirectory,
      cleanup: removePublic,
      dispose() {
        tlsOptions.key.fill(0);
        tlsOptions.key = Buffer.alloc(0);
      },
    };
  } catch (error) {
    caKey.fill(0);
    leafKey.fill(0);
    if (removePublic) {
      try {
        await removePublic();
      } catch {
        throw cleanupFailure();
      }
    }
    throw error;
  } finally {
    caKey.fill(0);
    leafKey.fill(0);
  }
}
export async function writeNativePublicCA(directory, publicCA) {
  assert.ok(path.isAbsolute(directory) && !/[\x00-\x1f,]/.test(directory));
  validatePublicCertificate(publicCA);
  const file = path.join(directory, 'native-guard-public-ca.pem');
  await writeFile(file, publicCA, { flag: 'wx', mode: 0o444 });
  return file;
}
