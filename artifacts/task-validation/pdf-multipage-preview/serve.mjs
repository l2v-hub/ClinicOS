import { build } from 'vite';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const dir = resolve('artifacts/task-validation/pdf-multipage-preview');
const output = resolve(dir, process.env.DIST || 'qa-dist');
const port = Number(process.env.PORT || 7540);
if (![7540, 7541].includes(port)) throw new Error('Unassigned QA port');
if (!process.env.NO_BUILD) await build({ root: resolve('frontend'), configFile: resolve('frontend/vite.config.ts'),
  build: { outDir: output, emptyOutDir: false, rollupOptions: { input: resolve(dir, 'surface.tsx'),
    output: { entryFileNames: 'assets/qa-entry.js' } } } });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png' };
const server = createServer((req, res) => {
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  const path = new URL(req.url, 'http://127.0.0.1:7540').pathname;
  if (path === '/qa-preview') {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html><head>${readdirSync(resolve(output, 'assets')).filter(n => n.endsWith('.css')).map(n => `<link rel="stylesheet" href="/assets/${n}">`).join('')}</head><body><div id="root"></div><script type="module" src="/assets/qa-entry.js"></script></body></html>`);
    return;
  }
  const file = resolve(output, '.' + decodeURIComponent(path));
  if (!file.startsWith(output + '/') && !file.startsWith(output + '\\')) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Compiled synthetic QA server 127.0.0.1:${port}; no backend`));
process.on('SIGINT', () => server.close(() => process.exit(0)));
