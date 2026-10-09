import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/425-chart-scroll',app='b7ae14d120c1e70ccf72784206a505f8c48f975e';
const read=p=>JSON.parse(readFileSync(root+'/'+p)),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),app);
const before=read('root-rerun2/source-before.json'),after=read('root-rerun2/source-after.json');assert.deepEqual(before,after);assert.equal(after.head,app);assert.equal(after.files.length,1534);
const qaBytes=readFileSync(root+'/independent-qa2/artifact-manifest.json'),qa=JSON.parse(qaBytes);assert.equal(qa.head,app);
assert.match(readFileSync(root+'/independent-qa2/validation-report.md','utf8'),/^QA Verdict: READY FOR CODEX QA$/m);
for(const f of qa.files)assert.equal(hash(readFileSync(root+'/independent-qa2/'+f.path)),f.sha256);
const qBefore=read('independent-qa2/source-before.json'),qAfter=read('independent-qa2/source-after.json');assert.equal(qBefore.head,app);assert.equal(qAfter.head,app);assert.deepEqual(qBefore.files,qAfter.files);
assert.deepEqual(before.files.map(f=>f.path),qBefore.files.map(f=>f.path));
const scope=['frontend/src/components/operator/PatientDetail.tsx','frontend/src/components/operator/PatientChartScroll.css','frontend/src/lib/__tests__/patientChartScroll.test.ts'];
const normalization=[];
for(let i=0;i<before.files.length;i++){const a=before.files[i],b=qBefore.files[i];if(a.sha256===b.sha256)continue;assert.ok(scope.includes(a.path));const rootBytes=readFileSync(a.path),qaSource=readFileSync('C:/w-425-qa2/'+a.path);const text=new TextDecoder('utf-8',{fatal:true});assert.equal(text.decode(rootBytes).replaceAll('\r\n','\n'),text.decode(qaSource).replaceAll('\r\n','\n'));assert.equal(hash(qaSource),b.sha256);normalization.push({path:a.path,policy:'strict UTF-8 CRLF-to-LF only'});}
const pre=read('root-rerun2/pre-run.json');assert.equal(pre.qaManifestSha256,hash(qaBytes));
for(const r of pre.records){assert.equal(hash(readFileSync(root+'/root-rerun2/recipes/'+r.name)),r.sha256);assert.equal(hash(readFileSync(root+'/independent-qa2/recipes/'+r.name)),r.sha256);}
let cases=0;
for(const [name,count]of [['browser01',10],['browser02',3],['browser03',3]]){
 const current=read('root-rerun2/'+name+'/results.json'),independent=read('independent-qa2/'+name+'/results.json');
 assert.equal(current.results.length,count);assert.equal(independent.results.length,count);assert.deepEqual(current.results.map(r=>[r.role,r.viewport]),independent.results.map(r=>[r.role,r.viewport]));
 for(const r of current.states)for(const key of ['unexpected','external','writes','pageErrors','consoleErrors','httpErrors'])assert.deepEqual(r[key],[]);
 if(name==='browser03')for(const r of current.results){assert.equal(r.clipping.length,110);assert.ok(r.clipping.every(f=>f.hit&&f.clipped.length===0&&f.fixedContainingBlock==='viewport'));assert.equal(r.saveBounds.hit,true);assert.ok(r.saveBounds.top>=0&&r.saveBounds.bottom<=r.viewport.height);}
 cases+=count;
}
for(const folder of ['root-rerun2','independent-qa2']){
 const commands=read(folder+'/commands01/command-results.json');assert.deepEqual(commands.newFailures,[]);assert.deepEqual(commands.focusedNewFailures,[]);
 for(const r of commands.records){if(r.name==='full-regression'){assert.equal(r.tests,1257);assert.equal(r.pass,1245);assert.equal(r.fail,12);assert.deepEqual(r.failures,commands.baselineFailures);}else if(r.name==='focused'){assert.equal(r.tests,44);assert.equal(r.pass,43);assert.equal(r.fail,1);assert.deepEqual(r.failures,['Assistant classic fallback with a known resident opens that resident section']);}else assert.equal(r.exit,0);}
 assert.deepEqual(read(folder+'/security01/comparison.json').newFindings,[]);
}
assert.equal(read('root-rerun2/server-stop.json').listenerFree,true);
const receipt={applicationCommit:app,decision:'AUTHORIZED SCOPED APPLICATION PROMOTION',authority:'Explicit human authorization plus independent QA and root byte-identical source-bound rerun',originalCriteriaPassed:4,independentBrowserCases:cases,rootIndependentRerun:cases,sourceSha256:after.sourceSha256,sourceFiles:1534,qaManifestSha256:hash(qaBytes),immutableQaFiles:qa.files.length,normalization,focusedEach:{tests:44,pass:43,exactBaselineFailures:1},fullEach:{tests:1257,pass:1245,exactBaselineFailures:12,newFailures:0},productionPatientTestMutations:0,scope,hardwareClaim:'Actual browser viewport dimensions only; no physical tablet/touch/ward certification',dbScope:'No backend/durable state changes or clinical writes; no mock persistence claim',failedCandidate:'796 rejected; failed142-artifact QA retained immutable, not waived',remainingReleaseGates:['Exact production deployment','Compiled online acceptance','Completed CI baseline comparison','Canonical privacy and pinned GitHub proof'],at:new Date().toISOString()};
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
