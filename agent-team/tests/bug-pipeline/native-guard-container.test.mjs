import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nativeContainerArguments,
  NATIVE_GUARD_IMAGE,
  createPrivateCapture,
  validateNativeContainerInspection,
  startNativeGuardContainer,
  NATIVE_CLI_SHA256,
} from '../../src/bug-pipeline/native-guard-container.mjs';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { createServer, isIP } from 'node:net';
import path from 'node:path';
import os from 'node:os';
import { createSocket } from 'node:dgram';
import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
const paths = {
  cli: '/safe/claude',
  launcher: '/safe/launcher.mjs',
  ca: '/safe/public-ca.pem',
  socketDirectory: '/safe/socket',
};
test('container arguments have immutable image, no network, no secrets or repo mounts', () => {
  const a = nativeContainerArguments(paths);
  const v = (k) => a[a.indexOf(k) + 1];
  assert.equal(v('--network'), 'none');
  assert.ok(a.includes('--read-only'));
  assert.equal(v('--user'), '1000:1000');
  assert.equal(v('--cap-drop'), 'ALL');
  assert.equal(v('--log-driver'), 'none');
  assert.equal(v('--security-opt'), 'no-new-privileges=true');
  assert.equal(v('--platform'), 'linux/amd64');
  assert.ok(a.includes(NATIVE_GUARD_IMAGE));
  assert.ok(!a.some((x) => /--env|--privileged|--publish/.test(x)));
  assert.equal(a.filter((x) => x === '--mount').length, 4);
  for (const value of a.filter((x) => x.startsWith('type=bind'))) {
    assert.ok(value.endsWith(',readonly'));
    assert.ok(!value.includes('docker.sock'));
  }
  assert.equal(a[a.indexOf('--host') + 1], 'unix:///var/run/docker.sock');
  assert.ok(
    NATIVE_GUARD_IMAGE.endsWith(
      '@sha256:9f0dde62d10e7ff7a310ecaebd66225f6b46c17e6cb778449a77b05d3541bea2',
    ),
  );
});
test('mount path injection, duplicate/public mount alias, socket traversal fail', () => {
  for (const p of [
    { ...paths, cli: '/safe,x=/etc' },
    { ...paths, ca: '/safe/../secret' },
    { ...paths, launcher: paths.cli },
    { ...paths, socketDirectory: 'relative' },
  ])
    assert.throws(() => nativeContainerArguments(p));
});
test('combined private output cap is hard and sanitized receipt never returns raw output', () => {
  const c = createPrivateCapture(20);
  c.push('stdout', Buffer.from('private-token'));
  c.push('stderr', Buffer.from('raw-error'));
  assert.equal(c.receipt().overflow, true);
  assert.ok(!JSON.stringify(c.receipt()).includes('private-token'));
  assert.ok(!JSON.stringify(c.receipt()).includes('raw-error'));
  assert.throws(() => c.take());
});
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
const options = {
  paths,
  uid: 1000,
  gid: 1000,
  name: 'native-guard-00000000-0000-0000-0000-000000000000',
};
test('actual inspection validator rejects isolation/image/env drift, not just builder intent', () => {
  const f = fixture();
  assert.equal(
    validateNativeContainerInspection(f.container, f.image, options).runtimeIsolationVerified,
    true,
  );
  for (const mutate of [
    (x) => (x.HostConfig.NetworkMode = 'host'),
    (x) => (x.HostConfig.Privileged = true),
    (x) => x.Config.Env.push('GH_TOKEN=synthetic'),
    (x) => (x.Mounts[0].RW = true),
    (x) => (x.State.Running = false),
    (x) => (x.Config.User = '0:0'),
  ]) {
    const g = fixture();
    mutate(g.container);
    assert.throws(() => validateNativeContainerInspection(g.container, g.image, options));
  }
});
test('escape comparison requires reachable controlled TCP and DNS bridge baseline', () => {
  const base = {
    fixtureSha256: 'a'.repeat(64),
    target: { gateway: '172.17.0.1', tcpPort: 30001, dnsPort: 30002 },
    unix: true,
    loopback: true,
    tcpReachable: true,
    dnsReachable: true,
    ipv6SemanticEscapeProof: 'not-qualified-no-controlled-route',
    syntheticOnly: true,
  };
  const candidate = { ...base, tcpReachable: false, dnsReachable: false };
  assertControlledNetworkComparison(base, candidate);
  for (const bad of [
    { ...base, tcpReachable: false },
    { ...base, dnsReachable: false },
  ])
    assert.throws(() => assertControlledNetworkComparison(bad, candidate));
  assert.throws(() =>
    assertControlledNetworkComparison(base, { ...candidate, tcpReachable: true }),
  );
  assert.throws(() =>
    assertControlledNetworkComparison(base, { ...candidate, fixtureSha256: 'b'.repeat(64) }),
  );
});
function assertControlledNetworkComparison(baseline, candidate) {
  assert.equal(baseline.tcpReachable, true, 'TCP control must actually be reachable');
  assert.equal(baseline.dnsReachable, true, 'DNS control must actually resolve');
  assert.equal(candidate.tcpReachable, false);
  assert.equal(candidate.dnsReachable, false);
  assert.equal(baseline.fixtureSha256, candidate.fixtureSha256);
  assert.deepEqual(baseline.target, candidate.target);
  for (const result of [baseline, candidate]) {
    assert.equal(result.unix, true);
    assert.equal(result.loopback, true);
    assert.equal(result.syntheticOnly, true);
    assert.equal(result.ipv6SemanticEscapeProof, 'not-qualified-no-controlled-route');
  }
}
test('deadline settles failed and escalates when inspected Docker child ignores SIGTERM', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'native-timeout-'));
  const pth = {
    ...paths,
    socketDirectory: dir.replace(/^[A-Za-z]:/, '').replaceAll('\\', '/') + '/socket',
  };
  const boot = {
    oauthToken: 'synthetic-only-token',
    model: 'claude-opus-4-6',
    schema: { type: 'object' },
    input: 'synthetic input',
    outputCap: 32768,
  };
  let child, name;
  const removals = [];
  const spawnImpl = (_cmd, args) => {
    const p = new EventEmitter();
    p.stdin = new PassThrough();
    p.stdout = new PassThrough();
    p.stderr = new PassThrough();
    p.kills = [];
    p.kill = (s) => {
      p.kills.push(s);
      return false;
    };
    if (args.includes('run')) {
      child = p;
      name = args[args.indexOf('--name') + 1];
      return p;
    }
    queueMicrotask(() => {
      const f = fixture();
      f.container.Name = '/' + name;
      f.container.Config.User = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
      f.container.Mounts.find((m) => m.Destination === '/guard/socket').Source =
        pth.socketDirectory;
      if (args.includes('rm')) removals.push(args.at(-1));
      else p.stdout.end(JSON.stringify([args.includes('image') ? f.image : f.container]));
      p.emit('close', 0);
    });
    return p;
  };
  const runtime = await startNativeGuardContainer({
    paths: pth,
    bootstrap: boot,
    spawnImpl,
    validateMounts: async () => ({ binaryVerified: true, cliSha256: NATIVE_CLI_SHA256 }),
    timeoutMs: 20,
  });
  try {
    await runtime.isolation;
    const result = await Promise.race([
      runtime.completion,
      new Promise((r) => setTimeout(() => r(null), 100)),
    ]);
    assert.ok(result, 'deadline must not depend on eventual child close');
    assert.equal(result.ok, false);
    assert.equal(result.status, 'native-container-timeout');
    assert.ok(child.kills.includes('SIGTERM'));
    assert.ok(child.kills.includes('SIGKILL'));
    assert.deepEqual(removals, ['a'.repeat(64)]);
  } finally {
    await runtime.close();
  }
});
async function observeProbeLaunch(readCounters, launch) {
  const before = readCounters();
  const id = await launch();
  return { id, before };
}
test('controlled probe snapshot precedes even immediate fixture completion', async () => {
  let tcpAccepted = 0,
    dnsAnswered = 0;
  const { before, id } = await observeProbeLaunch(
    () => ({ tcpAccepted, dnsAnswered }),
    async () => {
      tcpAccepted++;
      dnsAnswered++;
      return 'synthetic-owned-container';
    },
  );
  assert.equal(id, 'synthetic-owned-container');
  assert.deepEqual(before, { tcpAccepted: 0, dnsAnswered: 0 });
  assert.ok(tcpAccepted > before.tcpAccepted && dnsAnswered > before.dnsAnswered);
});
test(
  'Linux controlled bridge TCP/DNS baseline succeeds; identical network-none fixture cannot escape',
  { skip: process.platform !== 'linux', timeout: 240000 },
  async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'native-guard-isolation-'));
    await mkdir(root + '/socket', { mode: 0o700 });
    await mkdir(root + '/docker', { mode: 0o700 });
    const env = { PATH: process.env.PATH, DOCKER_CONFIG: root + '/docker', LANG: 'C.UTF-8' };
    const run = (args, timeout = 180000) =>
      new Promise((resolve, reject) => {
        const p = spawn('docker', ['--host', 'unix:///var/run/docker.sock', ...args], {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let raw = '',
          size = 0;
        const t = setTimeout(() => {
          p.kill('SIGKILL');
          reject(Error('docker-smoke-timeout'));
        }, timeout);
        p.stdout.on('data', (b) => {
          size += b.length;
          if (size > 131072) p.kill('SIGKILL');
          else raw += b.toString();
        });
        p.stderr.on('data', () => {});
        p.once('error', () => {
          clearTimeout(t);
          reject(Error('linux-docker-required'));
        });
        p.once('close', (code) => {
          clearTimeout(t);
          code === 0 ? resolve(raw) : reject(Error('docker-smoke-failed'));
        });
      });
    await run(['version', '--format', '{{.Server.Version}}']);
    await run(['pull', '--platform', 'linux/amd64', NATIVE_GUARD_IMAGE]);
    const [network] = JSON.parse(await run(['network', 'inspect', 'bridge']));
    const gateway = network.IPAM?.Config?.find((c) => isIP(c.Gateway ?? '') === 4)?.Gateway;
    assert.equal(isIP(gateway ?? ''), 4, 'A real observed bridge gateway is required');
    let tcpAccepted = 0,
      dnsAnswered = 0;
    const nonce = 'SYNTHETIC-' + randomUUID(),
      clients = new Set();
    const host = createServer((s) => {
      clients.add(s);
      s.once('close', () => clients.delete(s));
      s.setTimeout(1000, () => s.destroy());
      let raw = '';
      s.on('data', (b) => {
        raw += b.toString('ascii');
        if (raw === nonce) {
          tcpAccepted++;
          s.end('SYNTHETIC_TCP_PONG');
        } else if (raw.length >= nonce.length) s.destroy();
      });
    });
    await new Promise((r, j) => {
      host.once('error', j);
      host.listen(0, '0.0.0.0', r);
    });
    const dns = createSocket('udp4'),
      dnsName = 'native-guard-controlled.test';
    const question = Buffer.concat([
      ...dnsName.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)])),
      Buffer.from([0, 0, 1, 0, 1]),
    ]);
    dns.on('message', (packet, peer) => {
      if (
        packet.length < 12 + question.length ||
        packet.length > 512 ||
        packet.readUInt16BE(4) !== 1 ||
        !packet.subarray(12, 12 + question.length).equals(question)
      )
        return;
      const h = Buffer.alloc(12);
      packet.copy(h, 0, 0, 2);
      h.writeUInt16BE(0x8180, 2);
      h.writeUInt16BE(1, 4);
      h.writeUInt16BE(1, 6);
      const answer = Buffer.from([0xc0, 0x0c, 0, 1, 0, 1, 0, 0, 0, 60, 0, 4, 192, 0, 2, 5]);
      dnsAnswered++;
      dns.send(Buffer.concat([h, question, answer]), peer.port, peer.address);
    });
    await new Promise((r, j) => {
      dns.once('error', j);
      dns.bind(0, '0.0.0.0', r);
    });
    const reports = [],
      waiters = [];
    const receive = (result) => {
      const waiter = waiters.shift();
      if (waiter) waiter(result);
      else reports.push(result);
    };
    const nextReport = () =>
      new Promise((resolve, reject) => {
        if (reports.length) return resolve(reports.shift());
        const timer = setTimeout(() => reject(Error('synthetic-probe-timeout')), 15000);
        waiters.push((result) => {
          clearTimeout(timer);
          resolve(result);
        });
      });
    const server = createServer((s) => {
      clients.add(s);
      s.once('close', () => clients.delete(s));
      s.setTimeout(2000, () => s.destroy());
      let raw = '';
      s.on('data', (b) => {
        raw += b.toString('utf8');
        if (raw === 'SYNTHETIC_PING') s.end('SYNTHETIC_PONG');
        if (raw.length > 4096) s.destroy();
      });
      s.on('end', () => {
        if (raw === 'SYNTHETIC_PING') return;
        try {
          receive(JSON.parse(raw));
          s.end('ACK');
        } catch {
          s.destroy();
        }
      });
    });
    await new Promise((r, j) => {
      server.once('error', j);
      server.listen(root + '/socket/data.sock', r);
    });
    const target = { gateway, tcpPort: host.address().port, dnsPort: dns.address().port };
    const script = `import net from 'node:net';import {Resolver} from 'node:dns/promises';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
 const target=${JSON.stringify(target)},nonce=${JSON.stringify(nonce)};
 delete process.env.HTTPS_PROXY;delete process.env.HTTP_PROXY;
 const exchange=(options,input,expected)=>new Promise(r=>{let raw='';const s=net.connect(options,()=>s.write(input));s.setTimeout(800,()=>{s.destroy();r(false)});s.on('data',b=>{raw+=b.toString()});s.once('end',()=>r(raw===expected));s.once('error',()=>r(false));});
 const unix=await exchange({path:'/guard/socket/data.sock'},'SYNTHETIC_PING','SYNTHETIC_PONG');
 const loop=net.createServer(s=>s.end('OK'));await new Promise(r=>loop.listen(0,'127.0.0.1',r));const loopback=await exchange({port:loop.address().port,host:'127.0.0.1'},'','OK');loop.close();
 const tcpReachable=await exchange({host:target.gateway,port:target.tcpPort},nonce,'SYNTHETIC_TCP_PONG');
 const resolver=new Resolver({timeout:500,tries:1});resolver.setServers([target.gateway+':'+target.dnsPort]);let dnsReachable=false;try{dnsReachable=(await resolver.resolve4(${JSON.stringify(dnsName)})).join(',')==='192.0.2.5'}catch{}
 const fixtureSha256=createHash('sha256').update(await readFile('/guard/launcher.mjs')).digest('hex');
 const result=JSON.stringify({target,fixtureSha256,unix,loopback,tcpReachable,dnsReachable,ipv6SemanticEscapeProof:'not-qualified-no-controlled-route',syntheticOnly:true});
 const report=net.connect('/guard/socket/data.sock',()=>report.end(result));setTimeout(()=>{},30000);`;
    await writeFile(root + '/launcher.mjs', script, { flag: 'wx', mode: 0o444 });
    await writeFile(root + '/unused-cli', 'PUBLIC_UNUSED_FIXTURE', { flag: 'wx', mode: 0o444 });
    await writeFile(root + '/public-ca.pem', 'PUBLIC_UNUSED_FIXTURE', { flag: 'wx', mode: 0o444 });
    const p = {
      cli: root + '/unused-cli',
      launcher: root + '/launcher.mjs',
      ca: root + '/public-ca.pem',
      socketDirectory: root + '/socket',
    };
    const uid = process.getuid(),
      gid = process.getgid();
    assert.ok(uid > 0 && gid > 0);
    const fixtureSha256 = createHash('sha256').update(script).digest('hex'),
      ids = [];
    try {
      const results = [];
      for (const mode of ['bridge', 'none']) {
        const name = 'native-guard-' + randomUUID(),
          args = nativeContainerArguments(p, { uid, gid, name });
        args[args.indexOf('--network') + 1] = mode;
        args.splice(args.indexOf('--interactive'), 1);
        args.splice(args.indexOf('run') + 1, 0, '--detach');
        const { id, before } = await observeProbeLaunch(
          () => ({ tcpAccepted, dnsAnswered }),
          async () => (await run(args.slice(2))).trim(),
        );
        assert.match(id, /^[a-f0-9]{64}$/);
        const [container] = JSON.parse(await run(['inspect', id]));
        assert.equal(container.Name, '/' + name);
        ids.push(id);
        assert.equal(container.HostConfig.NetworkMode, mode);
        if (mode === 'bridge')
          assert.equal(container.NetworkSettings.Networks.bridge.Gateway, gateway);
        else {
          const [image] = JSON.parse(await run(['image', 'inspect', NATIVE_GUARD_IMAGE]));
          const proof = validateNativeContainerInspection(container, image, {
            paths: p,
            uid,
            gid,
            name,
          });
          assert.equal(proof.runtimeIsolationVerified, true);
          assert.equal(proof.cliSha256, undefined, 'Synthetic fixture is not binary qualification');
        }
        const result = await nextReport();
        assert.equal(result.fixtureSha256, fixtureSha256);
        assert.deepEqual(result.target, target);
        results.push(result);
        if (mode === 'bridge') {
          assert.equal(result.tcpReachable, true);
          assert.equal(result.dnsReachable, true);
          assert.ok(tcpAccepted > before.tcpAccepted && dnsAnswered > before.dnsAnswered);
        } else {
          assert.equal(tcpAccepted, before.tcpAccepted);
          assert.equal(dnsAnswered, before.dnsAnswered);
        }
        await run(['rm', '--force', '--', id]);
        ids.splice(ids.indexOf(id), 1);
      }
      assertControlledNetworkComparison(results[0], results[1]);
    } finally {
      for (const id of ids) await run(['rm', '--force', '--', id]);
      for (const client of clients) client.destroy();
      await new Promise((r) => server.close(r));
      await new Promise((r) => host.close(r));
      await new Promise((r) => dns.close(r));
    }
  },
);
