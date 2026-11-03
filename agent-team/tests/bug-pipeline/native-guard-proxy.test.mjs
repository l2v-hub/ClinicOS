import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectProxyRequest,
  inspectConnect,
  metadataRoute,
  officialForwardOptions,
  createNativeGuardProxy,
} from '../../src/bug-pipeline/native-guard-proxy.mjs';
import { createNativeGuardCertificates } from '../../src/bug-pipeline/native-guard-certificates.mjs';
import { mkdtemp, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
const headers = [
  'Host',
  'api.anthropic.com',
  'Authorization',
  'Bearer synthetic-only-token',
  'Content-Type',
  'application/json',
  'Content-Length',
  '2',
];
test('CONNECT authority is exact and never an open tunnel', () => {
  assert.equal(
    inspectConnect({
      method: 'CONNECT',
      url: 'api.anthropic.com:443',
      rawHeaders: ['Host', 'api.anthropic.com:443'],
    }),
    true,
  );
  for (const url of [
    'api.anthropic.com.evil:443',
    '127.0.0.1:443',
    'api.anthropic.com:80',
    'api.anthropic.com:443/',
  ])
    assert.throws(() => inspectConnect({ method: 'CONNECT', url, rawHeaders: ['Host', url] }));
});
test('raw duplicate framing/auth/host and alternate authentication fail closed', () => {
  assert.equal(
    inspectProxyRequest(
      { method: 'POST', url: '/v1/messages', rawHeaders: headers },
      'synthetic-only-token',
    ).contentLength,
    2,
  );
  for (const h of [
    ['HOST', 'other'],
    ['Authorization', 'Bearer second'],
    ['Transfer-Encoding', 'chunked'],
    ['X-Api-Key', 'bad'],
    ['Content-Length', '2'],
    ['Connection', 'upgrade'],
  ])
    assert.throws(() =>
      inspectProxyRequest(
        { method: 'POST', url: '/v1/messages', rawHeaders: [...headers, ...h] },
        'synthetic-only-token',
      ),
    );
  assert.throws(() =>
    inspectProxyRequest(
      { method: 'POST', url: '/v1/messages', rawHeaders: headers },
      'different-token',
    ),
  );
});
test('only fixed inference and policy metadata endpoints are allowed', () => {
  for (const url of ['/api/claude_code/settings', '/api/claude_code/policy_limits'])
    assert.equal(metadataRoute('GET', url), true);
  for (const url of [
    '/api/claude_code/settings?code=secret',
    '/api/claude_code/metrics',
    '/v1/messages/batches',
    'https://api.anthropic.com/v1/messages',
  ])
    assert.throws(() =>
      inspectProxyRequest({ method: 'POST', url, rawHeaders: headers }, 'synthetic-only-token'),
    );
  assert.equal(metadataRoute('POST', '/api/claude_code/settings'), false);
});
test('upstream TLS cannot inherit local CA/proxy or route to alternate host', () => {
  const o = officialForwardOptions();
  assert.equal(o.hostname, 'api.anthropic.com');
  assert.equal(o.port, 443);
  assert.equal(o.servername, 'api.anthropic.com');
  assert.equal(o.rejectUnauthorized, true);
  assert.equal(o.agent, false);
  assert.ok(Array.isArray(o.ca) && o.ca.length > 0);
  assert.equal(o.proxy, undefined);
});
test(
  'Linux real CONNECT/TLS holds complete source before parent release and preserves body',
  { skip: process.platform !== 'linux', timeout: 30000 },
  async () => {
    const cert = await createNativeGuardCertificates(),
      dir = await mkdtemp(path.join(os.tmpdir(), 'native-guard-proxy-'));
    await mkdir(dir + '/socket', { mode: 0o700 });
    let notify,
      stageResolve,
      stageReject,
      forward,
      count = 0,
      seen,
      observed = '';
    const arrived = new Promise((r) => {
      notify = r;
    });
    const completion = new Promise((r, j) => {
      stageResolve = r;
      stageReject = j;
    });
    completion.catch(() => {});
    const data = {
      stage(o) {
        assert.equal(forward, undefined);
        forward = o.forward;
        seen = o.seal;
        const s = { handle: Object.freeze({}), seal: o.seal, completion };
        notify(s);
        return s;
      },
      fail() {
        stageReject(Error('synthetic-proxy-rejected'));
      },
      status() {
        return { phase: 'SYNTHETIC' };
      },
    };
    const requestImpl = (options, callback) => {
      count++;
      assert.equal(options.hostname, 'api.anthropic.com');
      const req = new EventEmitter();
      req.setTimeout = () => {};
      req.destroy = () => {};
      req.end = (body) => {
        assert.equal(body.toString(), '{}');
        queueMicrotask(() => {
          const up = new PassThrough();
          up.statusCode = 200;
          up.headers = { 'request-id': 'synthetic-request-id' };
          up.rawHeaders = ['Content-Type', 'text/event-stream', 'Content-Length', '12'];
          callback(up);
          up.end('SYNTHETIC_OK');
        });
      };
      return req;
    };
    const proxy = createNativeGuardProxy({
      tlsOptions: cert.tlsOptions,
      oauthToken: 'synthetic-only-token',
      expected: {},
      data,
      validateRequest: ({ body }) => {
        assert.equal(body.toString(), '{}');
        return { model: 'claude-opus-4-6' };
      },
      onStage: async () => {},
      observeResponse: (meta) => {
        assert.equal(meta.statusCode, 200);
        assert.equal(meta.requestId, 'synthetic-request-id');
        return {
          push: (b) => {
            observed += b.toString();
          },
        };
      },
      requestImpl,
    });
    let transport, secure;
    try {
      const socketPath = await proxy.listen(dir + '/socket');
      const result = new Promise((resolve, reject) => {
        transport = net.connect(socketPath, () =>
          transport.write(
            'CONNECT api.anthropic.com:443 HTTP/1.1\r\nHost: api.anthropic.com:443\r\n\r\n',
          ),
        );
        let head = '';
        const onHead = (chunk) => {
          head += chunk.toString('ascii');
          if (!head.endsWith('\r\n\r\n')) return;
          assert.equal(head, 'HTTP/1.1 200 Connection Established\r\n\r\n');
          transport.off('data', onHead);
          secure = tls.connect(
            {
              socket: transport,
              servername: 'api.anthropic.com',
              ca: cert.publicCA,
              ALPNProtocols: ['http/1.1'],
            },
            () =>
              secure.write(
                'POST /v1/messages HTTP/1.1\r\nHost: api.anthropic.com\r\nAuthorization: Bearer synthetic-only-token\r\nContent-Type: application/json\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}',
              ),
          );
          let response = '';
          secure.on('data', (b) => {
            response += b.toString();
          });
          secure.once('end', () => resolve(response));
          secure.once('error', reject);
        };
        transport.on('data', onHead);
        transport.once('error', reject);
      });
      const stage = await arrived;
      assert.equal(count, 0);
      assert.equal(stage.seal, seen);
      await forward().then(stageResolve, stageReject);
      const response = await result;
      assert.equal(count, 1);
      assert.ok(response.includes('SYNTHETIC_OK'));
      assert.equal(observed, 'SYNTHETIC_OK');
    } finally {
      secure?.destroy();
      transport?.destroy();
      await proxy.close();
      cert.dispose();
    }
  },
);
