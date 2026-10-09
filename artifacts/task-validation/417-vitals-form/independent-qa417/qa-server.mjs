import {createServer} from 'vite';
import {resolve} from 'node:path';
const base=resolve('artifacts/task-validation/417-vitals-form/independent-qa417');
const server=await createServer({configFile:false,root:resolve('frontend'),cacheDir:resolve(base,'cache/vite'),esbuild:{jsx:'automatic'},define:{'import.meta.env.VITE_API_URL':'"http://localhost:3001"','import.meta.env.VITE_ENTRA_CLIENT_ID':'""','import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},server:{host:'127.0.0.1',port:7480,strictPort:true,fs:{allow:[resolve('.'),'C:/Workspace/ClinicOSHouse-worktrees/insulin-online-20261008/node_modules']}}});
await server.listen();console.log('Fresh independent417 actual SPA loopback7480; all API synthetic guarded browser routes');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
