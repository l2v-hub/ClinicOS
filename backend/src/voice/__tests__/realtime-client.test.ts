import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import {
  createRuntimeSttProvider,
  runtimeSttStatus,
  voiceTransport,
  SttUnavailableError,
} from '../stt.js';

test('realtime client forwards bearer/SDP but returns only bounded allowlisted answer', async () => {
  let reply: unknown = {
    sdp: 'v=0\r\nanswer',
    model: 'live',
    deployment: 'live',
    expiresAt: 123,
    token: 'private-ephemeral',
  };
  let seen: any;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (data) => (raw += data));
    req.on('end', () => {
      seen = { auth: req.headers.authorization, path: req.url, body: JSON.parse(raw || '{}') };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(reply));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const env = {
    AI_RUNTIME_URL: `http://127.0.0.1:${(server.address() as any).port}`,
    AI_RUNTIME_SERVICE_TOKEN: 'synthetic',
  };
  try {
    const answer = await createRuntimeSttProvider(env).negotiateRealtimeCall!('v=0\r\noffer');
    assert.equal(seen.auth, 'Bearer synthetic');
    assert.equal(seen.path, '/v1/voice/realtime-call');
    assert.deepEqual(seen.body, { sdp: 'v=0\r\noffer' });
    assert.equal(answer.sdp, 'v=0\r\nanswer');
    assert.ok(!JSON.stringify(answer).includes('private-ephemeral'));
    for (const invalid of [
      { sdp: 'not-sdp' },
      { sdp: 'v=0' + 'é'.repeat(32000) },
      { sdp: 'v=0' + 'x'.repeat(100_000) },
    ]) {
      reply = invalid;
      await assert.rejects(
        createRuntimeSttProvider(env).negotiateRealtimeCall!('v=0'),
        SttUnavailableError,
      );
    }
    reply = { available: true, realtime: { enabled: false, available: false, transports: [] } };
    const disabled = await runtimeSttStatus({ ...env, AI_RUNTIME_SERVICE_TOKEN: 'disabled' });
    assert.equal(voiceTransport(disabled, {}), 'server');
    reply = {
      available: true,
      realtime: { enabled: true, available: true, model: 'live', transports: ['webrtc'] },
    };
    const enabled = await runtimeSttStatus({ ...env, AI_RUNTIME_SERVICE_TOKEN: 'enabled' });
    assert.equal(voiceTransport(enabled, {}), 'webrtc');
    assert.equal(voiceTransport(enabled, { VOICE_STT_TRANSPORT: 'server' }), 'server');
    reply = { available: true, realtime: { enabled: true, available: false, transports: [] } };
    const unsupported = await runtimeSttStatus({ ...env, AI_RUNTIME_SERVICE_TOKEN: 'unsupported' });
    assert.equal(
      voiceTransport(unsupported, {}),
      'webrtc',
      'an unsupported explicit realtime request cannot silently select the file model',
    );
    assert.equal(unsupported.realtime.available, false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await assert.rejects(
    createRuntimeSttProvider({}).negotiateRealtimeCall!('v=0'),
    SttUnavailableError,
  );
});

test('status probes cache by runtime and credential, deduplicate, expire and isolate returned values', async () => {
  let requests = 0;
  let valid = true;
  const server = http.createServer((_req, res) => {
    requests++;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      valid
        ? JSON.stringify({
            available: true,
            realtime: { enabled: true, available: true, transports: ['webrtc'] },
          })
        : 'not json',
    );
  });
  const other = http.createServer((_req, res) => {
    requests++;
    res.end('{"available":false}');
  });
  await Promise.all([
    new Promise<void>((r) => server.listen(0, '127.0.0.1', r)),
    new Promise<void>((r) => other.listen(0, '127.0.0.1', r)),
  ]);
  const env = {
    AI_RUNTIME_URL: `http://127.0.0.1:${(server.address() as any).port}`,
    AI_RUNTIME_SERVICE_TOKEN: 'synthetic-cache',
  };
  try {
    const [first, second] = await Promise.all([
      runtimeSttStatus(env, 1000),
      runtimeSttStatus(env, 1000),
    ]);
    assert.equal(requests, 1);
    first.realtime.available = false;
    assert.equal(second.realtime.available, true);
    assert.equal(
      (await runtimeSttStatus({ ...env, AI_RUNTIME_URL: `${env.AI_RUNTIME_URL}/` }, 2000)).realtime
        .available,
      true,
    );
    assert.equal(requests, 1, 'trailing slash normalizes to the same runtime');
    await runtimeSttStatus({ ...env, AI_RUNTIME_SERVICE_TOKEN: 'rotated' }, 2000);
    assert.equal(requests, 2, 'rotated credential cannot inherit old authentication');
    await runtimeSttStatus(
      { ...env, AI_RUNTIME_URL: `http://127.0.0.1:${(other.address() as any).port}` },
      2000,
    );
    assert.equal(requests, 3, 'another runtime has its own status');
    await runtimeSttStatus(env, 61001);
    assert.equal(requests, 4, 'TTL expiration refreshes status with a deterministic clock');
    valid = false;
    assert.equal((await runtimeSttStatus(env, 121002)).available, false);
    await runtimeSttStatus({}, 121002);
    assert.equal(requests, 5, 'missing configuration never probes');
  } finally {
    await Promise.all([
      new Promise<void>((r) => server.close(() => r())),
      new Promise<void>((r) => other.close(() => r())),
    ]);
  }
});
