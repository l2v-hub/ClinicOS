import { spawnSync } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out=resolve('artifacts/task-validation/404-giro-allergies/logs');mkdirSync(out,{recursive:true});
function run(name,args,cwd=resolve('.')){const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:40*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=4096'}});writeFileSync(`${out}/${name}.log`,result.stdout+result.stderr);console.log(`${name}: exit${result.status}`);return result;}
run('types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
run('focused-tests',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/allergyStatusModel.test.ts','frontend/src/lib/__tests__/therapyGiroAllergies.test.ts','frontend/src/lib/__tests__/therapyW2InPlace.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src/lib/allergyStatusModel.ts','frontend/src/lib/therapyAllergyRead.ts','frontend/src/lib/__tests__/therapyGiroAllergies.test.ts','frontend/src/components/operator/TherapyPatientAllergies.tsx','frontend/src/components/operator/TherapyGiroRows.tsx','frontend/src/components/operator/TherapyRoundsPage.css','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
