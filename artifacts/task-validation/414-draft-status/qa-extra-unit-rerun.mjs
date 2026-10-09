import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.argv[2]||'artifacts/task-validation/414-draft-status/root-rerun/extra');mkdirSync(out,{recursive:true});
const r=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','artifacts/task-validation/414-draft-status/independent-qa414/adversarial414.test.ts'],{encoding:'utf8',env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')}});
writeFileSync(out+'/tests.log',(r.stdout||'')+(r.stderr||''));writeFileSync(out+'/results.json',JSON.stringify({exit:r.status,expectedTests:8},null,2));console.log(`extra unit exit${r.status}`);process.exitCode=r.status;
