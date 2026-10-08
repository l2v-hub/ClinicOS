import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync,readdirSync,statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out='artifacts/task-validation/404-giro-allergies';
const baseline='64b3427be9e2d73ae47303f31b468b3c89f0c214',candidate='848ae9613c3cfe2a6eae81308719964475dc9afe';
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8'});if(r.status)throw new Error(r.stderr);return r.stdout.trim();};
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const hashRows=paths=>paths.sort().map(path=>({path,sha256:hash(path)}));
const security=spawnSync(process.execPath,['scripts/security/scan-frontend-secrets.mjs',out],{encoding:'utf8'});
writeFileSync(`${out}/logs/evidence-security-scan.log`,security.stdout+security.stderr);
if(security.status)throw new Error('Evidence security scan failed');
const frontend=hashRows(git('ls-files','frontend','package.json','package-lock.json').split(/\r?\n/).filter(Boolean));
const changed=git('diff','--name-only',baseline,candidate,'--','frontend','backend','prisma','package.json','package-lock.json').split(/\r?\n/).filter(Boolean);
const names=path=>[...new Set(readFileSync(path,'utf8').split(/\r?\n/).filter(row=>row.startsWith('✖ ')&&!row.startsWith('✖ failing tests:')).map(row=>row.replace(/ \([\d.]+ms\)$/,'').replaceAll('\\','/')))].sort();
const baselineLog='artifacts/task-validation/403-therapy-incomplete/logs/full-regression.log';
const baselineFailures=names(baselineLog),currentFailures=names(`${out}/logs/full-regression.log`);
const summary=path=>readFileSync(path,'utf8').split(/\r?\n/).filter(row=>/^ℹ (tests|pass|fail) /.test(row));
const browser=JSON.parse(readFileSync(`${out}/test-results/browser-results.json`,'utf8'));
const treePaths=dir=>readdirSync(dir).flatMap(name=>{const path=`${dir}/${name}`;return statSync(path).isDirectory()?treePaths(path):[path];});
const evidence=treePaths(out).filter(path=>/\/(screenshots|video|playwright-report|test-results|logs)\//.test(path)&&!path.includes('/initial-harness-failed/')&&!/\/failed-/.test(path)&&!/\/page@/.test(path));
const traces=readdirSync(out).filter(name=>name.endsWith('.zip')).map(name=>`${out}/${name}`);
const input={baseline,candidate,observedHead:git('rev-parse','HEAD'),repositoryTree:git('rev-parse',`${candidate}^{tree}`),applicationStatus:git('status','--porcelain','--','frontend','backend','prisma','package.json','package-lock.json'),
 sourceState:'Clean frozen committed application source; independent QA authored issue404 evidence only. Existing unrelated dirty files excluded; no dependencies installed. Builds generated ignored frontend/dist.',
 runtime:{node:process.version,platform:process.platform},frontendSourceTreeSha256:createHash('sha256').update(JSON.stringify(frontend)).digest('hex'),frontend,changed:hashRows(changed),
 harness:hashRows(['qa-browser.mjs','qa-server.mjs','qa-commands.mjs','qa-receipt.mjs','task-contract.md','issue-source.json','independent-test-plan.md','validation-report.md'].map(name=>`${out}/${name}`)),buildOutputs:hashRows(treePaths('frontend/dist')),
 regression:{baselineLog,baselineLogSha256:hash(baselineLog),baselineSummary:summary(baselineLog),currentSummary:summary(`${out}/logs/full-regression.log`),baselineFailures,currentFailures,newFailures:currentFailures.filter(name=>!baselineFailures.includes(name)),resolvedFailures:baselineFailures.filter(name=>!currentFailures.includes(name))},
 browser:{checks:browser.outcomes.length,passed:browser.outcomes.filter(row=>row.status==='PASS').length,unexpectedApi:browser.runtimes.reduce((n,row)=>n+row.unexpectedApi.length,0),unexpectedRuntimeHttpExternal:browser.runtimes.reduce((n,row)=>n+row.pageErrors.length+row.httpErrors.length+row.blockedExternal.length,0),expectedHttp:browser.runtimes.flatMap(row=>row.expectedHttp),clinicalWrites:browser.runtimes.flatMap(row=>row.clinicalWrites),maxActualActiveCartellaFetch:Math.max(...browser.runtimes.map(row=>row.fetchObservation?.max??0)),
  consoleErrors:browser.runtimes.flatMap(row=>row.errors),note:'Browser console resource errors for deliberately intercepted401/403/503 only; no unexpected console/runtime/HTTP. maxRouteReads in raw results counts mock route handlers held even after browser abort, not active network requests; actual fetch concurrency observed separately.'},
 evidence:hashRows([...evidence,...traces]),limitations:'Actual SPA + synthetic mocked local transport only. One simulated supervisor administration POST; zero real patient/DB writes. Reload proves mocked persistence, not database durability, live authorization, compatibility, or hardware/sunlight clinical safety. No production deployment/closure certification.'};
writeFileSync(`${out}/independent-source-receipt.json`,JSON.stringify(input,null,2));
console.log(JSON.stringify({candidate,inputHead:input.observedHead,applicationStatus:input.applicationStatus,sourceHash:input.frontendSourceTreeSha256,regression:input.regression.currentSummary,newFailures:input.regression.newFailures,browser:{checks:input.browser.checks,passed:input.browser.passed,unexpected:input.browser.unexpectedApi+input.browser.unexpectedRuntimeHttpExternal,writes:input.browser.clinicalWrites.length,maxActive:input.browser.maxActualActiveCartellaFetch}},null,2));
if(input.observedHead!==candidate||input.applicationStatus||input.regression.newFailures.length||input.regression.resolvedFailures.length||baselineFailures.length!==12||input.browser.checks!==input.browser.passed||input.browser.unexpectedApi||input.browser.unexpectedRuntimeHttpExternal||input.browser.clinicalWrites.length!==1||input.browser.maxActualActiveCartellaFetch>4)process.exitCode=1;
