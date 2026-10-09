import {createServer} from 'vite';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
const surface=readFileSync(new URL('./modal-surface.html',import.meta.url),'utf8');
const server=await createServer({root:resolve('frontend'),configFile:resolve('frontend/vite.config.ts'),plugins:[{name:'synthetic-qa422-only',configureServer(s){s.middlewares.use('/__qa422-modal',async(req,res)=>{res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/__qa422-modal',surface));});}}],cacheDir:resolve(process.env.EV_OUT,'runtime-cache'),define:{'import.meta.env.VITE_API_URL':'"http://localhost:3001"','import.meta.env.VITE_ENTRA_CLIENT_ID':'""','import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},server:{host:'127.0.0.1',port:Number(process.env.QA_PORT||7509),strictPort:true,fs:{allow:[resolve('.')]}}});
await server.listen();console.log('422 actual repository SPA/config/compiler, synthetic intercepted APIs only');for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
