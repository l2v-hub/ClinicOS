import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out=resolve('artifacts/task-validation/403-therapy-incomplete/logs'); mkdirSync(out,{recursive:true});
function run(name,args,cwd=resolve('.')) {
  const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:30*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=4096'}});
  writeFileSync(`${out}/${name}.log`,result.stdout+result.stderr);
  console.log(`${name}: exit ${result.status}`); return result;
}
run('types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
const files=spawnSync('rg',['--files','frontend/src/lib/__tests__','frontend/src/components/operator/cartella/__tests__','-g','*.test.ts','-g','*.test.tsx'],{encoding:'utf8'}).stdout.trim().split(/\r?\n/).filter(path=>/therapy|Therapy|glucose|Glucose/.test(path));
run('focused-tests',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',...files]);
run('clean-focused-tests',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/therapyIncompleteSummary.test.ts','frontend/src/lib/__tests__/patientTherapyCalendar.test.ts','frontend/src/lib/__tests__/therapyCalendarCreate.test.ts','frontend/src/lib/__tests__/therapyW2InPlace.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx','frontend/src/components/operator/cartella/PatientTherapyScheduleSummary.tsx','frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx','frontend/src/components/operator/cartella/TherapyScheduleEditor.tsx','frontend/src/components/operator/cartella/therapyFormMapping.ts','frontend/src/components/operator/cartella/therapyFormRestore.ts','frontend/src/lib/__tests__/therapyIncompleteSummary.test.ts','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
