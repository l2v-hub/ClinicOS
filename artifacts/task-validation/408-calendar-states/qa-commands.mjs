import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.env.QA408_OUTPUT||'artifacts/task-validation/408-calendar-states/root');mkdirSync(out,{recursive:true});
const records=[];
function run(name,args,cwd=resolve('.')){
 const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:40*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=4096'}});
 const log=(r.stdout||'')+(r.stderr||'');writeFileSync(resolve(out,`${name}.log`),log);
 const stats=Object.fromEntries([...log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m=>[m[1],Number(m[2])]));
 const failures=[...new Set([...log.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();
 records.push({name,exit:r.status,...stats,...(failures.length?{failures}:{})});console.log(`${name}:exit${r.status} ${JSON.stringify(stats)}`);
}
run('frontend-types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
run('issue-specific',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/components/operator/__tests__/therapyCalendarVisualStates.test.ts']);
run('focused',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/components/operator/__tests__/therapyCalendarVisualStates.test.ts','frontend/src/components/operator/__tests__/therapyGiro.test.ts','frontend/src/components/operator/__tests__/patientTherapySlotAndForm.test.ts','frontend/src/lib/__tests__/therapyWeek.test.ts','frontend/src/lib/__tests__/therapyCalendarState.test.ts','frontend/src/lib/__tests__/patientTherapyCalendar.test.ts','frontend/src/lib/__tests__/therapyIncompleteSummary.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
const proof='9ed20aaad9609b30f4a58d5f92176af7bda943c6';
const baseline=spawnSync('git',['show',`${proof}:artifacts/task-validation/407-badge-contrast/root-rerun/full-regression.log`],{encoding:'utf8',maxBuffer:40*1024*1024});
if(baseline.status!==0)throw new Error('Pinned baseline missing');
const baselineFailures=[...new Set([...baseline.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();
const current=records.find(r=>r.name==='full-regression');const newFailures=(current.failures||[]).filter(f=>!baselineFailures.includes(f));
writeFileSync(resolve(out,'command-results.json'),JSON.stringify({records,baselineProof:proof,baselineApplication:'973d78e5e109032a36cf89cf80fd8eb2a848a649',baselineFailures,newFailures},null,2));
if(records.some(r=>r.name!=='full-regression'&&r.exit!==0)||current.fail!==12||newFailures.length)process.exitCode=1;
