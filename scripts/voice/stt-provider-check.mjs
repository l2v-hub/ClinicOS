#!/usr/bin/env node
// Phase 5 — PROVIDER-DEPENDENT STT check: real audio fixtures → the AI runtime → the real STT
// provider (AI_STT_MODEL, e.g. google:gemini-3.5-flash-lite). Not part of CI (needs provider
// credentials and network). Keys are never read or printed here: only the runtime holds them.
//
//   AI_RUNTIME_URL=http://127.0.0.1:8765 AI_RUNTIME_SERVICE_TOKEN=… \
//     node scripts/voice/stt-provider-check.mjs [--out report.json] [--runs 1] [--delay 4500]
//
// Expectations are LITERAL content checks (numbers may come as digits or words); a silent / noise
// fixture must come back empty — the provider must never invent a command.

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
const runs = Number(opt('--runs', '1'));
// Pause between calls: the Gemini API quota answers 429 (→ runtime 503 rate_limited) on bursts.
const delayMs = Number(opt('--delay', '4500'));

const num = (digits, words) => new RegExp(`\\b(${digits}|${words})\\b`, 'i');
const FIXTURES = [
  ['read-overview.wav', [/dimmi tutto/i, /ospite/i]],
  ['vitals-120-80.wav', [/pressione/i, num('120', 'centoventi'), num('80', 'ottanta')]],
  ['vitals-140-90.wav', [/pressione/i, num('140', 'centoquaranta'), num('90', 'novanta')]],
  ['conferma.wav', [/^\W*conferma\W*$/i]],
  ['ambiguous-ferri.wav', [/pressione/i, num('130', 'centotrenta'), /\bFerri\b/i]],
  ['out-of-scope.wav', [/pressione/i, /\bEsposito\b/i]],
  ['prescribe.wav', [/paracetamolo/i, num('1000|1\\.000', 'mille'), /compress/i]],
  ['administration.wav', [/somministrazione/i, /ospite/i]],
  ['silence.wav', 'EMPTY'],
  ['steady-noise.wav', 'EMPTY'],
  ['noise-burst.wav', 'EMPTY'],
];

const results = [];
for (let run = 0; run < runs; run += 1) {
  for (const [file, expected] of FIXTURES) {
    const audio = readFileSync(join(here, 'fixtures', file));
    const t0 = Date.now();
    let status = 0;
    let body = null;
    try {
      const response = await fetch(`${base}/v1/voice/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: audio.toString('base64'),
          mime_type: 'audio/wav',
          locale: 'it-IT',
        }),
      });
      status = response.status;
      body = await response.json().catch(() => null);
    } catch (error) {
      body = { error: String(error) };
    }
    const ms = Date.now() - t0;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const text = body?.text ?? '';
    const pass =
      status === 200 &&
      (expected === 'EMPTY'
        ? body.empty === true && text === ''
        : body.empty === false && expected.every((re) => re.test(text)));
    const audioSeconds = (audio.length - 44) / 32_000;
    results.push({
      run,
      file,
      pass,
      status,
      text,
      empty: body?.empty,
      provider: body?.metadata?.provider,
      model: body?.metadata?.model,
      providerMs: body?.metadata?.durationMs,
      usage: body?.metadata?.usage,
      roundTripMs: ms,
      audioSeconds: Number(audioSeconds.toFixed(2)),
      bytes: audio.length,
      // Informational: the deterministic fallback interpreter recognises capitalised surnames.
      ...(/Ferri|Esposito/i.test(text)
        ? { surnameCapitalized: /\b(Ferri|Esposito)\b/.test(text) }
        : {}),
    });
    console.log(
      `${pass ? 'PASS' : 'FAIL'}  ${file.padEnd(22)} ${String(ms).padStart(5)} ms  «${text}»`,
    );
  }
}

const latencies = results.map((r) => r.roundTripMs).sort((a, b) => a - b);
const pct = (p) =>
  latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))];
const summary = {
  at: new Date().toISOString(),
  runtime: base.replace(/\/\/[^/]*@/, '//'),
  model: results[0]?.model,
  passed: results.filter((r) => r.pass).length,
  total: results.length,
  latencyMs: { p50: pct(50), p90: pct(90), max: latencies.at(-1) },
  audioSecondsTotal: Number(results.reduce((n, r) => n + r.audioSeconds, 0).toFixed(1)),
  tokens: {
    input: results.reduce((n, r) => n + (r.usage?.inputTokens ?? 0), 0),
    output: results.reduce((n, r) => n + (r.usage?.outputTokens ?? 0), 0),
  },
  results,
};
const out = opt('--out');
if (out) writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  `\n${summary.passed}/${summary.total} PASS  p50=${summary.latencyMs.p50}ms p90=${summary.latencyMs.p90}ms`,
);
process.exit(summary.passed === summary.total ? 0 : 1);
