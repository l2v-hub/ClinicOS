import { cp, mkdir, realpath, readFile, writeFile, lstat, symlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = await realpath(process.cwd());
if (root !== await realpath('C:/Workspace/ClinicOSHouse-worktrees/po10-assessments-backend')) throw new Error('Wrong worktree');
const artifact = resolve(root, 'artifacts/task-validation/po-10-painad/backend');
const previous = 'C:/Workspace/ClinicOSHouse-worktrees/po08-handover-backend';
const integrator = 'C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== 'cfe0e16be0c3efc4c49245f5a9944745bf913a8a') throw new Error('Wrong baseline');
await mkdir(artifact, { recursive: true });
const inside = async path => {
  const actual = await realpath(path), child = relative(root, actual);
  if (child.startsWith('..') || isAbsolute(child)) throw new Error(`Not private: ${path}`);
  return actual;
};
const exists = async path => lstat(path).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
const junction = async (target, path) => {
  const actual = await realpath(target);
  if (await exists(path)) { if (await realpath(path) !== actual) throw new Error(`Unexpected target: ${path}`); }
  else await symlink(actual, path, 'junction');
  return actual;
};
const shared = await junction(resolve(previous, 'node_modules'), resolve(root, 'node_modules'));
for (const path of ['backend/node_modules/@prisma', 'backend/node_modules/.prisma', 'backend/node_modules/@pdf-lib']) {
  await mkdir(resolve(root, path), { recursive: true }); await inside(resolve(root, path));
}
const wrapper = resolve(root, 'backend/node_modules/@prisma/client');
if (!(await exists(wrapper))) await cp(resolve(previous, 'backend/node_modules/@prisma/client'), wrapper,
  { recursive: true, dereference: false, errorOnExist: true, force: false });
await inside(wrapper);
const output = resolve(root, 'backend/node_modules/.prisma/client');
await mkdir(output, { recursive: true }); await inside(output);
const pdf = await junction(resolve(previous, 'backend/node_modules/pdf-lib'), resolve(root, 'backend/node_modules/pdf-lib'));
const fontkit = await junction(resolve(integrator, 'artifacts/task-validation/po-10-painad/dependencies/fontkit-runtime/node_modules/@pdf-lib/fontkit'), resolve(root, 'backend/node_modules/@pdf-lib/fontkit'));
await mkdir(resolve(root, 'backend/src/assessments/fonts'), { recursive: true });
for (const [source, target] of [['NotoSans-Regular.ttf','NotoSans-Regular.ttf'],['NotoSans-Bold.ttf','NotoSans-Bold.ttf'],['LICENSE','OFL.txt']]) {
  await cp(resolve(integrator, 'artifacts/task-validation/po-10-painad/dependencies/noto-sans', source), resolve(root, 'backend/src/assessments/fonts', target));
}
const rootContract = resolve(integrator, 'artifacts/task-validation/po-10-painad/task-contract.md');
const contract = await readFile(rootContract);
await writeFile(resolve(artifact, 'root-contract.snapshot.md'), contract);
const preserved = await Promise.all(['package.json','package-lock.json','backend/package.json','run-claude-queue.ps1','start-claude-team.ps1'].map(async path => ({ path, sha256: hash(await readFile(resolve(root,path))) })));
await writeFile(resolve(artifact, 'implementation-session.json'), JSON.stringify({
  task: 'PO10-backend', worktree: root, branch: git('branch','--show-current'), baseline: git('rev-parse','HEAD'),
  startedAt: new Date().toISOString(), decision: 'allow scoped implementation and synthetic validation after root GO following verified PO09 deployment',
  claim: { issueId:'PO-10-backend-implementation', claimant:'agent:codex-po10-backend:coder', claimedAt:'2026-09-23T03:16:36.387Z' },
  runtime: { sharedReadOnly:shared, privateWrapper:wrapper, privateOutput:output, pdfReadOnly:pdf, fontkitReadOnly:fontkit },
  rootContract, rootContractSha256: hash(contract), preserved,
  publicationAuthorizedToWorker:false,
},null,2)+'\n');
const generation = (await readFile(resolve(previous,'artifacts/task-validation/po-08-consegne-giro/backend/generate-private.mjs'),'utf8'))
  .replaceAll('po-08-consegne-giro','po-10-painad').replaceAll('po08_generate_only','po10_generate_only');
await writeFile(resolve(artifact,'generate-private.mjs'),generation);
console.log(JSON.stringify({root,shared,wrapper,output,pdf,fontkit}));
