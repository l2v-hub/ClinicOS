import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createGitHub } from './github.mjs';
import { createRunner } from './process.mjs';
import { loadDashboard } from './dashboard.mjs';

const FILE = fileURLToPath(import.meta.url);
const assets = new Map([
  ['/', ['dashboard.html', 'text/html; charset=utf-8']],
  ['/dashboard.js', ['dashboard-client.js', 'text/javascript; charset=utf-8']],
  ['/dashboard.css', ['dashboard.css', 'text/css; charset=utf-8']],
]);

export function createDashboardServer({ load, refreshMs = 15000 }) {
  let cached = null;
  let cachedAt = 0;
  let pending = null;
  const refresh = async () => {
    if (!pending)
      pending = (async () => {
        try {
          cached = { ok: true, snapshot: await load() };
        } catch {
          cached = {
            ok: false,
            error: 'Aggiornamento GitHub non riuscito. Stato precedente non confermato.',
            snapshot: cached?.snapshot ?? null,
          };
        }
        cachedAt = Date.now();
      })().finally(() => {
        pending = null;
      });
    await pending;
    return cached;
  };
  const server = http.createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const host = request.headers.host;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    if (
      host !== new URL(origin).host ||
      (request.headers.origin && request.headers.origin !== origin) ||
      request.headers['sec-fetch-site'] === 'cross-site'
    ) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405).end('GET only');
      return;
    }
    if (request.url === '/api/status') {
      const data = !cached || Date.now() - cachedAt >= refreshMs ? await refresh() : cached;
      response
        .writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify(data));
      return;
    }
    const asset = assets.get(request.url);
    if (!asset) {
      response.writeHead(404).end('Not found');
      return;
    }
    try {
      const body = await readFile(path.join(path.dirname(FILE), 'dashboard', asset[0]));
      response.writeHead(200, { 'Content-Type': asset[1] }).end(body);
    } catch {
      response.writeHead(500).end('Dashboard unavailable');
    }
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === FILE) {
  const root = path.resolve(path.dirname(FILE), '../../..');
  const run = createRunner({
    env: process.env,
    runtimeRoot: path.join('/tmp', `clinicos-dashboard-${process.pid}`),
  });
  const repo = 'l2v-hub/ClinicOS';
  const github = createGitHub({ cwd: root, repo, run });
  const server = createDashboardServer({ load: () => loadDashboard(github, repo) });
  server.listen(4317, '127.0.0.1', () =>
    console.log('ClinicOS bug dashboard: http://127.0.0.1:4317'),
  );
}
