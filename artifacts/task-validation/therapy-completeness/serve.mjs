import { build } from 'vite';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const dir = resolve('artifacts/task-validation/therapy-completeness');
const output = resolve(dir, process.env.DIST || 'qa-dist');
const applicationRoot = process.env.BASELINE ? 'C:/w-pdf' : resolve('.');
const input = process.env.BASELINE ? 'C:/w-pdf/artifacts/task-validation/therapy-completeness-baseline/surface.tsx' : resolve(dir, 'surface.tsx');
const port = Number(process.env.PORT || 7542);
if (port !== 7542) throw new Error('Unassigned QA port');
if (!process.env.NO_BUILD) await build({ root: resolve(applicationRoot, 'frontend'), configFile: resolve(applicationRoot, 'frontend/vite.config.ts'),
  build: { outDir: output, emptyOutDir: false, rollupOptions: { input,
    output: { entryFileNames: 'assets/qa-entry.js' } } } });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png' };
const server = createServer((req, res) => {
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  const pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
  if (pathname === '/qa-therapy') {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html lang="it"><head><meta name="viewport" content="width=device-width, initial-scale=1">${readdirSync(resolve(output, 'assets')).filter(n => n.endsWith('.css')).map(n => `<link rel="stylesheet" href="/assets/${n}">`).join('')}</head><body><div id="root"></div><script type="module" src="/assets/qa-entry.js"></script></body></html>`);
    return;
  }
  const file = resolve(output, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(output + '/') && !file.startsWith(output + '\\')) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Synthetic QA surface http://127.0.0.1:${port}/qa-therapy`));
