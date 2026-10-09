import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out='artifacts/task-validation/425-chart-scroll';mkdirSync(out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const files=git('ls-files','frontend','backend','scripts','package.json','package-lock.json').split('\n').filter(Boolean);
const hashes=files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(`${out}/${process.argv[2]||'baseline'}-source.json`,JSON.stringify({head:git('rev-parse','HEAD'),files:hashes,sourceSha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')},null,2));
if(process.argv.includes('--issue')){
 const config=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
 const env={...process.env,GH_TOKEN:config.GITHUB_TOKEN||config.GH_TOKEN};
 const issue=JSON.parse(execFileSync('gh',['issue','view','425','--repo','l2v-hub/ClinicOS','--json','number,title,body,comments,labels,state,url'],{env,encoding:'utf8'}));
 writeFileSync(`${out}/original-issue.json`,JSON.stringify(issue,null,2));
}
console.log('Source/issue snapshot written; no credentials emitted');
