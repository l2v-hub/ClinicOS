import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'artifacts/task-validation/411-patient-regimes/root-initial/commands');
mkdirSync(out, { recursive: true });
const records = [];
function run(name, args, cwd = resolve('.')) {
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 40*1024*1024, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' } });
  const log = (r.stdout || '') + (r.stderr || ''); writeFileSync(resolve(out, `${name}.log`), log);
  const stats = Object.fromEntries([...log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m => [m[1], Number(m[2])]));
  const failures = [...new Set([...log.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m => m[1]))].sort();
  records.push({ name, exit: r.status, ...stats, ...(failures.length ? { failures } : {}) });
  console.log(`${name}: exit${r.status} ${JSON.stringify(stats)}`);
}
run('frontend-types', ['../node_modules/typescript/bin/tsc', '--noEmit'], resolve('frontend'));
run('backend-types', ['node_modules/typescript/bin/tsc', '-p', 'backend/tsconfig.json', '--noEmit']);
run('frontend-tsc-build', ['../node_modules/typescript/bin/tsc', '-b'], resolve('frontend'));
run('vite-build', ['../node_modules/vite/bin/vite.js', 'build'], resolve('frontend'));
run('focused', ['--import', 'tsx', '--import', './scripts/stub-css-loader.mjs', '--test',
  'frontend/src/lib/__tests__/patientRegime411.test.ts', 'frontend/src/lib/__tests__/patientListView.test.ts',
  'frontend/src/lib/__tests__/patientRosterSort.test.ts', 'frontend/src/lib/__tests__/clinicalOverviewResilience.test.ts']);
run('security-scan', ['scripts/security/scan-frontend-secrets.mjs', 'frontend/src', 'frontend/dist']);
run('full-regression', ['../scripts/run-node-tests.mjs'], resolve('frontend'));
const proof = '5c9f094fe62fa8deedf0c6b9fa7afd85022e87fd';
const baseline = spawnSync('git', ['show', `${proof}:artifacts/task-validation/409-unread-queue/root-rerun/commands/full-regression.log`], { encoding: 'utf8', maxBuffer: 40*1024*1024 });
if (baseline.status !== 0) throw new Error('Pinned baseline missing');
const baselineFailures = [...new Set([...baseline.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m => m[1]))].sort();
const current = records.find(r => r.name === 'full-regression');
const newFailures = (current.failures || []).filter(f => !baselineFailures.includes(f));
writeFileSync(resolve(out, 'command-results.json'), JSON.stringify({ records, baselineProof: proof,
  baselineApplication: '47a4b16c111d9b9bfd0b138991958a8ca8f6c351', baselineFailures, newFailures }, null, 2));
if (records.some(r => r.name !== 'full-regression' && r.exit !== 0) || current.fail !== 12 || newFailures.length) process.exitCode = 1;
