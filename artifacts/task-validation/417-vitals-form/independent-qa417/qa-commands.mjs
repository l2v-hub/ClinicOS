import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const base=resolve('artifacts/task-validation/417-vitals-form/independent-qa417'),out=resolve(base,'commands');mkdirSync(out,{recursive:true});const records=[];
function run(name,args,cwd=resolve('.'),env={}){
 const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:50*1024*1024,env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json'),NODE_OPTIONS:'--max-old-space-size=4096',...env}});
 const log=(r.stdout||'')+(r.stderr||'');writeFileSync(resolve(out,`${name}.log`),log);
 const stats=Object.fromEntries([...log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m=>[m[1],Number(m[2])]));
 const failures=[...new Set([...log.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();records.push({name,args,cwd,exit:r.status,...stats,failures});writeFileSync(resolve(out,'progress.json'),JSON.stringify(records,null,2));console.log(`${name} exit=${r.status} ${JSON.stringify(stats)}`);
}
run('contract',['scripts/quality-gate/validate-task-contract.js',base]);
run('frontend-types-app',['node_modules/typescript/bin/tsc','--noEmit','-p','frontend/tsconfig.app.json']);
run('frontend-types-config',['node_modules/typescript/bin/tsc','--noEmit','-p','frontend/tsconfig.node.json']);
run('backend-types',['node_modules/typescript/bin/tsc','--noEmit','-p','backend/tsconfig.json']);
run('production-build',[resolve(base,'qa-build.mjs')]);
run('frontend-focused',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/components/operator/__tests__/parameterReadingForm417.test.ts','frontend/src/lib/__tests__/parameterEntrySchema.test.ts','frontend/src/lib/__tests__/parameterPad.test.ts','frontend/src/lib/__tests__/parameterEntryDrafts.test.ts','frontend/src/lib/__tests__/parameterEntrySummary.test.ts','frontend/src/lib/__tests__/patientParameterReadings.test.ts','frontend/src/lib/__tests__/patientParameterWorkspace.test.ts','frontend/src/lib/__tests__/patientParametersPage.test.ts','frontend/src/lib/__tests__/news2.test.ts']);
run('backend-input-focused',['--import','tsx','--test','backend/src/patients/__tests__/parameter-reading-input.test.ts'],resolve('.'),{AUTH_MODE:'demo',NODE_ENV:'test'});
run('security-source-dist',['scripts/security/scan-frontend-secrets.mjs','frontend/src',resolve(base,'build/dist')]);
run('full-frontend',['../scripts/run-node-tests.mjs'],resolve('frontend'));
const baselineProof='82920e256904b8a967ecb343cc19add281f58ed0';
const b=spawnSync('git',['show',`${baselineProof}:artifacts/task-validation/415-catalog-purpose/root-rerun/commands/full-regression.log`],{encoding:'utf8',maxBuffer:50*1024*1024});if(b.status!==0)throw Error('Pinned baseline unavailable');
writeFileSync(resolve(out,'pinned-baseline-full.log'),b.stdout);
const baselineFailures=[...new Set([...b.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();
const current=records.find(r=>r.name==='full-frontend'),newFailures=current.failures.filter(f=>!baselineFailures.includes(f));
writeFileSync(resolve(out,'command-results.json'),JSON.stringify({records,baselineProof,baselineApplication:'0d7adc361b92c8466655d9ed830d2b87bbd0f419',baselineFailures,newFailures},null,2));
if(records.some(r=>r.name!=='full-frontend'&&r.exit!==0)||newFailures.length)process.exitCode=1;
