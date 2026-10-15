// Erase known synthetic backup files through an isolated, private volume worker.
// This is used when the project token cannot delete the volume resource itself.
import {spawnSync} from 'node:child_process';
import {mkdtempSync,copyFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const projectId='bddf5d1b-ee83-4362-8238-a79721f795e5',environmentId='235fd681-2b0a-4c09-a0c4-04d862a99b38';
const volumeId='61e3959f-9e3a-40d2-8e12-a3c65fbb2d7b',volumeName='clinicos-backup-20261015-38743287285-volume';
let serviceId,attached=false;
function railway(args,timeout=30000) {
 const r=spawnSync('railway',args,{encoding:'utf8',timeout,maxBuffer:8*1024*1024});
 if(r.status!==0)throw new Error('RAILWAY_COMMAND_REJECTED');return r.stdout;
}
function volumes(){return JSON.parse(railway(['volume','--environment','production','list','--json'])).volumes;}
async function api(query,variables){
 const r=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(!r.ok||d.errors)throw new Error('NATIVE_API_REJECTED');return d.data;
}
try {
 const config=JSON.parse(railway(['variables','--service','clinicos-backend','--environment','production','--json']));
 if(config.RAILWAY_PROJECT_ID!==projectId||config.RAILWAY_ENVIRONMENT_ID!==environmentId)throw new Error('TARGET_CHANGED');
 const volume=volumes().find(v=>v.id===volumeId);
 if(!volume||volume.name!==volumeName||volume.serviceName)throw new Error('DETACHED_BACKUP_IDENTITY_UNVERIFIED');
 const name='clinicos-erase-fake-backup-'+process.env.GITHUB_RUN_ID;
 const services=JSON.parse(railway(['service','list','--json']));
 if(services.some(s=>s.name===name))throw new Error('SERVICE_NAME_EXISTS');
 const created=await api('mutation($input:ServiceCreateInput!){serviceCreate(input:$input){id name}}',{input:{projectId,environmentId,name,variables:{MAINTENANCE_RUN_ID:process.env.GITHUB_RUN_ID}}});
 if(!created.serviceCreate?.id||created.serviceCreate.name!==name)throw new Error('NEW_SERVICE_UNVERIFIED');
 if(services.some(s=>s.id===created.serviceCreate.id))throw new Error('SERVICE_ID_NOT_NEW');
 serviceId=created.serviceCreate.id;
 console.log(JSON.stringify({privateBackupEraseService:serviceId,volumeId,databaseBinding:false}));
 await api('mutation($volumeId:String!,$environmentId:String!,$input:VolumeInstanceUpdateInput!){volumeInstanceUpdate(volumeId:$volumeId,environmentId:$environmentId,input:$input)}',{volumeId,environmentId,input:{serviceId,mountPath:'/backup'}});
 attached=true;
 const dir=mkdtempSync(join(tmpdir(),'clinicos-erase-backup-'));
 copyFileSync('scripts/maintenance/erase-fake-backup-worker.mjs',join(dir,'worker.mjs'));
 writeFileSync(join(dir,'railway.json'),JSON.stringify({build:{builder:'DOCKERFILE',dockerfilePath:'Dockerfile'},deploy:{restartPolicyType:'NEVER'}}));
 for(const phase of ['erase','verify']) {
  writeFileSync(join(dir,'Dockerfile'),'FROM node:22-alpine\nWORKDIR /maintenance\nCOPY worker.mjs ./\nENV BACKUP_ERASE_PHASE='+phase+'\nCMD ["node","worker.mjs"]\n');
  railway(['up',dir,'--path-as-root','--service',serviceId,'--environment','production','--project',projectId,'--detach','--yes','--json'],120000);
  let result;
  for(let i=0;i<100;i++) {
   await new Promise(r=>setTimeout(r,5000));
   try {
    for(const line of railway(['logs','--service',serviceId,'--environment','production','--json','--lines','100']).split('\n')) {
     let m;try{m=JSON.parse(line).message;}catch{continue;}
     if(typeof m!=='string'||!m.startsWith('CLINICOS_BACKUP_ERASE_RESULT '))continue;
     const parsed=JSON.parse(m.slice('CLINICOS_BACKUP_ERASE_RESULT '.length));
     if(parsed.operationRunId===process.env.GITHUB_RUN_ID&&parsed.phase===phase)result=parsed;
    }
   }catch{}
   if(result)break;
  }
  if(!result)throw new Error('PRIVATE_WORKER_RESULT_TIMEOUT');
  console.log(JSON.stringify({privateBackupErasure:result}));
  if(result.failed||!result.backupFilesAbsent)throw new Error('PRIVATE_BACKUP_ERASURE_FAILED');
 }
}catch(error){console.error(JSON.stringify({backupErasureFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'BACKUP_ERASURE_FAILED'}));process.exitCode=1;
}finally{
 if(serviceId)try {
  if(attached)await api('mutation($volumeId:String!,$environmentId:String!,$input:VolumeInstanceUpdateInput!){volumeInstanceUpdate(volumeId:$volumeId,environmentId:$environmentId,input:$input)}',{volumeId,environmentId,input:{serviceId:null}});
  const volume=volumes().find(v=>v.id===volumeId);
  if(!volume||volume.serviceName)throw new Error('DETACHMENT_UNVERIFIED');
  await api('mutation($id:String!,$environmentId:String!){serviceDelete(id:$id,environmentId:$environmentId)}',{id:serviceId,environmentId});
  console.log(JSON.stringify({temporaryEraseServiceRemoved:serviceId,emptyBackupVolumeDetached:true,volumeId}));
 }catch{console.error(JSON.stringify({temporaryEraseServiceCleanupFailed:serviceId,volumeId}));process.exitCode=1;}
}
