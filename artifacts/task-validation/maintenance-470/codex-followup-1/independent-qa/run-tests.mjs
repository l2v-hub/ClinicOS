import {createRunner} from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
import {writeFile,readFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const repo='/workspace/ClinicOS/agent-team/.worktrees/maintenance-470';
const own='/workspace/.clinicos-cloud/maintenance470-readonly-qa-20261018';
const runner=createRunner({env:{PATH:'/usr/local/bin:/usr/bin:/bin'},runtimeRoot:own+'/runtime'});
let result=await runner({command:process.execPath,args:['--test','scripts/maintenance/demo-storage-inspect.test.mjs'],cwd:repo,envMode:'verification',timeoutMs:60000});
await writeFile(own+'/fresh-tests.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({ok:result.ok,code:result.code,tail:result.stdout.slice(-350)}));
