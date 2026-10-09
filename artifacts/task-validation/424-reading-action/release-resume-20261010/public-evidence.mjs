import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const own='artifacts/task-validation/424-reading-action/release-resume-20261010',root='artifacts/task-validation/424-reading-action',branch='codex/bug-424-reading-action',sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:100e6});assert.equal(r.status,0,'Evidence read failed');return r.stdout.trim();},proof=git(['rev-parse','HEAD']);assert.ok(git(['ls-remote','origin','refs/heads/'+branch]).startsWith(proof+'\t'));
const paths=['root-ordinary/screenshots/desktop-after-brief-notes.png','root-ordinary/screenshots/authoritative-read-active-urgency.png','root-supplemental/screenshots/direct-chart-confirmed.png'],images=[];
for(const path of paths){const url=`https://raw.githubusercontent.com/l2v-hub/ClinicOS/${proof}/${own}/${path}`,response=await fetch(url);assert.equal(response.status,200);const hash=sha(Buffer.from(await response.arrayBuffer()));assert.equal(hash,sha(readFileSync(own+'/'+path)));images.push({path,url,http:200,sha256:hash});}
writeFileSync(own+'/public-preverification.json',JSON.stringify({decision:'PUBLIC PINNED SYNTHETIC PNG BYTES VERIFIED',proofCommit:proof,images,at:new Date().toISOString()},null,2));console.log(JSON.stringify({proofCommit:proof,verifiedImages:images.length}));
