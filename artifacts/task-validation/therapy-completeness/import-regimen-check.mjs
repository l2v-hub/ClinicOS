import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const phase = process.argv[2];
if (!['red', 'green'].includes(phase)) throw new Error('Explicit test phase required');
const output = resolve('artifacts/task-validation/therapy-completeness/import-regimen', phase);
mkdirSync(output, { recursive: true });
const cases = [
  ['backend', ['--import', 'tsx', '--test', 'backend/src/intake/__tests__/therapy-inventory-regimen.test.ts',
    'backend/src/intake/__tests__/parse-discharge-therapy.test.ts']],
  ['frontend', ['--import', 'tsx', '--import', './scripts/stub-css-loader.mjs', '--test',
    'frontend/src/components/shared/intake/__tests__/therapyInventoryRegimen.test.ts',
    'frontend/src/components/shared/intake/__tests__/therapyConfirmation.test.ts',
    'frontend/src/components/shared/intake/__tests__/glucoseIntake.test.ts']],
];
const results = cases.map(([name, args]) => {
  const run = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16e6,
    env: { ...process.env, TSX_TSCONFIG_PATH: resolve('frontend/tsconfig.app.json') } });
  writeFileSync(resolve(output, name + '.log'), (run.stdout || '') + (run.stderr || ''));
  return { name, args, exit: run.status };
});
writeFileSync(resolve(output, 'receipt.json'), JSON.stringify({ phase,
  base: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceDiff: execFileSync('git', ['diff', '--', 'backend/src', 'frontend/src'], { encoding: 'utf8' }), results }, null, 2));
console.log(JSON.stringify(results));
if (phase === 'green' && results.some(r => r.exit !== 0)) process.exitCode = 1;
