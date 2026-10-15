import {spawnSync} from 'node:child_process';
function call(args){const r=spawnSync('railway',args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});if(r.status!==0)throw new Error('WORKER_INSPECTION_REJECTED');return r.stdout;}
try{
 const services=JSON.parse(call(['service','list','--json']));
 const own=services.filter(s=>s.name==='clinicos-erase-fake-backup-38753177223');
 for(const service of own){
  console.log(JSON.stringify({eraseWorker:{id:service.id,name:service.name,deploymentId:service.deploymentId}}));
  const deployments=JSON.parse(call(['deployment','list','--service',service.id,'--environment','production','--json']));
  console.log(JSON.stringify({deployments:deployments.map(d=>({id:d.id,status:d.status,createdAt:d.createdAt}))}));
  try{for(const line of call(['logs','--service',service.id,'--environment','production','--json','--lines','100']).split('\n')){let m;try{m=JSON.parse(line).message;}catch{continue;}if(typeof m==='string'&&m.startsWith('CLINICOS_BACKUP_ERASE_RESULT '))console.log(JSON.stringify({workerResult:JSON.parse(m.slice('CLINICOS_BACKUP_ERASE_RESULT '.length))}));}}catch{}
 }
 console.log(JSON.stringify({matchingEraseWorkers:own.length}));
}catch{console.error(JSON.stringify({eraseWorkerInspectionFailed:true}));process.exitCode=1;}
