import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const [worker,scope] = process.argv.slice(2);
if(!['backend','frontend'].includes(scope)) throw new Error('Explicit scope required');
const base=`artifacts/task-validation/po-08-consegne-giro/${scope}`;
const path=resolve(worker,base,'artifact-manifest.json');
const bytes=await readFile(path), manifest=JSON.parse(bytes);
let count=0;
for(const item of manifest.artifacts) {
  if(!item.path.startsWith(base+'/') || /private-schema|postgres-|node_modules|\/cache\//.test(item.path)) throw new Error('Invalid artifact');
  const destination=resolve(item.path), tail=relative(process.cwd(),destination);
  if(tail.startsWith('..')||isAbsolute(tail)) throw new Error('Outside root');
  const data=await readFile(resolve(worker,item.path));
  if(createHash('sha256').update(data).digest('hex')!==item.sha256) throw new Error(`Artifact changed: ${item.path}`);
  await mkdir(dirname(destination),{recursive:true}); await writeFile(destination,data); count++;
}
await writeFile(resolve(base,'artifact-manifest.json'),bytes);
console.log(JSON.stringify({scope,verifiedArtifacts:count}));
