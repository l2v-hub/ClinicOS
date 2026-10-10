import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const root = resolve('frontend/dist');
const headers = JSON.parse(readFileSync('frontend/vercel.json')).headers.find(r => r.source === '/(.*)').headers;
const server = createServer((req, res) => {
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  for (const { key, value } of headers) res.setHeader(key, value);
  const path = new URL(req.url, 'http://127.0.0.1:7540').pathname;
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : decodeURIComponent(path)));
  if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream');
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
server.listen(7540, '127.0.0.1', () => console.log('Actual SPA static QA server 7540; production headers; no backend'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
