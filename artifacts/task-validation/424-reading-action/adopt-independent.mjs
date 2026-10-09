import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
const root='artifacts/task-validation/424-reading-action',origin='C:/w-424-qa/'+root+'/independent-qa',dest=root+'/independent-qa',app='67d21c3e9257a5acb8c9b25130c9417fb92185fb',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(dest),false);const bytes=readFileSync(origin+'/immutable-manifest.json'),manifest=JSON.parse(bytes);
assert.equal(sha(bytes),'7079affea9bc5191002a1af77c113fd3016cddcb09786568afba211978175058');
assert.equal(manifest.applicationCommit,app);assert.equal(manifest.files.length,129);assert.equal(manifest.allFailedAttemptsRetained,true);
for(const f of manifest.files){assert.ok(!f.path.startsWith('/')&&!f.path.includes('..')&&!f.path.includes('runtime-cache'));const b=readFileSync(origin+'/'+f.path);assert.equal(sha(b),f.sha256);mkdirSync(dirname(dest+'/'+f.path),{recursive:true});copyFileSync(origin+'/'+f.path,dest+'/'+f.path);assert.equal(sha(readFileSync(dest+'/'+f.path)),f.sha256);}
copyFileSync(origin+'/immutable-manifest.json',dest+'/immutable-manifest.json');
const pre=JSON.parse(readFileSync(dest+'/source-before/source-receipt.json')),post=JSON.parse(readFileSync(dest+'/source-after/source-receipt.json'));assert.equal(pre.applicationCommit,app);assert.equal(post.applicationCommit,app);assert.deepEqual(pre.files,post.files);
const normalized=[];for(const f of pre.files){const qa=readFileSync('C:/w-424-qa/'+f.path),local=readFileSync(f.path);assert.equal(sha(qa),f.sha256);if(sha(local)!==f.sha256){const decode=new TextDecoder('utf-8',{fatal:true});assert.equal(sha(Buffer.from(decode.decode(local).replaceAll('\r\n','\n'))),sha(Buffer.from(decode.decode(qa).replaceAll('\r\n','\n'))));normalized.push(f.path);}}
const evidence=JSON.parse(readFileSync(dest+'/evidence-verification.json'));assert.deepEqual(normalized,evidence.strictUtf8CrLfOnlyCrossCheckoutDifferences);
for(const f of evidence.extraInputs)assert.equal(sha(readFileSync(f.path)),f.sha256);
for(const f of JSON.parse(readFileSync(root+'/root-rerun/pre-run.json')).records)assert.equal(sha(readFileSync(dest+'/'+f.name)),f.sha256,'Root rerun exact frozen QA recipe');
writeFileSync(root+'/independent-adoption.json',JSON.stringify({applicationCommit:app,qaManifestSha256:sha(bytes),immutableQaFiles:129,sourceFileCount:pre.files.length,normalizedOnlyUtf8CrLfPaths:normalized,extraInputsVerified:evidence.extraInputs,allFailedAttemptsRetained:true,rootExactRerunStillRequired:true},null,2));console.log('Immutable independent129files and source/frozenrecipes verified; all failures retained');
