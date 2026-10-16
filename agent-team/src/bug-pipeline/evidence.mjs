import { inflateSync, inflateRawSync } from 'node:zlib';

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function validatePng(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    throw new Error('invalid PNG evidence');
  let offset = 8,
    width,
    height,
    channels,
    ended = false;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset),
      end = offset + 12 + length;
    if (end > bytes.length) throw new Error('truncated PNG evidence');
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (
      crc32(bytes.subarray(offset + 4, offset + 8 + length)) !==
      bytes.readUInt32BE(offset + 8 + length)
    )
      throw new Error('PNG checksum mismatch');
    if (offset === 8 && type !== 'IHDR') throw new Error('missing PNG header');
    if (type === 'IHDR') {
      if (width !== undefined || length !== 13) throw new Error('invalid PNG header');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      if (
        width < 16 ||
        height < 16 ||
        width > 10000 ||
        height > 10000 ||
        !channels ||
        data[8] !== 8 ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] !== 0
      )
        throw new Error('unsupported screenshot geometry or format');
    }
    if (type === 'IDAT') compressed.push(data);
    offset = end;
    if (type === 'IEND') {
      ended = length === 0 && offset === bytes.length;
      break;
    }
  }
  if (!ended || !compressed.length || !width) throw new Error('incomplete PNG evidence');
  const expected = (1 + width * channels) * height;
  if (expected > 100 * 1024 * 1024) throw new Error('screenshot decompression limit');
  const pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: expected });
  if (pixels.length !== expected) throw new Error('invalid PNG pixel data');
  for (let row = 0; row < height; row++)
    if (pixels[row * (1 + width * channels)] > 4) throw new Error('invalid PNG filter');
}
export function validateTrace(bytes) {
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      bytes.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + bytes.readUInt16LE(i + 20) === bytes.length
    ) {
      eocd = i;
      break;
    }
  if (eocd < 0 || bytes.readUInt16LE(eocd + 4) !== 0 || bytes.readUInt16LE(eocd + 6) !== 0)
    throw new Error('invalid ZIP trace directory');
  const entries = bytes.readUInt16LE(eocd + 10);
  if (!entries || entries > 10000 || bytes.readUInt16LE(eocd + 8) !== entries)
    throw new Error('invalid ZIP trace entries');
  let cursor = bytes.readUInt32LE(eocd + 16),
    found = false;
  for (let n = 0; n < entries; n++) {
    if (cursor + 46 > eocd || bytes.readUInt32LE(cursor) !== 0x02014b50)
      throw new Error('invalid ZIP trace entry');
    const flags = bytes.readUInt16LE(cursor + 8),
      method = bytes.readUInt16LE(cursor + 10),
      crc = bytes.readUInt32LE(cursor + 16),
      size = bytes.readUInt32LE(cursor + 20),
      unpacked = bytes.readUInt32LE(cursor + 24),
      nameLength = bytes.readUInt16LE(cursor + 28),
      extra = bytes.readUInt16LE(cursor + 30),
      comment = bytes.readUInt16LE(cursor + 32),
      local = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString();
    cursor += 46 + nameLength + extra + comment;
    if (cursor > eocd || name.includes('..') || name.startsWith('/'))
      throw new Error('invalid ZIP trace path');
    if (!name.endsWith('.trace')) continue;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      unpacked > 20 * 1024 * 1024 ||
      local + 30 > bytes.length ||
      bytes.readUInt32LE(local) !== 0x04034b50
    )
      throw new Error('unsupported trace compression');
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    if (start + size > eocd) throw new Error('truncated trace payload');
    const payload =
      method === 8
        ? inflateRawSync(bytes.subarray(start, start + size), { maxOutputLength: 20 * 1024 * 1024 })
        : bytes.subarray(start, start + size);
    if (payload.length !== unpacked || crc32(payload) !== crc)
      throw new Error('trace checksum mismatch');
    const records = payload
      .toString('utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    if (
      records.some(
        (r) =>
          r.type === 'before' &&
          (typeof r.apiName === 'string' ||
            (typeof r.class === 'string' && typeof r.method === 'string')),
      ) &&
      records.some((r) => r.type === 'after')
    )
      found = true;
  }
  if (!found) throw new Error('trace has no recorded Playwright actions');
}
