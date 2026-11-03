// Parent-side HTTPS inspection reference monitor. No CONNECT is an upstream tunnel.
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { timingSafeEqual } from 'node:crypto';
import { lstat, readdir, chmod } from 'node:fs/promises';
import path from 'node:path';

const HOST = 'api.anthropic.com',
  AUTHORITY = HOST + ':443',
  MAX_BODY = 2 * 1024 * 1024;
const GETS = new Set(['/api/claude_code/settings', '/api/claude_code/policy_limits']);
const POSTS = new Set(['/v1/messages', '/v1/messages?beta=true']);
const COMMON = new Set([
  'host',
  'authorization',
  'content-type',
  'content-length',
  'accept',
  'accept-encoding',
  'user-agent',
  'anthropic-version',
  'anthropic-beta',
  'x-app',
  'x-client-request-id',
  'x-stainless-lang',
  'x-stainless-package-version',
  'x-stainless-os',
  'x-stainless-arch',
  'x-stainless-runtime',
  'x-stainless-runtime-version',
  'x-stainless-retry-count',
  'x-stainless-timeout',
  'x-stainless-helper-method',
  'x-stainless-helper',
  'connection',
  'cache-control',
  'pragma',
]);
function headers(raw) {
  assert.ok(Array.isArray(raw) && raw.length >= 2 && raw.length <= 80 && raw.length % 2 === 0);
  const map = new Map();
  let size = 0;
  for (let i = 0; i < raw.length; i += 2) {
    const key = raw[i],
      value = raw[i + 1];
    assert.ok(typeof key === 'string' && /^[A-Za-z0-9-]+$/.test(key));
    assert.ok(typeof value === 'string' && /^[\x20-\x7e]*$/.test(value));
    size += key.length + value.length;
    assert.ok(size <= 16384);
    const k = key.toLowerCase();
    assert.ok(!map.has(k), 'native-header-duplicate');
    map.set(k, value);
  }
  return map;
}
export function inspectConnect(req) {
  assert.equal(req.method, 'CONNECT');
  assert.equal(req.url, AUTHORITY);
  const h = headers(req.rawHeaders);
  assert.equal(h.get('host'), AUTHORITY);
  for (const [k, v] of h) {
    assert.ok(['host', 'connection', 'proxy-connection'].includes(k));
    if (k !== 'host') assert.ok(['keep-alive', 'Keep-Alive', 'close'].includes(v));
  }
  return true;
}
export function metadataRoute(method, url) {
  return method === 'GET' && GETS.has(url);
}
export function inspectProxyRequest(req, oauthToken) {
  assert.ok(typeof oauthToken === 'string' && oauthToken.length >= 8);
  const h = headers(req.rawHeaders);
  assert.equal(h.get('host'), HOST);
  for (const [k, v] of h) {
    assert.ok(COMMON.has(k), 'native-header-unsupported');
    if (k === 'connection') assert.ok(['keep-alive', 'close'].includes(v));
  }
  const a = Buffer.from(h.get('authorization') ?? ''),
    b = Buffer.from('Bearer ' + oauthToken);
  assert.ok(a.length === b.length && timingSafeEqual(a, b), 'native-oauth-required');
  let contentLength = 0;
  if (h.has('content-length')) {
    assert.match(h.get('content-length'), /^(?:0|[1-9][0-9]{0,6})$/);
    contentLength = Number(h.get('content-length'));
  }
  assert.ok(contentLength <= MAX_BODY);
  if (metadataRoute(req.method, req.url)) {
    assert.equal(contentLength, 0);
    assert.ok(!h.has('content-type'));
    for (const [k, v] of h) {
      assert.ok(
        [
          'host',
          'authorization',
          'accept',
          'accept-encoding',
          'user-agent',
          'anthropic-beta',
          'cache-control',
          'pragma',
          'connection',
          'content-length',
        ].includes(k),
      );
      if (k === 'user-agent')
        assert.ok(['claude-code/2.1.301', 'claude-cli/2.1.301 (external, cli)'].includes(v));
      if (k === 'anthropic-beta') assert.equal(v, 'oauth-2025-04-20');
      if (k === 'cache-control' || k === 'pragma') assert.equal(v, 'no-cache');
      if (k === 'accept')
        assert.ok(['application/json', 'application/json, text/plain, */*', '*/*'].includes(v));
      if (k === 'accept-encoding')
        assert.ok(['gzip, compress, deflate, br', 'gzip, deflate, br', 'identity'].includes(v));
    }
    return { kind: 'metadata', contentLength, host: HOST, path: req.url };
  }
  assert.equal(req.method, 'POST');
  assert.ok(POSTS.has(req.url), 'native-endpoint-denied');
  assert.ok(h.has('content-length') && contentLength > 0);
  assert.ok(
    ['application/json', 'application/json; charset=utf-8'].includes(h.get('content-type')),
  );
  return { kind: 'source', contentLength, host: HOST, path: req.url };
}
export function officialForwardOptions() {
  const system = tls.getCACertificates?.('system') ?? [];
  return {
    hostname: HOST,
    port: 443,
    servername: HOST,
    rejectUnauthorized: true,
    checkServerIdentity: tls.checkServerIdentity,
    ca: [...tls.rootCertificates, ...system],
    ALPNProtocols: ['http/1.1'],
    agent: false,
    minVersion: 'TLSv1.2',
  };
}
export function stageNativeProxySource({
  request,
  validateRequest,
  data,
  forward,
  isCapacityError = () => false,
  onCapacity = () => {},
}) {
  try {
    let seal;
    try {
      seal = validateRequest(request);
    } catch (error) {
      // Only the trusted protocol classifier may recognize its internally minted error.
      if (isCapacityError(error) === true) {
        const source = error.metadata,
          safe = {};
        for (const key of [
          'requiredTokensUpperBound',
          'contextBytes',
          'inputBytes',
          'schemaBytes',
          'maxTokens',
          'contextWindow',
        ]) {
          const value = source[key];
          assert.ok(Number.isSafeInteger(value) && value >= 0);
          safe[key] = value;
        }
        onCapacity(Object.freeze(safe));
      }
      throw error;
    }
    return data.stage({ seal, forward: () => forward(seal) });
  } catch {
    try {
      data.fail('native-proxy-rejected');
    } catch {}
    throw Error('native-proxy-rejected');
  }
}
export function createNativeGuardProxy({
  tlsOptions,
  oauthToken,
  expected,
  data,
  validateRequest,
  onStage,
  observeResponse,
  isCapacityError = () => false,
  onCapacity = () => {},
  requestImpl = https.request,
} = {}) {
  assert.ok(tlsOptions?.key && tlsOptions?.cert);
  assert.ok(
    typeof validateRequest === 'function' &&
      typeof onStage === 'function' &&
      typeof observeResponse === 'function',
  );
  assert.ok(typeof isCapacityError === 'function' && typeof onCapacity === 'function');
  assert.ok(
    typeof data?.stage === 'function' &&
      typeof data?.fail === 'function' &&
      typeof data?.status === 'function',
  );
  assert.ok(typeof oauthToken === 'string' && /^[\x21-\x7e]{8,8192}$/.test(oauthToken));
  const context = tls.createSecureContext({
    key: tlsOptions.key,
    cert: tlsOptions.cert,
    minVersion: 'TLSv1.2',
  });
  const sockets = new Set(),
    requests = new Set();
  let metadata = 0,
    sourceSeen = false,
    closed = false,
    listening = false;
  const fail = () => {
    try {
      data.fail('native-proxy-rejected');
    } catch {}
    for (const p of requests) p.destroy();
    for (const s of sockets) s.destroy();
  };
  const track = (s) => {
    sockets.add(s);
    s.on('error', fail);
    s.once('close', () => sockets.delete(s));
    s.setTimeout(20 * 60000, fail);
  };
  function forward(req, res, body, seal) {
    return new Promise((resolve, reject) => {
      let p,
        ended = false;
      const bad = () => {
        if (ended) return;
        ended = true;
        fail();
        reject(Error('native-upstream-failed'));
      };
      try {
        p = requestImpl(
          {
            ...officialForwardOptions(),
            method: req.method,
            path: req.url,
            headers: [...req.rawHeaders],
            setHost: false,
            setDefaultHeaders: false,
          },
          (up) => {
            try {
              if (seal) assert.equal(up.statusCode, 200);
              else assert.ok([200, 204, 304, 404].includes(up.statusCode));
              assert.ok(
                !up.headers['content-encoding'] ||
                  up.headers['content-encoding'] === 'identity' ||
                  !seal,
                'native-inference-encoding-denied',
              );
              const id = up.headers['request-id'];
              if (seal) assert.ok(typeof id === 'string' && id.length > 0 && id.length <= 200);
              const observer = seal
                ? observeResponse({ statusCode: up.statusCode, requestId: id, seal })
                : null;
              if (seal) assert.ok(observer && typeof observer.push === 'function');
              res.writeHead(up.statusCode, [...up.rawHeaders]);
              let received = 0;
              up.on('data', (chunk) => {
                try {
                  received += chunk.length;
                  assert.ok(received <= 768 * 1024);
                  observer?.push(Buffer.from(chunk));
                  res.write(chunk);
                } catch {
                  bad();
                }
              });
              up.once('error', bad);
              up.once('aborted', bad);
              up.once('end', () => {
                if (ended) return;
                ended = true;
                requests.delete(p);
                res.end();
                resolve({ upstreamCompleted: true });
              });
            } catch {
              bad();
            }
          },
        );
      } catch {
        return bad();
      }
      requests.add(p);
      p.once('error', bad);
      p.setTimeout(20 * 60000, bad);
      p.end(body);
    });
  }
  const inner = http.createServer(
    { maxHeaderSize: 16384, insecureHTTPParser: false },
    async (req, res) => {
      try {
        assert.ok(!closed && req.httpVersion === '1.1');
        const route = inspectProxyRequest(req, oauthToken);
        if (route.kind === 'source') {
          assert.equal(sourceSeen, false, 'native-second-inference-denied');
          sourceSeen = true;
        } else {
          metadata++;
          assert.ok(metadata <= 8);
        }
        let size = 0;
        const parts = [];
        for await (const chunk of req) {
          size += chunk.length;
          assert.ok(size <= route.contentLength);
          parts.push(Buffer.from(chunk));
        }
        assert.equal(size, route.contentLength);
        assert.equal(req.rawTrailers.length, 0);
        assert.equal(req.complete, true);
        const body = Buffer.concat(parts);
        if (route.kind === 'metadata') {
          await forward(req, res, body, null);
          return;
        }
        const staged = stageNativeProxySource({
          request: {
            body,
            rawHeaders: [...req.rawHeaders],
            host: HOST,
            method: req.method,
            path: req.url,
            expected,
          },
          validateRequest,
          data,
          isCapacityError,
          onCapacity,
          forward: (seal) => forward(req, res, body, seal),
        });
        // Root receives only the safe opaque handle/seal; release is NOT an egress operation.
        await onStage(staged);
        await staged.completion;
      } catch {
        fail();
        res.destroy();
      }
    },
  );
  inner.maxRequestsPerSocket = 1;
  inner.on('clientError', fail);
  inner.on('dropRequest', fail);
  inner.on('upgrade', fail);
  inner.on('connect', fail);
  const secure = tls.createServer(
    {
      key: tlsOptions.key,
      cert: tlsOptions.cert,
      minVersion: 'TLSv1.2',
      ALPNProtocols: ['http/1.1'],
      SNICallback: (name, cb) =>
        name === HOST ? cb(null, context) : cb(Error('native-sni-denied')),
    },
    (socket) => {
      if (
        socket.servername !== HOST ||
        (socket.alpnProtocol && socket.alpnProtocol !== 'http/1.1')
      ) {
        fail();
        socket.destroy();
        return;
      }
      track(socket);
      inner.emit('connection', socket);
    },
  );
  secure.on('tlsClientError', fail);
  const outer = http.createServer(
    { maxHeaderSize: 4096, insecureHTTPParser: false },
    (_req, res) => {
      fail();
      res.destroy();
    },
  );
  outer.on('clientError', fail);
  outer.on('upgrade', fail);
  outer.on('connection', track);
  outer.on('connect', (req, socket, head) => {
    try {
      inspectConnect(req);
      assert.ok(head.length <= 16384);
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) socket.unshift(head);
      secure.emit('connection', socket);
    } catch {
      fail();
      socket.destroy();
    }
  });
  return {
    async listen(directory) {
      assert.equal(listening, false);
      assert.ok(path.isAbsolute(directory) && !/[\x00-\x1f,]/.test(directory));
      const s = await lstat(directory);
      assert.ok(s.isDirectory() && !s.isSymbolicLink() && (s.mode & 0o077) === 0);
      assert.deepEqual(await readdir(directory), []);
      const socket = path.join(directory, 'data.sock');
      await new Promise((resolve, reject) => {
        outer.once('error', reject);
        outer.listen(socket, resolve);
      });
      await chmod(socket, 0o600);
      listening = true;
      return socket;
    },
    state() {
      return { ...data.status(), metadataRequests: metadata, sourceRequestSeen: sourceSeen };
    },
    async close() {
      if (closed) return;
      closed = true;
      for (const p of requests) p.destroy();
      for (const s of sockets) s.destroy();
      if (listening) await new Promise((r) => outer.close(r));
    },
  };
}
