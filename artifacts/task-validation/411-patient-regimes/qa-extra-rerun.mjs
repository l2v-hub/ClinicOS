import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = 'artifacts/task-validation/411-patient-regimes';
const out = `${root}/root-rerun/extra`; mkdirSync(out, { recursive: true });
const records = [];
for (const [name, args, cwd] of [
  ['adversarial-unit', ['--import', 'tsx', '--import', '../scripts/stub-css-loader.mjs', '--test', '../' + root + '/independent-qa/adversarial.test.ts'], resolve('frontend')],
  ['adversarial-browser', [root + '/independent-qa/adversarial-browser.mjs', root + '/root-rerun/extra-browser'], resolve('.')],
]) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 10*1024*1024,
    env: { ...process.env, TSX_TSCONFIG_PATH: resolve('frontend/tsconfig.app.json') } });
  writeFileSync(`${out}/${name}.log`, (result.stdout || '') + (result.stderr || ''));
  records.push({ name, exit: result.status }); console.log(`${name}: exit${result.status}`);
}
writeFileSync(`${out}/result.json`, JSON.stringify({ records, source: '8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df', independentlyAuthoredAssertionsRerunByRoot: true }, null, 2));
if (records.some(r => r.exit !== 0)) process.exitCode = 1;
