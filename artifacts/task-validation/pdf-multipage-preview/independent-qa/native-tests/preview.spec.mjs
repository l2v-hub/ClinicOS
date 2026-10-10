import { test, expect } from 'playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
test('Real compiled import workspace: four source pages, all thumbnails, full previews, reorder and reload under exact production CSP', async ({}, info) => {
  const root = resolve('.'), dir = resolve('artifacts/task-validation/pdf-multipage-preview/independent-qa/native-csp');
  const result = spawnSync(process.execPath, ['artifacts/task-validation/pdf-multipage-preview/browser.mjs'], {
    cwd: root, encoding: 'utf8', maxBuffer: 2_000_000,
    env: { ...process.env, BASE: 'http://127.0.0.1:7541', RUN: 'independent-qa/native-csp', NO_WASM: '0', FIXTURE: '' },
  });
  await info.attach('actual browser command output', { body: Buffer.from((result.stdout || '') + (result.stderr || '')), contentType: 'text/plain' });
  expect(result.status).toBe(0);
  const runs = JSON.parse(readFileSync(resolve(dir, 'results.json')));
  expect(runs.map(r => r.name)).toEqual(['desktop', 'mobile']);
  for (const r of runs) {
    expect(r.pass).toBe(true); expect(r.errors).toEqual([]); expect(r.httpErrors).toEqual([]);
    expect(r.pixels).toHaveLength(4);
    expect(r.requests.some(x => x.path.endsWith('jbig2_nowasm_fallback.js'))).toBe(true);
    expect(r.warnings.some(w => w.includes('Content Security policy'))).toBe(true);
  }
  for (const file of readdirSync(dir).filter(n => n.endsWith('.png') || n.endsWith('.zip') || n.endsWith('.webm') || n === 'results.json'))
    await info.attach(file, { path: resolve(dir, file), contentType: file.endsWith('.png') ? 'image/png' : file.endsWith('.zip') ? 'application/zip' : file.endsWith('.webm') ? 'video/webm' : 'application/json' });
});
