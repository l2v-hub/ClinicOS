import { spawnSync } from 'node:child_process';
function json(args) {
  const r = spawnSync('railway', args, {encoding:'utf8', timeout:30000});
  if(r.status !== 0) throw new Error('RAILWAY_READ_FAILED');
  return JSON.parse(r.stdout);
}
try {
  const backend = json(['variables','--service',process.env.RAILWAY_SERVICE,'--json']);
  if(backend.RAILWAY_PROJECT_ID !== 'bddf5d1b-ee83-4362-8238-a79721f795e5' || backend.RAILWAY_ENVIRONMENT_ID !== '235fd681-2b0a-4c09-a0c4-04d862a99b38') throw new Error('TARGET_CHANGED');
  const services = json(['service','list','--json']);
  const safe = (v) => {
    if(Array.isArray(v)) return v.map(safe);
    if(!v || typeof v !== 'object') return undefined;
    const result = {};
    for(const [k,x] of Object.entries(v)) {
      if(['id','name','status','serviceId','environmentId','deploymentId'].includes(k) && ['string','number'].includes(typeof x)) result[k]=x;
      else if(x && typeof x==='object') {const y=safe(x); if(y && Object.keys(y).length) result[k]=y;}
    }
    return result;
  };
  console.log(JSON.stringify({target:{projectId:backend.RAILWAY_PROJECT_ID,environmentId:backend.RAILWAY_ENVIRONMENT_ID,backendServiceId:backend.RAILWAY_SERVICE_ID},services:safe(services)}));
  const response = await fetch('https://backboard.railway.app/graphql/v2', {
    method:'POST', headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},
    body:JSON.stringify({query:'query { __schema { queryType { fields { name } } mutationType { fields { name args { name type { kind name ofType { kind name } } } } } } }'}),
  });
  const data=await response.json();
  if(data.errors) {console.log(JSON.stringify({graphqlStatus:response.status,introspectionErrors:data.errors.map(e=>e.extensions?.code ?? 'REJECTED')})); process.exitCode=1;}
  else console.log(JSON.stringify({operations:Object.fromEntries(Object.entries(data.data.__schema).map(([k,v])=>[k,v.fields.filter(f=>/backup|file|exec|volume/i.test(f.name))]))}));
} catch { console.error('PRIVATE_ACCESS_INSPECTION_FAILED');process.exitCode=1; }
