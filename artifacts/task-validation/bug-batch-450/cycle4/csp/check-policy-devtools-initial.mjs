import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const dir = new URL('./', import.meta.url);
const original = JSON.parse(await readFile(new URL('../csp-wasm-diagnostic.json', dir), 'utf8')).csp;
const config = JSON.parse(await readFile('frontend/vercel.json', 'utf8'));
const candidate = config.headers.find(item => item.source === '/(.*)').headers.find(item => item.key === 'Content-Security-Policy').value;
assert.equal(candidate, original.replace("script-src 'self';", "script-src 'self' 'wasm-unsafe-eval';"));
assert.equal(candidate.includes("'unsafe-eval'"), false);
const script = `self.onmessage = async () => { let wasm = false, js = false; try { await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0])); wasm = true; } catch {} try { new Function('return 1')(); js = true; } catch {} postMessage({ wasm, js }); };`;
const server = createServer((req,res) => {
  const mode = req.url.startsWith('/original') ? 'original' : 'candidate';
  res.setHeader('Content-Security-Policy', mode === 'original' ? original : candidate);
  res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : 'text/html');
  res.end(req.url.endsWith('.js') ? script : '<title>ClinicOS synthetic PDF decoder policy check</title>');
});
let browser;
const result = {};
try {
  await new Promise(resolve => server.listen(5459,'127.0.0.1',resolve));
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  for (const mode of ['original','candidate']) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:5459/${mode}/`);
    result[mode] = await page.evaluate(async mode => {
      let wasm = false, js = false;
      try { await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0])); wasm = true; } catch {}
      try { new Function('return 1')(); js = true; } catch {}
      const worker = new Worker(`/${mode}/worker.js`);
      const workerResult = await new Promise((resolve,reject) => { worker.onmessage = event => resolve(event.data); worker.onerror = reject; worker.postMessage('probe'); });
      worker.terminate();
      return { main: { wasm, js }, worker: workerResult };
    }, mode);
    await page.close();
  }
  assert.deepEqual(result, { original: { main: { wasm:false, js:false }, worker: { wasm:false, js:false } }, candidate: { main: { wasm:true, js:false }, worker: { wasm:true, js:false } } });
  await writeFile(new URL('policy-comparison.json',dir), JSON.stringify({ result, original, candidate, syntheticOnly:true, deployedSiteVerified:false },null,2));
  console.log('PASS main and real network-worker: original wasm denied; narrow candidate wasm allowed; JavaScript eval denied in both');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
