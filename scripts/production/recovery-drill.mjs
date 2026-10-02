#!/usr/bin/env node
// Phase 9 — failure / recovery drill against REAL processes (local, synthetic data only).
//
//   R1 backend restart mid-workflow   prepare a write → kill the backend → restart → confirm:
//                                     no write, clear non-success answer, new workflow works.
//   R2 lost response after write      confirm, drop the answer, retry the same confirmation:
//                                     exactly one row.
//   R3 AI outage                      runtime stub down/500 → Assistant still answers
//                                     (deterministic), classic GUI unaffected, no write.
//   R4 database outage                stop Postgres → /health 200, /ready 503, API fails closed
//                                     with a generic body → start Postgres → recovers without a
//                                     backend restart.
//
// Usage (see PRODUCTION_RUNBOOK.md §Drills):
//   node scripts/production/recovery-drill.mjs --port 3299 --db <url> --pg-ctl <pg_ctl> \
//        --pg-data <dir> --stub http://127.0.0.1:8799 --out <dir>
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const port = Number(arg('port', 3299));
const dbUrl = arg('db');
const pgCtl = arg('pg-ctl');
const pgData = arg('pg-data');
const stub = arg('stub', 'http://127.0.0.1:8799');
const out = arg('out', '');
const base = `http://127.0.0.1:${port}`;
if (!dbUrl || !/127\.0\.0\.1/.test(dbUrl))
  throw new Error('--db must be a LOCAL disposable database');

const env = {
  ...process.env,
  PORT: String(port),
  NODE_ENV: 'development',
  DATABASE_URL: dbUrl,
  AUTH_MODE: 'demo',
  ROLE_SIMULATOR_ENABLED: 'true',
  // Fixed secret: sessions survive a restart, so R1 tests the workflow store, not the token.
  ROLE_SIMULATOR_SECRET: 'p9-recovery-simulator-secret-0123456789abcdef01234567',
  AI_RUNTIME_URL: stub,
  AI_RUNTIME_SERVICE_TOKEN: 'p9-stub-token-0123456789abcdef',
  SKILLS_AGNO_TIMEOUT_MS: '2000',
  AI_PROVIDER: 'mock',
  AI_WORKER_INLINE: 'false',
};

