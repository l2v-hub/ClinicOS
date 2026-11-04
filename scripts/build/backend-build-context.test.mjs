import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const expected=['artifacts/','docs/qa/','mockup/','design_handoff_restyle/','.git/','.swarm/','.claude-flow/','**/node_modules','frontend/dist/','backend/dist/'];
test('Railpack source-copy policy excludes QA archives without deleting or negating them',async()=>{
 const patterns=(await readFile(root+'.dockerignore','utf8')).split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
 assert.deepEqual(patterns,expected,'Keep this intentionally small policy explicit; assess new exclusions before extending');
 assert.ok(patterns.includes('artifacts/'));
 assert.equal(patterns.some(s=>s.startsWith('!')),false);
 // Structural regression, not a reimplementation of BuildKit glob semantics.
 const failingPath='artifacts/task-validation/bug-batch-432/history/accepted-qa3-runtime/files/evidence/issue-432-import-trace.zip';
 assert.ok(failingPath.startsWith(patterns[0]));
 assert.equal((JSON.parse(await readFile(root+'railway.json','utf8'))).build.builder,'RAILPACK');
});

test('backend build source, migrations, locks and packaged PDF fonts stay in the context',async()=>{
 const patterns=(await readFile(root+'.dockerignore','utf8')).split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
 const required=['package.json','package-lock.json','backend/package.json','frontend/package.json','backend/src/server.ts','backend/tsconfig.json','prisma/schema.prisma','prisma/migrations/migration_lock.toml','prisma.config.ts','scripts/build/copy-assessment-fonts.mjs','backend/src/assessments/fonts/NotoSans-Regular.ttf','backend/src/assessments/fonts/NotoSans-Bold.ttf','backend/src/assessments/fonts/OFL.txt'];
 for(const filename of required){
  await access(root+filename);
  for(const pattern of patterns.filter(s=>s.endsWith('/')))assert.equal(filename.startsWith(pattern),false,filename);
  assert.equal(filename.split('/').includes('node_modules'),false);
 }
 assert.ok(!patterns.includes('prisma/')&&!patterns.includes('backend/')&&!patterns.includes('scripts/'));
});

test('native Windows CI uses a bounded sparse fetch without weakening its tests or deadline',async()=>{
 const workflow=await readFile(root+'.github/workflows/bug-pipeline-tests.yml','utf8');
 const job=workflow.split(/^  windows-review-setup:\s*$/m)[1];
 assert.ok(job,'The real required Windows job must remain present');
 assert.match(job,/runs-on: windows-latest/);
 assert.match(job,/timeout-minutes: 10/,'Keep the existing deadline; fix source retrieval instead');
 assert.match(job,/actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/);
 assert.match(job,/persist-credentials: false/);
 const sparse=/sparse-checkout:\s*\|\r?\n((?: {12}[^\r\n]+\r?\n)+)/.exec(job);
 assert.ok(sparse,'Sparse input makes the pinned checkout request blob:none instead of all proof blobs');
 assert.deepEqual(sparse[1].trim().split(/\r?\n/).map(x=>x.trim()),['agent-team','scripts','.github']);
 assert.match(job,/sparse-checkout-cone-mode: true/,'Cone mode keeps tracked root manifests and bootstrap files');
 assert.match(job,/run: node --test agent-team\/tests\/bug-pipeline\/windows-review\.test\.mjs/);
 assert.equal(/continue-on-error:\s*true|if:\s*false|\.skip\(/.test(job),false);
 await access(root+'agent-team/tests/bug-pipeline/windows-review.test.mjs');
 // The Linux required check must still explicitly reject any non-success Windows result.
 assert.match(workflow,/needs: windows-review-setup/);
 assert.match(workflow,/WINDOWS_RESULT:/);
 assert.match(workflow,/WINDOWS_RESULT.*success/);
});
