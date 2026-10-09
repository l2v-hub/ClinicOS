import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/424-reading-action',qa='C:/w-424-qa/'+root+'/independent-qa',out=root+'/root-rerun',hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(out),false);mkdirSync(out+'/recipes',{recursive:true});
const frozen=JSON.parse(readFileSync(qa+'/recipes-frozen.json'));
assert.equal(frozen.candidate,'67d21c3e9257a5acb8c9b25130c9417fb92185fb');
const records=[];
for(const name of ['browser.mjs','qa-server.mjs','commands.mjs','db-regression.mjs','prisma-validation.mjs','source-receipt.mjs']) {
  const bytes=readFileSync(qa+'/'+name),receipt=frozen.files.find(f=>f.path===name);
  assert.ok(receipt);assert.equal(hash(bytes),receipt.sha256);
  copyFileSync(qa+'/'+name,out+'/recipes/'+name);records.push({name,sha256:hash(bytes)});
}
const extra=readFileSync(qa+'/supplemental03.mjs'),extraReceipt=JSON.parse(readFileSync(qa+'/supplemental03.mjs.preexecution.json'));
assert.ok(JSON.stringify(extraReceipt).includes(hash(extra)),'Supplemental exact pre-execution hash required');
copyFileSync(qa+'/supplemental03.mjs',out+'/recipes/supplemental03.mjs');records.push({name:'supplemental03.mjs',sha256:hash(extra)});
const source=spawnSync(process.execPath,[root+'/source-receipt.mjs','67d21c3e9257a5acb8c9b25130c9417fb92185fb',out+'/source-before'],{encoding:'utf8'});assert.equal(source.status,0);process.stdout.write(source.stdout);
writeFileSync(out+'/pre-run.json',JSON.stringify({decision:'AUTHORIZED EXACT INDEPENDENT RECIPE ROOT RERUN',applicationCommit:frozen.candidate,authority:'Human implementation/release authorization; QA browser7515 stopped/free, root sole writer/browser',qaSeal:'Still completing, promotion prohibited until immutable manifest validated; these exact pre-execution recipe hashes will be compared to final seal',records,sourceBound:true,at:new Date().toISOString()},null,2));
