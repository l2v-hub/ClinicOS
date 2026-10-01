#!/usr/bin/env node
// Phase 5 — AZURE-DEPENDENT check of gpt-live-transcribe through the AI runtime (real provider).
//   1. health: endpoint + auth + deployment (non-destructive)
//   2. realtime call: a real WebRTC offer (headless Chromium) negotiated server-side (mint + SDP
//      exchange); only the SDP answer comes back (token never printed or returned)
//   3. server transport: Italian fixtures → Realtime WebSocket → final transcript (+ partial count)
// Exit 0 = PASS, 2 = BLOCKED (deployment/config missing), 1 = FAIL. Never prints secrets.
//
//   AI_RUNTIME_URL=http://127.0.0.1:8765 AI_RUNTIME_SERVICE_TOKEN=… \
//     node scripts/voice/azure-stt-check.mjs [--out report.json] [--delay 1000]

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const base = (process.env.AI_RUNTIME_URL ?? '').replace(/\/$/, '');
const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
if (!base || !token) {
  console.error('AI_RUNTIME_URL and AI_RUNTIME_SERVICE_TOKEN are required');
  process.exit(2);
}
const headers = { Authorization: `Bearer ${token}` };
const delayMs = Number(opt('--delay', '1000'));
const report = { at: new Date().toISOString(), verdict: 'FAIL', steps: [] };
const step = (name, pass, detail) => {
  report.steps.push({ name, pass, detail });
  console.log(`${pass === null ? 'BLOCKED' : pass ? 'PASS' : 'FAIL'}  ${name}  ${detail ?? ''}`);
};
const finish = (verdict) => {
  report.verdict = verdict;
  const out = opt('--out');
  if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${verdict}`);
  process.exit(verdict === 'PASS' ? 0 : verdict === 'BLOCKED' ? 2 : 1);
};

const health = await (await fetch(`${base}/v1/voice/health`, { headers })).json();
report.health = health;
if (!health.ok) {
  step('health (endpoint/auth/deployment)', null, `${health.code}: ${health.message}`);
  finish('BLOCKED');
}
step(
  'health (endpoint/auth/deployment)',
  true,
  `deployment=${health.deployment} model=${health.model}`,
);

// The browser path: a REAL WebRTC offer (headless Chromium) negotiated by the runtime
// (mint + /realtime/calls server-side). Only the SDP answer comes back.
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const offer = await page.evaluate(async () => {
  const pc = new RTCPeerConnection();
  pc.addTransceiver('audio', { direction: 'sendrecv' });
  pc.createDataChannel('oai-events');
  const o = await pc.createOffer();
  return o.sdp;
});
await browser.close();
const t0 = Date.now();
const call = await fetch(`${base}/v1/voice/realtime-call`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sdp: offer }),
});
const answer = await call.json().catch(() => ({}));
step(
  'realtime call (server-side ephemeral session + SDP exchange)',
  call.ok && typeof answer.sdp === 'string' && answer.sdp.startsWith('v=') && !('token' in answer),
  `status=${call.status} answer=${answer.sdp ? `${answer.sdp.length} chars` : JSON.stringify(answer.detail ?? answer).slice(0, 120)} ${Date.now() - t0}ms`,
);

const num = (d, w) => new RegExp(`\\b(${d}|${w})\\b`, 'i');
const FIXTURES = [
  ['read-overview.wav', [/dimmi tutto/i, /ospite/i]],
  ['vitals-120-80.wav', [/pressione/i, num('120', 'centoventi'), num('80', 'ottanta')]],
  ['vitals-140-90.wav', [/pressione/i, num('140', 'centoquaranta'), num('90', 'novanta')]],
  ['conferma.wav', [/conferma/i]],
  ['ambiguous-ferri.wav', [/pressione/i, /ferri/i]],
  ['prescribe.wav', [/paracetamolo/i, num('1000|1\\.000', 'mille')]],
  ['silence.wav', 'EMPTY'],
  ['noise-burst.wav', 'EMPTY'],
];
const latencies = [];
for (const [file, expected] of FIXTURES) {
  const audio = readFileSync(join(here, 'fixtures', file));
  const t = Date.now();
  const r = await fetch(`${base}/v1/voice/transcribe`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_base64: audio.toString('base64'),
      mime_type: 'audio/wav',
      locale: 'it-IT',
    }),
  });
  const body = await r.json().catch(() => ({}));
  const ms = Date.now() - t;
  latencies.push(ms);
  const text = body.text ?? '';
  const pass =
    r.ok && (expected === 'EMPTY' ? body.empty === true : expected.every((re) => re.test(text)));
  step(
    `transcribe ${file}`,
    pass,
    `${r.status} ${ms}ms partials=${body.metadata?.usage?.partials ?? '-'} firstPartialMs=${body.metadata?.usage?.firstPartialMs ?? '-'} «${text}»`,
  );
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
latencies.sort((a, b) => a - b);
report.latencyMs = { p50: latencies[Math.floor(latencies.length / 2)], max: latencies.at(-1) };
finish(report.steps.every((s) => s.pass) ? 'PASS' : 'FAIL');
