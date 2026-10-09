import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='C:/w-418-qa-final/artifacts/task-validation/418-reading-recency/independent-qa418-final';
const receipt=JSON.parse(readFileSync(out+'/server-receipt.json'));
if(receipt.pid!==24884||receipt.port!==7483)throw Error('Owned server identity changed');
const command=`$taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId = ${receipt.pid}"; if (!$taskProcess -or $taskProcess.CommandLine -notlike '*independent-qa418-final/server.mjs*') { throw 'Owned server validation failed' }; Stop-Process -Id ${receipt.pid}; if (Get-NetTCPConnection -State Listen -LocalPort 7483 -ErrorAction SilentlyContinue) { throw 'Port still listening' }`;
const result=spawnSync('pwsh',['-NoProfile','-Command',command],{encoding:'utf8'});
if(result.status!==0)throw Error('Owned server stop failed');
writeFileSync(out+'/server-stopped.json',JSON.stringify({pid:receipt.pid,port:receipt.port,ownedCommandLineValidated:true,portFreeAfter:true,stoppedAt:new Date().toISOString()},null,2));console.log('Owned QA server stopped, port7483 free');
