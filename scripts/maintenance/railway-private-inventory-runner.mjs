import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function call(args,{json=false,timeout=30000}={}) {
  const r=spawnSync('railway',args,{encoding:'utf8',timeout,maxBuffer:8*1024*1024});
  if(r.status!==0) throw new Error('RAILWAY_'+String(args[0]).toUpperCase()+'_FAILED');
  if(json) return JSON.parse(r.stdout);
  return r.stdout;
}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let serviceId;
try {
  const backend=call(['variables','--service',process.env.RAILWAY_SERVICE,'--json'],{json:true});
  if(backend.RAILWAY_PROJECT_ID!=='bddf5d1b-ee83-4362-8238-a79721f795e5'||backend.RAILWAY_ENVIRONMENT_ID!=='235fd681-2b0a-4c09-a0c4-04d862a99b38') throw new Error('TARGET_CHANGED');
  const before=call(['service','list','--json'],{json:true});
  if(!Array.isArray(before)) throw new Error('UNEXPECTED_SERVICE_LIST');
  const name='clinicos-readonly-'+process.env.GITHUB_RUN_ID;
  if(before.some(s=>s.name===name)) throw new Error('SERVICE_NAME_ALREADY_EXISTS');
  call(['add','--service',name,'--variables','DATABASE_URL=${{clinicos-backend.DATABASE_URL}}','--json']);
  const after=call(['service','list','--json'],{json:true});
  const created=after.filter(s=>s.name===name&&!before.some(b=>b.id===s.id));
  if(created.length!==1) throw new Error('NEW_SERVICE_ID_NOT_VERIFIED');
  serviceId=created[0].id;
  console.log(JSON.stringify({temporaryReadOnlyServiceId:serviceId,name,productionWrites:false}));
  const dir=mkdtempSync(join(tmpdir(),'clinicos-inventory-'));
  copyFileSync('scripts/maintenance/private-production-inventory.mjs',join(dir,'inventory.mjs'));
  writeFileSync(join(dir,'package.json'),JSON.stringify({type:'module',dependencies:{pg:'8.16.3'}}));
  writeFileSync(join(dir,'Dockerfile'),'FROM node:22-alpine\nWORKDIR /maintenance\nCOPY package.json ./\nRUN npm install --omit=dev --ignore-scripts --no-audit --no-fund\nCOPY inventory.mjs ./\nUSER node\nCMD ["node","inventory.mjs"]\n');
  writeFileSync(join(dir,'railway.json'),JSON.stringify({build:{builder:'DOCKERFILE',dockerfilePath:'Dockerfile'},deploy:{restartPolicyType:'NEVER'}}));
  call(['up',dir,'--path-as-root','--service',serviceId,'--environment','production','--project',backend.RAILWAY_PROJECT_ID,'--detach','--yes','--json'],{timeout:120000});
  let result;
  for(let i=0;i<60;i++) {
    await sleep(5000);
    try {
      const logs=call(['logs','--service',serviceId,'--environment','production','--json','--lines','100']);
      for(const line of logs.split('\n')) {
        let message;try{message=JSON.parse(line).message;}catch{continue;}
        if(typeof message==='string'&&message.startsWith('CLINICOS_MAINTENANCE_RESULT ')) result=JSON.parse(message.slice('CLINICOS_MAINTENANCE_RESULT '.length));
      }
    } catch { /* Build/start may not have produced application logs yet. */ }
    if(result) break;
  }
  if(!result) throw new Error('PRIVATE_INVENTORY_RESULT_TIMEOUT');
  console.log(JSON.stringify({privateInventory:result}));
  if(result.failed) process.exitCode=1;
} catch(error) {
  console.error(JSON.stringify({operation:'private-read-only-inventory',error:/^[A-Z0-9_]+$/.test(error.message)?error.message:'MAINTENANCE_FAILED',deletionPerformed:false}));process.exitCode=1;
} finally {
  if(serviceId) {
    try {call(['service','delete','--service',serviceId,'--environment','production','--yes','--json']);console.log(JSON.stringify({temporaryServiceRemoved:serviceId}));}
    catch {console.error(JSON.stringify({temporaryServiceCleanupFailed:serviceId}));process.exitCode=1;}
  }
}
