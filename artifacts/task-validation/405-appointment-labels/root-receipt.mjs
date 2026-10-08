import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const folder = 'artifacts/task-validation/405-appointment-labels';
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const independent = JSON.parse(readFileSync(`${folder}/independent-source-receipt.json`, 'utf8'));
const root = JSON.parse(readFileSync(`${folder}/root-rerun/logs/root-gate-results.json`, 'utf8'));
const browser = JSON.parse(readFileSync(`${folder}/root-rerun/test-results/browser-results.json`, 'utf8'));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== independent.candidate) throw Error('Candidate changed');
execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', 'frontend']);
const sourceFailures = independent.source.filter(row => hash(row.path) !== row.sha256).map(row => row.path);
const evidenceFailures = independent.artifacts.filter(row => hash(row.path) !== row.sha256).map(row => row.path);
if (sourceFailures.length || evidenceFailures.length) throw Error('Independent receipt hash mismatch');
if (browser.outcomes.length !== 7 || browser.outcomes.some(row => row.status !== 'PASS')) throw Error('Root browser gate failed');
if (!root.regression.unchanged || root.regression.newFailures.length) throw Error('Regression mismatch');
const receipt = {
  observedAt: new Date().toISOString(), issue: 405, applicationCommit: head,
  applicationSourceHash: independent.sourceHash,
  independentReceiptSha256: hash(`${folder}/independent-source-receipt.json`),
  independentSourceAndEvidenceHashesMatch: true,
  independentReportSha256: hash(`${folder}/validation-report.md`),
  rootAutomatedBrowserChecks: browser.outcomes,
  rootGateResultsSha256: hash(`${folder}/root-rerun/logs/root-gate-results.json`),
  screenReaderAcceptance: 'UNVERIFIED', releaseDecision: 'BLOCKED',
  productionPush: false, productionDeployment: false, githubClosure: false,
  closureChecker: { exit: 1, reason: 'NON COMPLETABILE — decisione: BLOCKED' },
  authority: 'User authorized sequential bug fixes, deployments and screenshots; this does not replace required acceptance evidence.',
};
writeFileSync(`${folder}/root-source-receipt.json`, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ candidate: head, sourceAndEvidenceHashesMatch: true,
  rootBrowserPass: 7, releaseDecision: 'BLOCKED' }));
