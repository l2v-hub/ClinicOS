import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]),manifest=resolve(root,'manifest.json');assert.ok(process.argv[2]);assert.equal(existsSync(manifest),false);const files=[];
function walk(d){for(const name of readdirSync(d)){if(['node_modules','runtime-cache'].includes(name))continue;const p=resolve(d,name);if(statSync(p).isDirectory())walk(p);else if(p!==manifest)files.push({path:relative(root,p).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(p)).digest('hex')});}}
walk(root);files.sort((a,b)=>a.path.localeCompare(b.path));const source=JSON.parse(readFileSync(root+'/source-bound.json'));assert.equal(source.head,'3f911cbd281d7c93c4796e97d5940258ceb331f0');assert.equal(source.sourceUnchanged,true);writeFileSync(manifest,JSON.stringify({head:source.head,files},null,2));console.log(JSON.stringify({manifestSHA256:createHash('sha256').update(readFileSync(manifest)).digest('hex'),fileCount:files.length,head:source.head}));
