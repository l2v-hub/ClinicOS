import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root='artifacts/task-validation/414-draft-status',out=resolve(process.argv[2]||root+'/root-rerun');mkdirSync(out,{recursive:true});
const runs=[];
for(const [name,script,directory]of [['ordinary',root+'/qa-browser.mjs',out+'/browser'],['adversarial',root+'/independent-qa414/adversarial-browser.mjs',out+'/adversarial-browser']]){
 const child=spawn(process.execPath,['--import','tsx',script,directory],{env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';
 for(const stream of[child.stdout,child.stderr])stream.on('data',chunk=>{log+=chunk;process.stdout.write(chunk);});
 const exit=await new Promise((ok,fail)=>{child.on('error',fail);child.on('close',ok);});writeFileSync(out+`/${name}.log`,log);runs.push({name,exit});writeFileSync(out+'/browser-run-results.json',JSON.stringify(runs,null,2));if(exit!==0){process.exitCode=exit||1;break;}
}
