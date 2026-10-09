import {createServer} from 'vite';
import {resolve} from 'node:path';
const server=await createServer({root:resolve('frontend'),configFile:resolve('frontend/vite.config.ts'),cacheDir:resolve(process.env.EV_OUT,'runtime-cache'),define:{'import.meta.env.VITE_API_URL':'"http://localhost:3001"','import.meta.env.VITE_ENTRA_CLIENT_ID':'""','import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},server:{host:'127.0.0.1',port:Number(process.env.QA_PORT||7513),strictPort:true,fs:{allow:[resolve('.')]}}});
await server.listen();console.log('425 actual repository SPA/config/compiler; APIs must be intercepted');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
