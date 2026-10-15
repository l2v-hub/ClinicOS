import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {runBugReview} from '../../../scripts/quality-gate/claude-bug-review.mjs';
import {runProcess} from '../../../agent-team/src/adapters/process-runner.mjs';
const help='--print --output-format --json-schema --tools --permission-mode --restricted --setting-sources --strict-mcp-config --mcp-config';
async function fixture(t,onReview){
  const cwd=await mkdtemp('/tmp/clinicos-independent-qa-');t.after(()=>rm(cwd,{recursive:true,force:true}));
  const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
  git('init','-b','main');git('config','user.name','Synthetic QA');git('config','user.email','qa@example.invalid');
  const packet='artifacts/task-validation/batch';await mkdir(cwd+'/'+packet,{recursive:true});
  await writeFile(cwd+'/.gitignore','*.local\n');await writeFile(cwd+'/feature.ts','export const value=0;\n');
  for(const file of ['task-contract.md','implementation-plan.md'])await writeFile(cwd+'/'+packet+'/'+file,'Synthetic QA plan\n');
  git('add','.');git('commit','-m','Synthetic fixture');let calls=0;
  const run=async call=>{
    if(call.command!=='claude')return runProcess(call);
    if(call.args[0]==='--help')return {ok:true,stdout:help};
    if(call.args[0]==='auth')return {ok:true,stdout:'{"loggedIn":true}'};
    calls++;return onReview({cwd,git,call,calls,sha:git('rev-parse','HEAD')});
  };
  return {cwd,packet,git,review:()=>runBugReview({cwd,packet,run}),calls:()=>calls,change:async value=>{await writeFile(cwd+'/feature.ts',`export const value=${value};\n`);git('add','feature.ts');git('commit','-m',`Synthetic correction ${value}`);},state:async()=>JSON.parse(await readFile(cwd+'/'+packet+'/claude-review-state.local','utf8'))};
}
test('independent probe: commit changed during review never yields approval',async t=>{
  const f=await fixture(t,async({cwd,git,sha})=>{
    await writeFile(cwd+'/feature.ts','export const value=7;\n');git('add','feature.ts');git('commit','-m','Concurrent synthetic change');
    return {ok:true,stdout:JSON.stringify({structured_output:{subject_sha:sha,verdict:'approved',summary:'Synthetic review',findings:[]}})};
  });
  await assert.rejects(f.review(),/revision changed during review/);
  assert.equal((await f.state()).rounds[0].verdict,'failed');
});
test('independent probe: four execution failures reserve four attempts and prevent a fifth invocation',async t=>{
  const f=await fixture(t,async()=>({ok:false,stdout:'',stderr:'Synthetic provider failure'}));
  for(let round=1;round<=4;round++){
    if(round>1)await f.change(round);
    await assert.rejects(f.review(),/execution failed/);
    assert.equal((await f.state()).rounds.length,round);
  }
  await f.change(5);assert.equal((await f.review()).reason,'four-review-limit');assert.equal(f.calls(),4);
});
test('independent probe: tracked prerequisite symlink cannot escape the checkout',async t=>{
  const f=await fixture(t,async()=>{throw new Error('Reviewer must not be invoked');});
  const external=await mkdtemp('/tmp/clinicos-external-qa-');t.after(()=>rm(external,{recursive:true,force:true}));
  await writeFile(external+'/plan.md','Synthetic external content');
  const plan=f.cwd+'/'+f.packet+'/implementation-plan.md';await rm(plan);await symlink(external+'/plan.md',plan);
  f.git('add','.');f.git('commit','-m','Synthetic symlink fixture');
  await assert.rejects(f.review(),/symlink|regular|inside|contained/i);assert.equal(f.calls(),0);
});
