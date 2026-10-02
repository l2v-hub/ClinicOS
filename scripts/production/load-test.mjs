#!/usr/bin/env node
// Phase 9 — non-destructive load baseline against a LOCAL backend (synthetic DB, AI runtime stub).
// Mixed roles through the Role Simulator: classic GUI reads, Copilot home, proactive inbox and
// Assistant read turns (skill route on the stub). Writes are NOT exercised here — the concurrency
// and recovery suites cover them. Reports throughput, p50/p95/p99 and error rate per scenario plus
// the backend's own /metrics (AI vs app latency, RSS).
//
//   node scripts/production/load-test.mjs --base http://127.0.0.1:3199 --duration 60 \
//        --concurrency 20 --metrics-token <METRICS_TOKEN> --out <dir>
import { mkdirSync, writeFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg('base', 'http://127.0.0.1:3199');
const durationS = Number(arg('duration', 60));
const concurrency = Number(arg('concurrency', 20));
const metricsToken = arg('metrics-token', process.env.METRICS_TOKEN || '');
const out = arg('out', '');
const assistantWeight = Number(arg('assistant-weight', 15));

const ROLES = ['SIM-OSS-1', 'SIM-NURSE-1', 'SIM-DOCTOR-1', 'SIM-SUPERVISOR-1'];

async function login(identityId) {
  const response = await fetch(`${base}/auth/simulator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityId }),
  });
  if (response.status !== 201) throw new Error(`login ${identityId}: ${response.status}`);
  return (await response.json()).token;
}

const sessions = {};
for (const id of ROLES) sessions[id] = await login(id);
const headersFor = (id) => ({
  Authorization: `Bearer ${sessions[id]}`,
  'Content-Type': 'application/json',
});

// Residents each role can see (classic list), used for detail reads and Assistant context.
const residents = {};
for (const id of ROLES) {
  const response = await fetch(`${base}/patients/page?limit=50`, { headers: headersFor(id) });
  const body = await response.json().catch(() => ({}));
  const rows = body.items ?? body.patients ?? body.data ?? [];
  residents[id] = rows.map((p) => p.id).filter(Boolean);
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const SCENARIOS = [
  { name: 'gui.patients_page', weight: 30, run: () => ['GET', '/patients/page?limit=25'] },
  {
    name: 'gui.patient_detail',
    weight: 20,
    run: (id) =>
      residents[id].length
        ? ['GET', `/patients/${pick(residents[id])}`]
        : ['GET', '/patients/page?limit=5'],
  },
  { name: 'gui.auth_me', weight: 10, run: () => ['GET', '/auth/me'] },
  { name: 'copilot.home', weight: 12, run: () => ['GET', '/skills/copilot/home'] },
  { name: 'proactive.inbox', weight: 13, run: () => ['GET', '/skills/proactive/inbox'] },
  {
    name: 'assistant.read_turn',
    weight: assistantWeight,
    run: (id) => [
      'POST',
      '/skills/converse',
      {
        message: 'mostra i parametri vitali di questo ospite',
        context: residents[id].length ? { currentPatientId: pick(residents[id]) } : {},
      },
    ],
  },
].filter((scenario) => scenario.weight > 0);
const totalWeight = SCENARIOS.reduce((sum, scenario) => sum + scenario.weight, 0);
function chooseScenario() {
  let r = Math.random() * totalWeight;
  for (const scenario of SCENARIOS) if ((r -= scenario.weight) <= 0) return scenario;
  return SCENARIOS[0];
}

const samples = {};
const errors = {};
const statuses = {};
const deadline = Date.now() + durationS * 1000;

async function worker(n) {
  const id = ROLES[n % ROLES.length];
  while (Date.now() < deadline) {
    const scenario = chooseScenario();
    const [method, path, body] = scenario.run(id);
    const t0 = performance.now();
    let status = 0;
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: headersFor(id),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      status = response.status;
      await response.arrayBuffer();
    } catch {
      status = -1;
    }
    const ms = performance.now() - t0;
    (samples[scenario.name] ??= []).push(ms);
    const key = `${scenario.name} ${status}`;
    statuses[key] = (statuses[key] ?? 0) + 1;
    if (status < 200 || status >= 400) errors[scenario.name] = (errors[scenario.name] ?? 0) + 1;
  }
}

const started = Date.now();
await Promise.all(Array.from({ length: concurrency }, (_, n) => worker(n)));
const elapsed = (Date.now() - started) / 1000;

const pct = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
const round = (n) => Math.round(n * 10) / 10;
const report = { base, durationS: elapsed, concurrency, scenarios: {}, statuses };
let all = [];
for (const [name, list] of Object.entries(samples)) {
  const sorted = [...list].sort((a, b) => a - b);
  all = all.concat(list);
  report.scenarios[name] = {
    requests: list.length,
    rps: round(list.length / elapsed),
    p50: round(pct(sorted, 50)),
    p95: round(pct(sorted, 95)),
    p99: round(pct(sorted, 99)),
    max: round(sorted.at(-1)),
    errorRatePct: round(((errors[name] ?? 0) / list.length) * 100),
  };
}
const allSorted = all.sort((a, b) => a - b);
const totalErrors = Object.values(errors).reduce((a, b) => a + b, 0);
report.total = {
  requests: all.length,
  rps: round(all.length / elapsed),
  p50: round(pct(allSorted, 50)),
  p95: round(pct(allSorted, 95)),
  p99: round(pct(allSorted, 99)),
  errorRatePct: round((totalErrors / all.length) * 100),
};
if (metricsToken) {
  const response = await fetch(`${base}/metrics`, {
    headers: { Authorization: `Bearer ${metricsToken}` },
  });
  report.metrics = await response.text();
}
console.log(JSON.stringify({ ...report, metrics: undefined }, null, 2));
if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/load-report-c${concurrency}.json`, JSON.stringify(report, null, 2));
  if (report.metrics) writeFileSync(`${out}/metrics-after-c${concurrency}.txt`, report.metrics);
}
