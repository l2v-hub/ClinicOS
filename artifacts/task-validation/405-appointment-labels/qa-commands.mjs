import { spawnSync } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out=resolve('artifacts/task-validation/405-appointment-labels/logs');mkdirSync(out,{recursive:true});
const results=[];
function run(name,args,cwd=resolve('.')){const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:40*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=4096'}});writeFileSync(`${out}/${name}.log`,result.stdout+result.stderr);results.push({name,exit:result.status});console.log(`${name}: exit${result.status}`);return result;}
run('types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
run('focused-tests',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/appointmentDialogAccessibility.test.ts','frontend/src/lib/__tests__/agendaAccessibility.test.ts','frontend/src/lib/__tests__/appointmentRange.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src/components/shared/AppointmentForm.tsx','frontend/src/lib/__tests__/appointmentDialogAccessibility.test.ts','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
writeFileSync(`${out}/command-results.json`,JSON.stringify(results,null,2));
