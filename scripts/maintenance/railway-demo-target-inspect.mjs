// Read-only next step for the online cleanup already requested by the user.
// This binding must belong to the backend actually used by the public frontend.
import {spawnSync} from 'node:child_process';
function railway(args) {
 const r=spawnSync('railway',args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
 if(r.status!==0)throw new Error('DEMO_CONFIGURATION_READ_REJECTED');
 return JSON.parse(r.stdout);
}
async function domains(config,serviceId) {
 const response=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query:'query($environmentId:String!,$serviceId:String!){serviceInstance(environmentId:$environmentId,serviceId:$serviceId){domains{serviceDomains{domain} customDomains{domain}}}}',variables:{environmentId:config.RAILWAY_ENVIRONMENT_ID,serviceId}}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(data.errors)throw new Error('DEMO_DOMAIN_MAPPING_REJECTED');
 return [...data.data.serviceInstance.domains.serviceDomains,...data.data.serviceInstance.domains.customDomains].map(d=>d.domain);
}
try {
 if(!process.env.RAILWAY_TOKEN)throw new Error('RAILWAY_DEMO_TOKEN_BINDING_MISSING');
 const services=railway(['service','list','--json']);
 if(!Array.isArray(services)||services.length>20)throw new Error('AMBIGUOUS_DEMO_SERVICES');
 let found=false;
 for(const service of services.filter(s=>/clinicos.*backend|backend.*clinicos/i.test(s.name))) {
  const config=railway(['variables','--service',service.id,'--json']);
  const names=await domains(config,service.id);
  if(!names.includes('clinicos-backend-demo.up.railway.app'))continue;
  const database=new URL(config.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(database.protocol))throw new Error('POSTGRESQL_BINDING_REQUIRED');
  console.log(JSON.stringify({onlineTargetVerified:true,mode:'configuration-read-only',projectId:config.RAILWAY_PROJECT_ID,environmentId:config.RAILWAY_ENVIRONMENT_ID,environmentName:config.RAILWAY_ENVIRONMENT_NAME,backendServiceId:service.id,backendServiceName:service.name,domains:names,databaseHost:database.hostname,database:database.pathname.slice(1),credentialsExported:false,inventoryPerformed:false,deletionPerformed:false}));
  found=true;break;
 }
 if(!found)throw new Error('BINDING_DOES_NOT_AUTHORIZE_LIVE_DEMO_BACKEND');
} catch(error) {console.error(JSON.stringify({demoTargetInspectionFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'DEMO_INSPECTION_FAILED',deletionPerformed:false}));process.exitCode=1;}
