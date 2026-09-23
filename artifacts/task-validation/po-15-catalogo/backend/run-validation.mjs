import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
const root = await realpath(process.cwd());
const artifact = resolve(root, 'artifacts/task-validation/po-15-catalogo/backend');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(resolve(artifact, name), 'utf8'));
const capture = async () => {
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--',
    'backend/src', 'prisma', 'backend/tsconfig.json', 'backend/package.json', 'package.json',
    'package-lock.json', 'prisma.config.ts', 'tests/fixtures/po05-postgres.mjs'],
    { cwd: root, windowsHide: true, encoding: 'utf8' }).trim().split(/\r?\n/);
  const inputs = await Promise.all([...new Set(paths)].sort().map(async path => ({ path, sha256: digest(await readFile(resolve(root, path))) })));
  return digest(inputs.map(row => `${row.path}\0${row.sha256}\n`).join(''));
};
const sourceTreeSha256 = await capture();
assert.equal(sourceTreeSha256, (await json('catalog-test-source-manifest.json')).treeSha256);
const startedAt = new Date().toISOString();
const session = await json('implementation-session.json');
const preparation = await json('preparation-receipt.json');
for (const row of session.preserved) assert.equal(digest(await readFile(resolve(root,row.path))),row.sha256,row.path);
for (const runtime of [preparation.runtime.privateWrapper,preparation.runtime.privateGeneratedClient]) {
  const target = await realpath(runtime.target), child = relative(root,target);
  assert(!child.startsWith('..') && !isAbsolute(child));
  for (const row of runtime.files) assert.equal(digest(await readFile(resolve(target,row.path))),row.sha256,row.path);
}
const schema = await readFile(resolve(root,'prisma/schema.prisma'),'utf8');
const generated = await readFile(resolve(preparation.runtime.privateGeneratedClient.target,'schema.prisma'),'utf8');
const normalize = value => value.replace(/^\s*output\s*=.*$/m,'').replace(/\r\n/g,'\n').split('\n')
  .map(line=>line.trim().replace(/[ \t]+/g,' ')).filter(Boolean).join('\n')
  .replace('@@index([patientId])\n@@unique([assessmentId, patientId])','@@unique([assessmentId, patientId])\n@@index([patientId])');
assert.equal(normalize(schema), normalize(generated));
const commands = [
  ['typecheck',process.execPath,['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json','--noEmit']],
  ['build',process.execPath,['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json']],
  ['build-fonts',process.execPath,['scripts/build/copy-assessment-fonts.mjs']],
  ['schema-validation',process.execPath,['node_modules/prisma/build/index.js','validate','--schema','prisma/schema.prisma']],
  ['diff-check','git',['diff','--check','--','backend','prisma']],
];
const results=[];
for (const [name,command,args] of commands) {
  const before = new Date().toISOString();
  const result=spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://postgres@127.0.0.1:1/po15_validate_only'}});
  await writeFile(resolve(artifact, name+'.log'),`${result.stdout ?? ''}${result.stderr ?? ''}`);
  results.push({name,command:[command,...args],exitCode:result.status,startedAt:before,completedAt:new Date().toISOString()});
  console.log(name+': '+result.status);
  assert.equal(result.status,0,name+': '+result.stderr);
}
const fontSource=resolve(root,'artifacts/task-validation/po-14-gds/backend/font-provenance.json');
const fontBytes=await readFile(fontSource), fonts=JSON.parse(fontBytes);
for(const row of fonts.files) assert.equal(digest(await readFile(resolve(root,row.path))),row.sha256,row.path);
await writeFile(resolve(artifact,'font-provenance.json'),fontBytes);
assert.equal(await capture(),sourceTreeSha256);
await writeFile(resolve(artifact,'validation-checks.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),sourceTreeSha256,
  sourceUnchanged:true,results,protectedFilesPreserved:session.preserved,
  schema:{sourceSha256:digest(schema),generatedSha256:digest(generated),privateClientMatchesSource:true,generationPerformed:false,connectedToDatabase:false},
  build:{compiled:true,fontsCopiedAndByteVerified:true,prismaGenerationSkipped:'Prisma model schema unchanged; previously byte-verified private PO14 runtime retained.'},
  runtime:{privateWrapper:preparation.runtime.privateWrapper.target,privateClient:preparation.runtime.privateGeneratedClient.target,preparedFilesByteVerified:true,sharedRuntimeWritten:false},
  fonts:{unchanged:true,provenance:'font-provenance.json'},dependencyManifestsChanged:false
},null,2)+'\n');
