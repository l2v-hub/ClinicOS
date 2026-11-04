import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const tests=['scripts/automation/enable-demo-auth-2029.test.mjs','scripts/automation/enable-demo-auth-2029.metadata.test.mjs','scripts/automation/demo-no-expiry-controller.test.mjs','scripts/automation/enable-demo-auth-no-expiry.test.mjs','scripts/automation/demo-no-expiry.integration.test.mjs','scripts/automation/demo-no-expiry.metadata.integration.test.mjs','scripts/automation/renew-demo-auth-expiry.test.mjs','scripts/build/backend-build-context.test.mjs','agent-team/tests/bug-pipeline/windows-review.test.mjs'];
const r=spawnSync(process.execPath,['--test',...tests],{cwd:'C:/w-rv/profiles-no-expiry-r7-qa-20261104',encoding:'utf8',windowsHide:true,maxBuffer:10000000});
await writeFile('C:/w-rv/tmp/profiles-restore-20261104/independent-qa/r7/regression.log',(r.stdout||'')+'\n'+(r.stderr||''),{flag:'wx'});
console.log(JSON.stringify({exit:r.status,summary:(r.stdout||'').split(/\r?\n/).filter(x=>/^ℹ (tests|pass|fail|skipped)/.test(x))}));process.exitCode=r.status;
