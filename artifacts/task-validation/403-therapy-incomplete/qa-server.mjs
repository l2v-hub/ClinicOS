import { createServer } from 'vite';
import { resolve } from 'node:path';
const server = await createServer({
  configFile: false, root: resolve('frontend'), esbuild: { jsx: 'automatic' },
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3001'),
    'import.meta.env.VITE_ENTRA_CLIENT_ID': '""', 'import.meta.env.VITE_ENTRA_TENANT_ID': '""', 'import.meta.env.VITE_ENTRA_API_SCOPE': '""' },
  server: { host: '127.0.0.1', port: 5186, strictPort: true, fs: { allow: [resolve('.')] } },
});
await server.listen();
console.log('Issue 403 synthetic actual SPA ready on localhost:5186');
