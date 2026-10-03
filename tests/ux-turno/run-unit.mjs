import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const out = path.resolve(
  'artifacts/task-validation/ux-turno-commenti/test-results/full-frontend.txt',
);
const result = spawnSync(process.execPath, ['../scripts/run-node-tests.mjs'], {
  cwd: path.resolve('frontend'),
  encoding: 'utf8',
  maxBuffer: 30 * 1024 * 1024,
});
const text = result.stdout + result.stderr;
writeFileSync(out, text);
console.log(
  text
    .split(/\r?\n/)
    .filter((line) => /^ℹ (tests|pass|fail|duration)|^✖ [a-zA-Z]/.test(line))
    .map((line) => line.slice(0, 220))
    .join('\n'),
);
process.exitCode = result.status ?? 1;
