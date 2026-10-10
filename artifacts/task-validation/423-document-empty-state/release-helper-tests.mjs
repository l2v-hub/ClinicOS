import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyCoverage,verifyLocalPinned,verifyCanonical} from './canonical-blobs.mjs';
const initial=process.cwd(),root='artifacts/task-validation/423-document-empty-state',out=initial+'/'+root+'/release-helper-tests.json',temp=mkdtempSync(tmpdir()+'/clinicos-423-release-guards-'),cases=[];
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);return r.stdout.trim();};
const test=(name,fn)=>{fn();cases.push({name,status:'PASS'});};
writeFileSync(initial+'/'+root+'/release-helper-test-policy.json',JSON.stringify({decision:'AUTHORIZED ISOLATED READ-GATE FAILURE-PATH TESTS',scope:temp,productionWrites:false,applicationWrites:false,at:new Date().toISOString()},null,2));
try{
 process.chdir(temp);git(['init','--quiet']);git(['config','core.autocrlf','false']);mkdirSync(root,{recursive:true});
 writeFileSync(root+'/validation-report.md','CLOSED — VERIFIED\n');writeFileSync(root+'/publication-manifest.json','{}');git(['add','--',root]);
 const bytes=readFileSync(root+'/validation-report.md'),rows=[{path:root+'/validation-report.md',gitBlobSha256:createHash('sha256').update(bytes).digest('hex')}];
 test('exact index coverage accepted',()=>verifyCoverage(rows));test('exact canonical blob accepted',()=>verifyCanonical(rows));
 writeFileSync(root+'/unscanned.json','{"synthetic":true}');git(['add','--',root+'/unscanned.json']);
 test('extra index artifact denied',()=>assert.throws(()=>verifyCoverage(rows)));git(['rm','--cached','--',root+'/unscanned.json']);
 test('duplicate manifest row denied',()=>assert.throws(()=>verifyCoverage([...rows,...rows])));
 git(['-c','user.name=Synthetic Guard Test','-c','user.email=guard423@example.test','commit','--quiet','-m','test: synthetic proof inputs']);const revision=git(['rev-parse','HEAD']);
 test('exact pinned proof accepted',()=>{verifyCoverage(rows,revision);verifyLocalPinned(['validation-report.md'],revision);});
 writeFileSync(root+'/validation-report.md','CLOSED — VERIFIED\r\n');test('CRLF-only local evidence accepted',()=>verifyLocalPinned(['validation-report.md'],revision));
 writeFileSync(root+'/validation-report.md','\uFEFFCLOSED — VERIFIED\n');test('local BOM drift denied',()=>assert.throws(()=>verifyLocalPinned(['validation-report.md'],revision)));
 writeFileSync(root+'/validation-report.md','IMPLEMENTED — NOT VERIFIED\n');test('unpublished local closure report denied',()=>assert.throws(()=>verifyLocalPinned(['validation-report.md'],revision)));
 writeFileSync(root+'/validation-report.md',Buffer.from([0xff,0xfe]));test('invalid UTF8 denied',()=>assert.throws(()=>verifyLocalPinned(['validation-report.md'],revision)));
 writeFileSync(root+'/validation-report.md',bytes);git(['add','--',root+'/unscanned.json']);git(['-c','user.name=Synthetic Guard Test','-c','user.email=guard423@example.test','commit','--quiet','-m','test: unscanned proof extra']);
 test('extra committed artifact denied',()=>assert.throws(()=>verifyCoverage(rows,git(['rev-parse','HEAD']))));
}finally{process.chdir(initial);}
writeFileSync(out,JSON.stringify({decision:'PASS',cases,temporarySyntheticRepository:temp,cleanup:'Retained temporary fixture, no recursive deletion',productionWrites:false,at:new Date().toISOString()},null,2));console.log(JSON.stringify({tests:cases.length,pass:cases.length}));
