// Export only immutable Git blobs, in one batch to avoid process-per-file overhead on Windows.
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative} from 'node:path';
const [commit,service,task='po-09-dimissione']=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(commit??'') || !['backend','frontend'].includes(service)) throw new Error('Immutable commit and service required');
if(!/^[a-z0-9-]+$/.test(task)) throw new Error('Invalid artifact folder');
const base=resolve('artifacts/task-validation',task), output=resolve(base,'releases',`${commit}-${service}`);
if(existsSync(output)) throw new Error('Release export already exists');
const paths=service==='frontend' ? ['frontend','package.json','package-lock.json','.vercelignore'] : ['backend','frontend','prisma','scripts','package.json','package-lock.json','prisma.config.ts','.railwayignore','.gitignore'];
const entries=execFileSync('git',['ls-tree','-r','-z',commit,'--',...paths],{maxBuffer:16*1024*1024,windowsHide:true}).toString('utf8').split('\0').filter(Boolean).map(line=>{
  const match=/^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/.exec(line);
  if(!match) throw new Error('Invalid Git tree entry');
  return {mode:match[1],kind:match[2],blob:match[3],path:match[4]};
}).filter(e=>e.kind==='blob'&&!/(^|\/)\.env($|\.)/.test(e.path));
if(!entries.length || entries.some(e=>!['100644','100755'].includes(e.mode))) throw new Error('Empty export or unsupported file mode');
const batch=execFileSync('git',['cat-file','--batch'],{input:entries.map(e=>e.blob).join('\n')+'\n',maxBuffer:256*1024*1024,windowsHide:true});
let offset=0;
const files=[];
for(const entry of entries){
  const newline=batch.indexOf(10,offset);
  if(newline<0) throw new Error('Truncated Git batch header');
  const header=/^([a-f0-9]{40}) blob (\d+)$/.exec(batch.subarray(offset,newline).toString('ascii'));
  if(!header||header[1]!==entry.blob) throw new Error('Git blob header mismatch');
  const size=Number(header[2]), bytes=batch.subarray(newline+1,newline+1+size);
  offset=newline+1+size+1;
  if(bytes.length!==size||batch[offset-1]!==10) throw new Error('Truncated Git blob');
  const blobSha=createHash('sha1').update(`blob ${size}\0`).update(bytes).digest('hex');
  if(blobSha!==entry.blob) throw new Error('Git blob hash mismatch');
  const target=resolve(output,entry.path);
  if(relative(output,target).startsWith('..')) throw new Error('Path escaped export');
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);
  if(!readFileSync(target).equals(bytes)) throw new Error('Export bytes differ');
  files.push({path:entry.path,gitBlob:entry.blob,bytes:size,sha256:createHash('sha256').update(bytes).digest('hex')});
}
if(offset!==batch.length) throw new Error('Unexpected trailing Git output');
writeFileSync(resolve(base,`${service}-release-inputs.json`),JSON.stringify({commit,service,output,exportedAt:new Date().toISOString(),excluded:['Environment files','Uncommitted files','railway.json: preserve configured demo service settings'],files},null,2));
console.log(JSON.stringify({commit,service,output,files:files.length}));
