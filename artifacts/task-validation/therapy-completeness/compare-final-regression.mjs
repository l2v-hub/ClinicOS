import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = 'artifacts/task-validation/therapy-completeness/';
const output = root + 'reconciliation-final-regression/';
const log = readFileSync(output + 'frontend-full.log', 'utf8');
const baseline = JSON.parse(readFileSync(root + 'commands/regression-comparison.json', 'utf8'));
const receipt = JSON.parse(readFileSync(output + 'receipt.json', 'utf8'));
const failures = [...new Set(log.split(/\r?\n/).filter(line => /^✖ .+ \([0-9.]+ms\)$/.test(line))
  .map(line => line.replace(/ \([0-9.]+ms\)$/, '')))].sort();
const expected = baseline.baselineFailures.slice().sort();
const introduced = failures.filter(name => !expected.includes(name));
const removed = expected.filter(name => !failures.includes(name));
const counts = Object.fromEntries([...log.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)$/gm)].map(([, name, count]) => [name, Number(count)]));
const result = { applicationCommit: receipt.applicationCommit, baseline: baseline.base,
  logSha256: createHash('sha256').update(log).digest('hex'), counts, failures,
  introduced, removed, sameFailureNames: introduced.length === 0 && removed.length === 0,
  mandatoryVerdict: 'FAILED VALIDATION; matching baseline does not waive failures' };
writeFileSync(output + 'comparison.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (!result.sameFailureNames || failures.length !== 12) process.exitCode = 1;
