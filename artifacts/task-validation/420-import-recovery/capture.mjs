import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=process.argv[2];if(!dir)throw Error('Own output directory required');mkdirSync(dir,{recursive:true});
const scopes=['frontend/src','backend/src','prisma','package.json','package-lock.json','frontend/package.json','frontend/tsconfig.json','frontend/tsconfig.app.json','frontend/tsconfig.node.json','frontend/vite.config.ts','frontend/vercel.json','backend/package.json','backend/tsconfig.json','scripts/build/copy-assessment-fonts.mjs','scripts/stub-css-loader.mjs','scripts/run-node-tests.mjs'];
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:20e6});if(r.status!==0)throw Error('Git source capture failed');return r.stdout;};
const files=git(['ls-files','-z','--',...scopes]).split('\0').filter(Boolean).sort().map(path=>{const b=readFileSync(path);return{path,sha256:createHash('sha256').update(b).digest('hex'),canonicalSha256:createHash('sha256').update(b.toString('utf8').replace(/\r\n/g,'\n')).digest('hex')};});
writeFileSync(`${dir}/source.json`,JSON.stringify({time:new Date().toISOString(),commit:git(['rev-parse','HEAD']).trim(),status:git(['status','--short','--',...scopes]),scope:scopes,files},null,2));
