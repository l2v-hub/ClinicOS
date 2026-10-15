import {readFileSync,readdirSync,lstatSync,existsSync,rmSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='/backup/patient-reset-2026-10-15';
const phase=process.env.BACKUP_ERASE_PHASE;
const result={operationRunId:process.env.MAINTENANCE_RUN_ID,phase};
try {
 if(!['erase','verify'].includes(phase))throw new Error('UNEXPECTED_PHASE');
 if(process.env.DATABASE_URL)throw new Error('DATABASE_BINDING_FORBIDDEN');
 if(!readFileSync('/proc/self/mountinfo','utf8').split('\n').some(l=>l.split(' ')[4]==='/backup'))throw new Error('BACKUP_NOT_MOUNTED');
 const entries=readdirSync('/backup').filter(n=>n!=='lost+found');
 if(entries.some(n=>n!=='patient-reset-2026-10-15'))throw new Error('UNEXPECTED_VOLUME_CONTENTS');
 if(existsSync(root)) {
  if(phase==='verify')throw new Error('BACKUP_STILL_PRESENT_IN_NEW_CONTAINER');
  if(!lstatSync(root).isDirectory()||lstatSync(root).isSymbolicLink())throw new Error('UNEXPECTED_BACKUP_PATH');
  const file=root+'/database.dump';
  if(!lstatSync(file).isFile()||lstatSync(file).isSymbolicLink())throw new Error('UNEXPECTED_DUMP_PATH');
  const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
  if(hash.digest('hex')!=='43e463f591f8c4c63ed794d356f4c614f8c02cd5e719c2364939a234876b9907')throw new Error('BACKUP_CONTENT_IDENTITY_CHANGED');
  rmSync(root,{recursive:true,force:false});
  if(spawnSync('sync',[],{timeout:30000}).status!==0)throw new Error('VOLUME_SYNC_FAILED');
 }
 if(existsSync(root)||readdirSync('/backup').some(n=>n!=='lost+found'))throw new Error('BACKUP_VOLUME_NOT_EMPTY');
 console.log('CLINICOS_BACKUP_ERASE_RESULT '+JSON.stringify({...result,backupFilesAbsent:true,mountedVolumeVerified:true}));
}catch(error){console.log('CLINICOS_BACKUP_ERASE_RESULT '+JSON.stringify({...result,failed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'BACKUP_ERASE_FAILED'}));process.exitCode=1;}
