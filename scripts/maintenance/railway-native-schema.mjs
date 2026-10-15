const names=['ServiceCreateInput','VariableCollectionUpsertInput','ServiceInstance','Volume','VolumeInstance','WorkflowId','VolumeInstanceBackup','ServiceInstanceUpdateInput'];
const type='kind name ofType { kind name ofType { kind name ofType {kind name} } }';
const query='query {'+names.map((name,i)=>`t${i}:__type(name:${JSON.stringify(name)}) { name inputFields {name type {${type}}} fields {name type {${type}}} }`).join(' ')+` __schema { mutationType { fields { name args {name type {${type}}} type {${type}} } } } }`;
try {
 const response=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query})});
 const data=await response.json();
 if(data.errors) throw new Error('SCHEMA_REJECTED');
 const {__schema,...types}=data.data;
 console.log(JSON.stringify({types,mutations:__schema.mutationType.fields.filter(f=>/^(serviceCreate|serviceDelete|variableCollectionUpsert|serviceInstanceUpdate|volumeInstanceBackupCreate)$/.test(f.name))}));
} catch {console.error('NATIVE_SCHEMA_FAILED');process.exitCode=1;}
