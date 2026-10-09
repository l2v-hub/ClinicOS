import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { syntheticPostgres } from './qa-postgres.mjs';

const out = resolve(process.argv[2] || 'artifacts/task-validation/414-draft-status/root-initial/db');
await mkdir(out, { recursive: true });
const pg = await syntheticPostgres();
const env = { ...process.env, DATABASE_URL: pg.url, NODE_ENV: 'test', AUTH_MODE: 'demo', ROLE_SIMULATOR_ENABLED: 'true', AI_MOCK_MODE: 'true' };
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'RESIDENT_SCOPE_CONFIG']) delete env[key];
let status;
try {
  await writeFile(resolve(out, 'migrations.json'), JSON.stringify(pg.applied, null, 2));
  const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1',
    'backend/src/assessments/__tests__/service-db.test.ts'], { cwd: process.cwd(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { log += chunk; process.stdout.write(chunk); });
  status = await new Promise((ok, fail) => { child.on('error', fail); child.on('close', code => ok(code ?? 1)); });
  await writeFile(resolve(out, 'tests.log'), log);
  await writeFile(resolve(out, 'result.json'), JSON.stringify({ synthetic: true, realPostgres: true, status, migrations: pg.applied.length }, null, 2));
} finally { await pg.close(); }
process.exitCode = status;
