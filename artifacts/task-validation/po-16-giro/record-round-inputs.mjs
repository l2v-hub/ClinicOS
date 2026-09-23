import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='artifacts/task-validation/po-16-giro',sha=b=>createHash('sha256').update(b).digest('hex');
const sourceCommit='36fb96750575d409dc9de41ea42e1e858c472253';
const changes=execFileSync('git',['diff',sourceCommit,'--name-only','--','backend/src','frontend/src','prisma','tests/fixtures'],{encoding:'utf8',windowsHide:true}).trim();
if(changes)throw new Error('Record inputs before application integration; application tree changed');
const files=[];
for(const path of ['tests/integration/po16-round.test.mts',`${base}/integrated-round.log`,`${base}/integrated-round-receipt.json`]){const bytes=await readFile(path);files.push({path,sha256:sha(bytes),bytes:bytes.length})}
await writeFile(`${base}/integrated-round-inputs.json`,JSON.stringify({sourceCommit,applicationFilesMatchCommit:true,command:'node --import tsx --test tests/integration/po16-round.test.mts',node:process.version,files,limitations:'Mixed loopback HTTP/service integration, injected extraction. MNA presentation and touch-only changes have separate worker/root evidence.'},null,2));
