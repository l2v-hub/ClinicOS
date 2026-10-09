import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const candidate = JSON.parse(readFileSync('.claude/security-scans/scan-all-deep.json', 'utf8'));
const baselinePath = 'C:/w-411/.claude/security-scans/scan-all-deep.json';
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const findings = scan => scan.issues ?? scan.vulnerabilities ?? scan.findings;
assert.ok(Array.isArray(findings(candidate))); assert.ok(Array.isArray(findings(baseline)));
const r = spawnSync('git', ['diff', '--name-only', '8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df', '--', 'frontend/src'], { encoding: 'utf8' });
assert.equal(r.status, 0);
const changed = r.stdout.trim().split('\n').filter(Boolean).map(p => p.replaceAll('\\', '/'));
const touchedFindings = findings(candidate).filter(f => changed.includes(f.location.replaceAll('\\', '/').split(':')[0]));
const newTouchedFindings = touchedFindings.filter(f => !findings(baseline).some(old => JSON.stringify(old) === JSON.stringify(f)));
assert.deepEqual(newTouchedFindings, []);
for (const finding of touchedFindings) {
  assert.equal(finding.type, 'React XSS');
  assert.equal(finding.location.replaceAll('\\','/'), 'frontend/src/components/shared/sections/NarrativeClinicalSection.tsx:8');
  const path = finding.location.replaceAll('\\','/').split(':')[0];
  const prior = spawnSync('git',['show',`8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df:${path}`],{encoding:'utf8'});
  assert.equal(prior.status,0);
  assert.equal(readFileSync(path,'utf8').split(/\r?\n/)[7],prior.stdout.split(/\r?\n/)[7]);
  assert.match(readFileSync(path,'utf8').split(/\r?\n/)[7],/no dangerouslySetInnerHTML/);
}
const deps = scan => findings(scan).filter(f => f.type === 'Dependency CVE');
assert.deepEqual(deps(candidate), deps(baseline));
for (const p of ['package.json', 'package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) {
  // Compare committed content; line-ending conversion does not mean a dependency edit.
  const current = spawnSync('git', ['diff', '--exit-code', '8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df', '--', p]);
  assert.equal(current.status, 0);
}
const receipt = { tool: 'npx --no-install ruflo security scan --depth full (resolved deep)',
  scanExit: 1, reason: 'Pre-existing findings; not a clean security certification',
  candidateScanSha256: createHash('sha256').update(readFileSync('.claude/security-scans/scan-all-deep.json')).digest('hex'),
  baselineApplication: '8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df',
  baselineScanSha256: createHash('sha256').update(readFileSync(baselinePath)).digest('hex'),
  findings: findings(candidate).length, unchangedDependencyFindings: deps(candidate), changedProductionPaths: changed,
  touchedFindings, newTouchedFindings, preExistingTouchedReview: 'One exact baseline React XSS heuristic points to unchanged comment stating no dangerouslySetInnerHTML. Actual renderer uses escaped React text; no raw HTML sink added, SSR escape assertion passes. Not suppressed or claimed absent.',
  review: 'Exact canonical membership/document-absence markers, React escaped original/source text, no automatic clinical synchronization. Existing narrative PUT unchanged; no new endpoint/permission/schema/config/dependency. Pre-existing repository security findings retained.' };
writeFileSync('artifacts/task-validation/412-clinical-topics/security-receipt.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ findings: receipt.findings, unchangedDependencyFindings: deps(candidate).length, preExistingTouchedFindings: touchedFindings.length, newTouchedFindings:newTouchedFindings.length }));
