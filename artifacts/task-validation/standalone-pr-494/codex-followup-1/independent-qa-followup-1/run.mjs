import {createRunner} from '/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs';
import {writeFile} from 'node:fs/promises';
const root='/workspace/.clinicos-cloud/receipt-recovery-followup-independent-qa-20261018';
const run=createRunner({runtimeRoot:root+'/runtime'});
for(const [name,args] of [['candidate-suite',['-B','-c',"import socket,ssl,unittest.mock,runpy,sys; socket.socket=lambda *a,**k: (_ for _ in ()).throw(AssertionError('NETWORK_BLOCKED')); socket.create_connection=socket.socket; sys.argv=['recover-demo-topology-receipt.test.py']; runpy.run_path('scripts/automation/recover-demo-topology-receipt.test.py',run_name='__main__')"]],['independent',['-B',root+'/independent-tests.py']]]) {
const r=await run({command:'python3',args,cwd:'/workspace/clinicos-topology-receipt',envMode:'verification',timeoutMs:60000});
await writeFile(root+'/'+name+'-results.json',JSON.stringify(r,null,2)+'\n'); console.log(name,JSON.stringify(r));
}
