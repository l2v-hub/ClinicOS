import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const root='artifacts/task-validation/417-vitals-form';
const read=name=>JSON.parse(readFileSync(`${root}/${name}`));
const baseline=read('security-baseline-scan-data.json'),candidate=read('security-frontend-scan-data.json');
assert.deepEqual(candidate.findings,baseline.findings);
const touched=spawnSync('git',['diff','--name-only','0d7adc361b92c8466655d9ed830d2b87bbd0f419','02b4ba89af291186a72e040b868da024bb865164'],{encoding:'utf8'});assert.equal(touched.status,0);
const paths=touched.stdout.trim().split(/\r?\n/);
for(const path of paths){assert.ok(path.startsWith('frontend/src/'));if(path.endsWith('.tsx'))assert.doesNotMatch(readFileSync(path,'utf8'),/dangerouslySetInnerHTML|console\.log|fetch\(/);}
const newTouchedFindings=candidate.findings.filter(finding=>paths.some(path=>finding.location.replaceAll('\\','/').startsWith(path.replace('frontend/src/','')+':')));assert.deepEqual(newTouchedFindings,[]);
writeFileSync(`${root}/security-receipt.json`,JSON.stringify({applicationCommit:'02b4ba89af291186a72e040b868da024bb865164',checkedAt:new Date().toISOString(),touchedPaths:paths,newTouchedFindings,frontendDeepCodeBaseline:candidate.summary,baselineFindings:baseline.findings,scope:'No new source finding; identical3medium pre-existing frontend findings. Standard broad all148 incl7old dependency warnings NOT globally green. Clinical validators/API/auth/config/deps unchanged, React escapes input; all browser APIs guarded synthetic only. Canonical configured-credential and ZIP member publication scan still required.',productionPatientTestMutations:0},null,2));
