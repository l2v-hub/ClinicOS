import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const [workerArgument,manifestPath]=process.argv.slice(2);
const root=await realpath(process.cwd()),worker=await realpath(workerArgument);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const safe=(base,path)=>{
 const absolute=resolve(base,path),tail=relative(base,absolute);
 if(!tail||isAbsolute(tail)||tail.startsWith('..')||!path.startsWith('artifacts/task-validation/'))throw new Error('Artifact path escaped scope');
 if(/(^|\/)(node_modules|cache|scratch|db|releases)(\/|$)|private-schema\.prisma$|(^|\/)\.env/.test(path))throw new Error(`Runtime path refused: ${path}`);
 return absolute;
};
const bytes=await readFile(safe(worker,manifestPath)),manifest=JSON.parse(bytes),entries=manifest.artifacts??manifest.files;
if(!Array.isArray(entries)||!entries.length)throw new Error('Artifact manifest missing');
const copied=[];
for(const entry of entries){
 const data=await readFile(safe(worker,entry.path));
 if(sha(data)!==entry.sha256)throw new Error(`Worker evidence changed: ${entry.path}`);
 const destination=safe(root,entry.path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,data);
 if(sha(await readFile(destination))!==entry.sha256)throw new Error('Evidence copy mismatch');
 copied.push(entry.path);
}
const destination=safe(root,manifestPath);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);
console.log(JSON.stringify({copied:copied.length,manifestSha256:sha(bytes)}));
