import { readFile, writeFile, mkdir, realpath, access } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Invocation is root-owned and only after the worker explicitly releases its claim.
const [workerArgument, manifestArgument, scope] = process.argv.slice(2);
if (!['backend', 'frontend'].includes(scope)) throw new Error('Explicit integration scope required');
const root = await realpath(process.cwd()), worker = await realpath(workerArgument);
if (root === worker) throw new Error('Worker checkout must be isolated');
const manifestBytes = await readFile(resolve(worker, manifestArgument));
const manifest = JSON.parse(manifestBytes);
const files = manifest.sourceIdentity?.files ?? manifest.files ?? manifest.sourcePaths;
if (!Array.isArray(files) || !files.length) throw new Error('No source manifest');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (base, path) => {
  const absolute = resolve(base, path), tail = relative(base, absolute);
  if (!tail || isAbsolute(tail) || tail.startsWith('..')) throw new Error('Path escaped checkout');
  return absolute;
};
const pending = [];
for (const file of files) {
  if (!(file.path.startsWith(`${scope}/`) || (scope === 'backend' && file.path.startsWith('prisma/')))) throw new Error(`Out of scope: ${file.path}`);
  const source = inside(worker, file.path), destination = inside(root, file.path);
  const bytes = await readFile(source);
  if (digest(bytes) !== file.sha256) throw new Error(`Worker changed after handoff: ${file.path}`);
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', file.path], { cwd: root, windowsHide: true, stdio: 'ignore' }).status === 0;
  if (tracked) {
    if (spawnSync('git', ['diff', '--quiet', 'HEAD', '--', file.path], { cwd: root, windowsHide: true }).status !== 0) throw new Error(`Integrator already modified ${file.path}`);
  } else if (await access(destination).then(() => true, () => false)) {
    if (digest(await readFile(destination)) !== file.sha256) throw new Error(`Untracked destination collision: ${file.path}`);
  }
  pending.push({ ...file, bytes, destination });
}
for (const file of pending) {
  await mkdir(dirname(file.destination), { recursive: true });
  await writeFile(file.destination, file.bytes);
  if (digest(await readFile(file.destination)) !== file.sha256) throw new Error(`Copy verification failed: ${file.path}`);
}
const receipt = { at: new Date().toISOString(), decision: 'ALLOW_INTEGRATE', scope, worker,
  authorization: 'User approved full plan, push/deploy; root invoked after explicit worker claim release',
  manifestSha256: digest(manifestBytes), files: files.map(({ path, sha256 }) => ({ path, sha256 })) };
await writeFile(resolve(root, `artifacts/task-validation/po-08-consegne-giro/${scope}-integration.json`), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ scope, verifiedFiles: files.length, manifestSha256: receipt.manifestSha256 }));
