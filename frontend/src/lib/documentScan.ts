export interface ScanCrop {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type ScanCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const MIN_CROP = 0.12;

function validSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error('Invalid image dimensions');
}

/** A portrait document guide centered inside the actual video image. */
export function initialScanCrop(width: number, height: number): ScanCrop {
  validSize(width, height);
  const w = Math.min(width * 0.86, height * 0.86 * (210 / 297));
  const h = w * (297 / 210);
  return {
    left: (1 - w / width) / 2,
    right: (1 + w / width) / 2,
    top: (1 - h / height) / 2,
    bottom: (1 + h / height) / 2,
  };
}

export function moveScanCorner(crop: ScanCrop, corner: ScanCorner, x: number, y: number): ScanCrop {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return crop;
  const next = { ...crop };
  if (corner.endsWith('left')) next.left = Math.max(0, Math.min(x, crop.right - MIN_CROP));
  else next.right = Math.min(1, Math.max(x, crop.left + MIN_CROP));
  if (corner.startsWith('top')) next.top = Math.max(0, Math.min(y, crop.bottom - MIN_CROP));
  else next.bottom = Math.min(1, Math.max(y, crop.top + MIN_CROP));
  return next;
}

/** Convert the displayed image's normalized boundary into source pixels, without letterboxing. */
export function scanCaptureGeometry(width: number, height: number, crop: ScanCrop) {
  validSize(width, height);
  if (
    Object.values(crop).some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
    crop.left >= crop.right ||
    crop.top >= crop.bottom
  )
    throw new Error('Invalid crop');
  const x = Math.floor(crop.left * width);
  const y = Math.floor(crop.top * height);
  const sourceWidth = Math.min(width - x, Math.ceil(crop.right * width) - x);
  const sourceHeight = Math.min(height - y, Math.ceil(crop.bottom * height) - y);
  const scale = Math.min(
    1,
    Math.sqrt(12_000_000 / (sourceWidth * sourceHeight)),
    4096 / Math.max(sourceWidth, sourceHeight),
  );
  return {
    x,
    y,
    sourceWidth,
    sourceHeight,
    width: Math.max(1, Math.floor(sourceWidth * scale)),
    height: Math.max(1, Math.floor(sourceHeight * scale)),
  };
}

/** Embed a canvas-produced RGB JPEG losslessly in a one-page PDF. No document leaves the device. */
export async function scannedJpegToPdf(jpeg: Blob, width: number, height: number): Promise<Blob> {
  validSize(width, height);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    Math.max(width, height) > 4096 ||
    width * height > 12_000_000 ||
    jpeg.type !== 'image/jpeg' ||
    jpeg.size < 4 ||
    jpeg.size > 10 * 1024 * 1024 - 4096
  )
    throw new Error('Invalid scanned image');
  const data = new Uint8Array(await jpeg.arrayBuffer());
  if (data[0] !== 0xff || data[1] !== 0xd8 || data.at(-2) !== 0xff || data.at(-1) !== 0xd9)
    throw new Error('Invalid JPEG encoding');
  const pageWidth = +((width * 842) / Math.max(width, height)).toFixed(2);
  const pageHeight = +((height * 842) / Math.max(width, height)).toFixed(2);
  const encoder = new TextEncoder();
  const chunks: BlobPart[] = [];
  const offsets = [0];
  let length = 0;
  function append(value: string | Uint8Array<ArrayBuffer>) {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  }
  function object(id: number, body: string, stream?: Uint8Array<ArrayBuffer>) {
    offsets[id] = length;
    append(`${id} 0 obj\n${body}`);
    if (stream) {
      append('\nstream\n');
      append(stream);
      append('\nendstream');
    }
    append('\nendobj\n');
  }
  append('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Scan 4 0 R >> >> /Contents 5 0 R >>`,
  );
  object(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>`,
    data,
  );
  const commands = encoder.encode(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Scan Do\nQ\n`);
  object(5, `<< /Length ${commands.length} >>`, commands);
  const xref = length;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
