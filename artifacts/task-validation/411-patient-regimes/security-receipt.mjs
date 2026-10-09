import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const candidate = JSON.parse(readFileSync('.claude/security-scans/scan-all-deep.json', 'utf8'));
const baselinePath = 'C:/w-409/.claude/security-scans/scan-all-deep.json';
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const findings = scan => scan.issues ?? scan.vulnerabilities ?? scan.findings;
assert.ok(Array.isArray(findings(candidate))); assert.ok(Array.isArray(findings(baseline)));
const r = spawnSync('git', ['diff', '--name-only', '47a4b16c111d9b9bfd0b138991958a8ca8f6c351', '--', 'frontend/src'], { encoding: 'utf8' });
assert.equal(r.status, 0);
const changed = r.stdout.trim().split('\n').filter(Boolean).map(p => p.replaceAll('\\', '/'));
const touchedFindings = findings(candidate).filter(f => changed.includes(f.location.replaceAll('\\', '/').split(':')[0]));
assert.deepEqual(touchedFindings, []);
const deps = scan => findings(scan).filter(f => f.type === 'Dependency CVE');
assert.deepEqual(deps(candidate), deps(baseline));
for (const p of ['package.json', 'package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) {
  // Compare committed content; line-ending conversion does not mean a dependency edit.
  const current = spawnSync('git', ['diff', '--exit-code', '47a4b16c111d9b9bfd0b138991958a8ca8f6c351', '--', p]);
  assert.equal(current.status, 0);
}
const receipt = { tool: 'npx --no-install ruflo security scan --depth full (resolved deep)',
  scanExit: 1, reason: 'Pre-existing findings; not a clean security certification',
  candidateScanSha256: createHash('sha256').update(readFileSync('.claude/security-scans/scan-all-deep.json')).digest('hex'),
  baselineApplication: '47a4b16c111d9b9bfd0b138991958a8ca8f6c351',
  baselineScanSha256: createHash('sha256').update(readFileSync(baselinePath)).digest('hex'),
  findings: findings(candidate).length, unchangedDependencyFindings: deps(candidate), changedProductionPaths: changed,
  touchedFindings, review: 'Exact canonical membership; no input normalization/data write, no new HTTP endpoint/permission, React escaped text, static option labels; existing unsafe-render/dependency findings outside scope retained.' };
writeFileSync('artifacts/task-validation/411-patient-regimes/security-receipt.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ findings: receipt.findings, unchangedDependencyFindings: deps(candidate).length, touchedFindings: touchedFindings.length }));
