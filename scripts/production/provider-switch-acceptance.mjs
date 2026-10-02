#!/usr/bin/env node
// Phase 9 — PROVIDER SWITCH ACCEPTANCE TEST (Prompt 9 §36) with real processes.
//
//   1. AI runtime started with AI_PROVIDER=openai (real OpenAI adapter + official SDK against a local
//      OpenAI-compatible stub — no key, no cost) and the real backend pointing at it;
//   2. representative workflows through the BACKEND API: read skill, structured command → preview,
//      skill confirmation (DB write), Assistant query (planner/composer path), voice transcription;
//   3. runtime stopped; ONLY its provider configuration changed to AI_PROVIDER=test; restarted;
//   4. the same workflows again — the backend process is never restarted, no file is touched.
// PASS only if every workflow succeeds both times and the metrics show the provider changed.
//
//   node scripts/production/provider-switch-acceptance.mjs --db <local url> --python <venv python> --out <dir>
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const DB = arg('db');
const PYTHON = arg('python', 'python');
const OUT = arg('out', '');
if (!DB || !/127\.0\.0\.1/.test(DB)) throw new Error('--db must be a LOCAL disposable database');
const RT_PORT = 8812;
const STUB_PORT = 8811;
const API_PORT = 3499;
const API = `http://127.0.0.1:${API_PORT}`;
const TOKEN = 'p9-switch-service-token-0123456789';
const METRICS = 'p9-switch-metrics-token-0123456789abc';
const runtimeDir = new URL('../../clinicos-ai-runtime/', import.meta.url);
const backendDir = new URL('../../backend/', import.meta.url);

// Provider configuration = the ONLY thing that differs between the two runs.
const OPENAI_TARGET = {
  // Phase 9B Railway target (RAILWAY_OPENAI_CONFIGURATION.md); key = placeholder, base URL = stub.
  AI_ENABLED: 'true',
  AI_PROVIDER: 'openai',
  OPENAI_API_KEY: 'sk-switch-test-not-real',
  OPENAI_BASE_URL: `http://127.0.0.1:${STUB_PORT}/v1`,
  AI_MODEL_DEFAULT: 'gpt-5.6-luna',
  AI_MODEL_FAST: 'gpt-5.6-luna',
  AI_MODEL_COMMAND_PARSER: 'gpt-5.6-luna',
  AI_MODEL_SUMMARY: 'gpt-5.6-luna',
  AI_MODEL_REASONING: 'gpt-5.6-sol',
  STT_PROVIDER: 'openai',
  STT_MODEL: 'gpt-transcribe',
  STT_REALTIME_ENABLED: 'false',
  STT_REALTIME_MODEL: 'gpt-live-transcribe',
  AI_FALLBACK_ENABLED: 'false',
};
const PROVIDER_CONFIG = {
  openai: OPENAI_TARGET,
  test: {
    AI_PROVIDER: 'test',
    AI_MODEL_DEFAULT: 'deterministic',
    STT_PROVIDER: 'test',
    STT_MODEL: 'deterministic',
  },
  // STT switch only: LLM stays on OpenAI, voice moves to the test STT provider.
  sttTest: { ...OPENAI_TARGET, STT_PROVIDER: 'test', STT_MODEL: 'deterministic' },
  // Runtime-side master switch (the backend still points at the runtime).
  aiOff: { ...OPENAI_TARGET, AI_ENABLED: 'false' },
};
const RUNTIME_BASE = {
  PORT: String(RT_PORT),
  AI_RUNTIME_SERVICE_TOKEN: TOKEN,
  AI_OCR_PROVIDER: 'mock',
  AI_OCR_MODEL: 'mock',
  PYTHONIOENCODING: 'utf-8',
};

const children = [];
function start(cmd, args, opts) {
  const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'ignore', 'ignore'] });
  children.push(child);
  return child;
}
function kill(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  } else child.kill('SIGKILL');
}
async function waitFor(url, ms = 60_000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not yet */
    }
    await sleep(500);
  }
  throw new Error(`timeout waiting for ${url}`);
}

