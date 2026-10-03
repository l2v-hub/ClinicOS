// Renders PDF pages to PNG with pdfjs-dist inside headless Chromium (no native tools needed).
// Usage: import { pdfToPngs } from './lib/pdf-to-png.mjs'; await pdfToPngs(browser, bytes, prefix)
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const pdfjs = path.join(root, 'node_modules/pdfjs-dist/build');

export async function pdfToPngs(browser, bytes, prefix, { scale = 1.6, maxPages = 6 } = {}) {
  const server = createServer((request, response) => {
    if (request.url === '/doc.pdf') {
      response.writeHead(200, { 'content-type': 'application/pdf' });
      return response.end(bytes);
    }
    if (request.url?.startsWith('/pdfjs/')) {
      response.writeHead(200, { 'content-type': 'text/javascript' });
      return response.end(readFileSync(path.join(pdfjs, request.url.slice(7))));
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(`<!doctype html><body style="margin:0;background:#fff"><script type="module">
      import * as pdfjs from '/pdfjs/pdf.min.mjs';
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      const doc = await pdfjs.getDocument({ url: '/doc.pdf' }).promise;
      window.pageCount = doc.numPages;
      window.renderPage = async (n) => {
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: ${scale} });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
        return canvas.toDataURL('image/png');
      };
      window.ready = true;
    </script></body>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const page = await browser.newPage();
  page.on('console', (m) => process.env.PDF_DEBUG && console.log('[pdf]', m.text()));
  page.on('pageerror', (e) => console.log('[pdf error]', e.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
    const count = Math.min(await page.evaluate(() => window.pageCount), maxPages);
    const files = [];
    for (let n = 1; n <= count; n++) {
      const data = await page.evaluate((index) => window.renderPage(index), n);
      const file = `${prefix}-p${n}.png`;
      writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      files.push(file);
    }
    return files;
  } finally {
    await page.close();
    server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  for (const file of process.argv.slice(2)) {
    const out = await pdfToPngs(browser, readFileSync(file), file.replace(/\.pdf$/i, ''));
    console.log(out.join('\n'));
  }
  await browser.close();
}
