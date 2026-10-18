import {createRunner} from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
import {writeFile} from 'node:fs/promises';
const own='/workspace/.clinicos-cloud/maintenance470-readonly-qa-20261018';
const run=createRunner({env:{PATH:'/usr/local/bin:/usr/bin:/bin'},runtimeRoot:own+'/runtime'});
const result=await run({command:process.execPath,args:['--test','scripts/maintenance/demo-storage-inspect.test.mjs'],cwd:own+'/sparse-repro',envMode:'verification',timeoutMs:60000});
await writeFile(own+'/sparse-tests.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({ok:result.ok,code:result.code,tail:result.stdout.slice(-2600),stderr:result.stderr}));
