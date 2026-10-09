import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const cwd='C:/w-418-qa',out=cwd+'/artifacts/task-validation/418-reading-recency/independent-qa418';
const receipts=[];
for(const [name,args] of [
 ['backend-types',['node_modules/typescript/bin/tsc','-p','backend/tsconfig.json','--noEmit']],
 ['focused64',['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',...['readingRecency','patientVitalsOverview','facilityTime','news2History','parameterEntrySchema','parameterPad','parameterEntryDrafts','parameterEntrySummary','patientParameterReadings','patientParameterWorkspace','patientParametersPage','news2'].map(x=>`frontend/src/lib/__tests__/${x}.test.ts`),'frontend/src/components/operator/__tests__/parameterReadingForm417.test.ts']],
 ['security',['scripts/security/scan-frontend-secrets.mjs','frontend/src','artifacts/task-validation/418-reading-recency/runtime-418/build']]
]){const p=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:40e6,env:{...process.env,TSX_TSCONFIG_PATH:cwd+'/frontend/tsconfig.app.json',NODE_OPTIONS:'--max-old-space-size=4096'}});writeFileSync(`${out}/commands/${name}.log`,((p.stdout||'')+(p.stderr||'')).replace(/ -> .*$/gm,' -> [redacted]'));receipts.push({name,args,exitCode:p.status});console.log(`${name}: ${p.status}`);}
writeFileSync(`${out}/commands/extras-receipts.json`,JSON.stringify(receipts,null,2));
