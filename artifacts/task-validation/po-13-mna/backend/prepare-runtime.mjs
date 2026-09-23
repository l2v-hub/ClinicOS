import { cp, mkdir, realpath, readFile, writeFile, lstat, symlink, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const expectedRoot = 'C:/Workspace/ClinicOSHouse-worktrees/po13-mna-backend';
const root = await realpath(process.cwd());
const baseline = '4e594aa39cb2cf9ef3bfc403e4680ae66a41c3be';
const branch = 'codex/po13-mna-backend';
const artifact = resolve(root, 'artifacts/task-validation/po-13-mna/backend');
const previous = await realpath('C:/Workspace/ClinicOSHouse-worktrees/po12-tinetti-backend');
const dtoSource = resolve(previous, 'artifacts/task-validation/po-13-mna/backend-preparation');
const expectedContract = '8f08f0f2b141c29ec0a3717ccab8ac67790e619ca0628e8d08a198654f53d961';
const expectedDto = '9d24743fafe6b78ce71dc4c119603ccae1bdde6babbe44907b30bf79b8e9eb2a';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
const names = output => output.split(/\r?\n/).filter(Boolean);
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const save = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
if (root !== await realpath(expectedRoot) || git('rev-parse', 'HEAD') !== baseline || git('branch', '--show-current') !== branch)
  throw new Error('Wrong worktree/baseline/branch');
const sourceScope = ['backend/src','prisma','frontend/src','scripts','tests/fixtures',
  'backend/tsconfig.json','backend/package.json','package.json','package-lock.json','prisma.config.ts'];
if (git('diff','HEAD','--name-only','--',...sourceScope) || git('ls-files','--others','--exclude-standard','--',...sourceScope))
  throw new Error('Preparation requires unchanged application source');
await mkdir(artifact, { recursive: true });
const files = async directory => {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isSymbolicLink()) throw new Error('Unexpected runtime link: ' + path);
    if (item.isDirectory()) result.push(...await files(path));
    else if (item.isFile()) result.push(path);
    else throw new Error('Unexpected runtime entry: ' + path);
  }
  return result;
};
const entries = async (base, paths) => Promise.all(paths.sort().map(async path => {
  const bytes = await readFile(path);
  return { path: relative(base,path).replaceAll('\\','/'), bytes:bytes.length, sha256:hash(bytes) };
}));
const tree = rows => hash(rows.map(row=>row.path+'\0'+row.sha256+'\n').join(''));
const inputs = await entries(root, names(git('ls-files','--',...sourceScope)).map(path=>resolve(root,path)));
const preserved = await Promise.all(['package.json','package-lock.json','backend/package.json',
  'run-claude-queue.ps1','start-claude-team.ps1'].map(async path=>({path,sha256:hash(await readFile(resolve(root,path)))})));
const claimResponse = await json(resolve(artifact,'claims-preparation.json'));
const claim = JSON.parse(claimResponse.content.find(item=>item.type==='text').text).claim;
const rootContractPath = 'C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-13-mna/task-contract.md';
const rootContract = await readFile(rootContractPath);
const localContractPath = resolve(root,'artifacts/task-validation/po-13-mna/task-contract.md');
const localContract = await readFile(localContractPath);
if (!Buffer.from(localContract.toString('utf8').replace(/\r\n/g,'\n'),'utf8').equals(rootContract))
  throw new Error('Worktree contract differs beyond CRLF normalization');
const dtoContract = await readFile(resolve(dtoSource,'backend-contract.md'));
if (hash(rootContract)!==expectedContract || hash(dtoContract)!==expectedDto)
  throw new Error('Approved contract bytes differ');
