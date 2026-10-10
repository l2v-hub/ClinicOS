import {createServer} from 'vite';
import {resolve} from 'node:path';
const repo=resolve(process.env.APP_REPO||'.');
const server=await createServer({root:resolve(repo,'frontend'),configFile:resolve(repo,'frontend/vite.config.ts'),cacheDir:resolve(process.env.EV_OUT,'runtime-cache'),define:{'import.meta.env.VITE_API_URL':'"http://localhost:3001"','import.meta.env.VITE_ENTRA_CLIENT_ID':'""','import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},server:{host:'127.0.0.1',port:Number(process.env.QA_PORT||7529),strictPort:true,fs:{allow:[repo]}}});
await server.listen();console.log('428 actual SPA/config/compiler; API requests intercepted before wire');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
