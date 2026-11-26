import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startNativeGuardContainer,
  NATIVE_CLI_SHA256,
  NATIVE_GUARD_IMAGE,
} from '../../src/bug-pipeline/native-guard-container.mjs';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
const paths = {
  cli: '/safe/claude',
  launcher: '/safe/launcher.mjs',
  ca: '/safe/public-ca.pem',
  socketDirectory: '/safe/socket',
};
function fixture() {
  const id = 'a'.repeat(64),
    image = {
      Id: 'sha256:' + 'b'.repeat(64),
      Os: 'linux',
      Architecture: 'amd64',
      RepoDigests: ['node@' + NATIVE_GUARD_IMAGE.split('@')[1]],
      Config: { Env: ['PATH=/usr/bin', 'NODE_VERSION=22.0.0', 'YARN_VERSION=1.0.0'] },
    };
  return {
    image,
    container: {
      Id: id,
      Name: '/native-guard-00000000-0000-0000-0000-000000000000',
      State: { Running: true },
      Image: image.Id,
      Config: { Image: NATIVE_GUARD_IMAGE, User: '1000:1000', Env: [...image.Config.Env] },
      Path: '/usr/local/bin/node',
      Args: ['/guard/launcher.mjs'],
      HostConfig: {
        NetworkMode: 'none',
        ReadonlyRootfs: true,
        Privileged: false,
        CapDrop: ['ALL'],
        PidMode: '',
        IpcMode: 'private',
        UTSMode: '',
        LogConfig: { Type: 'none' },
        SecurityOpt: ['no-new-privileges=true'],
        AutoRemove: true,
        PidsLimit: 48,
        Memory: 1536 * 1024 * 1024,
        NanoCpus: 2e9,
        Tmpfs: { '/tmp': 'rw,noexec,nosuid,nodev,size=134217728,mode=1777' },
      },
      Mounts: [
        [paths.cli, '/guard/claude'],
        [paths.launcher, '/guard/launcher.mjs'],
        [paths.ca, '/guard/public-ca.pem'],
        [paths.socketDirectory, '/guard/socket'],
      ].map(([Source, Destination]) => ({ Source, Destination, Type: 'bind', RW: false })),
    },
  };
}
for (const outcome of [
  'success',
  'nonzero',
  'error',
  'throw',
  'timeout',
  'no-id',
  'late-id',
  'auto-removed',
  'list-error',
  'list-throw',
  'list-nonzero',
  'list-timeout',
  'list-visible',
  'list-truncated',
  'list-stderr',
])
  test(`container cleanup ${outcome} requires proven removal of the owned ID`, async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'native-cleanup-test-'));
    const pth = {
      ...paths,
      socketDirectory: dir.replace(/^[A-Za-z]:/, '').replaceAll('\\', '/') + '/socket',
    };
    let name,
      removals = 0;
    const spawnImpl = (_command, args) => {
      if (args.includes('rm') && outcome === 'throw') throw new Error('private fixture');
      if (args.includes('ls') && outcome === 'list-throw') throw new Error('private fixture');
      const p = new EventEmitter();
      p.stdin = new PassThrough();
      p.stdout = new PassThrough();
      p.stderr = new PassThrough();
      p.kill = () => false;
      if (args.includes('run')) {
        name = args[args.indexOf('--name') + 1];
        return p;
      }
      if (args.includes('ls')) {
        assert.ok(args.includes(`id=${'a'.repeat(64)}`));
        if (outcome === 'list-timeout') return p;
        queueMicrotask(() => {
          if (outcome === 'list-error') return p.emit('error', Error('private fixture'));
          if (outcome === 'list-visible') p.stdout.write('a'.repeat(64) + '\n');
          if (outcome === 'list-truncated') p.stdout.write('a'.repeat(12) + '\n');
          if (outcome === 'list-stderr') p.stderr.write('private fixture');
          if (outcome === 'nonzero') p.stdout.write('unverified');
          p.emit('close', outcome === 'list-nonzero' ? 1 : 0);
        });
        return p;
      }
      if (args.includes('rm')) {
        removals++;
        assert.equal(args.at(-1), 'a'.repeat(64));
        if (outcome === 'timeout') return p;
        queueMicrotask(() =>
          outcome === 'error'
            ? p.emit('error', Error('private fixture'))
            : p.emit(
                'close',
                outcome === 'nonzero' || outcome === 'auto-removed' || outcome.startsWith('list-')
                  ? 1
                  : 0,
              ),
        );
        return p;
      }
      if (outcome === 'no-id') return p;
      const reply = () => {
        const f = fixture();
        f.container.Name = '/' + name;
        f.container.Config.User = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
        f.container.Mounts.find((m) => m.Destination === '/guard/socket').Source =
          pth.socketDirectory;
        p.stdout.end(JSON.stringify([args.includes('image') ? f.image : f.container]));
        p.emit('close', 0);
      };
      if (outcome === 'late-id') setTimeout(reply, 1);
      else queueMicrotask(reply);
      return p;
    };
    const runtime = await startNativeGuardContainer({
      paths: pth,
      spawnImpl,
      bootstrap: {
        oauthToken: 'synthetic-only-token',
        model: 'claude-opus-4-6',
        schema: { type: 'object' },
        input: 'synthetic input',
        outputCap: 32768,
      },
      validateMounts: async () => ({ binaryVerified: true, cliSha256: NATIVE_CLI_SHA256 }),
      cleanupTimeoutMs: 40,
    });
    if (!['no-id', 'late-id'].includes(outcome)) await runtime.isolation;
    const a = runtime.close(),
      b = runtime.close();
    const results = await Promise.allSettled([a, b]);
    if (['success', 'late-id', 'auto-removed'].includes(outcome)) {
      assert.deepEqual(
        results.map((r) => r.value),
        [{ removed: true }, { removed: true }],
      );
      assert.equal(removals, 1);
    } else {
      assert.deepEqual(
        results.map((r) => [r.status, r.reason?.message]),
        Array(2).fill(['rejected', 'native-container-cleanup-unproven']),
      );
      assert.equal(removals, outcome === 'no-id' || outcome === 'throw' ? 0 : 1);
    }
  });
