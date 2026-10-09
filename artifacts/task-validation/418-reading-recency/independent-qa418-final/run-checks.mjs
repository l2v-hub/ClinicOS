import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const cwd='C:/w-418-qa-final/frontend',out=resolve(cwd,'../artifacts/task-validation/418-reading-recency/independent-qa418-final');
mkdirSync(`${out}/commands`,{recursive:true});
const receipts=[];
const attempt='correct-runtime-';
function run(name,args,options={}) {const start=new Date().toISOString();const p=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:64e6,env:{...process.env,TSX_TSCONFIG_PATH:`${cwd}/tsconfig.app.json`,NODE_OPTIONS:'--max-old-space-size=4096'},...options});writeFileSync(`${out}/commands/${attempt}${name}.log`,(p.stdout||'')+(p.stderr||''));const r={name,args,cwd,start,end:new Date().toISOString(),exitCode:p.status,TSX_TSCONFIG_PATH:`${cwd}/tsconfig.app.json`,NODE_OPTIONS:'--max-old-space-size=4096'};receipts.push(r);console.log(`${name}: ${p.status}`);return p;}
run('types-app',['../node_modules/typescript/bin/tsc','--noEmit','--project','tsconfig.app.json','--incremental','false']);
run('types-node',['../node_modules/typescript/bin/tsc','--noEmit','--project','tsconfig.node.json','--incremental','false']);
for(const name of ['app','node'])writeFileSync(`${out}/tsconfig.original-${name}.json`,JSON.stringify({extends:`${cwd}/tsconfig.${name}.json`,compilerOptions:{tsBuildInfoFile:`${out}/original-${name}.tsbuildinfo`}},null,2));
writeFileSync(`${out}/tsconfig.original-build.json`,JSON.stringify({files:[],references:[{path:'./tsconfig.original-app.json'},{path:'./tsconfig.original-node.json'}]},null,2));
run('build-types',['../node_modules/typescript/bin/tsc','-b',`${out}/tsconfig.original-build.json`]);
run('build-vite',['../node_modules/vite/bin/vite.js','build','--configLoader','runner','--outDir',`${out}/../runtime-418-final/build`]);
run('focused',['--import','tsx','--import','../scripts/stub-css-loader.mjs','--test','src/lib/__tests__/readingRecency.test.ts','src/lib/__tests__/parameterPad.test.ts','src/lib/__tests__/patientVitalsOverview.test.ts','src/lib/__tests__/news2.test.ts','src/lib/__tests__/news2History.test.ts','src/lib/__tests__/parameterEntrySchema.test.ts','src/lib/__tests__/parameterEntryDrafts.test.ts','src/lib/__tests__/parameterEntrySummary.test.ts','src/components/operator/__tests__/parameterReadingForm417.test.ts']);
run('full-regression',['../scripts/run-node-tests.mjs']);
writeFileSync(`${out}/commands/${attempt}receipts.json`,JSON.stringify(receipts,null,2));
