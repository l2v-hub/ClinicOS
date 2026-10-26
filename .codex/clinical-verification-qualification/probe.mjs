import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const ACCEPTED='13c71ce0e2cdf6e72b4c7eeeb036754fac7e4f73';
const sha256=value=>createHash('sha256').update(value).digest('hex');
export function finiteResult(result){
 const stdout=String(result.stdout??''),stderr=String(result.stderr??''),both=stdout+'\n'+stderr;
 const patterns={appServerSocketDirectory:/app-server socket directory must be a user-owned directory with mode 0700/i,bubblewrap:/error building bubblewrap command|bwrap:/i,permissionDenied:/permission denied|operation not permitted/i,unknownArgument:/unexpected argument|unrecognized option/i,profileConfiguration:/permissions profile.*(?:not found|unknown|invalid)|unknown.*permissions profile/i,postgresBinaryMissing:/initdb.*(?:ENOENT|not found)|pg_ctl.*(?:ENOENT|not found)/i,postgresRoot:/cannot be run as root|cannot be run by root/i,portAlreadyInUse:/address already in use|another server.*port/i,syntheticPreparation:/Synthetic database preparation failed|Isolated verification failed to prepare/i,connectionRefused:/connection refused/i,migrationFailure:/migration.*(?:failed|error)/i};
 const flags=Object.fromEntries(Object.entries(patterns).map(([name,re])=>[name,re.test(both)]));
 const separator='\n[bounded synthetic system diagnostic excerpt]\n';
 const tailLength=Math.floor((2560-separator.length)/2);
 const excerpt=s=>s.length<=2560?s:s.slice(0,2560-separator.length-tailLength)+separator+s.slice(-tailLength);
 return{ok:result.ok===true,exitCode:Number.isSafeInteger(result.code)?result.code:null,runnerError:['timeout','output-limit','spawn-failed'].includes(result.error)?result.error:null,markerPresent:stdout.includes('clinicos-verification-zero-provider-ok'),stdoutBytes:Buffer.byteLength(stdout),stderrBytes:Buffer.byteLength(stderr),stdoutSha256:sha256(stdout),stderrSha256:sha256(stderr),flags,safeSyntheticStdout:excerpt(stdout),safeSyntheticStderr:excerpt(stderr)};
}
export async function qualify({cwd,run,verificationArguments,nodePath}){
 const result=await run({command:'codex',args:verificationArguments(cwd,nodePath,['-e','process.stdout.write("clinicos-verification-zero-provider-ok\\n")']),cwd,envMode:'verification',timeoutMs:15*60_000,maxOutputBytes:1024*1024});
 return{schemaVersion:1,acceptedMainSha:ACCEPTED,providerInvocations:0,clinicalData:false,controllerOrProviderCredentials:false,verificationInvocations:1,actualTrustedVerificationWrapper:true,...finiteResult(result)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const cwd=path.resolve('source');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim(),ACCEPTED);
 const processModule=path.join(cwd,'agent-team/src/bug-pipeline/process.mjs'),verificationModule=path.join(cwd,'agent-team/src/bug-pipeline/verification.mjs');
 const {createRunner}=await import(processModule),{verificationArguments}=await import(verificationModule);
 // Only the same nonsecret runner inputs needed by native verification; no GitHub,
 // model, OAuth, production variables or inherited HOME/configuration are supplied.
 const env={PATH:process.env.PATH,CODEX_CLI_PATH:process.env.CODEX_CLI_PATH,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH};
 assert(path.isAbsolute(env.CODEX_CLI_PATH??''));
 const run=createRunner({env,runtimeRoot:path.join(cwd,'agent-team/.runtime/bug-pipeline')});
 const version=await run({command:'codex',args:['--version'],cwd,envMode:'verification',timeoutMs:30000,maxOutputBytes:65536});
 assert.equal(version.ok,true);assert.equal(version.stdout.trim(),'codex-cli 0.159.2','Pinned installed official CLI identity mismatch');
 const report=await qualify({cwd,run,verificationArguments,nodePath:process.execPath});report.actualCliVersion=version.stdout.trim();report.versionInvocations=1;
 report.trustedVerificationSha256=sha256(await readFile(verificationModule));report.trustedProcessSha256=sha256(await readFile(processModule));
 await writeFile('qualification-result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 // This is only synthetic database/system command output: no model/source/patient
 // input and no controller/provider credential ever reaches the child.
 console.log(JSON.stringify({type:'clinical-verification-zero-provider-qualification',...report}));
 process.exitCode=report.ok&&report.markerPresent?0:1;
}
