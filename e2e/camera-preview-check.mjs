// BUG-067 verify: fake-camera preview must render (not black). Launches Chromium with a
// synthetic media stream + auto-granted permission, drives Pazienti -> Importa -> Scatta foto,
// and screenshots the live preview. No real camera, no real data.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const out = process.argv[2] ?? '.';
const browser = await chromium.launch({
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, permissions: ['camera'] });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(800);
  await page.getByText('Importa dimissione').first().click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Scatta foto/i }).click();
  // wait for the live phase video to appear
  await page.locator('[data-testid="camera-live"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1500); // let the fake stream paint a few frames
  // sample the video pixels to assert it is NOT a uniform black frame
  const stats = await page.evaluate(() => {
    const v = document.querySelector('[data-testid="camera-live"]');
    if (!v) return { ok: false, reason: 'no video el' };
    const c = document.createElement('canvas');
    c.width = 64; c.height = 48;
    const g = c.getContext('2d');
    g.drawImage(v, 0, 0, 64, 48);
    const d = g.getImageData(0, 0, 64, 48).data;
    let nonBlack = 0, sum = 0;
    for (let i = 0; i < d.length; i += 4) { const lum = d[i] + d[i + 1] + d[i + 2]; sum += lum; if (lum > 30) nonBlack++; }
    return { ok: true, vw: v.videoWidth, vh: v.videoHeight, nonBlackPct: Math.round((nonBlack / (64 * 48)) * 100), avgLum: Math.round(sum / (64 * 48 * 3)), hasStream: !!v.srcObject };
  });
  await page.locator('[data-testid="camera-capture"]').screenshot({ path: resolve(out, 'after-118-camera.png') });
  console.log('CAMERA STATS', JSON.stringify(stats), 'consoleErrors', errors.length);
  console.log(stats.ok && stats.hasStream && stats.vw > 0 && stats.nonBlackPct > 20 ? 'PASS: preview renders live frames' : 'FAIL: preview appears black/empty');
} catch (e) {
  console.log('NAV FAILED:', e.message);
  await page.screenshot({ path: resolve(out, 'after-118-camera-FAIL.png') }).catch(() => {});
} finally {
  await browser.close();
}
