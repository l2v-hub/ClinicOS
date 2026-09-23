import { cp, mkdir, realpath, readFile, writeFile, lstat, symlink, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const expectedRoot = 'C:/Workspace/ClinicOSHouse-worktrees/po11-transfers-backend';
const root = await realpath(process.cwd());
const baseline = 'd659c1b459eb72a2920cbd9f678a2c11f9bf7efd';
const expectedBranch = 'codex/po11-transfers-backend';
if (root !== await realpath(expectedRoot)) throw new Error('Wrong worktree');
const artifact = resolve(root, 'artifacts/task-validation/po-11-postural-transfers/backend');
const previous = await realpath('C:/Workspace/ClinicOSHouse-worktrees/po10-assessments-backend');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
const names = output => output.split(/\r?\n/).filter(Boolean);
if (git('rev-parse', 'HEAD') !== baseline || git('branch', '--show-current') !== expectedBranch)
  throw new Error('Wrong baseline/branch');
const sourceScope = ['backend/src','prisma','src','scripts','backend/tsconfig.json','backend/package.json','package.json','package-lock.json','prisma.config.ts'];
if (git('diff','HEAD','--name-only','--',...sourceScope) || git('ls-files','--others','--exclude-standard','--',...sourceScope))
  throw new Error('Preparation requires unchanged application source');
await mkdir(artifact, { recursive: true });
const files = async directory => {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isSymbolicLink()) throw new Error(`Unexpected link inside private runtime: ${path}`);
    if (item.isDirectory()) result.push(...await files(path));
    else if (item.isFile()) result.push(path);
    else throw new Error(`Unexpected runtime entry: ${path}`);
  }
  return result;
};
const treeEntries = async (base, paths) => Promise.all(paths.sort().map(async path => {
  const bytes = await readFile(path);
  return { path: relative(base,path).replaceAll('\\','/'), bytes:bytes.length, sha256:hash(bytes) };
}));
const tree = entries => hash(entries.map(row=>`${row.path}\0${row.sha256}\n`).join(''));
const inputs = await treeEntries(root, names(git('ls-files','--',...sourceScope)).map(path=>resolve(root,path)));
const preserved = await Promise.all(['package.json','package-lock.json','backend/package.json','run-claude-queue.ps1','start-claude-team.ps1']
  .map(async path => ({ path, sha256:hash(await readFile(resolve(root,path))) })));
const claimResponse = JSON.parse(await readFile(resolve(artifact,'claims-preparation.json'),'utf8'));
const claim = JSON.parse(claimResponse.content.find(item=>item.type==='text').text).claim;
const contractPath = resolve(root,'artifacts/task-validation/po-11-postural-transfers/task-contract.md');
const contract = await readFile(contractPath);
await writeFile(resolve(artifact,'task-contract.snapshot.md'),contract);
await writeFile(resolve(artifact,'preparation-session.json'),JSON.stringify({
  task:'PO11-backend-preparation', startedAt:new Date().toISOString(), root, branch:expectedBranch, baseline,
  decision:'allow private runtime copy and preparation artifacts only; application implementation awaits explicit root GO after PO10 deploy',
  claim, contract:{path:contractPath,sha256:hash(contract)}, sourceTreeSha256:tree(inputs), preserved,
  implementationAuthorized:false, publicationAuthorized:false,
},null,2)+'\n');
const inside = async path => {
  const actual = await realpath(path), child = relative(root,actual);
  if (child.startsWith('..') || isAbsolute(child)) throw new Error(`Not private: ${path}`);
  return actual;
};
const exists = path => lstat(path).then(()=>true,error=>{ if(error.code==='ENOENT') return false; throw error; });
const junction = async (target,path) => {
  const actual = await realpath(target);
  if (await exists(path)) {
    if (await realpath(path)!==actual) throw new Error(`Unexpected junction target: ${path}`);
  } else await symlink(actual,path,'junction');
  return actual;
};
const shared = await junction(resolve(previous,'node_modules'),resolve(root,'node_modules'));
for(const path of ['backend/node_modules','backend/node_modules/@prisma','backend/node_modules/.prisma','backend/node_modules/@pdf-lib']) {
  await mkdir(resolve(root,path),{recursive:true}); await inside(resolve(root,path));
}
const copyPrivate = async part => {
  const source = await realpath(resolve(previous,part));
  const previousRelative = relative(previous,source);
  if(previousRelative.startsWith('..') || isAbsolute(previousRelative)) throw new Error('Source Prisma runtime is not private');
  const sourceEntries = await treeEntries(source,await files(source));
  const target = resolve(root,part);
  if(!(await exists(target))) await cp(source,target,{recursive:true,dereference:false,errorOnExist:true,force:false});
  await inside(target);
  const targetEntries = await treeEntries(target,await files(target));
  if(JSON.stringify(sourceEntries)!==JSON.stringify(targetEntries)) throw new Error(`Runtime copy differs: ${part}`);
  return {source,target,treeSha256:tree(targetEntries),files:targetEntries};
};
const wrapper = await copyPrivate('backend/node_modules/@prisma/client');
const output = await copyPrivate('backend/node_modules/.prisma/client');
const pdf = await junction(resolve(previous,'backend/node_modules/pdf-lib'),resolve(root,'backend/node_modules/pdf-lib'));
const fontkit = await junction(resolve(previous,'backend/node_modules/@pdf-lib/fontkit'),resolve(root,'backend/node_modules/@pdf-lib/fontkit'));
const sourceSchema = await readFile(resolve(root,'prisma/schema.prisma'),'utf8');
const generatedSchema = await readFile(resolve(output.target,'schema.prisma'),'utf8');
const normalize = text => text.replace(/^\s*output\s*=.*$/m,'').replace(/\r\n/g,'\n')
  .split('\n').map(line=>line.trim().replace(/[ \t]+/g,' ')).filter(Boolean).join('\n')
  .replace('@@index([patientId])\n@@unique([assessmentId, patientId])','@@unique([assessmentId, patientId])\n@@index([patientId])');
