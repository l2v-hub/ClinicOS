import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.argv[2]);assert.ok(process.argv[2]);assert.equal(existsSync(out),false);mkdirSync(out,{recursive:true});const records=[];
function run(name,args,cwd=resolve('.')){const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:40e6,env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json'),NODE_OPTIONS:'--max-old-space-size=4096'}});const log=(r.stdout||'')+(r.stderr||'');writeFileSync(out+'/'+name+'.log',log);const stats=Object.fromEntries([...log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m=>[m[1],Number(m[2])]));const failures=[...new Set([...log.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();records.push({name,exit:r.status,...stats,failures});console.log(`${name}: exit${r.status} ${JSON.stringify(stats)}`);}
run('frontend-types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('backend-types',['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json','--noEmit']);
run('frontend-tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
run('focused',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/patientChartScroll.test.ts','frontend/src/lib/__tests__/accessibleClinicalDialogs.test.ts','frontend/src/lib/__tests__/patientTherapyCalendar.test.ts','frontend/src/lib/__tests__/therapyCalendarCreate.test.ts','frontend/src/lib/__tests__/therapyNavigationGuard.test.ts','frontend/src/components/operator/cartella/__tests__/therapyFormPresentation.test.ts','frontend/src/components/operator/__tests__/patientTherapySlotAndForm.test.ts','frontend/src/lib/__tests__/patientTargetResolver.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
const baselineProof='6632cda65c3678b231034e659764207cb7313794',base=spawnSync('git',['show',`${baselineProof}:artifacts/task-validation/424-reading-action/root-rerun/commands/full-regression.log`],{encoding:'utf8',maxBuffer:40e6});assert.equal(base.status,0);
const baselineFailures=[...new Set([...base.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort(),current=records.find(r=>r.name==='full-regression'),newFailures=current.failures.filter(f=>!baselineFailures.includes(f));
const focused=records.find(r=>r.name==='focused'),focusedNewFailures=focused.failures.filter(f=>!baselineFailures.includes(f));
writeFileSync(out+'/command-results.json',JSON.stringify({records,baselineProof,baselineApplication:'67d21c3e9257a5acb8c9b25130c9417fb92185fb',baselineFailures,newFailures,focusedNewFailures,baselineWaiver:'Only exact named accepted baseline failures; never global green'},null,2));if(records.some(r=>!['full-regression','focused'].includes(r.name)&&r.exit!==0)||newFailures.length||current.fail!==baselineFailures.length||focusedNewFailures.length)process.exitCode=1;
