import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output = resolve('artifacts/task-validation/therapy-completeness', process.env.RUN || 'commands');
mkdirSync(output, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const tasks = [
  ['focused', '.', ['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',
    'frontend/src/lib/__tests__/therapyCompleteness.test.ts','frontend/src/lib/__tests__/therapyPages.test.ts',
    'frontend/src/lib/__tests__/patientTherapyCalendar.test.ts','frontend/src/components/operator/__tests__/patientTherapySlotAndForm.test.ts',
    'frontend/src/lib/__tests__/therapyIncompleteSummary.test.ts']],
  ['types', '.', ['node_modules/typescript/bin/tsc','-b','frontend']],
  ['backend-types', '.', ['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json']],
  ['build', '.', ['node_modules/vite/bin/vite.js','build','--config','frontend/vite.config.ts','frontend']],
  ['full-regression', 'frontend', ['../scripts/run-node-tests.mjs']],
  ['import-audit-existing-tests','backend',['--import','tsx','--test',
    'src/intake/__tests__/parse-discharge-therapy.test.ts','src/intake/__tests__/parse-discharge-therapy-nonrx.test.ts']],
];
const results = [];
for (const [name,cwd,args] of tasks) {
  const start = new Date().toISOString();
  const run = spawnSync(process.execPath,args,{ cwd, encoding:'utf8', windowsHide:true,maxBuffer:32e6,
    env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')} });
  const log = (run.stdout||'')+(run.stderr||'');
  writeFileSync(resolve(output,name+'.log'),log);
  results.push({name,cwd,args,start,exit:run.status,logSha256:sha256(log)});
  console.log(JSON.stringify(results.at(-1)));
}
const files = execFileSync('git',['diff','--name-only','30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6','HEAD','--','frontend/src','backend/src'],{encoding:'utf8'}).trim().split('\n');
writeFileSync(resolve(output,'receipt.json'),JSON.stringify({ applicationCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  source:files.map(path=>({path,sha256:sha256(readFileSync(path))})),results },null,2));
