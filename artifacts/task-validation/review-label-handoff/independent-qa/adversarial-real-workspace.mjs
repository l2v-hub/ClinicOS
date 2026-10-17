import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createWorkspace } from '../../../../agent-team/src/bug-pipeline/workspace.mjs';
const root = await mkdtemp(path.join(os.tmpdir(),'clinicos-qa-final-review-'));
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
try {
  git(['init','-b','main']); git(['config','user.name','Synthetic QA']);git(['config','user.email','qa@example.invalid']);
  const packet='artifacts/task-validation/bug-batch-17';
  await mkdir(path.join(root,packet),{recursive:true});
  await writeFile(path.join(root,packet,'codex-independent-qa.md'),'# Independent Codex QA\n\nverified\n\nPrevious immutable QA\n');
  await writeFile(path.join(root,'feature.ts'),'export const synthetic=true;\n');
  git(['add','.']);git(['commit','-m','Synthetic fixture']);
  const cwd=path.join(root,'agent-team','.worktrees','bug-batch-17');
  await mkdir(path.dirname(cwd),{recursive:true});git(['worktree','add','-b','codex/bug-batch-17',cwd]);
  const batch={id:'bug-batch-17',branch:'codex/bug-batch-17',sha:git(['rev-parse','HEAD']),plan:{}};
  const workspace=createWorkspace({root,repo:'l2v-hub/ClinicOS',models:{qa:async()=>({status:'changes-requested',summary:'Independent QA found a synthetic stale filter.'})},run:async(call)=>{
    if(call.command==='git'&&call.args[0]==='fetch')return {ok:true,stdout:''};
    try{return {ok:true,stdout:execFileSync(call.command,call.args,{cwd:call.cwd,encoding:'utf8'})}}catch(error){return {ok:false,stdout:error.stdout??'',stderr:error.stderr??''}}
  }});
  const qa=await workspace.qa(batch);
  assert.equal(qa.status,'changes-requested');
  const dirty=git(['status','--porcelain'],cwd);
  let error;
  try{await workspace.prepare(batch)}catch(value){error=value.message}
  console.log(JSON.stringify({probe:'actual-workspace-post-approval-qa',qa:qa.status,dirty,error}));
  assert.equal(error,undefined,'A Codex finding must be correctable through the actual workspace, not deadlock on its own QA report');
} finally {await rm(root,{recursive:true,force:true})}
