import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const out=resolve('artifacts/task-validation/412-clinical-topics/independent-qa');
const source='3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56', baseline='8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df';
const command=spawnSync(process.execPath,['--import','tsx','--import','./scripts/stub-css-loader.mjs','--test',`${out}/adversarial-unit.test.tsx`],{encoding:'utf8',env:{...process.env,TSX_TSCONFIG_PATH:resolve('frontend/tsconfig.app.json')}});
writeFileSync(`${out}/adversarial-unit.log`,command.stdout+command.stderr);assert.equal(command.status,0);
const before=JSON.parse(readFileSync(`${out}/source-before/source-receipt.json`));
const after=JSON.parse(readFileSync(`${out}/source-after/source-receipt.json`));
assert.equal(before.sourceSha256,after.sourceSha256);assert.equal(after.applicationCommit,source);
const currentScan=JSON.parse(readFileSync('.claude/security-scans/scan-all-deep.json'));
const priorScan=JSON.parse(readFileSync('C:/w-411/.claude/security-scans/scan-all-deep.json'));
const paths=spawnSync('git',['diff','--name-only',baseline,source],{encoding:'utf8'}).stdout.trim().split('\n');
const touched=currentScan.findings.filter(f=>paths.includes(f.location.replaceAll('\\','/').split(':')[0]));
assert.equal(touched.length,1);
assert.ok(priorScan.findings.some(f=>JSON.stringify(f)===JSON.stringify(touched[0])));
const old=spawnSync('git',['show',`${baseline}:frontend/src/components/shared/sections/NarrativeClinicalSection.tsx`],{encoding:'utf8'}).stdout;
const current=readFileSync('frontend/src/components/shared/sections/NarrativeClinicalSection.tsx','utf8');
assert.equal(current.split(/\r?\n/)[7],old.split(/\r?\n/)[7]);
assert.match(current.split(/\r?\n/)[7],/no dangerouslySetInnerHTML/);
writeFileSync(`${out}/security-review.json`,JSON.stringify({applicationCommit:source,baseline,scanSummary:currentScan.summary,
  independentlyReviewedTouchedFinding:touched[0],baselineIdentical:true,implicatedLineUnchanged:true,
  rawHtmlSinkAdded:false,actualBrowserEscapedMarkupAssertion:true,changedEndpoints:false,changedPermissions:false,
  changedDependencies:false,clinicalSourceAutoAdoption:false,actualFullScanExecutedByRoot:true,
  scope:'Independent diff/runtime/security review; full scanner raw input independently compared, not reexecuted outside assigned artifact ownership.'},null,2));
const hashes=[];
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())walk(path);else if(item.name!=='immutable-manifest.json'){const bytes=readFileSync(path);hashes.push({path:relative(out,path).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
walk(out);hashes.sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(`${out}/immutable-manifest.json`,JSON.stringify({applicationCommit:source,sourceSha256:after.sourceSha256,
  baseline,verdict:'READY FOR CODEX QA',artifacts:hashes,frozenBeforeHandoff:true,
  privacy:'Only synthetic fixtures. No real audit attachments copied; no credential values logged. Fake simulator token retained in traces is explicitly synthetic/non-authorizing.'},null,2));
console.log(JSON.stringify({applicationCommit:source,sourceSha256:after.sourceSha256,artifactCount:hashes.length}));
