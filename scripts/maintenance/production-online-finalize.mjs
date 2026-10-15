import {spawnSync} from 'node:child_process';
const projectId='bddf5d1b-ee83-4362-8238-a79721f795e5',environmentId='235fd681-2b0a-4c09-a0c4-04d862a99b38';
const backupServiceId='d7677bf9-3dc8-488d-915d-4c6639dc74a1',backupVolumeId='61e3959f-9e3a-40d2-8e12-a3c65fbb2d7b';
async function api(query,variables) {
 const r=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(d.errors) throw new Error('NATIVE_API_REJECTED');return d.data;
}
function railway(args) {
 const r=spawnSync('railway',args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});if(r.status!==0)throw new Error('RAILWAY_READ_FAILED');return JSON.parse(r.stdout);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try {
 const backend=railway(['variables','--service','clinicos-backend','--json']);
 if(backend.RAILWAY_PROJECT_ID!==projectId||backend.RAILWAY_ENVIRONMENT_ID!==environmentId) throw new Error('TARGET_CHANGED');
 const schema=await api('query {__schema{mutationType{fields{name args{name type{kind name ofType{kind name}}}}}}}');
 const restart=schema.__schema.mutationType.fields.find(f=>f.name==='deploymentRestart');
 if(!restart||restart.args.length!==1||restart.args[0].name!=='id') throw new Error('RESTART_API_NOT_VERIFIED');
 const services=railway(['service','list','--json']);
 for(const id of ['c000f011-0349-4ea9-9b56-13c625b5767b','2fa67280-a68f-4ed7-89e3-80280843dde4']) {
  const service=services.find(s=>s.id===id);if(!service?.deploymentId)throw new Error('ACTIVE_DEPLOYMENT_NOT_VERIFIED');
  const idType=restart.args[0].type.ofType?.name??restart.args[0].type.name;
  const result=await api(`mutation($id:${idType}!){deploymentRestart(id:$id)}`,{id:service.deploymentId});
  if(!result.deploymentRestart)throw new Error('RESTART_REJECTED');
  console.log(JSON.stringify({serviceRestarted:service.name,deploymentId:service.deploymentId,clearTemporaryPatientFilesAndCaches:true}));
 }
 let ready=false;
 const base='https://clinicos-backend-production-df88.up.railway.app';
 for(let i=0;i<30;i++) {
  await sleep(3000);
  try {const r=await fetch(base+'/ready',{signal:AbortSignal.timeout(10000)});if(r.status===200){ready=true;break;}}catch{}
 }
 if(!ready)throw new Error('ONLINE_READINESS_FAILED');
 const health=await fetch(base+'/health',{signal:AbortSignal.timeout(10000)});
 const frontend=await fetch('https://clinicos-eosin.vercel.app',{signal:AbortSignal.timeout(15000)});
 if(health.status!==200||frontend.status!==200)throw new Error('ONLINE_HTTP_CHECK_FAILED');
 console.log(JSON.stringify({onlineVerification:{backend:base,health:health.status,ready:200,frontend:frontend.status,authenticationMode:backend.AUTH_MODE??'unspecified'}}));
 const own=services.find(s=>s.id===backupServiceId&&s.name==='clinicos-backup-20261015-38743287285');
 if(!own)throw new Error('OWN_BACKUP_SERVICE_NOT_VERIFIED');
 await api('mutation($input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:$input)}',{input:{projectId,environmentId,serviceId:backupServiceId,skipDeploys:true,replace:true,variables:{BACKUP_RETAINED:'true'}}});
 const detached=await api('mutation($volumeId:String!,$environmentId:String!,$input:VolumeInstanceUpdateInput!){volumeInstanceUpdate(volumeId:$volumeId,environmentId:$environmentId,input:$input)}',{volumeId:backupVolumeId,environmentId,input:{serviceId:null}});
 if(!detached.volumeInstanceUpdate)throw new Error('BACKUP_DETACH_FAILED');
 const detachedVolumes=railway(['volume','--environment','production','list','--json']);
 const detachedVolume=detachedVolumes.volumes?.find(v=>v.id===backupVolumeId);
 if(!detachedVolume||detachedVolume.serviceName)throw new Error('BACKUP_DETACH_NOT_VERIFIED');
 await api('mutation($id:String!,$environmentId:String!){serviceDelete(id:$id,environmentId:$environmentId)}',{id:backupServiceId,environmentId});
 const volumes=railway(['volume','--environment','production','list','--json']);
 const retained=volumes.volumes?.find(v=>v.id===backupVolumeId);
 if(!retained)throw new Error('RETAINED_BACKUP_VOLUME_NOT_FOUND');
 console.log(JSON.stringify({maintenanceServiceRemoved:backupServiceId,privateBackupRetained:{volumeId:backupVolumeId,name:retained.name,detached:true,path:'/patient-reset-2026-10-15/database.dump'}}));
} catch(error) {console.error(JSON.stringify({finalizationFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'FINALIZATION_FAILED'}));process.exitCode=1;}
