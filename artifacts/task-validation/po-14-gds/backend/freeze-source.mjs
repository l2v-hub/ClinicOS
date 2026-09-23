import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root=await realpath(process.cwd());
const artifact=resolve(root,'artifacts/task-validation/po-14-gds/backend');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,encoding:'utf8'}).trim();
const split=text=>text.split(/\r?\n/).filter(Boolean);
const entries=async names=>Promise.all([...new Set(names)].sort().map(async path=>{const bytes=await readFile(resolve(root,path));return {path,bytes:bytes.length,sha256:sha(bytes)};}));
const tree=rows=>sha(rows.map(row=>`${row.path}\0${row.sha256}\n`).join(''));
const json=async name=>JSON.parse(await readFile(resolve(artifact,name),'utf8'));
const session=await json('implementation-session.json');
assert.equal(git('rev-parse','HEAD'),session.baseline);
assert.equal(git('branch','--show-current'),session.branch);
const inputs=await entries(split(git('ls-files','--cached','--others','--exclude-standard','--',
 'backend/src','prisma','backend/tsconfig.json','backend/package.json','package.json','package-lock.json','prisma.config.ts','tests/fixtures/po05-postgres.mjs')));
const inputTreeSha256=tree(inputs), tests=await json('gds15-focused-tests.json'), checks=await json('validation-checks.json');
assert.equal(tests.sourceTreeSha256,inputTreeSha256);
assert.equal(checks.sourceTreeSha256,inputTreeSha256);
assert(tests.sourceUnchanged && tests.databaseClosed && tests.results.every(row=>row.exitCode===0) && checks.results.every(row=>row.exitCode===0));
for(const row of session.preserved) assert.equal(sha(await readFile(resolve(root,row.path))),row.sha256,row.path);
const sourcePaths=await entries([...split(git('diff','HEAD','--name-only','--','backend/src','prisma')),
 ...split(git('ls-files','--others','--exclude-standard','--','backend/src','prisma'))]);
const sourceTreeSha256=tree(sourcePaths);
const manifest={task:'PO-14-backend',root,branch:session.branch,baseline:session.baseline,capturedAt:checks.completedAt,
 sourceTreeSha256,inputTreeSha256,hashAlgorithm:'SHA256 over sorted path + NUL + byte-SHA256 + LF',sourcePaths,
 excludedUnrelatedDirtyPaths:['run-claude-queue.ps1','start-claude-team.ps1']};
await writeFile(resolve(artifact,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({sourceFrozen:true,files:sourcePaths.length,sourceManifestSha256:sha(await readFile(resolve(artifact,'source-manifest.json'))),sourceTreeSha256,inputTreeSha256}));
