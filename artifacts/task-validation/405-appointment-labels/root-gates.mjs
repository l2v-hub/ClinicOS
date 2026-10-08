import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const folder = 'artifacts/task-validation/405-appointment-labels';
const out = resolve(folder, 'root-rerun/logs');
mkdirSync(out, { recursive: true });
const results = [];
function run(name, args, cwd = resolve('.')) {
  const result = spawnSync(process.execPath, args, {
    cwd, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  });
  writeFileSync(`${out}/${name}.log`, result.stdout + result.stderr);
  results.push({ name, exit: result.status });
  console.log(`${name}: exit${result.status}`);
}
run('types', ['../node_modules/typescript/bin/tsc', '--noEmit'], resolve('frontend'));
run('vite-build', ['../node_modules/vite/bin/vite.js', 'build'], resolve('frontend'));
run('focused-tests', ['--import', 'tsx', '--import', './scripts/stub-css-loader.mjs', '--test',
  'frontend/src/lib/__tests__/appointmentDialogAccessibility.test.ts',
  'frontend/src/lib/__tests__/agendaAccessibility.test.ts',
  'frontend/src/lib/__tests__/appointmentRange.test.ts']);
run('security-scan', ['scripts/security/scan-frontend-secrets.mjs',
  'frontend/src/components/shared/AppointmentForm.tsx',
  'frontend/src/lib/__tests__/appointmentDialogAccessibility.test.ts', 'frontend/dist']);
run('full-regression', ['../scripts/run-node-tests.mjs'], resolve('frontend'));
const failures = file => [...new Set(readFileSync(file, 'utf8').split(/\r?\n/)
  .filter(line => line.startsWith('✖ ') && !line.includes('failing tests:'))
  .map(line => line.replace(/ \([\d.]+ms\)$/, '').slice(2)))].sort();
const baseline = failures('artifacts/task-validation/404-giro-allergies/logs/full-regression.log');
const candidate = failures(`${out}/full-regression.log`);
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const gate = {
  candidate: '21f8c75c221c464fb00499326cf261143b444bf4', results,
  regression: { baselineFailures: baseline, candidateFailures: candidate,
    newFailures: candidate.filter(name => !baseline.includes(name)),
    unchanged: JSON.stringify(baseline) === JSON.stringify(candidate) },
  independentReportSha256: sha(`${folder}/validation-report.md`),
  screenReader: 'UNVERIFIED', releaseDecision: 'BLOCKED',
  reason: 'Original AC3 requires genuine real-screen-reader evidence; automated checks are not a substitute.',
};
writeFileSync(`${out}/root-gate-results.json`, JSON.stringify(gate, null, 2));
if (results.some(r => r.name !== 'full-regression' && r.exit !== 0)
    || baseline.length !== 12 || !gate.regression.unchanged) process.exitCode = 1;
console.log(JSON.stringify({ unchanged12Baseline: gate.regression.unchanged,
  newFailures: gate.regression.newFailures, releaseDecision: gate.releaseDecision }));
