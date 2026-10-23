import { createRunner } from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
import { writeFile } from 'node:fs/promises';
const run = createRunner({env:{PATH:process.env.PATH},runtimeRoot:'/workspace/.clinicos-cloud/492-continuation7-independent-qa-20261018/runtime'});
const name=process.argv[2];
const result=await run({command:process.execPath,args:['--test',...process.argv.slice(3)],cwd:'/workspace/clinicos-standalone-pr-review',envMode:'verification',timeoutMs:600000,maxOutputBytes:16000000});
await writeFile(`/workspace/.clinicos-cloud/492-continuation7-independent-qa-20261018/${name}.json`,JSON.stringify({...result,node:process.version,command:process.execPath,args:['--test',...process.argv.slice(3)],envMode:'verification',trustedRunner:'/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs'},null,2)+'\n');
console.log(JSON.stringify({ok:result.ok,code:result.code,error:result.error,tail:result.stdout.slice(-1800),stderr:result.stderr.slice(-1000)}));
process.exitCode=result.ok?0:1;
