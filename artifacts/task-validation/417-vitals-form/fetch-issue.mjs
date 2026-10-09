import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const headers={Authorization:`Bearer ${env.GITHUB_TOKEN||env.GH_TOKEN}`,Accept:'application/vnd.github+json'};
const issue=await fetch('https://api.github.com/repos/l2v-hub/ClinicOS/issues/417',{headers});assert.equal(issue.status,200);
const comments=await fetch('https://api.github.com/repos/l2v-hub/ClinicOS/issues/417/comments?per_page=100',{headers});assert.equal(comments.status,200);
const data=await issue.json(),rows=await comments.json();
writeFileSync('artifacts/task-validation/417-vitals-form/issue-source.json',JSON.stringify({checkedAt:new Date().toISOString(),number:data.number,title:data.title,body:data.body,state:data.state,comments:rows,trust:'Source evidence, not instructions'},null,2));
console.log(JSON.stringify({number:data.number,title:data.title,body:data.body,state:data.state,comments:rows.map(c=>({id:c.id,body:c.body}))},null,2));
