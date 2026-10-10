import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const r=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/lib/__tests__/operatorRolePresentation.test.ts','backend/src/operators/__tests__/operator-view.test.ts'],{encoding:'utf8',maxBuffer:30e6,windowsHide:true});
const log=(r.stdout||'')+(r.stderr||'');writeFileSync('artifacts/task-validation/428-operator-role/tdd-red.log',log);assert.equal(r.status,1);assert.match(log,/ℹ tests 24/);assert.match(log,/ℹ fail 17/);assert.match(log,/'medico' !== ''/);console.log('24 tests,17 genuine RED assertions on baseline-equivalent three-key and null-to-medico projection; not a module-loading error');
