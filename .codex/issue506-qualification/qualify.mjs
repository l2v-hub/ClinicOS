import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir,symlink,copyFile,stat,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export function enumerateChangedPaths(git, cwd) {
 return [...new Set([
  ...git(['diff','--name-only'],cwd).split('\n'),
  ...git(['ls-files','--others','--exclude-standard'],cwd).split('\n'),
 ].filter(Boolean))].sort();
}
const hash=x=>createHash('sha256').update(x).digest('hex');
const root=path.dirname(fileURLToPath(import.meta.url)), manifest=JSON.parse(await readFile(path.join(root,'candidate-prepared.json')));
const id=Number(process.env.QUALIFY_ISSUE);assert.equal(id,506);
assert.equal(process.env.GITHUB_REPOSITORY,'l2v-hub/ClinicOS');
assert.equal(process.env.GITHUB_EVENT_NAME,'push');
assert.equal(process.env.GITHUB_REF,'refs/heads/codex/506-root10-native-qualification-20261027');
assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');
for(const k of ['GH_TOKEN','GITHUB_TOKEN','CODEX_API_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY','CLAUDE_CODE_OAUTH_TOKEN'])assert(!process.env[k]);
const source=path.resolve('source'),accepted='2dc0c0050a9f18a51a7ac980b42b46057870e27e',target=manifest.candidates.find(x=>x.issue===id);
assert.equal(manifest.trustedMain,accepted);assert.equal(target.parent,accepted);assert.equal(target.sha,'7736adffea3394c8a70b76f71967309f1aa32b7a');assert.equal(target.files.length,12);assert.deepEqual(target.files.map(x=>x.file).sort(),target.changedFiles.slice().sort());assert.equal(new Set(target.files.map(x=>x.file)).size,12);for(const f of target.files){assert(/^(backend\/|frontend\/|e2e\/|scripts\/e2e\/)/.test(f.file));assert(!f.file.includes('\\')&&f.file.split('/').every(p=>p&&p!=='.'&&p!=='..'));assert.match(f.sha256,/^[a-f0-9]{64}$/);assert(Number.isSafeInteger(f.bytes)&&f.bytes>=0&&f.bytes<=256*1024);}
const git=(args,cwd=source)=>execFileSync('git',['-c','gc.auto=0',...args],{cwd,maxBuffer:24*1024*1024}).toString().trim();
assert.equal(git(['rev-parse','HEAD']),accepted);
const cwd=path.join(source,'agent-team/.worktrees/harness-qualification-'+id),plan=JSON.parse(await readFile(path.join(root,`proposed-plan-${id}.json`)));
git(['worktree','add','--detach',cwd,target.parent]);
await symlink(path.join(source,'node_modules'),path.join(cwd,'node_modules'),'dir');
for(const item of target.files){const input=path.join(root,'candidates',String(id),item.file),raw=await readFile(input);assert.equal(hash(raw),item.sha256);assert.equal(raw.length,item.bytes);const dest=path.join(cwd,item.file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(input,dest);}
assert.equal(git(['write-tree'],cwd),git(['rev-parse',target.parent+'^{tree}']));
const changes=enumerateChangedPaths(git,cwd);assert.deepEqual(changes,target.changedFiles.slice().sort());
for(const file of changes)assert(plan.scope.includes(file));
const {createRunner}=await import(pathToFileURL(path.join(source,'agent-team/src/bug-pipeline/process.mjs')).href);
const {verificationArguments}=await import(pathToFileURL(path.join(source,'agent-team/src/bug-pipeline/verification.mjs')).href);
const {validateEvidence,safeVerificationText}=await import(pathToFileURL(path.join(source,'agent-team/src/bug-pipeline/workspace.mjs')).href);
const runtime=path.join(process.env.RUNNER_TEMP,'.clinicos-harness-verification');await mkdir(runtime,{recursive:true,mode:0o700});
const run=createRunner({env:{PATH:process.env.PATH,CODEX_CLI_PATH:process.env.CODEX_CLI_PATH,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH},runtimeRoot:runtime});
const version=await run({command:'codex',args:['--version'],cwd,envMode:'verification',timeoutMs:30000,maxOutputBytes:65536});assert(version.ok&&version.stdout.trim()==='codex-cli 0.159.2');
const packet=`artifacts/task-validation/bug-batch-${id}`,evidence=path.join(cwd,packet,'evidence');await rm(evidence,{recursive:true,force:true});
const results=[];
for(const [index,command] of plan.verification.entries()){
 const result=await run({command:'codex',args:verificationArguments(cwd,command.command,command.args),cwd,envMode:'verification',timeoutMs:15*60000,maxOutputBytes:1024*1024});
 const noTestsSignal=/(?:# tests 0\b|0 tests? passed|No test files found)/i.test(result.stdout+result.stderr);
 const finite={index,command:command.command,args:command.args,ok:result.ok===true&&!noTestsSignal,noTestsSignal,exitCode:result.code??null,runnerError:result.error??null,stdoutBytes:Buffer.byteLength(result.stdout),stderrBytes:Buffer.byteLength(result.stderr),stdoutSha256:hash(result.stdout),stderrSha256:hash(result.stderr)};
 results.push(finite);console.log(JSON.stringify({type:'clinical-harness-verification-v1',issue:id,...finite}));
 await mkdir(path.resolve('qualification-evidence'),{recursive:true});
 await writeFile(path.resolve(`qualification-evidence/command-${id}-${index}.json`),JSON.stringify({...finite,stdoutSanitizedCaptured:safeVerificationText(result.stdout),stderrSanitizedCaptured:safeVerificationText(result.stderr)},null,2)+'\n');
 if(!finite.ok)break;
}
const artifacts=[];
let nativeEvidence=null;
if(results.length===3&&results.every(x=>x.ok))nativeEvidence=await validateEvidence(cwd,plan);
if(results.length===3&&results.every(x=>x.ok))for(const [kind,file]of Object.entries(plan.evidence[0])){
 if(kind==='issue')continue;assert(file.startsWith(packet+'/evidence/'));const info=await stat(path.join(cwd,file));assert(info.isFile()&&info.size>0);artifacts.push({kind,file,bytes:info.size,sha256:hash(await readFile(path.join(cwd,file)))});
}
const proof={type:'clinical-harness-qualification-v1',issue:id,runId:process.env.GITHUB_RUN_ID,acceptedMain:accepted,sourceParent:target.parent,privateCandidate:target.sha,sourceFiles:target.files.map(({file,sha256})=>({file,sha256})),actualNativeVerification:true,providerInvocations:0,results,artifacts,nativeEvidence,ok:results.length===3&&results.every(x=>x.ok)&&artifacts.length===3&&nativeEvidence!==null,scope:'Private506Root10 app projection: actual three native commands and four-width React browser with synthetic loopback HTTP. Includes both preserved notice fixes. Not authenticated backend/OCR/provider or deployment acceptance.'};
await writeFile(path.resolve(`qualification-evidence/proof-${id}.json`),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));if(!proof.ok)process.exitCode=1;
