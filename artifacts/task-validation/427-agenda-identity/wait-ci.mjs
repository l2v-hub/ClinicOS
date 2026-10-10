import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const configured=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const run=JSON.parse(readFileSync('artifacts/task-validation/427-agenda-identity/ci-progress.json')).candidateRun;
assert.equal(run,38009583177);
const child=spawn('gh',['run','watch',String(run),'--repo','l2v-hub/ClinicOS','--interval','30','--exit-status'],{windowsHide:true,env:{...process.env,GH_TOKEN:configured.GITHUB_TOKEN||configured.GH_TOKEN},stdio:'ignore'});
child.on('error',()=>{console.log('CI wait unavailable; final read-only receipt still required');process.exitCode=1;});
child.on('exit',code=>console.log(JSON.stringify({run,watchExit:code,decision:'Wait ended, not a test verdict; ci-receipt independently checks exact failures and stages'})));
