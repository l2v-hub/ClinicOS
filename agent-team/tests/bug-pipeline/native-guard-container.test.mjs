import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nativeContainerArguments,
  NATIVE_GUARD_IMAGE,
  createPrivateCapture,
  validateNativeContainerInspection,
} from '../../src/bug-pipeline/native-guard-container.mjs';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import os from 'node:os';
import {createSocket} from 'node:dgram';
import {createHash,randomUUID} from 'node:crypto';
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
test('escape comparison requires reachable controlled TCP and DNS bridge baseline',()=>{
 const base={fixtureSha256:'a'.repeat(64),target:{gateway:'172.17.0.1',tcpPort:30001,dnsPort:30002},unix:true,loopback:true,tcpReachable:true,dnsReachable:true,ipv6SemanticEscapeProof:'not-qualified-no-controlled-route',syntheticOnly:true};
 const candidate={...base,tcpReachable:false,dnsReachable:false};
 assertControlledNetworkComparison(base,candidate);
 for(const bad of [{...base,tcpReachable:false},{...base,dnsReachable:false}])assert.throws(()=>assertControlledNetworkComparison(bad,candidate));
 assert.throws(()=>assertControlledNetworkComparison(base,{...candidate,tcpReachable:true}));
 assert.throws(()=>assertControlledNetworkComparison(base,{...candidate,fixtureSha256:'b'.repeat(64)}));
});
test(
  'Linux actual Docker isolation and Unix/loopback route work; direct egress fails',
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
    let resolveProbe, rejectProbe;
    const probe = new Promise((r, j) => {
      resolveProbe = r;
      rejectProbe = j;
    });
    const server = createServer((s) => {
      s.once('data', (b) => {
        try {
          if (b.toString() === 'SYNTHETIC_PING') s.end('SYNTHETIC_PONG');
          else {
            const result = JSON.parse(b.toString());
            resolveProbe(result);
            s.end('ACK');
          }
        } catch {
          rejectProbe(Error('synthetic-probe-invalid'));
          s.destroy();
        }
      });
    });
    await new Promise((r, j) => {
      server.once('error', j);
      server.listen(root + '/socket/data.sock', r);
    });
    const script = `import net from 'node:net';import dns from 'node:dns/promises';
 const check=(host,port)=>new Promise(r=>{const s=net.connect({host,port});s.setTimeout(300,()=>{s.destroy();r(true)});s.once('error',()=>r(true));s.once('connect',()=>{s.destroy();r(false)});});
 delete process.env.HTTPS_PROXY;delete process.env.HTTP_PROXY;process.env.RES_OPTIONS='attempts:1 timeout:1';
 const unix=await new Promise((r,j)=>{const s=net.connect('/guard/socket/data.sock',()=>s.write('SYNTHETIC_PING'));s.on('data',b=>r(b.toString()==='SYNTHETIC_PONG'));s.on('error',j)});
 const loop=net.createServer(s=>s.end('OK'));await new Promise(r=>loop.listen(0,'127.0.0.1',r));const loopback=await new Promise((r,j)=>{const s=net.connect(loop.address().port,'127.0.0.1');s.on('data',b=>r(b.toString()==='OK'));s.on('error',j)});loop.close();
 const ipv4=await check('192.0.2.1',443),ipv6=await check('2001:db8::1',443);let noDns=false;try{await dns.resolve4('example.invalid')}catch{noDns=true}
 const result=JSON.stringify({unix,loopback,ipv4,ipv6,noDns,syntheticOnly:true});const report=net.connect('/guard/socket/data.sock',()=>report.end(result));setTimeout(()=>{},30000);`;
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
    const name =
      'native-guard-00000000-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0');
    let id;
    try {
      const args = nativeContainerArguments(p, { uid, gid, name });
      args.splice(args.indexOf('--interactive'), 1);
      args.splice(args.indexOf('run') + 1, 0, '--detach');
      const raw = await run(args.slice(2));
      id = raw.trim();
      assert.match(id, /^[a-f0-9]{64}$/);
      const [container] = JSON.parse(await run(['inspect', id])),
        [image] = JSON.parse(await run(['image', 'inspect', NATIVE_GUARD_IMAGE]));
      const proof = validateNativeContainerInspection(container, image, {
        paths: p,
        uid,
        gid,
        name,
      });
      assert.equal(proof.runtimeIsolationVerified, true);
      assert.equal(proof.cliSha256, undefined, 'Synthetic fixture is not binary qualification');
      // log-driver none intentionally retains no output; read synthetic bounded Unix report, never docker logs.
      let timer;
      try {
        const result = await Promise.race([
          probe,
          new Promise((_, j) => {
            timer = setTimeout(() => j(Error('synthetic-probe-timeout')), 15000);
          }),
        ]);
        assert.deepEqual(result, {
          unix: true,
          loopback: true,
          ipv4: true,
          ipv6: true,
          noDns: true,
          syntheticOnly: true,
        });
      } finally {
        clearTimeout(timer);
      }
    } finally {
      if (id) await run(['rm', '--force', '--', id]);
      await new Promise((r) => server.close(r));
    }
  },
);
