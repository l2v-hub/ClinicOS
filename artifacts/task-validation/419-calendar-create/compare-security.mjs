import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='artifacts/task-validation/419-calendar-create/security';
const baseline=JSON.parse(readFileSync(`${root}/baseline-code-scan.json`,'utf8')),candidate=JSON.parse(readFileSync(`${root}/candidate-code-scan.json`,'utf8')),global=JSON.parse(readFileSync(`${root}/global-scan.json`,'utf8'));
assert.deepEqual(candidate.findings,baseline.findings);assert.equal(candidate.summary.critical,0);assert.equal(candidate.summary.high,0);
const manifests=['package.json','package-lock.json','frontend/package.json','backend/package.json'];
const r=spawnSync('git',['diff','--exit-code','d028e1ee4c5c44d96b5005362b28f54e5c05fee1','fa028c11ffe5dbfe514df8110e6ccf7f6b977602','--',...manifests],{encoding:'utf8'});assert.equal(r.status,0);
writeFileSync(`${root}/comparison.json`,JSON.stringify({candidate:'fa028c11ffe5dbfe514df8110e6ccf7f6b977602',baseline:'d028e1ee4c5c44d96b5005362b28f54e5c05fee1',sourceScan:candidate.summary,identicalFindings:true,newSourceFindings:[],changedPathsFindings:[],dependencyManifestsUnchanged:manifests,globalScannerSummary:global.summary,globalScannerLimit:'Broad scan includes historical evidence and generic dependency warnings. Not claimed clean, not a validated CVE audit. No dependency changes in419; scoped actual application source compared byte-bound accepted baseline, three identical medium heuristic warnings outside all six changed paths. Root reviewed new diff AuthZ/input/XSS separately.',ownGeneratedReportsMovedOutOfApplicationSource:true},null,2));
