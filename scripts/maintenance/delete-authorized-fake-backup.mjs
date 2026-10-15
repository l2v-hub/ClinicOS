// User confirmed on 2026-10-15 that all data, including this backup, are synthetic.
// Delete only our detached maintenance backup, never either PostgreSQL volume.
import {spawnSync} from 'node:child_process';
const projectId='bddf5d1b-ee83-4362-8238-a79721f795e5';
const environmentId='235fd681-2b0a-4c09-a0c4-04d862a99b38';
const volumeId='61e3959f-9e3a-40d2-8e12-a3c65fbb2d7b';
const name='clinicos-backup-20261015-38743287285-volume';
function railway(args) {
 const r=spawnSync('railway',args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
 if(r.status!==0)throw new Error('RAILWAY_READ_REJECTED');
 return JSON.parse(r.stdout);
}
function volumes() {return railway(['volume','--environment','production','list','--json']).volumes;}
try {
 if(!process.env.RAILWAY_TOKEN)throw new Error('PRODUCTION_BINDING_MISSING');
 const config=railway(['variables','--service','clinicos-backend','--environment','production','--json']);
 if(config.RAILWAY_PROJECT_ID!==projectId||config.RAILWAY_ENVIRONMENT_ID!==environmentId)throw new Error('UNEXPECTED_TARGET');
 const before=volumes();
 if(!Array.isArray(before))throw new Error('VOLUME_INVENTORY_INVALID');
 const target=before.find(v=>v.id===volumeId);
 if(target) {
  if(target.name!==name||target.serviceName)throw new Error('BACKUP_IDENTITY_OR_DETACHMENT_CHANGED');
  const r=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query:'mutation($volumeId:String!){volumeDelete(volumeId:$volumeId)}',variables:{volumeId}}),signal:AbortSignal.timeout(30000)});
  const result=await r.json();
  if(!r.ok||result.errors||result.data?.volumeDelete!==true) {
   const schemaResponse=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query:'query{__schema{mutationType{fields{name args{name type{kind name ofType{kind name}}} type{kind name ofType{kind name}}}}} __type(name:"VolumeInstance"){fields{name type{kind name ofType{kind name}}}}}'}),signal:AbortSignal.timeout(30000)});
   const schema=await schemaResponse.json();
   console.log(JSON.stringify({deletionDiagnostics:{httpStatus:r.status,errors:(result.errors??[]).map(e=>({code:e.extensions?.code,message:e.message})),result:result.data?.volumeDelete,mutation:schema.data?.__schema?.mutationType?.fields.filter(f=>/volumeDelete|volumeInstanceBackupDelete/.test(f.name)),volumeInstanceFields:schema.data?.__type?.fields}}));
   throw new Error('BACKUP_DELETION_REJECTED');
  }
 }
 const after=volumes();
 if(after.some(v=>v.id===volumeId))throw new Error('BACKUP_STILL_PRESENT');
 if(before.some(v=>v.id!==volumeId&&!after.some(a=>a.id===v.id)))throw new Error('OTHER_VOLUME_MISSING');
 console.log(JSON.stringify({fakeMaintenanceBackupRemoved:true,alreadyAbsent:!target,volumeId,otherVolumesPreserved:after.length,productionDatabaseVolumePreserved:after.some(v=>v.id==='e26045b3-0e76-44c1-bc7f-803e101442bd')}));
} catch(error) {console.error(JSON.stringify({backupRemovalFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'BACKUP_REMOVAL_FAILED'}));process.exitCode=1;}
