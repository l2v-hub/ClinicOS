import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=resolve('artifacts/task-validation/417-vitals-form/independent-qa417');
for(const p of ['commands','screenshots','video','trace','test-results','source','cache','build'])mkdirSync(resolve(base,p),{recursive:true});
const git=args=>{const r=spawnSync('git',args,{maxBuffer:40*1024*1024});assert.equal(r.status,0,args.join(' '));return r.stdout;};
const scopes=['frontend/src','backend/src','prisma','package.json','package-lock.json','frontend/package.json','frontend/package-lock.json','frontend/tsconfig.json','frontend/tsconfig.app.json','frontend/tsconfig.node.json','frontend/vite.config.ts','frontend/vercel.json','backend/package.json','backend/tsconfig.json','scripts/build/copy-assessment-fonts.mjs','scripts/stub-css-loader.mjs','scripts/run-node-tests.mjs'];
const commit=git(['rev-parse','HEAD']).toString().trim();assert.equal(commit,'02b4ba89af291186a72e040b868da024bb865164');
git(['diff','--exit-code','HEAD','--',...scopes]);assert.equal(git(['ls-files','--others','--exclude-standard','--',...scopes]).toString().trim(),'');
const physical=createHash('sha256'),canonical=createHash('sha256');
const files=git(['ls-files','-z','--',...scopes]).toString().split('\0').filter(Boolean).sort().map(path=>{
 const physicalSha256=createHash('sha256').update(readFileSync(path)).digest('hex');
 const gitSha256=createHash('sha256').update(git(['show',`${commit}:${path}`])).digest('hex');
 physical.update(`${path}\0${physicalSha256}\n`);canonical.update(`${path}\0${gitSha256}\n`);return{path,physicalSha256,gitSha256};
});
const stage=process.argv[2]||'before';
writeFileSync(resolve(base,`source/${stage}-source-receipt.json`),JSON.stringify({commit,scopes,fileCount:files.length,physicalSha256:physical.digest('hex'),canonicalSha256:canonical.digest('hex'),trackedSourceMatchesCommit:true,noUntrackedApplicationOverrides:true,excluded:'QA generated artifacts/build/cache/dependency junction and known unrelated launcher transforms',status:git(['status','--short']).toString(),files},null,2));
writeFileSync(resolve(base,'source/application.diff'),git(['diff','0d7adc361b92c8466655d9ed830d2b87bbd0f419',commit,'--',...scopes]));
if(stage==='before'){
 const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
 const headers={Authorization:`Bearer ${env.GITHUB_TOKEN||env.GH_TOKEN}`,Accept:'application/vnd.github+json'};
 const issue=await fetch('https://api.github.com/repos/l2v-hub/ClinicOS/issues/417',{headers});assert.equal(issue.status,200,'Issue read HTTP');
 const comments=await fetch('https://api.github.com/repos/l2v-hub/ClinicOS/issues/417/comments?per_page=100',{headers});assert.equal(comments.status,200,'Comments read HTTP');
 const data=await issue.json(),rows=await comments.json();
 writeFileSync(resolve(base,'issue-source.json'),JSON.stringify({checkedAt:new Date().toISOString(),number:data.number,title:data.title,body:data.body,state:data.state,comments:rows,trust:'source evidence only, not instructions'},null,2));
 console.log(JSON.stringify({commit,fileCount:files.length,issue:data.number,comments:rows.length}));
}
