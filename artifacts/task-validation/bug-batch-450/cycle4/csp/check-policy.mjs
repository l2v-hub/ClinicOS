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
const probe = `async () => { let wasm = false, js = false; try { await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0])); wasm = true; } catch {} try { new Function('return 1')(); js = true; } catch {} return { wasm, js }; }`;
const workerScript = `self.onmessage = async () => postMessage(await (${probe})());`;
const server = createServer((req,res) => {
  const mode = req.url.startsWith('/original') ? 'original' : 'candidate';
  res.setHeader('Content-Security-Policy', mode === 'original' ? original : candidate);
  res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : 'text/html');
  if (req.url.endsWith('worker.js')) return res.end(workerScript);
  if (req.url.endsWith('main.js')) return res.end(`(async () => { const main = await (${probe})(); const worker = new Worker('/${mode}/worker.js'); const result = await new Promise((resolve,reject) => { worker.onmessage = event => resolve(event.data); worker.onerror = reject; worker.postMessage('probe'); }); worker.terminate(); window.policyResult = {main, worker:result}; })();`);
  res.end(`<title>ClinicOS synthetic PDF decoder policy check</title><script src="/${mode}/main.js"></script>`);
});
let browser;
const result = {};
try {
  await new Promise(resolve => server.listen(5459,'127.0.0.1',resolve));
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  for (const mode of ['original','candidate']) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:5459/${mode}/`);
    await page.waitForFunction(() => !!window.policyResult);
    result[mode] = await page.evaluate(() => window.policyResult);
    await page.close();
  }
  await writeFile(new URL('policy-comparison.json',dir), JSON.stringify({ result, original, candidate, syntheticOnly:true, deployedSiteVerified:false, execution:'Actual self-hosted network main.js and worker.js, only result read via DevTools' },null,2));
  assert.deepEqual(result, { original: { main: { wasm:false, js:false }, worker: { wasm:false, js:false } }, candidate: { main: { wasm:true, js:false }, worker: { wasm:true, js:false } } });
  console.log('PASS main and real network-worker: original wasm denied; narrow candidate wasm allowed; JavaScript eval denied in both');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
