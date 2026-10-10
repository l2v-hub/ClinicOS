import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
const configured=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const root='artifacts/task-validation/423-document-empty-state',run=JSON.parse(readFileSync(root+(existsSync(root+'/ci-progress.json')?'/ci-progress.json':'/ci-comparison.json'))).candidateRun;
assert.ok(Number.isSafeInteger(run)&&run>0);
const child=spawn('gh',['run','watch',String(run),'--repo','l2v-hub/ClinicOS','--interval','30','--exit-status'],{windowsHide:true,env:{...process.env,GH_TOKEN:configured.GITHUB_TOKEN||configured.GH_TOKEN},stdio:'ignore'});
child.on('error',()=>{console.log('CI wait unavailable; final read-only receipt still required');process.exitCode=1;});
child.on('exit',code=>console.log(JSON.stringify({run,watchExit:code,decision:'Wait ended, not a test verdict; ci-receipt independently checks exact failures and stages'})));
