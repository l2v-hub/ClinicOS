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

