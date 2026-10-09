import {readdirSync,statSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('artifacts/task-validation/413-painad-focus/independent-qa/refinement87'),files=[];
function walk(dir){for(const name of readdirSync(dir)){const path=resolve(dir,name);if(statSync(path).isDirectory())walk(path);else if(name!=='immutable-manifest.json')files.push({path:relative(root,path).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});}}
walk(root);files.sort((a,b)=>a.path.localeCompare(b.path));writeFileSync(resolve(root,'immutable-manifest.json'),JSON.stringify({applicationCommit:'87e6dcaf9614c38aad918a2c89579af2bc5d0a27',sourceSha256:'15fecd77d96727baa987103add912d1e4356c1d418789579a9599dca9ebd9751',verdict:'FAILED VALIDATION',files},null,2));console.log(JSON.stringify({files:files.length,verdict:'FAILED VALIDATION'}));
