import { createServer } from 'vite';
import { resolve } from 'node:path';
const server = await createServer({configFile:false,root:resolve('frontend'),esbuild:{jsx:'automatic'},
 define:{'import.meta.env.VITE_API_URL':JSON.stringify('http://localhost:3001'),
 'import.meta.env.VITE_ENTRA_CLIENT_ID':'""','import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},
 server:{host:'127.0.0.1',port:7469,strictPort:true,fs:{allow:[resolve('.')]}}});
await server.listen();console.log('405 independent actual SPA synthetic QA: localhost7469');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
