import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { gh } from 'file:///C:/w-therapy/artifacts/task-validation/therapy-completeness/github.mjs';
const dir = 'artifacts/task-validation/therapy-reconciliation-qa';
const src = 'C:/w-therapy/artifacts/task-validation/therapy-completeness';
const sha = '0c6a7e95c94accd6022b8ca44086cc574aa6bc84';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
assert.equal(execFileSync('git',['diff','HEAD','--','frontend','backend','prisma','package.json','package-lock.json'],{encoding:'utf8'}),'');
mkdirSync(dir+'/logs',{recursive:true});
for (const f of ['task-contract.md','surface.tsx','reconciliationSurface.tsx','reconciliation-fixture.mjs','reconciliation-check.mjs','serve.mjs','native.config.mjs']) {
  let s=readFileSync(src+'/'+f,'utf8').replaceAll('therapy-completeness','therapy-reconciliation-qa').replaceAll('7542','7543');
  if(f==='native.config.mjs') s=s.replace("testDir: './native-tests'", "testDir: './native-tests'");
  writeFileSync(dir+'/'+f,s);
}
cpSync(src+'/native-tests',dir+'/native-tests',{recursive:true});
writeFileSync(dir+'/native-tests/fixtures.mjs',readFileSync(dir+'/native-tests/fixtures.mjs','utf8').replaceAll('7542','7543'));
writeFileSync(dir+'/issue.json',JSON.stringify({issue:JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/issues/432'])),comments:JSON.parse(gh(['api','repos/l2v-hub/ClinicOS/issues/432/comments','--paginate']))},null,2));
const status=execFileSync('git',['status','--short'],{encoding:'utf8'});
writeFileSync(dir+'/source-receipt.json',JSON.stringify({sha,appDiffEmpty:true,initialStatus:status,preexistingScripts:['run-claude-queue.ps1','start-claude-team.ps1'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),policy:{mode:'independent-qa',allowed:['synthetic tests','own artifact folder','loopback 7543'],denied:['app edits','real DB','providers','auth','issue writes','commit','push','deploy']}},null,2));
console.log(JSON.stringify({sha,issue:432,contract:dir+'/task-contract.md',appDiffEmpty:true}));
