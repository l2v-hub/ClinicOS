import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const own=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1')),repo='C:/w-424-qa',prior=repo+'/artifacts/task-validation/424-reading-action/independent-qa';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
assert.equal(fs.existsSync(path.join(own,'immutable-manifest.json')),false);
const manifestBytes=fs.readFileSync(prior+'/immutable-manifest.json');assert.equal(sha(manifestBytes),'7079affea9bc5191002a1af77c113fd3016cddcb09786568afba211978175058');
const old=read(prior+'/immutable-manifest.json');for(const e of old.files){const b=fs.readFileSync(path.join(prior,e.path));assert.equal(sha(b),e.sha256,e.path);assert.equal(b.length,e.bytes,e.path);}
const source=read(prior+'/source-after/source-receipt.json');for(const e of source.files)assert.equal(sha(fs.readFileSync(path.join(repo,e.path))),e.sha256,e.path);
const before=read(path.join(own,'deployment-before.json')),after=read(path.join(own,'deployment-after.json'));assert.deepEqual(before.vercel,after.vercel);
const recipes=read(path.join(own,'pre-run/continuity-and-frozen-recipes.json'));for(const r of recipes.recipes)assert.equal(sha(fs.readFileSync(r.target)),r.sha256);
const ordinary=read(path.join(own,'ordinary01/test-results/browser-results.json')),supplemental=read(path.join(own,'supplemental01/test-results/browser-results.json'));
assert.equal(ordinary.outcomes.length,17);assert.equal(supplemental.outcomes.length,4);
for(const r of [...ordinary.outcomes,...supplemental.outcomes])assert.equal(r.status,'PASS');
const guardSummary=[];for(const [label,result] of [['ordinary',ordinary],['supplemental',supplemental]])for(const [index,s] of result.states.entries()){
 for(const key of ['clinicalWrites','unexpected','external','pageErrors'])assert.deepEqual(s[key],[],key);
 const unexpectedConsole=s.errors.filter(e=>!/^Failed to load resource: the server responded with a status of (503|409) \(/.test(e));assert.deepEqual(unexpectedConsole,[]);
 for(const e of s.httpErrors)assert.ok([503,409].includes(e.status)&&(e.path.endsWith('/ack')||e.path==='/patients/diary-unread-patient-counts'));
 guardSummary.push({lane:label,index,forbiddenWrites:0,unexpectedApis:0,externalRequests:0,pageErrors:0,expectedNegativeHttp:s.httpErrors,syntheticReceipts:s.allowedSyntheticReceipts.length});
}
for(const lane of ['ordinary01','supplemental01'])assert.equal(read(path.join(own,lane,'execution-result.json')).exitCode,0);
const files=[];function walk(dir,prefix=''){for(const n of fs.readdirSync(dir)){if(n==='immutable-manifest.json')continue;const p=path.join(dir,n),rel=prefix+n;if(fs.statSync(p).isDirectory())walk(p,rel+'/');else files.push({path:rel,sha256:sha(fs.readFileSync(p)),bytes:fs.statSync(p).size});}}
const receipt={at:new Date().toISOString(),decision:'READY FOR CODEX QA',previousManifestVerified:sha(manifestBytes),previousFilesVerified:129,previousSourceFilesUnchanged:source.files.length,currentProduction:after.vercel,ordinaryCases:17,supplementalCases:4,guardSummary,screenshotsVisuallyReviewed:['supplemental01/screenshots/direct-chart-confirmed.png','ordinary01/screenshots/mobile-after-brief-notes.png'],browserLane:'FREE; both child processes exit0 and browser finally blocks complete; no local servers started',gitStatus:execFileSync('git',['status','--short'],{cwd:repo}).toString(),limitations:['Previous32focused/12realDB reviewed, not rerun in this continuation','CI status not certified by this independent worker','Mock receipt reload is not DB persistence proof','No hardware or human PHI/global vulnerability/global green certification']};
fs.writeFileSync(path.join(own,'verification-receipt.json'),JSON.stringify(receipt,null,2));
const privacy=read(path.join(own,'privacy-receipt.json'));assert.equal(privacy.credentialFindings,0);
walk(own);files.sort((a,b)=>a.path.localeCompare(b.path));const m={decision:'READY FOR CODEX QA',applicationCandidate:recipes.candidate,currentProductionCommit:recipes.current,previousManifestSha256:sha(manifestBytes),recipes:recipes.recipes.map(r=>({name:r.name,sha256:r.sha256})),fileCount:files.length,files};fs.writeFileSync(path.join(own,'immutable-manifest.json'),JSON.stringify(m,null,2));console.log(JSON.stringify({decision:m.decision,files:files.length,manifestSha256:sha(fs.readFileSync(path.join(own,'immutable-manifest.json'))),screenshots:files.filter(f=>f.path.endsWith('.png')).length,traces:files.filter(f=>f.path.endsWith('.zip')).length,videos:files.filter(f=>f.path.endsWith('.webm')).length}));
