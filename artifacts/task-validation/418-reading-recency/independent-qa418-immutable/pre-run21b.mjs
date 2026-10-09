import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out='C:/w-418-qa-final/artifacts/task-validation/418-reading-recency/independent-qa418-immutable';
const sha=b=>createHash('sha256').update(b).digest('hex');
mkdirSync(out+'/pre-run21b',{recursive:true});
const files=['independent.spec.cjs','playwright.config.cjs','server.mjs'].map(path=>{copyFileSync(out+'/'+path,out+'/pre-run21b/'+path+'.source');return{path,sha256:sha(readFileSync(out+'/'+path))};});
writeFileSync(out+'/pre-run21b/receipt.json',JSON.stringify({application:'d028e1ee4c5c44d96b5005362b28f54e5c05fee1',beforeExecution:true,files,sourceBeforeSha256:sha(readFileSync(out+'/source-before.json')),command:'node C:/w-insulin-qa/node_modules/playwright/cli.js test --config artifacts/task-validation/418-reading-recency/independent-qa418-immutable/playwright.config.cjs',cwd:'C:/w-418-qa-final',outputs:'fresh21b only; earlier collection attempt fresh21 retained and excluded archival source pre-run cannot become test input',at:new Date().toISOString()},null,2));
