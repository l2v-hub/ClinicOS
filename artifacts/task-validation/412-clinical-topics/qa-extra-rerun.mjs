import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const result=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','artifacts/task-validation/412-clinical-topics/independent-qa/adversarial-unit.test.tsx'],{encoding:'utf8',env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')}});
writeFileSync('artifacts/task-validation/412-clinical-topics/root-rerun/adversarial-unit.log',result.stdout+result.stderr);
assert.equal(result.status,0);assert.match(result.stdout,/ℹ pass 3/);console.log('Root independent adversarial-unit replay3/3 PASS');
