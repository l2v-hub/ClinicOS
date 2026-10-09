import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'artifacts/task-validation/424-reading-action/root-initial/prisma');
await mkdir(out, { recursive: true });
const original = await readFile('prisma/schema.prisma', 'utf8');
const directory = await mkdtemp(resolve(out, 'scratch-prisma-'));
const generated = resolve(directory, 'generated').replaceAll('\\', '/');
// Mechanical temporary schema clone: only generator output is changed to avoid shared node_modules writes.
const clone = original.replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = "${generated}"`);
if (clone === original) throw new Error('Generator block not found');
const schema = resolve(directory, 'schema.prisma'); await writeFile(schema, clone);
const records = [];
for (const command of ['validate', 'generate']) {
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', command, '--schema', schema], { windowsHide: true, encoding: 'utf8', maxBuffer: 8*1024*1024,
    env: { ...process.env, DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/never-connect', CHECKPOINT_DISABLE: '1' } });
  await writeFile(resolve(out, `${command}.log`), `${result.stdout || ''}${result.stderr || ''}`);
  records.push({ command, exit: result.status }); console.log(`${command}: ${result.status}`);
}
const types = records.every(record => record.exit === 0) ? await readFile(resolve(generated, 'index.d.ts'), 'utf8') : '';
const models = ['DiaryEntryReadReceipt', 'ConsegnaReadReceipt'];
const record = { sourceSchemaSha256: createHash('sha256').update(original).digest('hex'), records, newModelsGenerated: models.every(model => types.includes(`export type ${model}`)), tempOutputOnly: true, noDatabaseConnection: true, sharedNodeModulesUnchanged: true };
await writeFile(resolve(out, 'result.json'), JSON.stringify(record, null, 2));
if (!record.newModelsGenerated || records.some(record => record.exit !== 0)) process.exitCode = 1;

