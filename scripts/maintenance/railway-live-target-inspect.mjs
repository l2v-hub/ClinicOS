import {spawnSync} from 'node:child_process';
try {
 const r=spawnSync('railway',['variables','--service','clinicos-backend','--json'],{encoding:'utf8',timeout:30000});
 if(r.status!==0)throw new Error('BACKEND_CONFIGURATION_UNAVAILABLE');
 const config=JSON.parse(r.stdout);
 if(config.RAILWAY_PROJECT_ID!=='bddf5d1b-ee83-4362-8238-a79721f795e5'||config.RAILWAY_ENVIRONMENT_ID!=='235fd681-2b0a-4c09-a0c4-04d862a99b38')throw new Error('TARGET_CHANGED');
 const response=await fetch('https://backboard.railway.app/graphql/v2',{method:'POST',headers:{'Content-Type':'application/json','Project-Access-Token':process.env.RAILWAY_TOKEN},body:JSON.stringify({query:'query($environmentId:String!,$serviceId:String!){serviceInstance(environmentId:$environmentId,serviceId:$serviceId){id serviceId environmentId domains{serviceDomains{domain} customDomains{domain}}}}',variables:{environmentId:config.RAILWAY_ENVIRONMENT_ID,serviceId:config.RAILWAY_SERVICE_ID}})});
 const data=await response.json();if(data.errors)throw new Error('DOMAIN_MAPPING_READ_FAILED');
 const instance=data.data.serviceInstance;
 const domains=[...instance.domains.serviceDomains,...instance.domains.customDomains].map(d=>d.domain);
 const url=new URL(config.DATABASE_URL);
 console.log(JSON.stringify({liveFrontendBackend:'clinicos-backend-demo.up.railway.app',verifiedBackendServiceId:instance.serviceId,verifiedEnvironmentId:instance.environmentId,domains,liveAliasMapsToCleanedDatabase:domains.includes('clinicos-backend-demo.up.railway.app'),databaseHost:url.hostname,database:url.pathname.slice(1)}));
 if(!domains.includes('clinicos-backend-demo.up.railway.app'))process.exitCode=1;
} catch(error){console.error(JSON.stringify({liveTargetVerificationFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'TARGET_VERIFICATION_FAILED'}));process.exitCode=1;}
