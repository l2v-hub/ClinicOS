import { createServer } from 'vite';
import { resolve } from 'node:path';
const server = await createServer({ configFile: false, root: resolve('.'), esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 5184, strictPort: true, fs: { allow: [resolve('.')] } } });
await server.listen();
console.log('QA server 5184 ready');
