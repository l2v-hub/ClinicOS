import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
const out='artifacts/task-validation/423-document-empty-state/root-refinement/tdd-preservation';assert.equal(existsSync(out),false);mkdirSync(out,{recursive:true});
const result=spawnSync(process.execPath,['--import','tsx','--test','--test-reporter','spec','frontend/src/components/operator/cartella/__tests__/documentEmptyState.test.ts'],{encoding:'utf8',maxBuffer:15e6,windowsHide:true});
writeFileSync(out+'/red.log',(result.stdout||'')+(result.stderr||''));
assert.equal(result.status,1);assert.match(result.stdout+result.stderr,/423 populated list respects save\/classify gates/);assert.match(result.stdout+result.stderr,/Modifica dettagli/);
writeFileSync(out+'/receipt.json',JSON.stringify({decision:'EXPECTED TDD RED: METADATA EDIT MUST REMAIN AVAILABLE WITHOUT CLASSIFICATION',exit:result.status,tests:5,reason:'Old candidate hides all editing instead of classification-only restriction',at:new Date().toISOString()},null,2));console.log('Expected preservation TDD RED retained');
