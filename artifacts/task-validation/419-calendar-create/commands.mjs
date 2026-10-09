import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'artifacts/task-validation/419-calendar-create/root-initial/commands');
mkdirSync(out,{recursive:true}); const records=[];
function run(name,args,cwd=resolve('.')) {
  const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:40*1024*1024,env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json'),NODE_OPTIONS:'--max-old-space-size=4096'}});
  const log=(r.stdout||'')+(r.stderr||''); writeFileSync(resolve(out,`${name}.log`),log);
  const stats=Object.fromEntries([...log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m=>[m[1],Number(m[2])]));
  const failures=[...new Set([...log.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();
  records.push({name,exit:r.status,...stats,...failures.length?{failures}:{}});console.log(`${name}: exit${r.status} ${JSON.stringify(stats)}`);
}
run('frontend-types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('backend-types',['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json','--noEmit']);
run('frontend-tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
run('focused',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',
  'frontend/src/lib/__tests__/operatorAppointmentCreation.test.ts',
  'frontend/src/lib/__tests__/agendaAccessibility.test.ts',
  'frontend/src/lib/__tests__/appointmentRange.test.ts',
  'frontend/src/lib/__tests__/capabilities.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
const baselineProof='e0682fa598c21752b5f51a39ac5e34be91e69b1a';
const baseline=spawnSync('git',['show',`${baselineProof}:artifacts/task-validation/418-reading-recency/root-final/commands/full-regression.log`],{encoding:'utf8',maxBuffer:40*1024*1024});
if(baseline.status!==0)throw Error('Pinned baseline missing');
const baselineFailures=[...new Set([...baseline.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();
const current=records.find(r=>r.name==='full-regression'),newFailures=(current.failures||[]).filter(f=>!baselineFailures.includes(f));
writeFileSync(resolve(out,'command-results.json'),JSON.stringify({records,baselineProof,baselineApplication:'d028e1ee4c5c44d96b5005362b28f54e5c05fee1',baselineFailures,newFailures},null,2));
if(records.some(r=>r.name!=='full-regression'&&r.exit!==0)||newFailures.length)process.exitCode=1;
