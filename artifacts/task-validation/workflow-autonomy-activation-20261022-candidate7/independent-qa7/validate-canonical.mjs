import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateState} from '../qa-source7/agent-team/src/bug-pipeline/contracts.mjs';
import {validateOperatorContinuations} from '../qa-source7/agent-team/src/bug-pipeline/attempt-budget.mjs';
import {validateStandaloneState} from '../qa-source7/agent-team/src/bug-pipeline/standalone-review.mjs';
const q=path.dirname(new URL(import.meta.url).pathname),v=JSON.parse(fs.readFileSync(path.join(q,'reservation.json'))),dir=path.dirname(v.transportReceipt),sha=b=>createHash('sha256').update(b).digest('hex');
const results=[];
for(const name of ['before.json','proposed.json']){
 const raw=fs.readFileSync(path.join(dir,name)),state=JSON.parse(raw);
 const snapshots=state.schemaVersion?state:state.state??state.content;
 assert(snapshots && typeof snapshots==='object');
 validateState(snapshots,'l2v-hub/ClinicOS');validateOperatorContinuations(snapshots);validateStandaloneState(snapshots);
 results.push({name,sha256:sha(raw),bytes:raw.length,validators:['validateState','validateOperatorContinuations','validateStandaloneState'],valid:true,counts:Object.fromEntries(['batches','manualBatches','standaloneReviews'].map(k=>[k,snapshots[k]?.length??0])),globalAutomationOwnProperty:Object.hasOwn(snapshots.operatorTakeover??{},'automation')});
}
assert.equal(results[1].globalAutomationOwnProperty,false);
fs.writeFileSync(path.join(q,'canonical-schema-results.json'),JSON.stringify({transportReceiptSha256:sha(fs.readFileSync(v.transportReceipt)),stateCommit:v.stateCommit,results,rawCanonicalCopied:false},null,2)+'\n');console.log('PASS complete actual reservation before/proposed canonical snapshots, all three validators; automation own-property absent');
