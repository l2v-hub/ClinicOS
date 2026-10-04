// New cluster + real HTTP only; never use an inherited DATABASE_URL.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { startPo05Postgres } from '../fixtures/po05-postgres.mjs';
const root = path.resolve('.');
const out = path.resolve(
  process.env.UX_EVIDENCE_DIR ||
    'artifacts/task-validation/conferma-condivisa-concorrente-diario-e-consegne',
);
mkdirSync(path.join(out, 'test-results'), { recursive: true });
const cluster = await startPo05Postgres({
  artifactRoot: path.join(out, 'scratch'),
  repositoryRoot: root,
});
if (new URL(cluster.url).hostname !== '127.0.0.1')
  throw new Error('Only synthetic local database allowed');
try {
  const env = {
    ...process.env,
    DATABASE_URL: cluster.url,
    NODE_ENV: 'test',
    AUTH_MODE: 'demo',
    ROLE_SIMULATOR_ENABLED: 'true',
    SKILLS_INTERPRETER: 'deterministic',
    AI_RUNTIME_URL: 'http://127.0.0.1:1',
    PROACTIVE_BRIEFING_COOLDOWN_S: '0',
    UX_EVIDENCE_DIR: out,
  };
  const suites = [
    'src/patients/__tests__/diary-ack-db.test.ts',
    'src/consegne/__tests__/consegna-ack-db.test.ts',
    'src/patients/__tests__/urgency-ack-concurrency-db.test.ts',
  ];
  if (process.argv.includes('--concurrency-only')) suites.splice(0, 2);
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', '--test', '--test-concurrency=1', ...suites],
    { cwd: path.join(root, 'backend'), env, windowsHide: true },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  writeFileSync(path.join(out, 'test-results', 'db-tests.txt'), output);
  writeFileSync(
    path.join(out, 'test-results', 'db-result.json'),
    JSON.stringify({ code, syntheticDatabase: true, migrations: cluster.applied, suites }, null, 2),
  );
  console.log(
    output
      .split(/\r?\n/)
      .filter((line) => /^ℹ (tests|pass|fail|duration)|^✖ |^not ok/.test(line))
      .join('\n'),
  );
  process.exitCode = code ?? 1;
} finally {
  await cluster.close();
}
