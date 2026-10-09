import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const r=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/diaryReading.test.ts'],{encoding:'utf8',maxBuffer:4e6,env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')}});
writeFileSync(out+'/red.log',(r.stdout||'')+(r.stderr||''));
assert.equal(r.status,1);assert.match(r.stdout,/all priorities describe/);assert.match(r.stdout,/confirmed reading displays/);
writeFileSync(out+'/result.json',JSON.stringify({expectedRed:true,exit:r.status,noApplicationImplementationYet:true},null,2));
