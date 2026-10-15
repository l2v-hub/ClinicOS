// Only native snapshots of the verified patient database and our synthetic dump.
const environmentId='235fd681-2b0a-4c09-a0c4-04d862a99b38',projectId='bddf5d1b-ee83-4362-8238-a79721f795e5';
const targets=new Map([['e26045b3-0e76-44c1-bc7f-803e101442bd','11a104b2-9788-4a70-94e8-38a95e4fdb6b'],['61e3959f-9e3a-40d2-8e12-a3c65fbb2d7b',null]]);
async function api(query,variables){
 const r=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(!r.ok||d.errors)throw new Error('NATIVE_SNAPSHOT_API_REJECTED');return d.data;
}
async function list(id){const d=await api('query($id:String!){volumeInstanceBackupList(volumeInstanceId:$id){id createdAt}}',{id});if(!Array.isArray(d.volumeInstanceBackupList))throw new Error('INVALID_SNAPSHOT_LIST');return d.volumeInstanceBackupList;}
try{
 const data=await api('query($id:String!){environment(id:$id){id projectId volumeInstances{edges{node{id volumeId serviceId}}}}}',{id:environmentId});
 if(data.environment?.id!==environmentId||data.environment.projectId!==projectId)throw new Error('UNEXPECTED_SNAPSHOT_ENVIRONMENT');
 const instances=data.environment.volumeInstances.edges.map(e=>e.node).filter(v=>targets.has(v.volumeId));
 if(!instances.some(v=>v.volumeId==='e26045b3-0e76-44c1-bc7f-803e101442bd'))throw new Error('SOURCE_DATABASE_VOLUME_NOT_FOUND');
 for(const instance of instances){
  if(instance.serviceId!==targets.get(instance.volumeId))throw new Error('VOLUME_SERVICE_CHANGED');
  const before=await list(instance.id);
  console.log(JSON.stringify({nativeSnapshotInventory:{volumeId:instance.volumeId,snapshots:before.length}}));
  for(const snapshot of before){
   await api('mutation($backupId:String!,$instanceId:String!){volumeInstanceBackupDelete(volumeInstanceBackupId:$backupId,volumeInstanceId:$instanceId){workflowId}}',{backupId:snapshot.id,instanceId:instance.id});
  }
  let remaining=before;
  for(let i=0;i<30;i++){
   remaining=await list(instance.id);if(!remaining.length)break;
   await new Promise(r=>setTimeout(r,3000));
  }
  if(remaining.length)throw new Error('NATIVE_SNAPSHOTS_REMAIN');
  console.log(JSON.stringify({nativeSnapshotsVerifiedEmpty:{volumeId:instance.volumeId,removed:before.length,remaining:0}}));
 }
}catch(error){console.error(JSON.stringify({nativeSnapshotCleanupFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'NATIVE_SNAPSHOT_CLEANUP_FAILED'}));process.exitCode=1;}
