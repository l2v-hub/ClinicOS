import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'artifacts/task-validation/414-draft-status/independent-qa414/adversarial-rerun');
mkdirSync(out, { recursive: true });
const result = spawnSync(process.execPath, ['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test','artifacts/task-validation/414-draft-status/independent-qa414/adversarial414.test.ts'], {
  encoding:'utf8', env:{...process.env, TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')}, maxBuffer:10*1024*1024,
});
writeFileSync(resolve(out,'tests.log'), (result.stdout || '') + (result.stderr || ''));
writeFileSync(resolve(out,'result.json'), JSON.stringify({status:result.status, reason:'Initial independent fixture relative import depth corrected; no application change.', expectedTests:8},null,2));
console.log(result.stdout); process.exitCode = result.status ?? 1;
