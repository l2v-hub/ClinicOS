import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect } from 'playwright/test';
const base = process.env.BASE || 'http://127.0.0.1:7540';
const dir = resolve('artifacts/task-validation/pdf-multipage-preview');
const out = resolve(dir, process.env.RUN || 'candidate');
mkdirSync(out, { recursive: true });
const baseline = process.env.BASELINE === '1';
const online = process.env.ONLINE === '1';
const positive = process.env.POSITIVE === '1';
const foreground = rgb => rgb.every(v => positive ? v < 100 : v > 200);
const background = rgb => rgb.every(v => positive ? v > 200 : v < 100);
const browser = await chromium.launch({ args: ['--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebSockets'] });
const checks = [];
try {
  for (const [name, width, height] of baseline ? [['desktop', 1150, 1004]] : [['desktop', 1150, 1004], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: out } });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    const errors = [], httpErrors = [], requests = [], warnings = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('console', m => { if (m.type() === 'warning' || m.type() === 'log') warnings.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400) httpErrors.push([r.status(), r.url()]); });
    const state = { forbidden: [], mockMutations: [] };
    let open;
    if (online) open = await (await import('./online-transport.mjs')).guard(context, base, requests, state);
    else await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      requests.push({ path: url.pathname, method: request.method() });
      if (url.hostname === 'fonts.googleapis.com' && request.method() === 'GET')
        return route.fulfill({ contentType: 'text/css', body: '/* offline QA: use system fonts */' });
      if (url.origin !== base || request.method() !== 'GET') { await route.abort(); throw new Error('Nonlocal or mutating network request forbidden'); }
      if (url.pathname === '/synthetic/files/synthetic-doc/content')
        return route.fulfill({ contentType: 'application/pdf', body: readFileSync(resolve(dir, 'fixtures/four-pages-synthetic.pdf')) });
      return route.continue();
    });
    try {
    await page.goto(online ? `${base}/#/pazienti` : `${base}/qa-preview`);
    if (online) await open(page);
    await expect.poll(() => page.locator('.import-documents').count(), { timeout: 20000 }).toBe(1);
    await expect(page.getByText('4 / 30 pagine')).toBeVisible();
    const pixels = [];
    for (let n = 1; n <= 4; n++) {
      const img = page.locator(`[data-page-id="synthetic-page-${n}"] img`);
      await page.locator(`[data-page-id="synthetic-page-${n}"]`).scrollIntoViewIfNeeded();
      await expect(img).toBeVisible();
      await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth > 1)).toBeTruthy();
      const result = await img.evaluate(i => {
        const canvas = document.createElement('canvas'); canvas.width = i.naturalWidth; canvas.height = i.naturalHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(i, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let dark = 0, light = 0;
        for (let p = 0; p < data.length; p += 4) { if (data[p] < 100) dark++; if (data[p] > 200) light++; }
        const sample = x => Array.from(ctx.getImageData(Math.floor(x / 600 * canvas.width), Math.floor(310 / 780 * canvas.height), 1, 1).data).slice(0, 3);
        return { dark, light, markers: [sample(110), sample(240), sample(370)] };
      });
      const thumbData = await img.evaluate(i => {
        const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
        c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/png');
      });
      writeFileSync(`${out}/${name}-thumbnail-${n}-raw.png`, Buffer.from(thumbData.split(',')[1], 'base64'));
      pixels.push({ page: n, dark: result.dark, light: result.light });
      if (baseline && n > 1) assert.equal(result.dark, 0, 'Baseline scanned thumbnail is blank');
      else assert.ok(result.dark > 100 && result.light > 100, 'Actual source image contains contrast, not white blank');
      if (!baseline && n > 1) {
        assert.ok(foreground(result.markers[n - 2]));
        assert.ok(result.markers.filter((_, i) => i !== n - 2).every(background));
      }
    }
    await page.locator('.import-session').evaluate(e => e.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/${name}-four-original-pages.png`, fullPage: true });
    if (!baseline) {
      for (let n = 2; n <= 4; n++) {
        await page.locator(`[data-page-id="synthetic-page-${n}"] .import-page__open`).click();
        const canvas = page.locator('.document-pdf-preview canvas');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveAttribute('data-ready', 'true');
        await expect(canvas).toHaveAttribute('aria-label', `four-pages-synthetic.pdf · pagina ${n}`);
        const actual = await canvas.evaluate(c => {
          const ctx = c.getContext('2d');
          const sample = x => Array.from(ctx.getImageData(Math.floor(x / 600 * c.width), Math.floor(310 / 780 * c.height), 1, 1).data).slice(0, 3);
          return [sample(110), sample(240), sample(370)];
        });
        // In this CCITT fixture marker is white on black; only its page-specific position is white.
        assert.ok(foreground(actual[n - 2]), 'Correct distinct source-page marker');
        assert.ok(actual.filter((_, i) => i !== n - 2).every(background), 'Not a repeated page1/other scan');
        writeFileSync(`${out}/${name}-page-${n}-raw.png`, Buffer.from((await canvas.evaluate(c => c.toDataURL('image/png'))).split(',')[1], 'base64'));
        await page.screenshot({ path: `${out}/${name}-page-${n}.png`, fullPage: true });
        await page.getByRole('button', { name: 'Chiudi anteprima', exact: true }).last().click();
      }
      await page.getByRole('button', { name: 'Sposta pagina 4 prima', exact: true }).click();
      await expect(page.locator('.import-page').nth(2)).toHaveAttribute('data-page-id', 'synthetic-page-4');
      await page.reload();
      if (online) await open(page);
      await expect(page.locator('.import-page').nth(2)).toHaveAttribute('data-page-id', 'synthetic-page-4');
      await page.locator('[data-page-id="synthetic-page-4"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-page-id="synthetic-page-4"] img')).toBeVisible();
      await page.locator('[data-page-id="synthetic-page-4"] .import-page__open').click();
      await expect(page.locator('.document-pdf-preview canvas')).toHaveAttribute('data-ready', 'true');
      await expect(page.locator('.document-pdf-preview canvas')).toHaveAttribute('aria-label', 'four-pages-synthetic.pdf · pagina 4');
      const resumed = await page.locator('.document-pdf-preview canvas').evaluate(c => {
        const ctx = c.getContext('2d');
        return [110, 240, 370].map(x => Array.from(ctx.getImageData(Math.floor(x / 600 * c.width), Math.floor(310 / 780 * c.height), 1, 1).data).slice(0, 3));
      });
      assert.ok(foreground(resumed[2]));
      assert.ok(resumed.slice(0, 2).every(background));
      await page.getByRole('button', { name: 'Chiudi anteprima', exact: true }).last().click();
    }
    await page.locator('.import-session').evaluate(e => e.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/${name}-thumbnails.png`, fullPage: true });
    if (!baseline) { assert.deepEqual(errors, []); assert.deepEqual(httpErrors, []); }
    assert.deepEqual(state.forbidden, []);
    checks.push({ name, pixels, errors, httpErrors, requests, state, pass: true, baseline, online });
    await context.tracing.stop({ path: `${out}/${name}-trace.zip` });
    await context.close();
    } catch (error) {
      writeFileSync(`${out}/failure.json`, JSON.stringify({ message: String(error), errors, warnings, httpErrors, requests, body: await page.locator('body').innerText() }, null, 2));
      await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
      await context.tracing.stop({ path: `${out}/failure-trace.zip` });
      await context.close();
      throw error;
    }
  }
  writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  writeFileSync(`${out}/index.html`, `<h1>Synthetic PDF preview QA</h1><pre>${JSON.stringify(checks, null, 2).replaceAll('<', '&lt;')}</pre>`);
  console.log(`PASS ${checks.length} browser scenarios, baseline=${baseline}`);
} finally { await browser.close(); }
