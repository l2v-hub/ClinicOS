import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
const own=resolve('artifacts/task-validation/425-chart-scroll/independent-qa');
const hash=b=>createHash('sha256').update(b).digest('hex');
const before=JSON.parse(readFileSync(own+'/source-before.json'));
const after={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:before.files.map(f=>({path:f.path,sha256:hash(readFileSync(f.path))}))};
after.sourceSha256=hash(JSON.stringify(after.files));assert.equal(after.head,before.head);assert.deepEqual(after.files,before.files);
writeFileSync(own+'/source-after.json',JSON.stringify(after,null,2));
const files=[];
function walk(dir){for(const name of readdirSync(dir)){const p=dir+'/'+name;if(name==='runtime-cache'||name==='artifact-manifest.json')continue;if(statSync(p).isDirectory())walk(p);else files.push({path:relative(own,p).replaceAll('\\','/'),bytes:statSync(p).size,sha256:hash(readFileSync(p))});}}
walk(own);files.sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(own+'/artifact-manifest.json',JSON.stringify({head:after.head,sourceSha256:after.sourceSha256,excluded:'runtime-cache generated dependency cache only; all successful and failed test attempts retained',files},null,2));
console.log(JSON.stringify({head:after.head,sourceSha256:after.sourceSha256,artifacts:files.length,manifestSha256:hash(readFileSync(own+'/artifact-manifest.json'))}));
