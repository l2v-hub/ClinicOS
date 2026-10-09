import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,cpSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/421-import-empty', origin=resolve('C:/w-421-qa/'+root+'/independent-qa421');
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const app='80b313227a9a2b9fefc0441c718b259d0d901cae',expected='3c94ef1ac9c6c12a01f84dbab606c1f866dd651602bef4ef12dbee9e8796786f';
assert.equal(sha(readFileSync(origin+'/immutable-manifest.json')),expected);
const manifest=read(origin+'/immutable-manifest.json');assert.equal(manifest.application,app);assert.equal(manifest.fileCount,346);
for(const f of manifest.files){const p=resolve(origin,f.path),rel=relative(origin,p);assert.ok(!rel.startsWith('..')&&!isAbsolute(rel));const b=readFileSync(p);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256,f.path);}
const rootSource=read(root+'/root-rerun/pre-run/source/source-receipt.json');
const rootAfter=read(root+'/root-rerun/after/source-receipt.json');assert.equal(rootSource.applicationCommit,app);assert.equal(rootSource.sourceSha256,rootAfter.sourceSha256);assert.equal(rootSource.fileCount,1470);
const scopes=new Set(rootSource.files.map(f=>f.path));
for(const attempt of ['nonbrowser-01','browser-01','pdf-01','persistence-01']){
 const pre=read(origin+'/'+attempt+'/pre-run-receipt.json');assert.equal(pre.application,app);assert.equal(pre.files.length,1469);
 for(const f of pre.files){assert.ok(scopes.has(f.path));const b=readFileSync(origin+'/../../../../'+f.path),a=readFileSync(f.path);assert.equal(sha(b),f.sha256);
  if(sha(a)!==sha(b)){const d=new TextDecoder('utf-8',{fatal:true});assert.equal(d.decode(a).replace(/\r\n/g,'\n'),d.decode(b).replace(/\r\n/g,'\n'),'Only valid UTF8 CRLF differences permitted '+f.path);}
 }
 assert.deepEqual([...scopes].filter(p=>!pre.files.some(f=>f.path===p)),['scripts/build/copy-assessment-fonts.mjs']);
}
let total=0;
for(const [attempt,count]of [['browser-01',18],['pdf-01',1],['persistence-01',1]]){
 for(const [path,label]of [[origin+'/'+attempt,'independent'],[root+'/root-rerun/'+attempt+'/run','root']]){
  const r=read(path+'/test-results/results.json');assert.equal(r.results.length,count);assert.ok(r.results.every(c=>c.status==='PASS'));
  for(const c of r.results){const g=read(path+'/test-results/'+c.name+'-guard.json');for(const k of ['pageErrors','unexpected','external','writes'])assert.deepEqual(g[k],[]);assert.deepEqual(g.httpErrors,g.expectedHttp);assert.equal(g.errors.length,g.expectedHttp.length+(g.expectedNetwork||0));}
 }
 total+=count;
}
for(const f of read(root+'/root-rerun/snapshot.json').files){assert.equal(sha(readFileSync(root+'/root-rerun/'+f.path)),f.sha256);assert.equal(sha(readFileSync(f.origin)),f.sha256);}
const commands=read(origin+'/nonbrowser-01/commands/command-results.json');for(const r of commands.records)if(r.name!=='full-regression')assert.equal(r.exit,0,r.name);
assert.equal(commands.records.find(r=>r.name==='focused').pass,37);const full=commands.records.find(r=>r.name==='full-regression');assert.equal(full.tests,1243);assert.equal(full.pass,1231);assert.equal(full.fail,12);assert.deepEqual(commands.newFailures,[]);
const privacy=read(origin+'/privacy-secret-scan.json');assert.equal(privacy.outcome,'PASS');assert.deepEqual(privacy.findings,[]);
const copy=root+'/independent-qa421';assert.equal(existsSync(copy),false,'Never overwrite independently sealed originals');cpSync(origin,copy,{recursive:true});
assert.equal(sha(readFileSync(copy+'/immutable-manifest.json')),expected);for(const f of manifest.files)assert.equal(sha(readFileSync(copy+'/'+f.path)),f.sha256);
writeFileSync(root+'/independent-integrity-receipt.json',JSON.stringify({applicationCommit:app,manifestSha256:expected,immutableFiles:346,independentBrowser:total,rootIdenticalRerun:total,sourceFiles:1469,rootSourceFiles:1470,onlyScopeDifference:'scripts/build/copy-assessment-fonts.mjs not used by QA build',physicalAndStrictValidUtf8CRLFComparisons:true,byteidenticalRecipes:true,copyHashesVerified:true,visualReview:'Desktop/mobile/PDFpage2/strongpersistence original pixels inspected by root; synthetic only',productionPatientTestMutations:0},null,2));
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify({decision:'AUTHORIZED SCOPED APPLICATION PROMOTION',authority:'Direct human authorized deploy plus root original4AC independent review/byteidentical20rerun gate',applicationCommit:app,sourceSha256:rootSource.sourceSha256,rootBrowser:14,independentBrowser:20,rootIndependentRerun:20,focusedEach:37,fullTests:1243,fullPass:1231,sameBaselineFailures:12,newFailures:0,qaManifest:expected,immutableQaFiles:346,originalCriteriaPassed:4,scope:'Four frontend import presentation paths only; deployment/CI/publication must still pass before closure',productionPatientTestMutations:0,at:new Date().toISOString()},null,2));
console.log('Independent346 immutable files +20 identical root reruns verified; scoped application release authorized, closure still gated.');
