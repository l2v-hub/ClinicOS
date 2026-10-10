import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const base = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6';
const cwd = 'C:/w-pdf';
// Proof-only commits must not change a single application input relative to the release base.
assert.equal(execFileSync('git',['diff','--name-only',base,'--','frontend','scripts/run-node-tests.mjs','scripts/stub-css-loader.mjs','package-lock.json'],{cwd,encoding:'utf8'}).trim(),'');
const run=spawnSync(process.execPath,['../scripts/run-node-tests.mjs'],{cwd:cwd+'/frontend',encoding:'utf8',windowsHide:true,maxBuffer:32e6,
  env:{...process.env,TSX_TSCONFIG_PATH:cwd+'/frontend/tsconfig.app.json'}});
const log=(run.stdout||'')+(run.stderr||'');
const prefix='artifacts/task-validation/therapy-completeness/commands/';
writeFileSync(prefix+'baseline-full-regression.log',log);
const failures = text => [...new Set(text.split('\n').filter(l=>l.startsWith('✖ ')&&!l.includes('failing tests:'))
  .map(l=>l.replace(/ \([\d.]+ms\)\r?$/,'')))].sort();
const candidate=readFileSync(prefix+'full-regression.log','utf8');
const previous=failures(log), current=failures(candidate);
const introduced=current.filter(item=>!previous.includes(item));
writeFileSync(prefix+'regression-comparison.json',JSON.stringify({base,candidate:'14a03038f758cf728e563807752da1642dc35fa8',
  baselineExit:run.status,baselineSha256:createHash('sha256').update(log).digest('hex'),baselineFailures:previous,candidateFailures:current,
  introducedFailures:introduced,at:new Date().toISOString()},null,2));
console.log(JSON.stringify({baselineExit:run.status,baselineFailures:previous.length,candidateFailures:current.length,introducedFailures:introduced}));
assert.equal(introduced.length,0);
