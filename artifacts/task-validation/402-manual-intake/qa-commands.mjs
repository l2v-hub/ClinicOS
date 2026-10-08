import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out=resolve('artifacts/task-validation/402-manual-intake/logs'); mkdirSync(out,{recursive:true});
function run(name,args,cwd=resolve('.')) {
  const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:30*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=4096'}});
  writeFileSync(`${out}/${name}.log`,result.stdout+result.stderr);
  console.log(`${name}: exit ${result.status}`); return result;
}
run('types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
const files=spawnSync('rg',['--files','frontend/src/components/shared/intake/__tests__','-g','*.test.ts','-g','*.test.tsx'],{encoding:'utf8'}).stdout.trim().split(/\r?\n/);
files.push('frontend/src/lib/__tests__/patientDemographics.test.ts','frontend/src/lib/__tests__/manualIntakeNavigation.test.ts','frontend/src/lib/__tests__/importLandsOnPatient.test.ts');
run('focused-tests',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',...files]);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