await save('preparation-session.json', {
  task:'PO13-backend-runtime-preparation',startedAt:new Date().toISOString(),root,branch,baseline,
  decision:'allow private runtime and PO13 artifact preparation only; application work awaits explicit root GO after PO12 deploy verification',
  claim,sourceTreeSha256:tree(inputs),preserved,
  contracts:{rootSha256:expectedContract,dtoSha256:expectedDto},implementationAuthorized:false,publicationAuthorized:false
});
const inside = async path => {
  const actual = await realpath(path), child = relative(root,actual);
  if (child.startsWith('..') || isAbsolute(child)) throw new Error('Not private: ' + path);
  return actual;
};
const exists = path => lstat(path).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
const junction = async (target,path) => {
  const actual = await realpath(target);
  if (await exists(path)) {
    if (await realpath(path)!==actual) throw new Error('Unexpected junction target: ' + path);
  } else await symlink(actual,path,'junction');
  return actual;
};
const shared = await junction(resolve(previous,'node_modules'),resolve(root,'node_modules'));
for (const path of ['backend/node_modules','backend/node_modules/@prisma','backend/node_modules/.prisma','backend/node_modules/@pdf-lib']) {
  await mkdir(resolve(root,path),{recursive:true}); await inside(resolve(root,path));
}
const previousRuntime = (await json(resolve(previous,'artifacts/task-validation/po-12-tinetti/backend/preparation-receipt.json'))).runtime;
const copyPrivate = async (part,expected) => {
  const source = await realpath(resolve(previous,part)), child = relative(previous,source);
  if (child.startsWith('..') || isAbsolute(child)) throw new Error('Source Prisma runtime not private');
  const sourceEntries = await entries(source,await files(source));
  if (JSON.stringify(sourceEntries)!==JSON.stringify(expected.files)) throw new Error('Previous verified runtime changed');
  const target = resolve(root,part);
  if (!(await exists(target))) await cp(source,target,{recursive:true,dereference:false,errorOnExist:true,force:false});
  await inside(target);
  const targetEntries = await entries(target,await files(target));
  if (JSON.stringify(sourceEntries)!==JSON.stringify(targetEntries)) throw new Error('Runtime copy differs: ' + part);
  return {source,target,treeSha256:tree(targetEntries),files:targetEntries};
};
const wrapper = await copyPrivate('backend/node_modules/@prisma/client',previousRuntime.privateWrapper);
const output = await copyPrivate('backend/node_modules/.prisma/client',previousRuntime.privateGeneratedClient);
const pdf = await junction(resolve(previous,'backend/node_modules/pdf-lib'),resolve(root,'backend/node_modules/pdf-lib'));
const fontkit = await junction(resolve(previous,'backend/node_modules/@pdf-lib/fontkit'),resolve(root,'backend/node_modules/@pdf-lib/fontkit'));
const sourceSchema = await readFile(resolve(root,'prisma/schema.prisma'),'utf8');
const generatedSchema = await readFile(resolve(output.target,'schema.prisma'),'utf8');
const normalize = value => value.replace(/^\s*output\s*=.*$/m,'').replace(/\r\n/g,'\n')
  .split('\n').map(line=>line.trim().replace(/[ \t]+/g,' ')).filter(Boolean).join('\n')
  .replace('@@index([patientId])\n@@unique([assessmentId, patientId])','@@unique([assessmentId, patientId])\n@@index([patientId])');
if (normalize(sourceSchema)!==normalize(generatedSchema)) throw new Error('Copied runtime schema differs from baseline');
const req = createRequire(resolve(root,'backend/package.json'));
const clientPath = await realpath(req.resolve('@prisma/client'));
if (!clientPath.startsWith(await realpath(wrapper.target))) throw new Error('Client resolution not private');
const {Prisma} = req('@prisma/client');
if (!Prisma.dmmf.datamodel.models.some(model=>model.name==='PatientAssessmentAttestation')) throw new Error('Baseline model missing');

