// BUG-052 (#89): verify "Scatta foto" is a real camera capture, distinct from "Importa".
// Run twice: with a FAKE camera (happy path) and WITHOUT (desktop-unavailable fallback).
//   node e2e/prod-camera-verify.mjs <outDir> [fake|nocam]
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.PROD_URL ?? 'https://clinicos-eosin.vercel.app';
const outDir = process.argv[2] ?? '.';
const mode = process.argv[3] ?? 'fake';
// fake = real fake stream; denied/unavailable = inject a getUserMedia rejection deterministically.
const args =
  mode === 'fake' ? ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : [];
const injectError =
  mode === 'denied' ? 'NotAllowedError' : mode === 'unavailable' ? 'NotFoundError' : null;

async function clickFirst(page, names) {
  for (const re of names) {
    const el = page.getByRole('button', { name: re }).first();
    try {
      if ((await el.count()) && (await el.isVisible())) {
        await el.click();
        return true;
      }
    } catch {
      /* */
    }
    const t = page.getByText(re).first();
    try {
      if ((await t.count()) && (await t.isVisible())) {
        await t.click();
        return true;
      }
    } catch {
      /* */
    }
  }
  return false;
}

const browser = await chromium.launch({ args });
const report = { mode };
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  if (injectError) {
    await page.addInitScript((name) => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () =>
          Promise.reject(Object.assign(new Error('mock'), { name }));
      }
    }, injectError);
  }
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  await clickFirst(page, [/Pazienti/i]);
  await page.waitForTimeout(800);
  await clickFirst(page, [/Importa dimissione/i, /Importa lettera/i, /Importa/i]);
  await page.waitForTimeout(800);

  const card = page.locator('.modal-card.import-modal');
  report.hasScattaFotoButton = (await page.locator('[data-testid="scatta-foto"]').count()) > 0;
  await card
    .screenshot({ path: resolve(outDir, `camera-${mode}-take-photo-button.png`) })
    .catch(() => {});

  await page.locator('[data-testid="scatta-foto"]').click();
  await page.waitForTimeout(1500);
  report.cameraModalOpened = (await page.locator('[data-testid="camera-capture"]').count()) > 0;
  const cam = page.locator('[data-testid="camera-capture"]');

  if (mode === 'fake') {
    // live preview should appear with the fake stream
    await page.waitForTimeout(1500);
    report.livePreview = (await page.locator('[data-testid="camera-live"]').count()) > 0;
    await cam.screenshot({ path: resolve(outDir, 'camera-live-preview.png') }).catch(() => {});
    // capture → preview
    if (await page.locator('[data-testid="camera-shoot"]').count())
      await page.locator('[data-testid="camera-shoot"]').click();
    await page.waitForTimeout(1000);
    report.capturedPreview = (await page.locator('[data-testid="camera-preview"]').count()) > 0;
    report.hasRetake = (await page.locator('[data-testid="camera-retake"]').count()) > 0;
    await cam.screenshot({ path: resolve(outDir, 'camera-captured-preview.png') }).catch(() => {});
    // use photo → added to the document list
    if (await page.locator('[data-testid="camera-use"]').count())
      await page.locator('[data-testid="camera-use"]').click();
    await page.waitForTimeout(2500);
    const body = (await page.textContent('body')) ?? '';
    report.photoAddedToList = /foto-documento-/.test(body);
    await card.screenshot({ path: resolve(outDir, 'camera-added-to-list.png') }).catch(() => {});
  } else {
    // injected getUserMedia rejection → explicit denied / unavailable fallback (NOT the file picker)
    await page.waitForTimeout(1500);
    report.unavailableFallback =
      (await page.locator('[data-testid="camera-unavailable"]').count()) > 0;
    report.deniedShown = (await page.locator('[data-testid="camera-denied"]').count()) > 0;
    const shot = mode === 'denied' ? 'camera-permission-denied.png' : 'camera-desktop-fallback.png';
    await cam.screenshot({ path: resolve(outDir, shot) }).catch(() => {});
  }
  await page.close();
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
