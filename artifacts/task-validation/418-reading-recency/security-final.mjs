import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync,copyFileSync } from 'node:fs';
const root='artifacts/task-validation/418-reading-recency';
const source='d028e1ee4c5c44d96b5005362b28f54e5c05fee1';
const run=spawnSync('npx.cmd',['--no-install','ruflo','security','scan','--target','frontend/src','--depth','deep','--type','code','--output','json'],{shell:true,encoding:'utf8',maxBuffer:20*1024*1024});
const log=(run.stdout||'')+(run.stderr||'');writeFileSync(root+'/security-final-command-rerun.log',log);
assert.equal(run.status,0,'Deep scan execution failed, raw evidence retained');
// Installed CLI ignores output=json for stdout, but persists the actual structured scan.
// Retain first failed JSON-extraction attempt; bind this record to the just-executed scan.
const recordPath='frontend/src/.claude/security-scans/scan-code-deep.json';
const candidate=JSON.parse(readFileSync(recordPath,'utf8'));
assert.ok(Date.now()-Date.parse(candidate.timestamp)<60_000);
assert.equal(candidate.target,'frontend/src');assert.equal(candidate.depth,'deep');assert.equal(candidate.type,'code');
writeFileSync(root+'/security-final-scan-data.json',JSON.stringify(candidate,null,2));
const pinned=spawnSync('git',['show','2e9c3233ac9e897d3fee1061c51c5f6bda8a6799:artifacts/task-validation/417-vitals-form/security-frontend-scan-data.json'],{encoding:'utf8'});assert.equal(pinned.status,0);
const baseline=JSON.parse(pinned.stdout);writeFileSync(root+'/security-baseline-scan-data.json',pinned.stdout);
assert.deepEqual(candidate.findings,baseline.findings);
const diff=spawnSync('git',['diff','--name-only','02b4ba89af291186a72e040b868da024bb865164',source],{encoding:'utf8'});assert.equal(diff.status,0);
const paths=diff.stdout.trim().split(/\r?\n/);assert.equal(paths.length,12);
for(const p of paths){assert.ok(p.startsWith('frontend/src/'));if(p.endsWith('.tsx'))assert.doesNotMatch(readFileSync(p,'utf8'),/dangerouslySetInnerHTML|console\.log|fetch\(/);}
const newTouchedFindings=candidate.findings.filter(f=>paths.some(p=>f.location.replaceAll('\\','/').startsWith(p.replace('frontend/src/','')+':')));assert.deepEqual(newTouchedFindings,[]);
writeFileSync(root+'/security-receipt.json',JSON.stringify({applicationCommit:source,decision:'SCOPED SECURITY PASS',newTouchedFindings,baselineFindings:baseline.findings,summary:candidate.summary,paths,scope:'Exact same three pre-existing MEDIUM frontend findings outside changed paths; no new dependencies or endpoints/auth/config/clinical validators. No global security cleanliness assertion; source/dist and canonical publication credential scans separate.',productionPatientTestMutations:0},null,2));
console.log('Scoped deep code scan matches pinned baseline, zero new touched findings');
