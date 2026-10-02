#!/usr/bin/env node
// Phase 9 — AI runtime stub for load/recovery drills (NO paid provider is called).
// Emulates /v1/assistant/{skill-route,compose,plan} and /v1/voice/transcribe with a fixed latency
// and a switchable failure mode, and counts the X-Request-Id headers it receives.
//
//   node scripts/production/ai-runtime-stub.mjs --port 8799 --latency 400 --token <service token>
//   POST /__mode {"mode":"ok|500|429|slow|malformed|down"}   GET /__stats
import http from 'node:http';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const port = Number(arg('port', 8799));
const latency = Number(arg('latency', 400));
const token = arg('token', process.env.AI_RUNTIME_SERVICE_TOKEN || 'stub-token');
let mode = 'ok';
const stats = { calls: {}, withRequestId: 0, total: 0, chars: {} };

const REPLIES = {
  'skill-route': '{"route":{"skillId":null},"model":"stub"}',
  compose: '{"answerText":"Sintesi di prova.","citedSources":[],"model":"stub"}',
  plan: '{"plan":{"steps":[]},"model":"stub","confidence":1}',
  transcribe: '{"text":"pressione 120 su 80","locale":"it-IT","metadata":{"provider":"stub"}}',
};

http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (req.url === '/__mode') {
        mode = JSON.parse(body || '{}').mode || 'ok';
        res.end(JSON.stringify({ mode }));
        return;
      }
      if (req.url === '/__stats') {
        res.end(JSON.stringify({ mode, ...stats }));
        return;
      }
      if (req.url === '/v1/runtime/health') {
        res.end('{"status":"ok"}');
        return;
      }
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.writeHead(401).end('{}');
        return;
      }
      const kind = (req.url || '').split('/').pop();
      stats.total += 1;
      stats.calls[kind] = (stats.calls[kind] || 0) + 1;
      stats.chars[kind] = (stats.chars[kind] || 0) + body.length;
      if (req.headers['x-request-id']) stats.withRequestId += 1;
      if (mode === 'down') {
        req.socket.destroy();
        return;
      }
      const reply = () => {
        res.setHeader('Content-Type', 'application/json');
        if (mode === '500') return void res.writeHead(500).end('{"detail":"internal error"}');
        if (mode === '429') return void res.writeHead(429).end('{"detail":"rate"}');
        if (mode === 'malformed') return void res.end('{"route":');
        res.end(REPLIES[kind] ?? '{}');
      };
      setTimeout(reply, mode === 'slow' ? 60_000 : latency);
    });
  })
  .listen(port, '127.0.0.1', () => console.log(`ai-runtime-stub on ${port} latency=${latency}ms`));
