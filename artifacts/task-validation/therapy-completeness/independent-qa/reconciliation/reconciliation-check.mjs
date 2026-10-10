import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const runName = process.argv[2];
if (!/^[a-z0-9-]{1,60}$/.test(runName ?? '')) throw Error('Explicit immutable run name required');
const output = resolve('artifacts/task-validation/therapy-reconciliation-qa', runName);
mkdirSync(output, { recursive: false });
const cases = [
  ['backend', ['--import','tsx','--test',
    'backend/src/intake/__tests__/therapy-source-inventory.test.ts',
    'backend/src/ai/upload/pages/__tests__/draft-merge.test.ts',
    'backend/src/ai/upload/pages/__tests__/draft-merge-pages.test.ts',
    'backend/src/intake/__tests__/import-error-specificity.test.ts',
    'backend/src/intake/__tests__/glucose-review-selection.test.ts']],
  ['frontend', ['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',
    'frontend/src/components/shared/intake/__tests__/therapySourceInventory.test.ts',
    'frontend/src/components/shared/intake/__tests__/therapyInventoryRegimen.test.ts',
    'frontend/src/components/shared/intake/__tests__/therapyConfirmation.test.ts',
    'frontend/src/components/shared/intake/__tests__/glucoseIntake.test.ts']],
  ['frontend-types', ['node_modules/typescript/bin/tsc','-b','frontend/tsconfig.json','--pretty','false']],
  ['backend-types', ['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json','--noEmit','--pretty','false']],
  ['frontend-build', ['node_modules/vite/bin/vite.js','build','--config','frontend/vite.config.ts','--outDir','dist'], 'frontend'],
];
const env = { ...process.env, DATABASE_URL: 'postgresql://unit:unit@127.0.0.1:1/unit_no_db',
  TSX_TSCONFIG_PATH: resolve('frontend/tsconfig.app.json') };
const results = cases.map(([name,args,cwd]) => {
  const adjusted = cwd ? args.map(arg => arg === 'node_modules/vite/bin/vite.js' ? resolve(arg) : arg === 'frontend/vite.config.ts' ? resolve(arg) : arg) : args;
  const run = spawnSync(process.execPath, adjusted, { cwd: cwd ? resolve(cwd) : resolve('.'), encoding:'utf8',windowsHide:true,maxBuffer:16e6,timeout:180000,env });
  writeFileSync(resolve(output,name+'.log'), (run.stdout || '')+(run.stderr || ''));
  return { name,args:adjusted,exit:run.status,timedOut:run.error?.code === 'ETIMEDOUT' };
});
const sourceDiff = execFileSync('git',['diff','HEAD','--','frontend/src','backend/src'],{encoding:'utf8'});
writeFileSync(resolve(output,'receipt.json'),JSON.stringify({ head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceDiffSha256:createHash('sha256').update(sourceDiff).digest('hex'), sourceDiff, results,
  realDatabaseAccess:false,providerInvoked:false,at:new Date().toISOString() },null,2));
console.log(JSON.stringify(results));
if (results.some(r => r.exit !== 0)) process.exitCode=1;
