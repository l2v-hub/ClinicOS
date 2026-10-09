import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const result=spawnSync('pwsh',['-NoProfile','-File','artifacts/task-validation/412-clinical-topics/release-inspection.ps1'],{encoding:'utf8',maxBuffer:4*1024*1024});
if(result.status!==0){console.log(result.stdout.trim());process.exit(result.status||1);}
const receipt=JSON.parse(result.stdout);assert.equal(receipt.decision,'VERIFIED RELEASE');
writeFileSync('artifacts/task-validation/412-clinical-topics/deployment-receipt.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify({applicationCommit:receipt.applicationCommit,decision:receipt.decision,deployment:receipt.vercel.id,state:receipt.vercel.state}));