const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([k]) => !/^(AI_|OPENAI_|AZURE_|GOOGLE_|GEMINI_|STT_|AGNOS_)/.test(k),
  ),
);
const startRuntime = (provider) =>
  start(PYTHON, ['-m', 'clinicos_ai.main'], {
    cwd: runtimeDir,
    env: { ...cleanEnv, ...RUNTIME_BASE, ...PROVIDER_CONFIG[provider] },
  });

const results = [];
const check = (run, id, ok, detail = '') => {
  results.push({ run, id, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${run}] ${id} ${detail}`);
};

const stub = start(PYTHON, ['-m', 'tools.openai_stub_server', '--port', String(STUB_PORT)], {
  cwd: runtimeDir,
  env: cleanEnv,
});
let runtime = startRuntime('openai');
await waitFor(`http://127.0.0.1:${RT_PORT}/v1/runtime/health`);
const backend = start(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
  cwd: backendDir,
  env: {
    ...cleanEnv,
    PORT: String(API_PORT),
    NODE_ENV: 'development',
    DATABASE_URL: DB,
    AUTH_MODE: 'demo',
    ROLE_SIMULATOR_ENABLED: 'true',
    AI_RUNTIME_URL: `http://127.0.0.1:${RT_PORT}`,
    AI_RUNTIME_SERVICE_TOKEN: TOKEN,
    AI_ASSISTANT_LLM_ENABLED: 'true',
    AI_ASSISTANT_PLAN_ENABLED: 'true',
    AI_ASSISTANT_COMPOSE_ENABLED: 'true',
    VOICE_CHANNEL_ENABLED: 'true',
    METRICS_TOKEN: METRICS,
    AI_WORKER_INLINE: 'false',
    AI_RATE_LIMIT_PER_MIN: '600',
  },
});
await waitFor(`${API}/health`);

const db = new pg.Client({ connectionString: DB });
await db.connect();
const session = await (
  await fetch(`${API}/auth/simulator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityId: 'SIM-NURSE-1' }),
  })
).json();
const headers = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
const resident = (
  await db.query(
    `SELECT id FROM "Patient" WHERE "registeredById" = 'SIM-NURSE-1' ORDER BY "createdAt" LIMIT 1`,
  )
).rows[0]?.id;
if (!resident) throw new Error('seed missing: no resident for SIM-NURSE-1');
const readings = async () =>
  Number(
    (
      await db.query('SELECT count(*) FROM "PatientParameterReading" WHERE "patientId" = $1', [
        resident,
      ])
    ).rows[0].count,
  );
const post = async (path, body) => {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const wav = readFileSync(new URL('../voice/fixtures/vitals-120-80.wav', import.meta.url));

async function workflows(run) {
  const context = { currentPatientId: resident };
  const read = await post('/skills/converse', {
    message: 'mostrami gli ultimi parametri di questo ospite',
    context,
  });
  check(
    run,
    'read_skill',
    read.status === 200 && read.body?.interpreter === 'agno',
    `${read.status} ${read.body?.skillId} ${read.body?.status} ${read.body?.interpreter}`,
  );
  const before = await readings();
  const cmd = await post('/skills/converse', {
    message: 'registra pressione 120/80 a questo ospite',
    context,
  });
  check(
    run,
    'structured_command',
    cmd.body?.status === 'NEEDS_CONFIRMATION' &&
      cmd.body?.interpreter === 'agno' &&
      JSON.stringify(cmd.body?.preview ?? {}).includes('120'),
    `${cmd.body?.status} ${cmd.body?.interpreter}`,
  );
  const done = await post('/skills/converse', {
    workflowId: cmd.body?.workflowId,
    action: 'confirm',
    previewId: cmd.body?.preview?.previewId,
    context,
  });
  check(
    run,
    'skill_commit_once',
    done.body?.status === 'COMPLETED' && (await readings()) === before + 1,
    done.body?.status,
  );
  const q = await post('/ai/assistant/query', {
    question: 'quali allergie ha questo ospite?',
    currentPatientId: resident,
  });
  check(run, 'assistant_query', q.status === 200, String(q.status));
  const voice = await fetch(`${API}/skills/voice/transcribe?locale=it-IT`, {
    method: 'POST',
    headers: { Authorization: headers.Authorization, 'Content-Type': 'audio/wav' },
    body: wav,
  });
  const v = await voice.json().catch(() => null);
  check(
    run,
    'voice_transcribe',
    voice.status === 200 && /120/.test(v?.transcript?.text ?? v?.text ?? ''),
    `${voice.status} ${JSON.stringify(v)?.slice(0, 80)}`,
  );
  const metrics = await (
    await fetch(`${API}/metrics`, { headers: { Authorization: `Bearer ${METRICS}` } })
  ).text();
  return metrics;
}

let failed = false;
const stubRequests = async () =>
  (await fetch(`http://127.0.0.1:${STUB_PORT}/__requests`)).json().catch(() => []);
async function restartRuntime(config) {
  kill(runtime);
  await sleep(1000);
  runtime = startRuntime(config);
  await waitFor(`http://127.0.0.1:${RT_PORT}/v1/runtime/health`);
}
try {
  const m1 = await workflows('openai');
  check('openai', 'metrics_provider', /clinicos_ai_calls_total\{[^}]*provider="openai"/.test(m1));
  const wire = await stubRequests();
  const used = new Set(wire.map((r) => `${r.purpose}:${r.model}`));
  check(
    'openai',
    'command_parser_uses_luna',
    used.has('skill_route:gpt-5.6-luna'),
    [...used].join(' '),
  );
  check('openai', 'stt_uses_gpt_transcribe', used.has('stt:gpt-transcribe'));
  check('openai', 'no_reasoning_model_for_parsing', !used.has('skill_route:gpt-5.6-sol'));
  check(
    'openai',
    'key_only_server_side',
    wire.every((r) => r.auth === 'Bearer sk-switch-test-not-real'),
  );
  // ── switch: stop ONLY the runtime, change ONLY its provider configuration, restart ──
  await restartRuntime('test');
  const before = (await stubRequests()).length;
  const m2 = await workflows('test');
  check('test', 'metrics_provider', /clinicos_ai_calls_total\{[^}]*provider="test"/.test(m2));
  check('test', 'no_openai_traffic', (await stubRequests()).length === before);
  // ── back to OpenAI ──
  await restartRuntime('openai');
  await workflows('openai-again');
  // ── STT switch only ──
  await restartRuntime('sttTest');
  const beforeStt = (await stubRequests()).filter((r) => r.purpose === 'stt').length;
  await workflows('stt-test');
  check(
    'stt-test',
    'stt_not_sent_to_openai',
    (await stubRequests()).filter((r) => r.purpose === 'stt').length === beforeStt,
  );
  // ── runtime AI_ENABLED=false: no provider call, backend degrades, GUI/API keep working ──
  await restartRuntime('aiOff');
  const beforeOff = (await stubRequests()).length;
  const context = { currentPatientId: resident };
  const off = await post('/skills/converse', {
    message: 'mostrami gli ultimi parametri di questo ospite',
    context,
  });
  check(
    'ai-off',
    'assistant_still_answers',
    off.status === 200 && off.body?.interpreter === 'deterministic',
    `${off.status} ${off.body?.interpreter}`,
  );
  const page = await fetch(`${API}/patients/page?limit=5`, { headers });
  check('ai-off', 'classic_api_works', page.status === 200, String(page.status));
  check('ai-off', 'zero_provider_calls', (await stubRequests()).length === beforeOff);
  const changed = Object.keys({ ...PROVIDER_CONFIG.openai, ...PROVIDER_CONFIG.test }).sort();
  check(
    'switch',
    'only_provider_config_changed',
    changed.every((k) => /^(AI_PROVIDER|AI_MODEL_|AI_ENABLED|AI_FALLBACK_|OPENAI_|STT_)/.test(k)),
    changed.join(','),
  );
} catch (error) {
  failed = true;
  console.error('switch test error:', error.message);
} finally {
  await db.end().catch(() => {});
  for (const child of children.reverse()) kill(child);
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} provider-switch checks passed`);
if (OUT) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    `${OUT}/provider-switch-acceptance.json`,
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  );
}
process.exit(failed || bad ? 1 : 0);
