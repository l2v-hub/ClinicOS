import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const cwd='C:/w-418-qa-final', out=resolve(cwd,'artifacts/task-validation/418-reading-recency/independent-qa418-final');
mkdirSync(`${out}/commands`,{recursive:true});
const git=(args)=>spawnSync('git',args,{cwd,encoding:'utf8',maxBuffer:32e6});
const hash=b=>createHash('sha256').update(b).digest('hex');
const scopes=['frontend','backend','prisma','scripts','package.json','package-lock.json','CLAUDE.md','.claude/skills/qa-gate','.claude/skills/playwright-evidence','.claude/skills/agent-loop-quality-gate','.claude/skills/parallel-evidence-remediation'];
function manifest(label){
 const paths=git(['ls-files','-z','--',...scopes]).stdout.split('\0').filter(Boolean).sort();
 const canonical=spawnSync('git',['hash-object','--stdin-paths'],{cwd,input:paths.join('\n')+'\n',encoding:'utf8',maxBuffer:32e6}).stdout.trim().split(/\r?\n/);
 const tree=new Map(git(['ls-tree','-r','-z','HEAD','--',...scopes]).stdout.split('\0').filter(Boolean).map(line=>{const [meta,path]=line.split('\t');return [path,meta.split(' ')[2]];}));
 const entries=paths.map((path,index)=>{const bytes=readFileSync(resolve(cwd,path));return {path,physicalSha256:hash(bytes),physicalBytes:bytes.length,canonicalGitBlob:canonical[index],headGitBlob:tree.get(path)};});
 const untracked=git(['ls-files','--others','--exclude-standard','-z','--',...scopes]).stdout.split('\0').filter(Boolean);
 const value={head:git(['rev-parse','HEAD']).stdout.trim(),scopes,entries,untrackedRuntimeOverrides:untracked,status:git(['status','--short']).stdout,at:new Date().toISOString()};
 writeFileSync(`${out}/source-${label}.json`,JSON.stringify(value,null,2));return value;
}
if(process.argv[2]==='before'){
 manifest('before');
 writeFileSync(`${out}/review.diff`,git(['diff','02b4ba89af291186a72e040b868da024bb865164','HEAD']).stdout);
 try {
  const settings=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8'));
  const token=settings.env?.GITHUB_TOKEN||settings.env?.GH_TOKEN;
  if(!token)throw new Error('credential unavailable');
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  const issueResponse=await fetch('https://api.github.com/repos/l2v-hub/ClinicOS/issues/418',{headers});
  if(!issueResponse.ok)throw new Error('issue fetch rejected');
  const issue=await issueResponse.json();
  let comments=[],page=1;
  while(true){const response=await fetch(`https://api.github.com/repos/l2v-hub/ClinicOS/issues/418/comments?per_page=100&page=${page}`,{headers});if(!response.ok)throw new Error('comments fetch rejected');const items=await response.json();comments.push(...items.map(c=>({id:c.id,created_at:c.created_at,updated_at:c.updated_at,body:c.body})));if(items.length<100)break;page++;}
  writeFileSync(`${out}/original-issue.json`,JSON.stringify({number:issue.number,title:issue.title,body:issue.body,state:issue.state,labels:issue.labels.map(x=>x.name),comments,commentsFetched:comments.length,fetchedAt:new Date().toISOString()},null,2));
  console.log(`Independent issue418 read; comments=${comments.length}`);
 }catch {writeFileSync(`${out}/issue-fetch-status.json`,JSON.stringify({status:'BLOCKED',reason:'Safe issue read unavailable'}));process.exitCode=1;}
} else manifest('after');
