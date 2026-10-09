import {readdirSync,statSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('artifacts/task-validation/413-painad-focus/independent-qa');
const files=[];
function walk(dir){for(const name of readdirSync(dir)){const path=resolve(dir,name);if(statSync(path).isDirectory())walk(path);else if(name!=='immutable-manifest.json')files.push({path:relative(root,path).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});}}
walk(root);files.sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(resolve(root,'immutable-manifest.json'),JSON.stringify({applicationCommit:'2097e059e7ef87871ceeaf29c56bfd83aac7f7e6',sourceSha256:'e86cf7f173b5d3a78f3660448a2dd1dfc6e8be08e03618badb707e876454f303',verdict:'FAILED VALIDATION',files},null,2));
console.log(JSON.stringify({files:files.length,verdict:'FAILED VALIDATION'}));
