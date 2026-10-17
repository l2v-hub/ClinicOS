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
    const disabled = await runtimeSttStatus(env);
    assert.equal(voiceTransport(disabled, {}), 'server');
    reply = {
      available: true,
      realtime: { enabled: true, available: true, model: 'live', transports: ['webrtc'] },
    };
    const enabled = await runtimeSttStatus(env);
    assert.equal(voiceTransport(enabled, {}), 'webrtc');
    assert.equal(voiceTransport(enabled, { VOICE_STT_TRANSPORT: 'server' }), 'server');
    reply = { available: true, realtime: { enabled: true, available: false, transports: [] } };
    const unsupported = await runtimeSttStatus(env);
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
