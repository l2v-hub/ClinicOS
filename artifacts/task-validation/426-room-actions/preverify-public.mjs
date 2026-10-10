import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyCanonical} from './canonical-blobs.mjs';
const root='artifacts/task-validation/426-room-actions',app=JSON.parse(readFileSync(root+'/frozen-release-source.json')).applicationCommit,branch='codex/bug-426-room-actions',sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:100e6,windowsHide:true});assert.equal(r.status,0,'Public proof check failed safely');return r.stdout.trim();};
const proof=git(['rev-parse','HEAD']),publication=JSON.parse(readFileSync(root+'/publication-manifest.json'));assert.notEqual(proof,app);assert.equal(publication.applicationCommit,app);assert.match(git(['ls-remote','origin','refs/heads/'+branch]),new RegExp('^'+proof+'\\s'));assert.match(git(['ls-remote','origin','refs/heads/main']),new RegExp('^'+app+'\\s'));assert.ok(git(['diff','--name-only',app,proof]).split('\n').every(p=>p.startsWith(root+'/')));verifyCanonical(publication.files,proof);
const images=[];for(const entry of JSON.parse(readFileSync(root+'/public-images.json'))){const url=`https://raw.githubusercontent.com/l2v-hub/ClinicOS/${proof}/${root}/${entry.path}`,response=await fetch(url);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),sha(readFileSync(root+'/'+entry.path)));images.push({...entry,url,http:200,sha256:sha(bytes)});}
const receipt={applicationCommit:app,proofCommit:proof,decision:'PINNED PUBLIC PROOF PREVERIFIED',canonicalHashesVerified:publication.files.length,images,at:new Date().toISOString(),productionPatientTestMutations:0};writeFileSync(root+'/public-preverification.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
