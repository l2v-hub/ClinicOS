import {createRunner} from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
import {writeFile} from 'node:fs/promises';
const root='/workspace/.clinicos-cloud/492-continuation8-independent-qa-20261018';
const name=process.argv[2], args=process.argv.slice(3);
const runner=createRunner({env:{PATH:process.env.PATH,PLAYWRIGHT_BROWSERS_PATH:'/workspace/.cache/clinicos-batch450-playwright'},runtimeRoot:root+'/runtime'});
const result=await runner({command:process.execPath,args,cwd:'/workspace/clinicos-standalone-pr-review',envMode:'verification',timeoutMs:600000,maxOutputBytes:16*1024*1024});
await writeFile(`${root}/${name}.json`,JSON.stringify({...result,node:process.version,executable:process.execPath,args,envMode:'verification'},null,2)+'\n');
console.log(JSON.stringify({ok:result.ok,code:result.code,error:result.error,tail:result.stdout.slice(-2000),stderr:result.stderr.slice(-1000)}));process.exitCode=result.ok?0:1;
