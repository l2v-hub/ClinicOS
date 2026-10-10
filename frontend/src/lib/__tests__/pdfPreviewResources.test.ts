import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pdfPreviewResources } from '../pdfPreviewResources';
import { pdfPreviewAssets } from '../../../config/pdfPreviewAssets';

test('PDF decoders resolve beside version-matched worker on app origin, also under a base path', () => {
  for (const worker of ['/assets/pdf.worker-HASH.mjs', '/clinic/assets/pdf.worker-HASH.mjs']) {
    const result = pdfPreviewResources(worker, 'https://clinic.example/pazienti', '6.2.108');
    assert.equal(result.wasmUrl, `https://clinic.example${worker.slice(0, worker.lastIndexOf('/') + 1)}pdfjs-6.2.108/`);
    assert.equal(result.useWorkerFetch, true);
  }
  assert.throws(() => pdfPreviewResources('/worker.mjs', 'https://clinic.example', '../escape'), /Invalid/);
});
test('Vite emits exact installed decoder bytes and licenses with names expected by PDF.js', () => {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve('pdfjs-dist/package.json'));
  const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const emitted: {fileName: string; source: Buffer}[] = [];
  const plugin = pdfPreviewAssets();
  const generate = typeof plugin.generateBundle === 'function' ? plugin.generateBundle : plugin.generateBundle!.handler;
  generate.call({ emitFile: (asset: {fileName: string; source: Buffer}) => emitted.push(asset) } as never, {} as never, {} as never, false);
  for (const name of ['jbig2.wasm', 'jbig2_nowasm_fallback.js', 'openjpeg.wasm', 'openjpeg_nowasm_fallback.js', 'qcms_bg.wasm', ...readdirSync(resolve(root, 'wasm')).filter(n => n.startsWith('LICENSE_'))]) {
    const asset = emitted.find(a => a.fileName === `assets/pdfjs-${version}/${name}`);
    assert.ok(asset, name);
    assert.deepEqual(asset.source, readFileSync(resolve(root, 'wasm', name)));
  }
  assert.equal(emitted.filter(a => a.fileName.endsWith('.wasm')).length, 3);
});
