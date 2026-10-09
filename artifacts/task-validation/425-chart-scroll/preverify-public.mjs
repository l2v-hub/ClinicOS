import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/425-chart-scroll',app='b7ae14d120c1e70ccf72784206a505f8c48f975e',branch='codex/bug-425-chart-scroll',sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:100e6});assert.equal(r.status,0,'Public proof check failed safely');return r.stdout.trim();};
const proof=git(['rev-parse','HEAD']),publication=JSON.parse(readFileSync(root+'/publication-manifest.json'));assert.notEqual(proof,app);assert.equal(publication.applicationCommit,app);assert.match(git(['ls-remote','origin','refs/heads/'+branch]),new RegExp('^'+proof+'\\s'));assert.match(git(['ls-remote','origin','refs/heads/main']),new RegExp('^'+app+'\\s'));assert.ok(git(['diff','--name-only',app,proof]).split('\n').every(p=>p.startsWith(root+'/')));
for(const row of publication.files){const r=spawnSync('git',['show',proof+':'+row.path],{maxBuffer:100e6});assert.equal(r.status,0);assert.equal(sha(r.stdout),row.gitBlobSha256);}
const paths=['compiled-online/browser03/doctor-1280-modal-save.png','compiled-online/browser03/doctor-390-modal-save.png','compiled-online/browser01/doctor-768-after-wheel.png'],images=[];
for(const path of paths){const url=`https://raw.githubusercontent.com/l2v-hub/ClinicOS/${proof}/${root}/${path}`,r=await fetch(url);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),sha(readFileSync(root+'/'+path)));images.push({path,url,http:200,sha256:sha(bytes)});}
const receipt={applicationCommit:app,proofCommit:proof,decision:'PINNED PUBLIC PROOF PREVERIFIED',canonicalHashesVerified:publication.files.length,images,at:new Date().toISOString(),productionPatientTestMutations:0};writeFileSync(root+'/public-preverification.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
