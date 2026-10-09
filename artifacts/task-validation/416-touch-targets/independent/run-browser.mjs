import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const out=process.argv[2];mkdirSync(out,{recursive:true});
const script=process.argv[3]||'artifacts/task-validation/416-touch-targets/independent/independent-browser.mjs';
writeFileSync(`${out}/script-at-run.mjs`,readFileSync(script));
const args=['node_modules/tsx/dist/cli.mjs',script,out];
writeFileSync(`${out}/command.json`,JSON.stringify({command:process.execPath,args,cwd:process.cwd(),envOverrides:{TSX_TSCONFIG_PATH:'C:/w-416-qa/frontend/tsconfig.app.json',QA_BASE_URL:process.env.QA_BASE_URL||'http://127.0.0.1:7478'},boundary:'Synthetic intercepted local SPA; originalAC3 real hardware unverified'},null,2));
let log='';const child=spawn(process.execPath,args,{env:{...process.env,TSX_TSCONFIG_PATH:'C:/w-416-qa/frontend/tsconfig.app.json'}});for(const s of [child.stdout,child.stderr])s.on('data',b=>{log+=b;process.stdout.write(b);});child.on('close',code=>{writeFileSync(`${out}/run.log`,log);writeFileSync(`${out}/exit.json`,JSON.stringify({exit:code}));process.exitCode=code;});
