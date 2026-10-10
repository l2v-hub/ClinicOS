import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.argv[2]);assert.ok(process.argv[2]);assert.equal(existsSync(out),false);mkdirSync(out,{recursive:true});const records=[];
function run(name,args,cwd=resolve('.')){const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:40e6,env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json'),NODE_OPTIONS:'--max-old-space-size=4096'},windowsHide:true});const log=(r.stdout||'')+(r.stderr||'');writeFileSync(out+'/'+name+'.log',log);const stats=Object.fromEntries([...log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m=>[m[1],Number(m[2])]));const failures=[...new Set([...log.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();records.push({name,exit:r.status,...stats,failures});console.log(`${name}: exit${r.status} ${JSON.stringify(stats)}`);}
run('frontend-types',['../node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend'));
run('backend-types',['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json','--noEmit']);
run('frontend-tsc-build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend'));
run('vite-build',['../node_modules/vite/bin/vite.js','build'],resolve('frontend'));
run('focused',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/agendaIdentity.test.ts','frontend/src/lib/__tests__/agendaAccessibility.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
const baselineProof='057dc6ca6374203d4a1c86d1e5c4b14b73810d48',base=spawnSync('git',['show',`${baselineProof}:artifacts/task-validation/425-chart-scroll/root-rerun2/commands01/full-regression.log`],{encoding:'utf8',maxBuffer:40e6});assert.equal(base.status,0);
const baselineFailures=[...new Set([...base.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort(),current=records.find(r=>r.name==='full-regression'),newFailures=current.failures.filter(f=>!baselineFailures.includes(f));
writeFileSync(out+'/command-results.json',JSON.stringify({records,baselineProof,baselineApplication:'b7ae14d120c1e70ccf72784206a505f8c48f975e',baselineFailures,newFailures,baselineWaiver:'Only exact named accepted baseline failures; focused must pass, never global green'},null,2));if(records.some(r=>r.name!=='full-regression'&&r.exit!==0)||newFailures.length||current.fail!==baselineFailures.length)process.exitCode=1;