const results = [];
const check = (id, ok, detail) => {
  results.push({ id, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail ?? ''}`);
};

let backend = null;
async function startBackend() {
  backend = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    cwd: new URL('../../backend/', import.meta.url),
    env,
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch {
      /* not yet */
    }
    await sleep(500);
  }
  throw new Error('backend did not start');
}
function killBackend() {
  // Hard kill = crash/redeploy without a graceful drain (worst case).
  if (process.platform === 'win32')
    execFileSync('taskkill', ['/PID', String(backend.pid), '/T', '/F']);
  else backend.kill('SIGKILL');
}

async function api(token, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* text */
  }
  return { status: response.status, body: parsed };
}
const stubMode = (mode) =>
  fetch(`${stub}/__mode`, { method: 'POST', body: JSON.stringify({ mode }) });

const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
const countReadings = async (patientId) =>
  Number(
    (
      await db.query('SELECT count(*) FROM "PatientParameterReading" WHERE "patientId" = $1', [
        patientId,
      ])
    ).rows[0].count,
  );

await startBackend();
const session = await api(null, 'POST', '/auth/simulator/session', { identityId: 'SIM-NURSE-1' });
const token = session.body.token;
const residentRow = await db.query(
  `INSERT INTO "Patient" (id, "medicalRecordNumber", "firstName", "lastName", "dateOfBirth", sex, "registeredById", "createdAt", "updatedAt")
   VALUES ($1, $2, 'Recupero', 'Sintetico', '1940-01-01', 'F', 'SIM-NURSE-1', now(), now()) RETURNING id`,
  [`p9rec-${Date.now()}`, `MRN-P9REC-${Date.now()}`],
);
const resident = residentRow.rows[0].id;
const prepare = (value) =>
  api(token, 'POST', '/skills/converse', {
    message: `registra pressione ${value} a questo ospite`,
    context: { currentPatientId: resident },
  });
const confirm = (r) =>
  api(token, 'POST', '/skills/converse', {
    workflowId: r.body.workflowId,
    action: 'confirm',
    previewId: r.body.preview.previewId,
    context: { currentPatientId: resident },
  });

// R1 — restart mid-workflow
{
  const before = await countReadings(resident);
  const prepared = await prepare('121/81');
  check('R1.prepared', prepared.body?.status === 'NEEDS_CONFIRMATION', prepared.body?.status);
  killBackend();
  await startBackend();
  const after = await confirm(prepared);
  check(
    'R1.no_false_success',
    after.body?.status !== 'COMPLETED' && after.status < 500,
    `${after.status} ${after.body?.status}`,
  );
  check('R1.no_write', (await countReadings(resident)) === before, 'row count unchanged');
  const again = await prepare('122/82');
  const done = await confirm(again);
  check('R1.new_workflow_ok', done.body?.status === 'COMPLETED', done.body?.status);
  check('R1.one_write', (await countReadings(resident)) === before + 1);
}

// R2 — lost response after write: the client retries the same confirmation
{
  const before = await countReadings(resident);
  const prepared = await prepare('123/83');
  await confirm(prepared); // answer "lost"
  const retry = await confirm(prepared);
  check(
    'R2.retry_safe',
    retry.status < 500 && retry.body?.status !== 'FAILED',
    `${retry.status} ${retry.body?.status}`,
  );
  check('R2.exactly_one', (await countReadings(resident)) === before + 1);
}

// R3 — AI outage
for (const mode of ['down', '500']) {
  await stubMode(mode);
  const before = await countReadings(resident);
  const turn = await api(token, 'POST', '/skills/converse', {
    message: 'mostra i parametri vitali di questo ospite',
    context: { currentPatientId: resident },
  });
  check(
    `R3.${mode}.assistant_answers`,
    turn.status === 200 && turn.body?.interpreter === 'deterministic',
    `${turn.status} ${turn.body?.interpreter}`,
  );
  const gui = await api(token, 'GET', `/patients/${resident}`);
  check(`R3.${mode}.classic_gui`, gui.status === 200, String(gui.status));
  check(`R3.${mode}.no_write`, (await countReadings(resident)) === before);
}
await stubMode('ok');

// R4 — database outage and recovery without a backend restart
if (pgCtl && pgData) {
  await db.end();
  execFileSync(pgCtl, ['stop', '-D', pgData, '-m', 'fast'], { stdio: 'ignore' });
  const health = await fetch(`${base}/health`);
  check('R4.liveness_up', health.status === 200, String(health.status));
  const ready = await api(null, 'GET', '/ready');
  check(
    'R4.not_ready',
    ready.status === 503 && ready.body?.checks?.database === 'fail',
    JSON.stringify(ready.body?.checks),
  );
  const list = await api(token, 'GET', '/patients/page?limit=5');
  const text = JSON.stringify(list.body);
  check(
    'R4.fails_closed',
    list.status >= 500 && !/ECONNREFUSED|postgres|5434\d|stack/i.test(text),
    `${list.status} ${text.slice(0, 80)}`,
  );
  const turn = await api(token, 'POST', '/skills/converse', { message: 'ciao' });
  check(
    'R4.assistant_no_false_success',
    turn.body?.status !== 'COMPLETED',
    `${turn.status} ${turn.body?.status ?? ''}`,
  );
  execFileSync(pgCtl, ['start', '-D', pgData, '-w', '-o', `-p ${new URL(dbUrl).port}`], {
    stdio: 'ignore',
  });
  let recovered = false;
  for (let i = 0; i < 30 && !recovered; i++) {
    recovered = (await api(null, 'GET', '/ready')).status === 200;
    if (!recovered) await sleep(1000);
  }
  check('R4.ready_again', recovered);
  const listAgain = await api(token, 'GET', '/patients/page?limit=5');
  check('R4.api_recovered', listAgain.status === 200, String(listAgain.status));
} else {
  check('R4.skipped', true, 'no --pg-ctl/--pg-data');
}

killBackend();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} recovery checks passed`);
if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(
    `${out}/recovery-drill.json`,
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  );
}
process.exit(failed ? 1 : 0);
