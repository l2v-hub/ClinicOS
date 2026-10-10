import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=process.argv[2];assert.ok(out);assert.equal(existsSync(out),false);
const configured=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const env={...process.env,GH_TOKEN:configured.GITHUB_TOKEN||configured.GH_TOKEN};assert.ok(env.GH_TOKEN);
const results=[];for(const endpoint of ['repos/l2v-hub/ClinicOS/issues/423','repos/l2v-hub/ClinicOS/issues/423/comments']){const r=spawnSync('gh',['api',endpoint],{env,encoding:'utf8',maxBuffer:10e6,windowsHide:true});if(r.status!==0)throw Error('Safe GitHub read failed; provider details suppressed');results.push(JSON.parse(r.stdout));}
writeFileSync(out,JSON.stringify({at:new Date().toISOString(),issue:results[0],comments:results[1]},null,2));console.log('Fresh original issue423/comments safely captured; comments '+results[1].length);console.log(results[0].body.replace(/!\[[^\]]*\]\([^)]*\)/g,'[original clinical screenshot intentionally not downloaded]'));
