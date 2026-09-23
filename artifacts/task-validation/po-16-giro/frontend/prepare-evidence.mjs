import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const directory = 'artifacts/task-validation/po-16-giro/frontend';
const baseline = '53e57d694850775b85ad1d22904e7bb1e6e84618';
const git = (...args) => execFileSync('git',args,{stdio:['ignore','pipe','ignore'],maxBuffer:64*1024*1024});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = path => sha(readFileSync(path));
const write = (name,data) => writeFileSync(directory+'/'+name,JSON.stringify(data,null,2)+'\n');
assert.equal(git('rev-parse','HEAD').toString().trim(),baseline);
assert.equal(git('branch','--show-current').toString().trim(),'codex/po16-final-ui');
assert.equal(git('diff','--name-only',baseline,'--','frontend/src','frontend/package.json','frontend/package-lock.json','package.json','package-lock.json','backend').toString().trim(),'');
assert.equal(git('ls-files','--others','--exclude-standard','frontend/src','backend').toString().trim(),'');
const protectedFiles = {
  'run-claude-queue.ps1':'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008',
  'start-claude-team.ps1':'606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78',
  'frontend/src/components/operator/assessments/AssessmentWorkspace.css':'b36eca8bc9fd9f584410f7ff3a3469f812f197d6e96a435659902adc5ee91be1',
};
for (const [path,expected] of Object.entries(protectedFiles)) assert.equal(hash(path),expected,path);
const paths = git('ls-tree','-r','--name-only',baseline,'--','frontend/src','frontend/package.json','frontend/package-lock.json','frontend/vite.config.ts','frontend/tsconfig.json','frontend/tsconfig.app.json','frontend/tsconfig.node.json','frontend/eslint.config.js','frontend/index.html','package.json','package-lock.json','scripts/stub-css-loader.mjs').toString().trim().split('\n').filter(Boolean).sort();
const batch = execFileSync('git',['cat-file','--batch'],{input:paths.map(path=>baseline+':'+path+'\n').join(''),stdio:['pipe','pipe','ignore'],maxBuffer:64*1024*1024});
let offset=0;
const files=paths.map(path=>{
  const end=batch.indexOf(10,offset), header=batch.subarray(offset,end).toString();
  const match=header.match(/^[a-f0-9]+ blob (\d+)$/); assert.ok(match,path);
  const size=Number(match[1]), original=batch.subarray(end+1,end+1+size); offset=end+size+2;
  const current=readFileSync(path);
  if (!original.equals(current)) {
    assert.ok(!original.toString('utf8').includes('\ufffd'),path);
    assert.equal(original.toString('utf8').replaceAll('\r\n','\n'),current.toString('utf8').replaceAll('\r\n','\n'),path);
  }
  return {path,bytes:current.length,sha256:sha(current),baselineCanonicalSha256:sha(original),unchangedVerified:true};
});
assert.equal(offset,batch.length);
assert.equal(files.length,563);
const now=new Date().toISOString();
const sourceTreeSha256=sha(JSON.stringify(files.map(({path,sha256})=>({path,sha256}))));
write('baseline-source-manifest.json',{task:'PO-16-frontend',baseline,generatedAtUtc:now,capture:'Before application implementation; exact Git objects and current bytes verified, allowing Git CRLF normalization.',sourceTreeSha256,files,protectedFiles});
const require=createRequire(process.cwd()+'/package.json');
const runtime={node:process.version,packages:Object.fromEntries(['typescript','tsx','react','vite'].map(name=>[name,require(name+'/package.json').version])),dependencyJunction:readlinkSync('node_modules'),dependencyWritePolicy:'Shared target read only by policy; no install/shared runtime writes.',localCaches:['frontend/node_modules/.tmp','frontend/node_modules/.vite-temp']};
const inputs=Object.fromEntries(['task-contract.snapshot.md','rifiniture-osservate.snapshot.md','root-assignment.snapshot.md'].map(name=>[name,hash(directory+'/'+name)]));
for(const name of ['task-contract','rifiniture-osservate']) assert.equal(hash(directory+'/'+name+'.snapshot.md'),hash('C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-16-giro/'+name+'.md'));
const ledger=JSON.parse(readFileSync(directory+'/ledger-preparation-claim.json','utf8'));
const result=JSON.parse(ledger.content.find(item=>item.type==='text').text); assert.equal(result.success,true);
const claim={task:'PO-16-frontend-preparation',owner:'/root/po01_frontend_audit',integrationOwner:'/root',worktree:process.cwd(),branch:'codex/po16-final-ui',baseline,phase:'preparation',applicationGo:false,
  authority:'Root explicitly assigned isolated PO16 checkout for preparation only during PO15 deploy; application GO follows PO15 published and verified.',
  decision:'allow-scoped-preparation',ledgerClaim:'PO-16-frontend-preparation',ledgerClaimant:'agent:codex-po16-frontend:coder',ledgerClaimedAt:result.claim.claimedAt,status:'ready-awaiting-root-go',claimActive:true,applicationClaimActive:false,
  allowedPaths:[directory,'node_modules',...runtime.localCaches],protectedFiles,inputs,runtime,ports:[],
  excluded:['application source/tests until root GO','backend','package manifests','lockfiles','shared dependencies','servers','ports','commit','push','deploy','live patient writes'],
  recall:'No relevant MNA presentation/touch-target memory match. Root contract/assignment and existing source are authoritative; existing hierarchy retained.',
  timestamp:now,sourceTreeSha256};
write('claims-preparation.json',claim); write('claims.json',claim);
write('preparation-session.json',{task:claim.task,sessionId:'po16-frontend-preparation-'+result.claim.claimedAt,owner:claim.owner,startedAt:result.claim.claimedAt,recordedAt:now,worktree:process.cwd(),branch:claim.branch,baseline,decision:claim.decision,authority:claim.authority,claim:result.claim,sourceTreeSha256,inputs,protectedFiles,implementationAuthorized:false,publicationAuthorized:false,status:'ready-awaiting-root-go',registration:'Local source-bound session receipt and Ruflo exact-directory claim; no external issue supervisor started.'});
write('runtime-preparation.json',{task:'PO-16-frontend',generatedAtUtc:now,baseline,runtime,protectedFiles,inputs,baselineInputs:files.length,applicationSourceChanges:0,applicationValidationRun:false});
console.log(JSON.stringify({baseline,baselineInputs:files.length,applicationSourceChanges:0,applicationGo:false,sourceTreeSha256,inputs,runtime}));
