import { createServer } from 'vite';
const server = await createServer({ configFile: 'frontend/vite.config.ts', server: {
  host: '127.0.0.1', port: 5190, strictPort: true, watch: { ignored: ['**/artifacts/**', '**/dist/**'] },
} });
await server.listen(); server.printUrls();
