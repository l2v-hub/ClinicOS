import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const directory = 'artifacts/task-validation/po-15-catalogo/frontend';
const baseline = 'f445260a4ca4de872c1361ff19fc215179b097fe';
const git = (...args) => execFileSync('git',args,{stdio:['ignore','pipe','ignore'],maxBuffer:64*1024*1024});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = path => sha(readFileSync(path));
const write = (name,data) => writeFileSync(`${directory}/${name}`,JSON.stringify(data,null,2)+'\n');
assert.equal(git('rev-parse','HEAD').toString().trim(),baseline);
assert.equal(git('diff','--name-only',baseline,'--','frontend/src','frontend/package.json','frontend/package-lock.json','package.json','package-lock.json','backend').toString().trim(),'');
assert.equal(git('ls-files','--others','--exclude-standard','frontend/src','backend').toString().trim(),'');
const protectedFiles = {
  'run-claude-queue.ps1':'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008',
  'start-claude-team.ps1':'606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78',
  'frontend/src/components/operator/assessments/AssessmentWorkspace.css':'b36eca8bc9fd9f584410f7ff3a3469f812f197d6e96a435659902adc5ee91be1',
};
for (const [path,expected] of Object.entries(protectedFiles)) assert.equal(hash(path),expected,path);
const paths = git('ls-tree','-r','--name-only',baseline,'--','frontend/src','frontend/package.json','frontend/package-lock.json','frontend/vite.config.ts','frontend/tsconfig.json','frontend/tsconfig.app.json','frontend/tsconfig.node.json','frontend/eslint.config.js','frontend/index.html','package.json','package-lock.json','scripts/stub-css-loader.mjs').toString().trim().split('\n').filter(Boolean).sort();
const batch = execFileSync('git',['cat-file','--batch'],{input:paths.map(path=>`${baseline}:${path}\n`).join(''),stdio:['pipe','pipe','ignore'],maxBuffer:64*1024*1024});
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
const now=new Date().toISOString();
write('baseline-source-manifest.json',{task:'PO-15-frontend',baseline,generatedAtUtc:now,capture:'Before application implementation; exact Git objects and current bytes verified, allowing Git CRLF normalization.',files,protectedFiles});
const require=createRequire(`${process.cwd()}/package.json`);
const runtime={node:process.version,packages:Object.fromEntries(['typescript','tsx','react','vite'].map(name=>[name,require(`${name}/package.json`).version])),dependencyJunction:readlinkSync('node_modules'),dependencyWritePolicy:'Shared target read only by policy; no install/shared runtime writes.',localCaches:['frontend/node_modules/.tmp','frontend/node_modules/.vite-temp']};
const inputs=Object.fromEntries(['task-contract.snapshot.md','preparatory-review.snapshot.md','catalog-contract-proposal.snapshot.md'].map(name=>[name,hash(`${directory}/${name}`)]));
const ledger=JSON.parse(readFileSync(`${directory}/ledger-preparation-claim.json`,'utf8'));
const result=JSON.parse(ledger.content.find(item=>item.type==='text').text); assert.equal(result.success,true);
const claim={task:'PO-15-frontend-preparation',owner:'/root/po01_frontend_audit',integrationOwner:'/root',worktree:process.cwd(),branch:'codex/po15-catalog-ui',baseline,phase:'preparation',applicationGo:false,
  authority:'Root explicitly assigned isolated PO15 checkout for runtime/claims/contracts only; application GO follows PO14 live verification.',
  decision:'allow-scoped-preparation',ledgerClaim:'PO-15-frontend-preparation',ledgerClaimant:'agent:codex-po15-frontend:coder',ledgerClaimedAt:result.claim.claimedAt,status:'ready-awaiting-root-go',claimActive:true,applicationClaimActive:false,
  allowedPaths:[directory,'node_modules',...runtime.localCaches],protectedFiles,inputs,runtime,ports:[],
  excluded:['application source/tests until root GO','backend','package manifests','lockfiles','shared dependencies','servers','ports','commit','push','deploy','live patient writes'],
  recall:'No directly relevant catalog/NRS memory match. Root task/contract/preparatory source review and current source are authoritative. Existing hierarchy retained; no new agents.',timestamp:now};
write('claims-preparation.json',claim); write('claims.json',claim);
write('runtime-preparation.json',{task:'PO-15-frontend',generatedAtUtc:now,baseline,runtime,protectedFiles,inputs,baselineInputs:files.length,applicationSourceChanges:0,applicationValidationRun:false});
console.log(JSON.stringify({baseline,baselineInputs:files.length,applicationSourceChanges:0,applicationGo:false,inputs,runtime}));
