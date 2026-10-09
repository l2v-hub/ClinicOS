import {createServer} from 'vite';
import {resolve} from 'node:path';
const server=await createServer({root:resolve('frontend'),configFile:resolve('frontend/vite.config.ts'),cacheDir:resolve('artifacts/task-validation/420-import-recovery/independent-qa420/runtime-cache'),server:{host:'127.0.0.1',port:7503,strictPort:true,fs:{allow:[resolve('.')]}}});
await server.listen();console.log(JSON.stringify({issue:420,port:7503,config:'frontend/vite.config.ts',overrides:'root/cache/server only; no define/env/app/compiler overrides',pid:process.pid}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
