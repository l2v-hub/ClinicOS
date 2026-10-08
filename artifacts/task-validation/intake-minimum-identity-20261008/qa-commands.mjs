import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out=resolve('artifacts/task-validation/intake-minimum-identity-20261008/logs');mkdirSync(out,{recursive:true});
const commands=[['types',['node_modules/typescript/bin/tsc','--noEmit'],resolve('frontend')],['build',['../node_modules/typescript/bin/tsc','-b'],resolve('frontend')]];
for(const [name,args,cwd] of commands){if(name==='types')args[0]='../node_modules/typescript/bin/tsc'; const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:20*1024*1024});writeFileSync(`${out}/qa-${name}.log`,r.stdout+r.stderr);console.log(`${name}: exit ${r.status}`);if(r.status!==0)process.exitCode=1;}
const files=spawnSync('rg',['--files','frontend/src/components/shared/intake/__tests__','-g','*.test.ts','-g','*.test.tsx'],{encoding:'utf8'}).stdout.trim().split(/\r?\n/);
files.push('frontend/src/lib/__tests__/patientDemographics.test.ts');
const tests=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',...files],{encoding:'utf8',maxBuffer:20*1024*1024});writeFileSync(`${out}/qa-focused-tests.log`,tests.stdout+tests.stderr);console.log(`focused: exit ${tests.status}`);if(tests.status!==0)process.exitCode=1;
const prod=spawnSync(process.execPath,['../node_modules/vite/bin/vite.js','build'],{cwd:resolve('frontend'),encoding:'utf8',maxBuffer:20*1024*1024});writeFileSync(`${out}/qa-vite-build.log`,prod.stdout+prod.stderr);console.log(`vite build: exit ${prod.status}`);if(prod.status!==0)process.exitCode=1;
