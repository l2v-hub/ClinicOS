import { readFile, writeFile, realpath, mkdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = await realpath(process.cwd());
const output = await realpath(resolve(root, 'backend/node_modules/.prisma/client'));
const wrapper = await realpath(resolve(root, 'backend/node_modules/@prisma/client'));
for (const path of [output, wrapper]) {
  const inside = relative(root, path);
  if (inside.startsWith('..') || isAbsolute(inside)) throw new Error(`Non-private output: ${path}`);
}
const artifact = resolve(root, 'artifacts/task-validation/po-07-ordine-reparto/backend');
await mkdir(artifact, { recursive: true });
const schema = (await readFile(resolve(root, 'prisma/schema.prisma'), 'utf8')).replace(
  'provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = ${JSON.stringify(output.replaceAll('\\', '/'))}`,
);
const schemaPath = resolve(artifact, 'private-schema.prisma');
await writeFile(schemaPath, schema);
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'generate', '--schema', schemaPath], {
  cwd: root, windowsHide: true, encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: 'postgresql://postgres@127.0.0.1:1/po07_generate_only', PRISMA_GENERATE_SKIP_AUTOINSTALL: '1' },
});
await writeFile(resolve(artifact, 'private-generation.log'), `${result.stdout}\n${result.stderr}`);
if (result.status !== 0) throw new Error(`Private generation failed: ${result.stderr}`);
if (await realpath(resolve(root, 'backend/node_modules/.prisma/client')) !== output) throw new Error('Output path changed');
console.log(result.stdout.trim());
console.log(JSON.stringify({ privateOutput: output, privateWrapper: wrapper }));
