// Run after PO15 is published. Checks committed release receipts and Git ancestry,
// not a fresh clinical certification or a repeat of all production smoke tests.
import {execFileSync,spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const git=(args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024}).trim();
const head=git(['rev-parse','HEAD']);
const paths=git(['ls-tree','-r','--name-only',head,'--','artifacts/task-validation']).split('\n');
const results=[];
for(let index=1;index<=15;index++){
 const prefix=`artifacts/task-validation/po-${String(index).padStart(2,'0')}-`;
 const candidates=paths.filter(path=>path.startsWith(prefix)&&path.endsWith('/deployment-receipt.json'));
 if(candidates.length!==1)throw new Error(`Expected one committed PO${index} deployment receipt`);
 const path=candidates[0],body=execFileSync('git',['show',`${head}:${path}`],{windowsHide:true,maxBuffer:16*1024*1024}),receipt=JSON.parse(body.toString('utf8'));
 const commit=receipt.sourceCommit;
 if(!/^[a-f0-9]{40}$/.test(commit??''))throw new Error(`Missing source commit PO${index}`);
 if(spawnSync('git',['merge-base','--is-ancestor',commit,head],{windowsHide:true}).status!==0)
  throw new Error(`Release PO${index} is not an ancestor of the candidate`);
 if(receipt.frontend?.status!=='READY')throw new Error(`Missing frontend READY receipt PO${index}`);
 if(receipt.backend&&!receipt.backend.unchanged&&receipt.backend.status!=='SUCCESS')
  throw new Error(`Missing backend SUCCESS receipt PO${index}`);
 results.push({activity:`PO-${String(index).padStart(2,'0')}`,sourceCommit:commit,receiptPath:path,
  receiptSha256:createHash('sha256').update(body).digest('hex'),frontend:receipt.frontend,backend:receipt.backend??null});
}
await writeFile('artifacts/task-validation/po-16-giro/release-chain-report.json',JSON.stringify({
 checkedHead:head,at:new Date().toISOString(),checks:'All PO01–PO15 release source commits are ancestors; committed receipts record deployment success',
 limitation:'This is a source/release-chain check, not a repeat of prior functional or live tests',results,
},null,2));
console.log(JSON.stringify({head,verifiedReleases:results.length}));
