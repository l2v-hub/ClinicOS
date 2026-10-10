import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [label, cwd, ...args] = process.argv.slice(2);
const outcome = spawnSync(process.execPath, args, { cwd: resolve(cwd), encoding: 'utf8', env: {
 ...process.env, TSX_TSCONFIG_PATH: resolve('frontend/tsconfig.app.json')
}, maxBuffer: 32 * 1024 * 1024 });
writeFileSync(resolve('artifacts/task-validation/therapy-completeness-qa/logs', `${label}.txt`),
 `cwd: ${resolve(cwd)}\ncommand: node ${args.join(' ')}\nexit: ${outcome.status}\n${outcome.stdout || ''}${outcome.stderr || ''}`);
console.log(JSON.stringify({ label, exit: outcome.status, tail: `${outcome.stdout || ''}${outcome.stderr || ''}`.slice(-4000) }));
process.exit(outcome.status ?? 1);
