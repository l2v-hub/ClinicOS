import { createServer } from 'vite';
const root='C:/w-412-baseline';
const server=await createServer({configFile:false,root:root+'/frontend',esbuild:{jsx:'automatic'},define:{
  'import.meta.env.VITE_API_URL':'"http://localhost:3001"','import.meta.env.VITE_ENTRA_CLIENT_ID':'""',
  'import.meta.env.VITE_ENTRA_TENANT_ID':'""','import.meta.env.VITE_ENTRA_API_SCOPE':'""'},
  server:{host:'127.0.0.1',port:7475,strictPort:true,fs:{allow:[root]}}});
await server.listen();console.log('Accepted8b read-only baseline QA loopback7475');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
