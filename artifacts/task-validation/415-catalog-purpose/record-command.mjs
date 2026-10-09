import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
const [file,command,...args]=process.argv.slice(2);
const result=spawnSync(command,args,{encoding:'utf8',shell:false});
mkdirSync(dirname(file),{recursive:true});
writeFileSync(file,`${result.stdout||''}${result.stderr||''}\nEXIT ${result.status}\n`);
console.log(`${file}: exit ${result.status}`);process.exit(result.status??1);
