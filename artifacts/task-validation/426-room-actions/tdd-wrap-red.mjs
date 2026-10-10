import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const r=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/roomActionIdentity.test.ts'],{encoding:'utf8',maxBuffer:20e6,windowsHide:true,env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')}});
const log=r.stdout+r.stderr;writeFileSync('artifacts/task-validation/426-room-actions/test-results/tdd-wrap-red.log',log);assert.equal(r.status,1);assert.match(log,/✖ bed resource headings wrap bounded custom labels within the dialog/);assert.match(log,/ℹ fail 1/);console.log('Wrapping regression RED1 preserved before source repair');
