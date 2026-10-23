import {createRunner} from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='/workspace/.clinicos-cloud/demo-bearer-readiness-independent-qa-20261018';
const root='/workspace/clinicos-demo-bearer-readiness';
const freeze=JSON.parse(await readFile('/workspace/.clinicos-cloud/demo-bearer-readiness-author-20261018/freeze.json'));
const paths=Object.keys(freeze.inputsSha256);
async function hashes(){const out={};for(const p of paths){out[p]=createHash('sha256').update(await readFile(p.startsWith('/')?p:`${root}/${p}`)).digest('hex');}return out;}
await writeFile(`${dir}/before.json`,JSON.stringify(await hashes(),null,2));
const run=createRunner({env:{PATH:'/usr/local/bin:/usr/bin:/bin'},runtimeRoot:`${dir}/runtime`});
for(const [name,args] of [['candidate',['--test','--test-reporter=tap','scripts/automation/configure-demo-source.test.mjs','scripts/automation/inspect-demo-bearer-readiness.test.mjs']],['fresh',['--test','--test-reporter=tap',`${dir}/fresh.test.mjs`]]]){
const result=await run({command:process.execPath,args,cwd:root,envMode:'verification',timeoutMs:60000,maxOutputBytes:2000000});
await writeFile(`${dir}/${name}.tap`,result.stdout);await writeFile(`${dir}/${name}-result.json`,JSON.stringify({...result,stdout:undefined},null,2));console.log(name,JSON.stringify({ok:result.ok,code:result.code,error:result.error}));}
await writeFile(`${dir}/after.json`,JSON.stringify(await hashes(),null,2));
