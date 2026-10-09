import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startPo05Postgres } from '../../../tests/fixtures/po05-postgres.mjs';

const out = resolve(process.argv[2] || 'artifacts/task-validation/424-reading-action/root-initial/db');
await mkdir(out, { recursive: true });
if (process.platform === 'win32' && !process.env.PO05_PG_BIN) process.env.PO05_PG_BIN = 'C:/Users/Claudio/AppData/Local/Temp/claude/C--Workspace-ClinicOSHouse/8f38df7f-f662-4544-a826-be262b0e6cf2/scratchpad/pg/node_modules/@embedded-postgres/windows-x64/native/bin';
const pg = await startPo05Postgres({ artifactRoot: resolve(tmpdir(), 'clinicos-bug424-synthetic'), repositoryRoot: process.cwd() });
const env = { ...process.env, DATABASE_URL: pg.url, NODE_ENV: 'test', AUTH_MODE: 'demo', ROLE_SIMULATOR_ENABLED: 'true', AI_MOCK_MODE: 'true' };
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'RESIDENT_SCOPE_CONFIG']) delete env[key];
let status;
try {
  await writeFile(resolve(out, 'migrations.json'), JSON.stringify(pg.applied, null, 2));
  const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1',
    'backend/src/patients/__tests__/diary-reading-db.test.ts',
    'backend/src/patients/__tests__/diary-unread-queue-db.test.ts'], { cwd: process.cwd(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { log += chunk; process.stdout.write(chunk); });
  status = await new Promise((ok, fail) => { child.on('error', fail); child.on('close', code => ok(code ?? 1)); });
  await writeFile(resolve(out, 'tests.log'), log);
  await writeFile(resolve(out, 'result.json'), JSON.stringify({ synthetic: true, realPostgres: true, status, migrations: pg.applied.length }, null, 2));
} finally { await pg.close(); }
process.exitCode = status;
