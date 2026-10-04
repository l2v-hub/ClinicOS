// QA-only preview: browser evidence must not be watched while Chromium writes it.
import { createServer } from 'vite';
import path from 'node:path';
const server = await createServer({
  configFile: 'frontend/vite.config.ts',
  cacheDir: path.resolve('artifacts/task-validation/ux-widgets-calendari-bozze-consegne-e-milo/vite-cache'),
  server: { host: '127.0.0.1', port: 5187, strictPort: true,
    watch: { ignored: ['**/artifacts/**', '**/dist/**'] } },
});
await server.listen();
server.printUrls();