if(normalize(sourceSchema)!==normalize(generatedSchema)) throw new Error('Reused runtime schema differs from baseline');
const req = createRequire(resolve(root,'backend/package.json'));
const clientPath = await realpath(req.resolve('@prisma/client'));
if(!clientPath.startsWith(wrapper.target)) throw new Error('Client import is not private');
const {Prisma} = req('@prisma/client');
if(!Prisma.dmmf.datamodel.models.some(model=>model.name==='PatientAssessment')) throw new Error('PO10 assessment model missing');
for(const row of preserved) if(hash(await readFile(resolve(root,row.path)))!==row.sha256) throw new Error(`Protected file changed: ${row.path}`);
const after = await treeEntries(root,names(git('ls-files','--',...sourceScope)).map(path=>resolve(root,path)));
if(tree(inputs)!==tree(after)) throw new Error('Application source changed during preparation');
await writeFile(resolve(artifact,'preparation-source-manifest.json'),JSON.stringify({baseline,sourceTreeSha256:tree(inputs),inputs},null,2)+'\n');
const receipt = {
  task:'PO11-backend-preparation',phase:'private-runtime-ready-awaiting-implementation-go',preparedAt:new Date().toISOString(),
  worktree:root,branch:expectedBranch,baseline,decision:'allow prepared runtime handoff; no application source implementation authorized',
  sourceTreeSha256:tree(inputs),sourceUnchanged:true,contractSha256:hash(contract),preserved,
  runtime:{readOnlyShared:shared,privateWrapper:wrapper,privateGeneratedClient:output,pdfReadOnly:pdf,fontkitReadOnly:fontkit,
    clientPath,prismaVersion:Prisma.prismaVersion,schemaSha256:hash(sourceSchema),
    generatedSchemaSha256:hash(generatedSchema),baselineSchemaMatches:true,
    comparison:'Ignoring generator output path, formatting whitespace and adjacent PatientDocument unique/index order only.',
    generationPerformed:false,databaseConnected:false,sharedRuntimeWritten:false},
  recall:{memoryMatches:0,reference:'PO10 backend implementation receipt and read-only task contract'},
  implementationAuthorized:false,publicationAuthorized:false,
  limitations:['Copied generated client is valid for the PAINAD baseline only; regenerate exclusively to this private output after an authorized PO11 schema change.',
    'No application tests or deployment performed during preparation.'],
};
await writeFile(resolve(artifact,'preparation-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({prepared:true,root,sourceTreeSha256:tree(inputs),privateClient:clientPath,generationPerformed:false,applicationSourceUnchanged:true}));
