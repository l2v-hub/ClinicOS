import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function call(args,{json=false,timeout=30000}={}) {
  const r=spawnSync('railway',args,{encoding:'utf8',timeout,maxBuffer:8*1024*1024});
  if(r.status!==0) {
    const diagnostic=String(r.stderr)+' '+String(r.stdout);
    const categories=[['NOT_LINKED',/no linked|not linked|link.*project/i],['NOT_AUTHORIZED',/unauthorized|not authorized|forbidden|permission denied/i],['PROJECT_TOKEN_UNSUPPORTED',/project tokens?.*not supported|not supported.*project tokens?/i],['INVALID_ARGUMENT',/unexpected argument|invalid value|unknown argument/i],['NETWORK',/network|connect|timeout|timed out/i]].filter(([,pattern])=>pattern.test(diagnostic)).map(([code])=>code);
    console.log(JSON.stringify({railwayCommand:args[0],exitCode:r.status,categories}));
    throw new Error('RAILWAY_'+String(args[0]).toUpperCase()+'_FAILED');
  }
  if(json) return JSON.parse(r.stdout);
  return r.stdout;
}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function api(query,variables) {
  const response=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
  const data=await response.json();
  if(data.errors) {
    console.log(JSON.stringify({nativeApiStatus:response.status,codes:data.errors.map(e=>e.extensions?.code??(/not authorized|unauthorized|forbidden/i.test(e.message??'')?'NOT_AUTHORIZED':'REJECTED'))}));
    throw new Error('NATIVE_API_REJECTED');
  }
  return data.data;
}
const backupMode=process.argv.includes('--backup')||process.argv.includes('--backup-existing');
const cleanupMode=process.argv.includes('--cleanup-patients');
const reuseBackup=cleanupMode||process.argv.includes('--backup-existing');
let serviceId,volumeId;
try {
  const backend=call(['variables','--service',process.env.RAILWAY_SERVICE,'--json'],{json:true});
  if(backend.RAILWAY_PROJECT_ID!=='bddf5d1b-ee83-4362-8238-a79721f795e5'||backend.RAILWAY_ENVIRONMENT_ID!=='235fd681-2b0a-4c09-a0c4-04d862a99b38') throw new Error('TARGET_CHANGED');
  const before=call(['service','list','--json'],{json:true});
  if(!Array.isArray(before)) throw new Error('UNEXPECTED_SERVICE_LIST');
  const name=reuseBackup?'clinicos-backup-20261015-38743287285':(backupMode?'clinicos-backup-20261015-':'clinicos-readonly-')+process.env.GITHUB_RUN_ID;
  if(reuseBackup) {
    serviceId='d7677bf9-3dc8-488d-915d-4c6639dc74a1';volumeId='61e3959f-9e3a-40d2-8e12-a3c65fbb2d7b';
    if(!before.some(s=>s.id===serviceId&&s.name===name)) throw new Error('BACKUP_SERVICE_NOT_VERIFIED');
    const schema=await api('query { input:__type(name:"VolumeInstanceUpdateInput"){inputFields{name type{kind name ofType{kind name}}}} environment:__type(name:"Environment"){fields{name type{kind name ofType{kind name}}}} }');
    console.log(JSON.stringify({volumeMaintenanceSchema:schema}));
    const volumeStatus=call(['volume','--service',serviceId,'--environment','production','list','--json'],{json:true});
    console.log(JSON.stringify({backupVolumeStatus:volumeStatus}));
    await api('mutation($input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:$input)}',{input:{projectId:backend.RAILWAY_PROJECT_ID,environmentId:backend.RAILWAY_ENVIRONMENT_ID,serviceId,skipDeploys:true,replace:false,variables:{EXPECTED_BACKUP_SERVICE_ID:serviceId,MAINTENANCE_RUN_ID:process.env.GITHUB_RUN_ID}}});
  } else {
    if(before.some(s=>s.name===name)) throw new Error('SERVICE_NAME_ALREADY_EXISTS');
    const created=await api('mutation($input:ServiceCreateInput!){serviceCreate(input:$input){id name}}',{input:{projectId:backend.RAILWAY_PROJECT_ID,environmentId:backend.RAILWAY_ENVIRONMENT_ID,name,variables:{DATABASE_URL:'${{clinicos-backend.DATABASE_URL}}'}}});
    if(!created.serviceCreate?.id || created.serviceCreate.name!==name || before.some(b=>b.id===created.serviceCreate.id)) throw new Error('NEW_SERVICE_ID_NOT_VERIFIED');
    serviceId=created.serviceCreate.id;
  }
  console.log(JSON.stringify({temporaryReadOnlyServiceId:serviceId,name,productionWrites:false}));
  if(backupMode&&!volumeId) {
    const volume=await api('mutation($input:VolumeCreateInput!){volumeCreate(input:$input){id}}',{input:{projectId:backend.RAILWAY_PROJECT_ID,environmentId:backend.RAILWAY_ENVIRONMENT_ID,serviceId,mountPath:'/backup',region:'us-west2'}});
    volumeId=volume.volumeCreate.id;
    console.log(JSON.stringify({privateBackupServiceId:serviceId,privateBackupVolumeId:volumeId,publicEndpoint:false,retainedForRecovery:true}));
  }
  const dir=mkdtempSync(join(tmpdir(),'clinicos-inventory-'));
  copyFileSync(cleanupMode?'scripts/maintenance/production-patient-cleanup.mjs':backupMode?'scripts/maintenance/production-snapshot.mjs':'scripts/maintenance/private-production-inventory.mjs',join(dir,'inventory.mjs'));
  if(cleanupMode) copyFileSync('scripts/maintenance/patient-data-reset.mjs',join(dir,'patient-data-reset.mjs'));
  writeFileSync(join(dir,'package.json'),JSON.stringify({type:'module',dependencies:{pg:'8.16.3'}}));
  const base=backupMode||cleanupMode?'FROM postgres:18-bookworm\nRUN apt-get update && apt-get install -y --no-install-recommends nodejs npm && rm -rf /var/lib/apt/lists/*\n':'FROM node:22-alpine\n';
  writeFileSync(join(dir,'Dockerfile'),base+'WORKDIR /maintenance\nCOPY package.json ./\nRUN npm install --omit=dev --ignore-scripts --no-audit --no-fund\nCOPY *.mjs ./\n'+(backupMode||cleanupMode?'':'USER node\n')+'CMD ["node","inventory.mjs"]\n');
  writeFileSync(join(dir,'railway.json'),JSON.stringify({build:{builder:'DOCKERFILE',dockerfilePath:'Dockerfile'},deploy:{restartPolicyType:'NEVER'}}));
  call(['up',dir,'--path-as-root','--service',serviceId,'--environment','production','--project',backend.RAILWAY_PROJECT_ID,'--detach','--yes','--json'],{timeout:120000});
  let result;
  const emittedMounts=new Set();
  for(let i=0;i<(backupMode||cleanupMode?150:60);i++) {
    await sleep(5000);
    try {
      const logs=call(['logs','--service',serviceId,'--environment','production','--json','--lines','100']);
      for(const line of logs.split('\n')) {
        let message;try{message=JSON.parse(line).message;}catch{continue;}
        if(typeof message==='string'&&message.startsWith('CLINICOS_BACKUP_MOUNT ')&&!emittedMounts.has(message)) {emittedMounts.add(message);console.log(JSON.stringify({backupMount:JSON.parse(message.slice('CLINICOS_BACKUP_MOUNT '.length))}));}
        if(typeof message==='string'&&message.startsWith('CLINICOS_MAINTENANCE_RESULT ')) {
          const parsed=JSON.parse(message.slice('CLINICOS_MAINTENANCE_RESULT '.length));
          if(!reuseBackup||parsed.operationRunId===process.env.GITHUB_RUN_ID) result=parsed;
        }
      }
    } catch { /* Build/start may not have produced application logs yet. */ }
    if(result) break;
  }
  if(!result) throw new Error('PRIVATE_INVENTORY_RESULT_TIMEOUT');
  console.log(JSON.stringify({[cleanupMode?'productionPatientCleanup':backupMode?'privateBackup':'privateInventory']:result}));
  if(result.failed) process.exitCode=1;
} catch(error) {
  console.error(JSON.stringify({operation:cleanupMode?'production-patient-cleanup':'private-read-only-inventory',error:/^[A-Z0-9_]+$/.test(error.message)?error.message:'MAINTENANCE_FAILED',deletionPerformed:cleanupMode?null:false}));process.exitCode=1;
} finally {
  if(serviceId&&!volumeId) {
    try {await api('mutation($id:String!,$environmentId:String!){serviceDelete(id:$id,environmentId:$environmentId)}',{id:serviceId,environmentId:'235fd681-2b0a-4c09-a0c4-04d862a99b38'});console.log(JSON.stringify({temporaryServiceRemoved:serviceId}));}
    catch {console.error(JSON.stringify({temporaryServiceCleanupFailed:serviceId}));process.exitCode=1;}
  }
  if(volumeId) console.log(JSON.stringify({retainedBackupServiceId:serviceId,retainedBackupVolumeId:volumeId}));
}
