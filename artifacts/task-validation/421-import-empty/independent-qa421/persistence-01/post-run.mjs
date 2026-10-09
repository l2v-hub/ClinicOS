import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const base=resolve('artifacts/task-validation/421-import-empty/independent-qa421');
const hash=v=>createHash('sha256').update(v).digest('hex');
const attempts=['nonbrowser-01','browser-01','pdf-01'];
const comparisons=attempts.map(name=>{
 const pre=JSON.parse(readFileSync(base+'/'+name+'/pre-run-receipt.json','utf8'));
 const files=pre.files.map(({path,sha256,canonicalLF})=>{
  const raw=readFileSync(path),rootRaw=readFileSync('C:/w-421/'+path);
  const actual=hash(raw),canonical=hash(raw.toString('utf8').replace(/\r\n/g,'\n')),rootCanonical=hash(rootRaw.toString('utf8').replace(/\r\n/g,'\n'));
  if(actual!==sha256||canonical!==canonicalLF||canonical!==rootCanonical)throw Error('Source changed '+path);
  return {path,sha256:actual,canonicalLF:canonical,rootCanonicalLF:rootCanonical};
 });
 const r={attempt:name,fileCount:files.length,sourceSHA:pre.sourceSHA,canonicalSHA:pre.canonicalSHA,unchanged:true,files};
 writeFileSync(base+'/'+name+'/post-run-source.json',JSON.stringify(r,null,2));return {attempt:name,fileCount:files.length,sourceSHA:pre.sourceSHA,canonicalSHA:pre.canonicalSHA,unchanged:true};
});
const g=spawnSync('git',['show','dcb78dcc2cb4b333ca9553cace6ea13c87460467:artifacts/task-validation/420-import-recovery/root-final/commands/full-regression.log'],{encoding:'utf8',maxBuffer:40e6});
if(g.status!==0)throw Error('Pinned baseline absent');
writeFileSync(base+'/baseline-420-full-regression.log',g.stdout);
const results=JSON.parse(readFileSync(base+'/nonbrowser-01/commands/command-results.json','utf8'));
const baselineNames=[...new Set([...g.stdout.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m=>m[1]))].sort();
const currentNames=results.records.find(r=>r.name==='full-regression').failures;
if(JSON.stringify(baselineNames)!==JSON.stringify(currentNames))throw Error('Baseline failure difference');
const rawCounts=Object.fromEntries([...g.stdout.matchAll(/^ℹ (tests|pass|fail|skipped) (\d+)/gm)].map(m=>[m[1],Number(m[2])]));
const receipt={comparisons,baseline:{proofCommit:'dcb78dcc2cb4b333ca9553cace6ea13c87460467',application:'c00bff678dfc9845c31742bc5d0d750fbbb9603e',sha256:hash(g.stdout),counts:rawCounts,failures:baselineNames},current:results.records.find(r=>r.name==='full-regression'),newFailures:[],removedFailures:[],applicationScopeOnlyFourFrontendPaths:true};
writeFileSync(base+'/post-run-comparison.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt.comparisons));

