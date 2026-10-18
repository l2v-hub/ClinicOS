import{spawnSync}from'node:child_process';
const r=spawnSync('/usr/bin/flock',['-w','50','/tmp/clinicos-browser-qa.lock',process.execPath,'/workspace/.clinicos-cloud/495-continuation3-independent-qa-20261018/browser.mjs'],{env:process.env,stdio:'inherit',timeout:55000});if(r.error)throw r.error;process.exitCode=r.status??1;
