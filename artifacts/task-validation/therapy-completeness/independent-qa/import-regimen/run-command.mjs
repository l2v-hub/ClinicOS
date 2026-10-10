import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [label, cwd, ...args] = process.argv.slice(2);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/(TOKEN|SECRET|PASSWORD|API_KEY|DATABASE_URL|CONNECTION_STRING|RAILWAY|AZURE|AUTH_MODE)/i.test(key)));
env.TSX_TSCONFIG_PATH = resolve('frontend/tsconfig.app.json');
env.DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:1/qa_no_db';
env.AUTH_MODE = 'demo'; env.NODE_ENV = 'test';
const outcome = spawnSync(process.execPath, args, { cwd: resolve(cwd), encoding: 'utf8', env, maxBuffer: 48 * 1024 * 1024 });
writeFileSync(resolve('artifacts/task-validation/therapy-completeness-qa/import-regimen/logs', `${label}.txt`),
 `cwd: ${resolve(cwd)}\ncommand: node ${args.join(' ')}\nexit: ${outcome.status}\n${outcome.stdout || ''}${outcome.stderr || ''}`);
console.log(JSON.stringify({ label, exit: outcome.status, tail: `${outcome.stdout || ''}${outcome.stderr || ''}`.slice(-4000) }));
process.exit(outcome.status ?? 1);
