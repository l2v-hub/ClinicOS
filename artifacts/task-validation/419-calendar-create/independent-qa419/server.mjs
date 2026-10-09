import { createServer } from 'vite';
import { resolve } from 'node:path';
const server=await createServer({root:resolve('frontend'),configFile:resolve('frontend/vite.config.ts'),cacheDir:resolve('artifacts/task-validation/419-calendar-create/independent-qa419/runtime-cache'),define:{'import.meta.env.VITE_API_URL':'"http://localhost:3001"','import.meta.env.VITE_ENTRA_CLIENT_ID':'""','import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},server:{host:'127.0.0.1',port:7493,strictPort:true,fs:{allow:[resolve('.')]}}});
await server.listen();console.log('Independent419 actualSPA/compiler loopback7493, onlysynthetic API interception');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
