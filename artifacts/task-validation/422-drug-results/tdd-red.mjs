import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const r=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','frontend/src/components/operator/cartella/__tests__/drugSearchPresentation.test.ts'],{encoding:'utf8'});
writeFileSync('artifacts/task-validation/422-drug-results/before-run-02/tdd-red.log',r.stdout+r.stderr);assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/ERR_MODULE_NOT_FOUND/);console.log('TDD red captured: presentation module absent before implementation');
