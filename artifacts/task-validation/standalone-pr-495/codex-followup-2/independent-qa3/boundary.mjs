import {readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const root='/workspace/.clinicos-cloud/495-continuation3-independent-qa-20261018', repo='/workspace/clinicos-demo-bearer-readiness', author='/workspace/.clinicos-cloud/495-continuation3-author-20261018';
export const hash=x=>createHash('sha256').update(x).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repo});
export async function capture(name){
 assert.equal(git('rev-parse','HEAD').toString().trim(),'efd9e1a4e5ddab4488a1911f40718a14ec143014');
 const paths=git('diff','--name-only','ba5b512f63720e09e09afd53ec69d3cd5f36aec1','HEAD').toString().trim().split('\n');
 assert.deepEqual(paths,['scripts/automation/inspect-demo-bearer-readiness.mjs','scripts/automation/inspect-demo-bearer-readiness.test.mjs']);
 const previous=JSON.parse(await readFile(author+'/prior-proof-manifest.json'));
 assert.equal(previous.length,64);
 const proof=[]; for(const f of previous){const blob=git('show','HEAD:'+f.path);assert.equal(hash(blob),f.sha256);assert.equal(blob.length,f.bytes);let working='sparse-absent';try{const b=await readFile(repo+'/'+f.path);assert.equal(hash(b),f.sha256);working='verified';}catch(e){if(e.code!=='ENOENT')throw e;}proof.push({...f,gitBlobVerified:true,working});}
 assert.equal(hash(await readFile(author+'/freeze.json')),'b2ccc64d832d0fbbcf20022cf2d84d1c98bfee0859e69e7608729ad334f43783');
 assert.equal(hash(await readFile(author+'/seal.json')),'aac1f9dd0eab85ae19c0039d6bc6df909975f8373f213083d937361c443310d4');
 for(const f of JSON.parse(await readFile(author+'/seal.json')).files)assert.equal(hash(await readFile(author+'/'+f.path)),f.sha256);
 const files=[...git('ls-tree','-r','--name-only','HEAD','scripts/automation','.github/workflows').toString().trim().split('\n'), 'artifacts/task-validation/standalone-pr-495/codex-followup-1/task-contract.md','artifacts/task-validation/standalone-pr-495/codex-followup-2/task-contract.md'];
 const seals=[];for(const p of files){let b;try{b=await readFile(repo+'/'+p);}catch(e){if(e.code!=='ENOENT')throw e;b=git('show','HEAD:'+p);}seals.push({path:p,sha256:hash(b)});}
 const freeze=JSON.parse(await readFile(author+'/freeze.json'));for(const f of freeze.sourceFiles)assert.equal(hash(await readFile(repo+'/'+f.path)),f.sha256);
 assert.equal(hash(await readFile(repo+'/artifacts/task-validation/standalone-pr-495/codex-followup-2/task-contract.md')),'dd6ad7e99fb31488f6c76fa817544b1ff78377a95132eb37d69463ac50f7a0bd');
 const reservation=JSON.parse(await readFile('/workspace/.clinicos-cloud/codex-after-claude-20261018/495-qa3-reservation.json'));assert.equal(reservation.nonce,'889f5d9f-2f11-48d0-a79a-3f10dda820b3');assert.equal(reservation.stateReadbackVerified,true);
 const record={capturedAt:new Date().toISOString(),sourceSha:'efd9e1a4e5ddab4488a1911f40718a14ec143014',changedPaths:paths,previousProof:proof,seals,authorSealVerified:true,reservationNonce:reservation.nonce};
 await writeFile(root+'/'+name+'.json',JSON.stringify(record,null,2)+'\n');return record;
}
