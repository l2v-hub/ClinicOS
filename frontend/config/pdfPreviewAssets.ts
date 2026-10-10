import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';

/** PDF.js requests these decoders by their original names; Vite must not hash each filename. */
export function pdfPreviewAssets(): Plugin {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve('pdfjs-dist/package.json'));
  const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string };
  const prefix = `assets/pdfjs-${version}/`;
  const folder = resolve(root, 'wasm');
  const files = readdirSync(folder).filter(name => /^(?:jbig2|openjpeg)(?:_nowasm_fallback\.js|\.wasm)$|^qcms_bg\.wasm$|^LICENSE_/.test(name));
  return {
    name: 'clinicos-pdf-preview-assets',
    generateBundle() {
      for (const name of files) this.emitFile({ type: 'asset', fileName: prefix + name, source: readFileSync(resolve(folder, name)) });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname;
        if (!path.startsWith('/' + prefix)) return next();
        const name = path.slice(prefix.length + 1);
        if (req.method !== 'GET' || !files.includes(name)) { res.statusCode = 404; res.end(); return; }
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.js') ? 'text/javascript' : 'text/plain');
        res.end(readFileSync(resolve(folder, name)));
      });
    },
  };
}
