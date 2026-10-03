import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const result = spawnSync('npm.cmd', ['run', 'build'], { shell: true,
  cwd: path.resolve('frontend'), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
});
const output = result.stdout + result.stderr;
writeFileSync(path.resolve(process.env.UX_EVIDENCE_DIR || 'artifacts/task-validation/ux-turno-commenti', 'test-results/build.txt'), output);
console.log(output.split(/\r?\n/).filter(line => /built in|error|transformed|larger than/.test(line)).join('\n'));
process.exitCode = result.status ?? 1;
