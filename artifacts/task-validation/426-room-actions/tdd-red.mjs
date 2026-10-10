import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const r=spawnSync(process.execPath,['--import','tsx','--test','frontend/src/lib/__tests__/roomActionIdentity.test.ts'],{encoding:'utf8',maxBuffer:10e6});writeFileSync('artifacts/task-validation/426-room-actions/test-results/tdd-red.log',r.stdout+r.stderr);assert.notEqual(r.status,0);assert.match(r.stdout,/fail 4/);console.log('RED: four missing resource identity contracts reproduced before app edit');