const oldReceipt = await json(resolve(dtoSource,'preparation-receipt.json'));
const dtoCopy = resolve(artifact,'dto-preparation');
await mkdir(dtoCopy,{recursive:true});
const copiedPreparation = [];
for (const name of oldReceipt.copyAllowlist) {
  if (isAbsolute(name) || name.includes('..') || name.includes('\\')) throw new Error('Invalid preparation artifact path');
  const bytes = await readFile(resolve(dtoSource,name));
  await mkdir(resolve(dtoCopy,name,'..'),{recursive:true});
  await writeFile(resolve(dtoCopy,name),bytes);
  if (hash(await readFile(resolve(dtoCopy,name)))!==hash(bytes)) throw new Error('Preparation copy changed bytes');
  copiedPreparation.push({path:'dto-preparation/'+name,bytes:bytes.length,sha256:hash(bytes)});
}
await writeFile(resolve(artifact,'backend-contract.md'),dtoContract);
await writeFile(resolve(artifact,'task-contract.snapshot.md'),rootContract);
for (const [source,name] of [['source-mna.txt','source-mna.txt'],['source-provenance.md','source-provenance.md']])
  await writeFile(resolve(artifact,name),await readFile(resolve(dtoSource,source)));
await save('contract-provenance.json', {
  rootOriginal:{path:rootContractPath,sha256:expectedContract,lineEndings:'LF'},
  assignedWorktreeContract:{path:localContractPath,sha256:hash(localContract),
    byteEquivalentAfterCrlfToLf:true,mutated:false},
  currentSnapshot:{path:'task-contract.snapshot.md',sha256:hash(await readFile(resolve(artifact,'task-contract.snapshot.md'))),byteIdentical:true},
  agreedDto:{source:resolve(dtoSource,'backend-contract.md'),path:'backend-contract.md',sha256:expectedDto,byteIdentical:true},
  historicalPreparation:{path:'dto-preparation',copiedFiles:copiedPreparation,
    note:'Historical DTO preparation retains its original CRLF snapshot and explicit CRLF-to-LF provenance. The current runtime preparation snapshot is copied byte-for-byte from the authoritative LF contract.'}
});
for (const row of preserved) if (hash(await readFile(resolve(root,row.path)))!==row.sha256) throw new Error('Protected file changed: '+row.path);
const after = await entries(root,names(git('ls-files','--',...sourceScope)).map(path=>resolve(root,path)));
if (tree(inputs)!==tree(after)) throw new Error('Application source changed during preparation');
await save('preparation-source-manifest.json',{baseline,sourceTreeSha256:tree(inputs),inputs});
const receipt = {
  task:'PO13-backend-runtime-preparation',phase:'private-runtime-ready-awaiting-implementation-go',
  preparedAt:new Date().toISOString(),worktree:root,branch,baseline,
  decision:'allow prepared runtime and agreed DTO handoff; application source implementation not authorized',
  sourceTreeSha256:tree(inputs),sourceUnchanged:true,rootContractSha256:expectedContract,dtoContractSha256:expectedDto,preserved,
  runtime:{readOnlyShared:shared,readOnlyByPolicy:true,privateWrapper:wrapper,privateGeneratedClient:output,
    pdfReadOnly:pdf,fontkitReadOnly:fontkit,clientPath,nodeVersion:process.version,prismaVersion:Prisma.prismaVersion,
    schemaSha256:hash(sourceSchema),generatedSchemaSha256:hash(generatedSchema),baselineSchemaMatches:true,
    comparison:'Ignore generator output path, formatting whitespace and adjacent PatientDocument unique/index order only.',
    generationPerformed:false,databaseConnected:false,sharedRuntimeWritten:false},
  contracts:{provenance:'contract-provenance.json',copiedPreparation},
  implementationAuthorized:false,publicationAuthorized:false,applicationTestsRun:false,
  limitations:['Private generated client matches the PO12 baseline; no MNA application source exists yet.',
    'No application tests, schema generation, dependency installation or deployment performed.',
    'Root must verify the PO12 release and issue explicit GO before application implementation.']
};
await save('preparation-receipt.json',receipt);
console.log(JSON.stringify({prepared:true,root,sourceTreeSha256:tree(inputs),privateClient:clientPath,
  rootContractSha256:expectedContract,dtoContractSha256:expectedDto,generationPerformed:false,applicationSourceUnchanged:true}));
