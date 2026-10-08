import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const r=spawnSync(process.execPath,['../scripts/run-node-tests.mjs'],{cwd:'frontend',encoding:'utf8',maxBuffer:40*1024*1024});
const output=r.stdout+r.stderr;
writeFileSync('artifacts/task-validation/intake-minimum-identity-20261008/logs/qa-full-regression.log',output);
console.log(`full regression exit ${r.status}`);
console.log(output.split(/\r?\n/).filter(line=>/^(✖|ℹ tests|ℹ pass|ℹ fail)/.test(line)).join('\n'));
