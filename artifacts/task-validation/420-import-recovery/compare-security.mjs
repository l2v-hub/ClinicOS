import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='artifacts/task-validation/420-import-recovery/security';
const baseline=JSON.parse(readFileSync(`${root}/accepted-baseline-code-scan.json`)),candidate=JSON.parse(readFileSync(`${root}/generated-scanner-state/security-scans/scan-code-deep.json`));
assert.deepEqual(candidate.findings,baseline.findings);assert.equal(candidate.summary.critical,0);assert.equal(candidate.summary.high,0);
writeFileSync(`${root}/comparison.json`,JSON.stringify({applicationCommit:'c00bff678dfc9845c31742bc5d0d750fbbb9603e',baseline:'fa028c11ffe5dbfe514df8110e6ccf7f6b977602',scanApplication:'57fcf370c83e26c1870f99214130ec0bb05428be',postScanDelta:'Only conservative error copy and assertion; no new execution/storage/auth/dependency capability',candidateSummary:candidate.summary,identicalFindings:true,newSourceFindings:[],changedPathFindings:[],limit:'Three existing medium source heuristics outside changed paths; not global clean/CVE verification. No dependency changes.'},null,2));
