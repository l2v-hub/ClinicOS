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
run('focused',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/components/operator/cartella/__tests__/drugSearchPresentation.test.ts','frontend/src/components/operator/cartella/__tests__/medicationSearch.test.ts','frontend/src/components/operator/cartella/__tests__/farmacoDocumento.test.ts','frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts','frontend/src/components/operator/cartella/__tests__/caricaDocumentoFarmaco.test.ts','frontend/src/lib/__tests__/capabilities.test.ts']);
run('security-scan',['scripts/security/scan-frontend-secrets.mjs','frontend/src','frontend/dist']);
run('full-regression',['../scripts/run-node-tests.mjs'],resolve('frontend'));
const baselineProof='f05b627e904831c2097da3ab04ab68c3254d1e44',base=spawnSync('git',['show',`${baselineProof}:artifacts/task-validation/421-import-empty/root-frozen/commands/full-regression.log`],{encoding:'utf8',maxBuffer:40e6});assert.equal(base.status,0);
const baselineFailures=[...new Set([...base.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort(),current=records.find(r=>r.name==='full-regression'),newFailures=current.failures.filter(f=>!baselineFailures.includes(f));
writeFileSync(out+'/command-results.json',JSON.stringify({records,baselineProof,baselineApplication:'80b313227a9a2b9fefc0441c718b259d0d901cae',baselineFailures,newFailures},null,2));if(records.some(r=>r.name!=='full-regression'&&r.exit!==0)||newFailures.length)process.exitCode=1;
