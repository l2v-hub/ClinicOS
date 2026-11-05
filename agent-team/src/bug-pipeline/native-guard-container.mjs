import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { lstat, realpath, readFile, readdir, mkdtemp } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { validatePublicCertificate } from './native-guard-certificates.mjs';
import { parseNativeBootstrap } from './native-guard-launcher.mjs';

export const NATIVE_GUARD_IMAGE =
  'docker.io/library/node:22-bookworm-slim@sha256:9f0dde62d10e7ff7a310ecaebd66225f6b46c17e6cb778449a77b05d3541bea2';
export const NATIVE_CLI_SHA256 = 'bc1aad9982c7b59c7d889ff92595d61cf46e0a6eae074cb551d932a989bcd222';
const HOST = ['--host', 'unix:///var/run/docker.sock'];
function absolute(p) {
  assert.ok(
    typeof p === 'string' && p.startsWith('/') && p.length <= 500 && !/[\x00-\x20,\\]/.test(p),
  );
  assert.equal(path.posix.normalize(p), p);
  return p;
}
export function nativeContainerArguments(paths, { uid = 1000, gid = 1000, name } = {}) {
  assert.deepEqual(Object.keys(paths).sort(), ['ca', 'cli', 'launcher', 'socketDirectory'].sort());
  for (const p of Object.values(paths)) absolute(p);
  assert.equal(new Set(Object.values(paths)).size, 4);
  assert.ok(
    Number.isSafeInteger(uid) &&
      uid > 0 &&
      uid <= 2147483647 &&
      Number.isSafeInteger(gid) &&
      gid > 0 &&
      gid <= 2147483647,
  );
  if (name !== undefined) assert.match(name, /^native-guard-[a-f0-9-]{36}$/);
  const a = [
    ...HOST,
    'run',
    '--rm',
    '--interactive',
    ...(name ? ['--name', name] : []),
    '--platform',
    'linux/amd64',
    '--network',
    'none',
    '--read-only',
    '--user',
    `${uid}:${gid}`,
    '--ipc',
    'private',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges=true',
    '--log-driver',
    'none',
    '--pids-limit',
    '48',
    '--memory',
    '1536m',
    '--cpus',
    '2',
    '--ulimit',
    'nofile=128:128',
    '--entrypoint',
    '/usr/local/bin/node',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,size=134217728,mode=1777',
  ];
  for (const [src, dst] of [
    [paths.cli, '/guard/claude'],
    [paths.launcher, '/guard/launcher.mjs'],
    [paths.ca, '/guard/public-ca.pem'],
    [paths.socketDirectory, '/guard/socket'],
  ])
    a.push('--mount', `type=bind,source=${src},target=${dst},readonly`);
  return [...a, NATIVE_GUARD_IMAGE, '/guard/launcher.mjs'];
}
export async function validateNativeGuardMounts(paths) {
  nativeContainerArguments(paths);
  for (const p of Object.values(paths)) {
    assert.equal(await realpath(p), p);
    const s = await lstat(p);
    assert.equal(s.isSymbolicLink(), false);
  }
  assert.equal(
    paths.launcher,
    fileURLToPath(new URL('./native-guard-launcher.mjs', import.meta.url)),
  );
  for (const p of [paths.cli, paths.launcher, paths.ca])
    assert.equal((await lstat(p)).isFile(), true);
  const cli = await lstat(paths.cli);
  assert.ok(cli.size === 267955384 && (cli.mode & 0o111) !== 0);
  assert.equal(
    createHash('sha256')
      .update(await readFile(paths.cli))
      .digest('hex'),
    NATIVE_CLI_SHA256,
  );
  validatePublicCertificate(await readFile(paths.ca));
  const directory = await lstat(paths.socketDirectory);
  assert.equal(directory.isDirectory(), true);
  assert.equal(directory.mode & 0o077, 0);
  assert.deepEqual(await readdir(paths.socketDirectory), ['data.sock']);
  assert.equal((await lstat(path.join(paths.socketDirectory, 'data.sock'))).isSocket(), true);
  return {
    binaryVerified: true,
    cliSha256: NATIVE_CLI_SHA256,
    launcherSha256: createHash('sha256')
      .update(await readFile(paths.launcher))
      .digest('hex'),
  };
}
export function createPrivateCapture(limit = 768 * 1024) {
  assert.ok(Number.isSafeInteger(limit) && limit > 0 && limit <= 768 * 1024);
  let total = 0,
    overflow = false,
    taken = false;
  const data = { stdout: [], stderr: [] };
  return {
    push(stream, chunk) {
      assert.ok(Object.hasOwn(data, stream) && Buffer.isBuffer(chunk));
      total += chunk.length;
      if (total > limit) {
        overflow = true;
        for (const parts of Object.values(data)) {
          for (const b of parts) b.fill(0);
          parts.length = 0;
        }
        return false;
      }
      if (!overflow) data[stream].push(Buffer.from(chunk));
      return !overflow;
    },
    receipt() {
      return { bytes: total, overflow };
    },
    take() {
      assert.ok(!taken && !overflow, 'native-private-output-unavailable');
      taken = true;
      const value = {
        stdout: Buffer.concat(data.stdout).toString('utf8'),
        stderr: Buffer.concat(data.stderr).toString('utf8'),
      };
      for (const parts of Object.values(data)) {
        for (const b of parts) b.fill(0);
        parts.length = 0;
      }
      return value;
    },
  };
}
export function validateNativeContainerInspection(container, image, { paths, uid, gid, name }) {
  assert.match(container.Id ?? '', /^[a-f0-9]{64}$/);
  assert.equal(container.Name, '/' + name);
  assert.equal(container.State?.Running, true);
  assert.match(image.Id ?? '', /^sha256:[a-f0-9]{64}$/);
  assert.equal(container.Image, image.Id);
  assert.equal(image.Os, 'linux');
  assert.equal(image.Architecture, 'amd64');
  assert.ok(image.RepoDigests?.some((d) => d.endsWith('@' + NATIVE_GUARD_IMAGE.split('@')[1])));
  assert.equal(container.Config?.Image, NATIVE_GUARD_IMAGE);
  assert.equal(container.Config?.User, `${uid}:${gid}`);
  assert.equal(container.Path, '/usr/local/bin/node');
  assert.deepEqual(container.Args, ['/guard/launcher.mjs']);
  assert.deepEqual(container.Config.Env, image.Config.Env);
  for (const v of container.Config.Env) {
    assert.match(v, /^(?:PATH|NODE_VERSION|YARN_VERSION)=/);
    assert.ok(!/TOKEN|API_KEY|AUTH_TOKEN/.test(v));
  }
  assert.ok(!container.Config.Healthcheck || container.Config.Healthcheck.Test?.[0] === 'NONE');
  const h = container.HostConfig;
  assert.equal(h.NetworkMode, 'none');
  assert.equal(h.ReadonlyRootfs, true);
  assert.equal(h.Privileged, false);
  assert.deepEqual(h.CapDrop, ['ALL']);
  assert.ok(!h.CapAdd?.length);
  assert.equal(h.PidMode, '');
  assert.equal(h.IpcMode, 'private');
  assert.equal(h.UTSMode, '');
  assert.ok(!h.Devices?.length && !h.Binds?.length);
  assert.equal(h.LogConfig.Type, 'none');
  assert.ok(h.SecurityOpt?.includes('no-new-privileges=true'));
  assert.equal(h.AutoRemove, true);
  assert.equal(h.PidsLimit, 48);
  assert.equal(h.Memory, 1536 * 1024 * 1024);
  assert.equal(h.NanoCpus, 2e9);
  assert.equal(h.Tmpfs?.['/tmp'], 'rw,noexec,nosuid,nodev,size=134217728,mode=1777');
  assert.deepEqual(Object.keys(h.Tmpfs), ['/tmp']);
  const expected = [
    [paths.cli, '/guard/claude'],
    [paths.launcher, '/guard/launcher.mjs'],
    [paths.ca, '/guard/public-ca.pem'],
    [paths.socketDirectory, '/guard/socket'],
  ];
  assert.equal(container.Mounts.length, 4);
  for (const [src, dst] of expected) {
    const m = container.Mounts.find((x) => x.Destination === dst);
    assert.ok(m && m.Source === src && m.Type === 'bind' && m.RW === false);
  }
  return {
    runtimeIsolationVerified: true,
    containerId: container.Id,
    imageId: image.Id,
    imageDigest: NATIVE_GUARD_IMAGE.split('@')[1],
    networkMode: 'none',
  };
}
function inspectDocker(args, { env, spawnImpl }) {
  return new Promise((resolve, reject) => {
    let p,
      total = 0,
      chunks = [],
      settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      if (!ok) return reject(Error('native-container-inspection-failed'));
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        assert.ok(Array.isArray(v) && v.length === 1);
        resolve(v[0]);
      } catch {
        reject(Error('native-container-inspection-failed'));
      }
    };
    const t = setTimeout(() => {
      p?.kill('SIGKILL');
      finish(false);
    }, 10000);
    t.unref?.();
    try {
      p = spawnImpl('docker', [...HOST, ...args], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch {
      return finish(false);
    }
    p.stdout.on('data', (b) => {
      total += b.length;
      if (total > 128 * 1024) {
        p.kill('SIGKILL');
        finish(false);
      } else chunks.push(Buffer.from(b));
    });
    p.stderr.on('data', () => {});
    p.once('error', () => finish(false));
    p.once('close', (code) => finish(code === 0));
  });
}
export async function startNativeGuardContainer({
  paths,
  bootstrap,
  onStdout = () => {},
  onDiagnostic = () => {},
  spawnImpl = spawn,
  validateMounts = validateNativeGuardMounts,
  timeoutMs = 20 * 60000,
  cleanupTimeoutMs = 10000,
} = {}) {
  if (spawnImpl === spawn) assert.equal(process.platform, 'linux', 'native-linux-required');
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20 * 60000);
  assert.ok(
    Number.isSafeInteger(cleanupTimeoutMs) && cleanupTimeoutMs > 0 && cleanupTimeoutMs <= 10000,
  );
  const boot = Buffer.from(JSON.stringify(bootstrap));
  parseNativeBootstrap(boot);
  let mountProof;
  try {
    mountProof = await validateMounts(paths);
    assert.equal(mountProof?.binaryVerified, true);
    assert.equal(mountProof.cliSha256, NATIVE_CLI_SHA256);
  } catch {
    boot.fill(0);
    throw Error('native-public-mount-validation-failed');
  }
  const uid = process.getuid?.() ?? 1000,
    gid = process.getgid?.() ?? 1000;
  assert.ok(uid > 0 && gid > 0);
  const name = 'native-guard-' + randomUUID(),
    args = nativeContainerArguments(paths, { uid, gid, name });
  const config = await mkdtemp(path.join(path.dirname(paths.socketDirectory), 'native-docker-'));
  const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', LANG: 'C.UTF-8', DOCKER_CONFIG: config };
  const capture = createPrivateCapture();
  let child,
    code = null,
    closed = false,
    failed = null,
    ownedContainerId = null;
  let finish;
  const completion = new Promise((r) => (finish = r));
  let timer, killTimer, cleanup;
  const proveAbsent = (id) =>
    new Promise((resolve, reject) => {
      let p,
        dirty = false,
        settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        if (ok && !dirty) resolve({ removed: true });
        else reject(Error('native-container-cleanup-unproven'));
      };
      const t = setTimeout(() => {
        try {
          p?.kill('SIGKILL');
        } catch {}
        done(false);
      }, cleanupTimeoutMs);
      try {
        const command = ['container', 'ls', '--all', '--no-trunc'];
        command.push('--format', '{{.ID}}', '--filter', `id=${id}`);
        const options = { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true };
        p = spawnImpl('docker', [...HOST, ...command], options);
        const markDirty = () => (dirty = true);
        for (const stream of [p.stdout, p.stderr]) stream.on('data', markDirty);
        p.once('error', () => done(false));
        p.once('close', (status) => done(status === 0));
      } catch {
        done(false);
      }
    });
  const removeOwned = () => {
    if (!ownedContainerId) return Promise.reject(Error('native-container-cleanup-unproven'));
    return (cleanup ??= new Promise((resolve, reject) => {
      let p,
        t,
        settled = false;
      const fail = () => {
        clearTimeout(t);
        if (!settled) reject(Error('native-container-cleanup-unproven'));
        settled = true;
      };
      try {
        p = spawnImpl('docker', [...HOST, 'rm', '--force', '--', ownedContainerId], {
          env,
          stdio: 'ignore',
          windowsHide: true,
        });
      } catch {
        return fail();
      }
      t = setTimeout(() => {
        try {
          p.kill('SIGKILL');
        } catch {}
        fail();
      }, cleanupTimeoutMs);
      p.once('error', fail);
      p.once('close', (status) => {
        clearTimeout(t);
        if (settled) return;
        settled = true;
        if (status === 0) resolve({ removed: true });
        else proveAbsent(ownedContainerId).then(resolve, reject);
      });
    }));
  };
  const end = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    clearTimeout(killTimer);
    boot.fill(0);
    finish({
      ok: code === 0 && !failed && !capture.receipt().overflow,
      code,
      status:
        failed ??
        (capture.receipt().overflow
          ? 'native-output-too-large'
          : code === 0
            ? 'native-exited'
            : 'native-failed'),
    });
  };
  const stop = (reason) => {
    if (closed) return;
    failed ??= reason;
    boot.fill(0);
    try {
      child?.kill('SIGTERM');
    } catch {
      /* Terminal failure remains bounded. */
    }
    if (ownedContainerId) void removeOwned().catch(() => {});
    killTimer ??= setTimeout(() => {
      try {
        child?.kill('SIGKILL');
      } catch {
        /* Do not depend on a close event. */
      } finally {
        code = null;
        end();
      }
    }, 25);
  };
  try {
    child = spawnImpl('docker', args, { env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  } catch {
    failed ??= 'native-container-spawn-failed';
    end();
  }
  if (child) {
    timer = setTimeout(() => {
      stop('native-container-timeout');
    }, timeoutMs);
    timer.unref?.();
    for (const [stream, callback] of [
      ['stdout', onStdout],
      ['stderr', onDiagnostic],
    ])
      child[stream].on('data', (raw) => {
        const chunk = Buffer.from(raw);
        if (!capture.push(stream, chunk)) {
          stop('native-output-too-large');
          return;
        }
        try {
          callback(chunk);
        } catch {
          stop('native-output-rejected');
        }
      });
    child.once('error', () => {
      failed ??= 'native-container-spawn-failed';
      end();
    });
    child.once('close', (value) => {
      code = value;
      end();
    });
    child.stdin.on('error', () => {
      stop('native-bootstrap-write-failed');
    });
  }
  const isolation = (async () => {
    assert.ok(child && !closed);
    let observed;
    for (let i = 0; i < 40; i++) {
      try {
        observed = await inspectDocker(['inspect', name], { env, spawnImpl });
        break;
      } catch {
        assert.ok(!closed);
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    assert.ok(observed);
    assert.match(observed.Id ?? '', /^[a-f0-9]{64}$/);
    assert.equal(observed.Name, '/' + name);
    assert.equal(observed.Config?.Image, NATIVE_GUARD_IMAGE);
    ownedContainerId = observed.Id;
    if (failed) {
      void removeOwned().catch(() => {});
      throw Error('native-container-stopped');
    }
    const image = await inspectDocker(['image', 'inspect', NATIVE_GUARD_IMAGE], { env, spawnImpl });
    const proof = validateNativeContainerInspection(observed, image, { paths, uid, gid, name });
    assert.equal(closed, false);
    assert.equal(failed, null);
    child.stdin.end(boot);
    return { ...proof, ...mountProof };
  })();
  isolation.catch(() => {
    stop('native-isolation-not-verified');
    if (!child) end();
  });
  return {
    completion,
    isolation,
    isLive: () => !closed && failed === null,
    takePrivateOutput: () => capture.take(),
    async close() {
      if (!closed) stop('native-container-closed');
      // Wait for the immutable ID to be observed; never remove by a speculative name.
      if (!ownedContainerId) {
        let waitTimer;
        try {
          await Promise.race([
            isolation.catch(() => {}),
            new Promise((_, reject) => {
              waitTimer = setTimeout(
                () => reject(Error('native-container-cleanup-unproven')),
                cleanupTimeoutMs,
              );
            }),
          ]);
        } finally {
          clearTimeout(waitTimer);
        }
      }
      return (await Promise.all([removeOwned(), completion]))[0];
    },
  };
}
