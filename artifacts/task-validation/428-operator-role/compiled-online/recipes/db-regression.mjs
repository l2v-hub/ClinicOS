import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startPo05Postgres } from '../../../../../tests/fixtures/po05-postgres.mjs';
const out = resolve(process.argv[2]); assert.ok(process.argv[2]);
await mkdir(out, {recursive:true});
process.env.PO05_PG_BIN = 'C:/Users/Claudio/AppData/Local/Temp/claude/C--Workspace-ClinicOSHouse/8f38df7f-f662-4544-a826-be262b0e6cf2/scratchpad/pg/node_modules/@embedded-postgres/windows-x64/native/bin';
await access(resolve(process.env.PO05_PG_BIN, 'initdb.exe'));
await writeFile(resolve(out,'policy.md'), '# Decision: AUTHORIZED\nOnly new isolated PostgreSQL cluster under task-specific temporary directory, reviewed po05 fixture, ephemeral localhost port, synthetic fixtures. Inherited DATABASE_URL not used. Exact owned shutdown, no deletion, no production mutation. User authorized scoped tests.\n');
const pg=await startPo05Postgres({artifactRoot:resolve(tmpdir(),'clinicos-bug428-synthetic'),repositoryRoot:process.cwd()});
const env={...process.env,DATABASE_URL:pg.url,BUG428_SYNTHETIC_CLUSTER:pg.directory,NODE_ENV:'test',AUTH_MODE:'demo',ROLE_SIMULATOR_ENABLED:'true',AI_MOCK_MODE:'true'};
for(const key of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','ANTHROPIC_API_KEY','RESIDENT_SCOPE_CONFIG']) delete env[key];
let status;
try {
  await writeFile(resolve(out,'migrations.json'),JSON.stringify(pg.applied,null,2));
  const child=spawn(process.execPath,['--import','tsx','--test','--test-concurrency=1','backend/src/operators/__tests__/operator-role-db.test.ts'],{cwd:process.cwd(),env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let log=''; for(const stream of [child.stdout,child.stderr])stream.on('data',c=>{log+=c;});
  status=await new Promise((ok,fail)=>{child.on('error',fail);child.on('close',code=>ok(code??1));});
  await writeFile(resolve(out,'tests.log'),log);
  await writeFile(resolve(out,'result.json'),JSON.stringify({synthetic:true,realPostgres:true,status,migrations:pg.applied.length},null,2));
  console.log(`Synthetic real PostgreSQL: exit${status}, migrations${pg.applied.length}`);
}finally{await pg.close();}
process.exitCode=status;
