import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=resolve(process.argv[2]),recipe=process.argv[3],port=Number(process.env.QA_PORT||7531);assert.ok(recipe);assert.equal(existsSync(out),false);mkdirSync(out,{recursive:true});
let log='';const server=spawn(process.execPath,[new URL('./qa-server.mjs',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')],{cwd:process.cwd(),windowsHide:true,env:{...process.env,QA_PORT:String(port),EV_OUT:out},stdio:['ignore','pipe','pipe']});
for(const stream of [server.stdout,server.stderr])stream.on('data',c=>log+=c);
let status=1;
try{let ready=false;for(let i=0;i<150;i++){assert.equal(server.exitCode,null);try{ready=(await fetch('http://127.0.0.1:'+port)).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready);
const child=spawn(process.execPath,[new URL('./'+recipe,import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),out+'/run'],{cwd:process.cwd(),windowsHide:true,env:{...process.env,APP_URL:process.env.APP_URL||'http://127.0.0.1:'+port},stdio:['ignore','pipe','pipe']});let runlog='';for(const stream of [child.stdout,child.stderr])stream.on('data',c=>runlog+=c);status=await new Promise((ok,fail)=>{child.on('error',fail);child.on('close',c=>ok(c??1));});writeFileSync(out+'/browser.log',runlog);console.log('browser exit'+status);
}finally{server.kill();await new Promise(r=>server.exitCode!==null||server.signalCode!==null?r():server.once('close',r));writeFileSync(out+'/server.log',log);writeFileSync(out+'/lane-receipt.json',JSON.stringify({serverPid:server.pid,port,serverStopped:server.exitCode!==null||server.signalCode!==null,signalCode:server.signalCode,status,root:process.env.APP_REPO||process.cwd(),released:true},null,2));}
process.exitCode=status;
