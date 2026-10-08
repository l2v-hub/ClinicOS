import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync,readdirSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out='artifacts/task-validation/403-therapy-incomplete';
const git=(...args)=>spawnSync('git',args,{encoding:'utf8'}).stdout.trim();
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const paths=git('ls-files','frontend','package.json','package-lock.json').split(/\r?\n/).filter(Boolean).sort();
const frontend=paths.map(path=>({path,sha256:hash(path)}));
const changed=git('diff','--name-only','4ddb4b4c','HEAD','--','frontend').split(/\r?\n/).filter(Boolean);
const harness=['qa-browser.mjs','qa-server.mjs','qa-commands.mjs','qa-receipt.mjs'].map(name=>({path:`${out}/${name}`,sha256:hash(`${out}/${name}`)}));
const failureNames=log=>[...new Set(readFileSync(log,'utf8').split(/\r?\n/).filter(line=>line.startsWith('✖ ')).filter(line=>!line.startsWith('✖ failing tests:')).map(line=>line.replace(/ \([\d.]+ms\)$/,'').replaceAll('\\','/')))].sort();
const baselineFailures=failureNames('artifacts/task-validation/402-manual-intake/logs/full-regression.log');
const currentFailures=failureNames(`${out}/logs/full-regression.log`);
const browser=JSON.parse(readFileSync(`${out}/test-results/browser-results.json`,'utf8'));
const input={baseline:'4ddb4b4c',candidate:git('rev-parse','HEAD'),repositoryTree:git('rev-parse','HEAD^{tree}'),applicationStatus:git('status','--porcelain','--','frontend','backend','prisma','package.json','package-lock.json'),
 sourceState:'Clean committed application source; existing unrelated scripts/artifacts excluded. QA wrote only issue403 artifacts.',
 frontendSourceTreeSha256:createHash('sha256').update(JSON.stringify(frontend)).digest('hex'),frontend,changed:changed.map(path=>({path,sha256:hash(path)})),harness,
 regression:{baselineFailures,currentFailures,newFailures:currentFailures.filter(name=>!baselineFailures.includes(name)),resolvedFailures:baselineFailures.filter(name=>!currentFailures.includes(name))},
 browser:{checks:browser.outcomes.length,passed:browser.outcomes.filter(r=>r.status==='PASS').length,unexpectedApi:browser.unexpectedApi.length,unexpectedConsoleRuntimeOrExternal:browser.runtime.reduce((n,row)=>n+row.errors.length+row.pageErrors.length+row.blockedExternal.length,0),clinicalWrites:browser.runtime.reduce((n,row)=>n+row.requests.filter(r=>r.method!=='GET'&&!r.path.startsWith('/auth/')).length,0)},
 evidence:{screenshots:readdirSync(`${out}/screenshots`).filter(name=>!name.startsWith('failed-')).map(name=>({path:`${out}/screenshots/${name}`,sha256:hash(`${out}/screenshots/${name}`)})),trace:existsSync(`${out}/trace.zip`)?{path:`${out}/trace.zip`,sha256:hash(`${out}/trace.zip`)}:null,browserResults:{path:`${out}/test-results/browser-results.json`,sha256:hash(`${out}/test-results/browser-results.json`)},videos:['final-desktop.webm','final-mobile.webm'].filter(name=>existsSync(`${out}/video/${name}`)).map(name=>({path:`${out}/video/${name}`,sha256:hash(`${out}/video/${name}`)}))},
 surface:'Real full SPA intercepted synthetic localhost-only auth/API. No real DB persistence or production authorization claim. No clinical data writes were required or allowed.'};
writeFileSync(`${out}/independent-source-receipt.json`,JSON.stringify(input,null,2));
console.log(JSON.stringify({candidate:input.candidate,frontendSourceTreeSha256:input.frontendSourceTreeSha256,applicationStatus:input.applicationStatus,regressionNewFailures:input.regression.newFailures,browser:input.browser},null,2));
if(input.applicationStatus||input.regression.newFailures.length||input.browser.checks!==input.browser.passed||input.browser.unexpectedApi||input.browser.unexpectedConsoleRuntimeOrExternal||input.browser.clinicalWrites)process.exitCode=1;
