import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialScanCrop,
  moveScanCorner,
  scanCaptureGeometry,
  scannedJpegToPdf,
} from '../documentScan';
import { isImportPhotoReplacement } from '../importPhotoPreviews';

test('initial guide fits portrait and landscape camera images at the A4 ratio', () => {
  for (const [width, height] of [
    [1920, 1080],
    [1080, 1920],
    [1000, 1000],
  ]) {
    const crop = initialScanCrop(width, height);
    assert.ok(crop.left >= 0 && crop.right <= 1 && crop.top >= 0 && crop.bottom <= 1);
    assert.ok(
      Math.abs(
        ((crop.right - crop.left) * width) / ((crop.bottom - crop.top) * height) - 210 / 297,
      ) < 0.0001,
    );
    assert.ok(Math.abs(crop.left + crop.right - 1) < 0.0001);
  }
});

test('dragged corners are clamped to the image and cannot cross or collapse', () => {
  const crop = { left: 0.2, top: 0.2, right: 0.8, bottom: 0.8 };
  assert.deepEqual(moveScanCorner(crop, 'top-left', -5, -3), { ...crop, left: 0, top: 0 });
  const crossed = moveScanCorner(crop, 'bottom-right', -1, -1);
  assert.ok(crossed.right - crossed.left >= 0.1199);
  assert.ok(crossed.bottom - crossed.top >= 0.1199);
  assert.deepEqual(moveScanCorner(crop, 'bottom-left', NaN, 0.2), crop);
  assert.deepEqual(moveScanCorner(crop, 'top-right', 2, -1), { ...crop, right: 1, top: 0 });
});

test('normalized boundary selects exact source pixels and preserves portrait/landscape orientation', () => {
  assert.deepEqual(
    scanCaptureGeometry(1000, 800, { left: 0.1, top: 0.25, right: 0.9, bottom: 0.75 }),
    { x: 100, y: 200, sourceWidth: 800, sourceHeight: 400, width: 800, height: 400 },
  );
  assert.deepEqual(
    scanCaptureGeometry(800, 1000, { left: 0.25, top: 0.1, right: 0.75, bottom: 0.9 }),
    { x: 200, y: 100, sourceWidth: 400, sourceHeight: 800, width: 400, height: 800 },
  );
  const bounded = scanCaptureGeometry(12000, 9000, { left: 0, top: 0, right: 1, bottom: 1 });
  assert.ok(bounded.width * bounded.height <= 12_000_000);
  assert.ok(Math.max(bounded.width, bounded.height) <= 4096);
  assert.throws(() => scanCaptureGeometry(0, 3, { left: 0, top: 0, right: 1, bottom: 1 }));
  assert.throws(() => scanCaptureGeometry(100, 100, { left: 0.8, top: 0, right: 0.1, bottom: 1 }));
  assert.throws(() => scanCaptureGeometry(100, 100, { left: NaN, top: 0, right: 1, bottom: 1 }));
});

test('PDF container embeds original binary bytes, correct page ratio and exact xref offsets', async () => {
  // Container test deliberately uses marker bytes; real JPEG decoding/rendering is checked in-browser.
  const bytes = new Uint8Array([255, 216, 128, 0, 200, 201, 255, 217]);
  const pdf = await scannedJpegToPdf(new Blob([bytes], { type: 'image/jpeg' }), 600, 900);
  assert.equal(pdf.type, 'application/pdf');
  const buffer = Buffer.from(await pdf.arrayBuffer());
  const text = buffer.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.match(text, /\/Count 1/);
  assert.match(text, /\/MediaBox \[0 0 561\.33 842\]/);
  assert.ok(buffer.includes(Buffer.from(bytes)));
  const xref = Number(text.match(/startxref\n(\d+)/)![1]);
  assert.equal(buffer.subarray(xref, xref + 4).toString(), 'xref');
  const entries = text.slice(xref).split('\n').slice(3, 8);
  entries.forEach((entry, index) => {
    const offset = Number(entry.slice(0, 10));
    assert.equal(buffer.subarray(offset, offset + 7).toString(), `${index + 1} 0 obj`);
  });
  const landscape = await scannedJpegToPdf(new Blob([bytes], { type: 'image/jpeg' }), 900, 600);
  assert.match(await landscape.text(), /\/MediaBox \[0 0 842 561\.33\]/);
});

test('PDF conversion rejects incorrect type, dimensions and oversized or invalid image encoding', async () => {
  const jpeg = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
  await assert.rejects(scannedJpegToPdf(new Blob(['bad'], { type: 'image/png' }), 100, 100));
  await assert.rejects(scannedJpegToPdf(new Blob(['invalid'], { type: 'image/jpeg' }), 100, 100));
  for (const [w, h] of [
    [NaN, 1],
    [0, 1],
    [2.5, 4],
    [4097, 1],
    [4000, 4000],
  ])
    await assert.rejects(scannedJpegToPdf(jpeg, w, h));
  await assert.rejects(
    scannedJpegToPdf(
      new Blob([new Uint8Array(10 * 1024 * 1024)], { type: 'image/jpeg' }),
      100,
      100,
    ),
  );
});

test('photo replacement accepts one PDF or image, rejecting other files and multiple inputs', () => {
  const pdf = new File(['pdf'], 'scan.pdf', { type: 'application/pdf' });
  const image = new File(['jpeg'], 'scan.jpg', { type: 'image/jpeg' });
  assert.equal(isImportPhotoReplacement([pdf]), true);
  assert.equal(isImportPhotoReplacement([image]), true);
  assert.equal(isImportPhotoReplacement([pdf, image]), false);
  assert.equal(isImportPhotoReplacement([]), false);
  assert.equal(
    isImportPhotoReplacement([new File(['txt'], 'scan.txt', { type: 'text/plain' })]),
    false,
  );
});
