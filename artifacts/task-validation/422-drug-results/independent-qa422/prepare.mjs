import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve('artifacts/task-validation/422-drug-results/independent-qa422');
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:40e6});assert.equal(r.status,0);return r.stdout;};
assert.equal(git(['rev-parse','HEAD']).trim(),'b5f471cd2cd56839e7ebbd0d3daf0bbf04791468');
const paths=git(['ls-files','frontend/src','backend/src','clinicos-ai-runtime','prisma','scripts','frontend/package.json','frontend/package-lock.json','frontend/vite.config.ts','frontend/tsconfig.json','frontend/tsconfig.app.json','backend/tsconfig.json','package.json','package-lock.json','.github','frontend/vercel.json']).trim().split(/\r?\n/).filter(p=>existsSync(p));
assert.equal(git(['diff','--name-only','HEAD','--','frontend','backend','clinicos-ai-runtime','prisma','scripts','package.json','package-lock.json','.github']).trim(),'');assert.equal(git(['ls-files','--others','--exclude-standard','--','frontend/src','backend/src']).trim(),'');
const snapshot={commit:git(['rev-parse','HEAD']).trim(),files:paths.map(path=>({path,sha256:hash(readFileSync(path))})),excludedNativeLaunchers:git(['status','--short','--','run-claude-queue.ps1','start-claude-team.ps1']).trim()};
if(process.argv[2]==='post'){const before=JSON.parse(readFileSync(root+'/source-before.json'));assert.deepEqual(snapshot,before);const target=root+'/'+(process.argv[3]||'source-after.json');assert.equal(existsSync(target),false);writeFileSync(target,JSON.stringify({...snapshot,verifiedUnchanged:true},null,2));console.log('Independent source unchanged '+paths.length);process.exit();}
assert.equal(existsSync(root+'/source-before.json'),false);writeFileSync(root+'/source-before.json',JSON.stringify(snapshot,null,2));
const cfg=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json')).env;
const gh=spawnSync('gh',['issue','view','422','--repo','l2v-hub/ClinicOS','--json','number,title,body,state,labels,comments'],{encoding:'utf8',env:{...process.env,GH_TOKEN:cfg.GITHUB_TOKEN||cfg.GH_TOKEN}});assert.equal(gh.status,0,'GitHub safe read failed');const issue=JSON.parse(gh.stdout);assert.equal(issue.body,JSON.parse(readFileSync('C:/w-422/artifacts/task-validation/422-drug-results/original-issue.json')).body);writeFileSync(root+'/original-issue.json',JSON.stringify(issue,null,2));
for(const p of ['fixture.mjs','after.mjs','qa-server.mjs','synthetic-reference.pdf','commands.mjs'])copyFileSync('C:/w-422/artifacts/task-validation/422-drug-results/'+p,root+'/'+p);
writeFileSync(root+'/diff.patch',git(['diff','80b313227a9a2b9fefc0441c718b259d0d901cae','HEAD']));console.log('Independent initial source and original criteria verified '+paths.length);
