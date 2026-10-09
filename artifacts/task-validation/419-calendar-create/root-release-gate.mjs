import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/419-calendar-create';
const origin='C:/w-419-qa/'+root+'/independent-qa419';
const destination=root+'/independent-qa419';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const manifestBytes=readFileSync(origin+'/immutable-manifest.json');
assert.equal(sha(manifestBytes),'9ad595c015aef9796c77093c9c7bf8e889b3f268872b25c58e52acca04e8b6bd');
assert.equal(existsSync(destination),false,'Never overwrite independent bundle');
const manifest=JSON.parse(manifestBytes);
for(const f of [...manifest.files,{path:'immutable-manifest.json',sha256:sha(manifestBytes)}]){
 assert.ok(!f.path.includes('..')&&!f.path.startsWith('/')&&!f.path.includes('runtime-cache/'));
 const bytes=readFileSync(origin+'/'+f.path);assert.equal(sha(bytes),f.sha256);
 mkdirSync(destination+'/'+f.path.split('/').slice(0,-1).join('/'),{recursive:true});
 copyFileSync(origin+'/'+f.path,destination+'/'+f.path);assert.equal(sha(readFileSync(destination+'/'+f.path)),f.sha256);
}
const integrity=read(root+'/independent-integrity-receipt.json');assert.equal(integrity.immutableFilesVerified,102);assert.equal(integrity.sourceFilesVerified,1466);
const commands=read(root+'/root-final/commands/command-results.json');
for(const r of commands.records)if(r.name!=='full-regression')assert.equal(r.exit,0,r.name);
assert.deepEqual(commands.newFailures,[]);assert.equal(commands.records.find(r=>r.name==='focused').pass,16);
for(const [p,n] of [[root+'/root-final/browser/test-results/results.json',9],[root+'/root-rerun/run/test-results/results.json',13],[origin+'/attempt-1/run/test-results/results.json',13]]){
 const result=read(p);assert.equal(result.results.length,n);for(const item of result.results)assert.equal(item.status,'PASS');
}
const rerun=read(root+'/root-rerun/pre-run/snapshot.json');
for(const f of rerun.files){assert.equal(sha(readFileSync(root+'/root-rerun/'+f.path)),f.sha256);assert.equal(sha(readFileSync(origin+'/'+f.path)),f.sha256);}
const source=read(root+'/root-final/pre-run/source/source-receipt.json');
const after=read(root+'/root-final/after/source-receipt.json');assert.equal(source.sourceSha256,after.sourceSha256);
const security=read(root+'/security/comparison.json');assert.deepEqual(security.newSourceFindings,[]);assert.deepEqual(security.changedPathsFindings,[]);
const receipt={decision:'AUTHORIZED SCOPED APPLICATION PROMOTION',applicationCommit:manifest.applicationCommit,baselineCommit:manifest.baselineCommit,sourceSha256:source.sourceSha256,canonicalSourceSha256:'fb3994317872b6949f7513955f6f1a33e0634f474a620fdae5a1a4e9ae2143ef',qaManifestSha256:sha(manifestBytes),immutableFilesVerified:102,rootOrdinaryBrowser:9,independentBrowser:13,rootIndependentRerun:13,focusedEach:16,unchangedBaselineFailures:12,newFailures:0,originalAcceptanceCriteria:4,allOriginalCriteriaPassed:true,review:'Main read contract, independent recipes/report/diff/privacy scanner and seal; visually inspected desktop/mobile original independent PNGs; reran exact independent recipe; hashes/source verified.',security:'Scoped 3 identical medium baseline warnings, no new changed-path findings; global 512 heuristic findings NOT claimed green or validated CVEs.',productionPatientTestMutations:0,authority:'Direct human authorization for sequential scoped fixes and deployment; root sole integration writer',at:new Date().toISOString(),remaining:'Exact-source deployment, compiled-online guards, completed CI comparison and public immutable evidence before issue closure'};
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
