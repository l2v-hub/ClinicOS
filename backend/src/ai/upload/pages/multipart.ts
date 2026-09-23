import multer from 'multer';
import type { Request, RequestHandler } from 'express';
import { ImportSessionError, LIMITS } from './model.js';
const totals = new WeakMap<Request, number>();
const storage: multer.StorageEngine = {
  _handleFile(req, file, done) {
    const chunks: Buffer[] = [];
    let size = 0;
    let ended = false;
    const fail = (e: Error) => {
      if (ended) return;
      ended = true;
      chunks.length = 0;
      done(e);
      file.stream.resume();
    };
    file.stream.on('data', (chunk: Buffer) => {
      if (ended) return;
      const total = (totals.get(req) ?? 0) + chunk.length;
      totals.set(req, total);
      if (total > LIMITS.maxTotalBytes) {
        fail(new ImportSessionError(413, 'request_limit', 'Carica un gruppo di file più piccolo'));
        return;
      }
      size += chunk.length;
      chunks.push(chunk);
    });
    file.stream.on('error', fail);
    file.stream.on('end', () => {
      if (!ended) {
        ended = true;
        done(null, { buffer: Buffer.concat(chunks), size });
      }
    });
  },
  _removeFile(_req, file, done) {
    delete (file as Partial<Express.Multer.File>).buffer;
    done(null);
  },
};
const upload = multer({
  storage,
  limits: {
    fileSize: LIMITS.maxFileBytes,
    files: LIMITS.maxFilesPerRequest,
    fields: 1,
    fieldSize: 65536,
    fieldNameSize: 100,
    parts: 11,
  },
}).array('files');
export const pageUpload: RequestHandler = (req, res, next) => {
  let total = 0,
    failed = false;
  const count = (chunk: Buffer) => {
    total += chunk.length;
    if (!failed && total > LIMITS.maxRequestBytes) {
      failed = true;
      req.emit(
        'error',
        new ImportSessionError(413, 'request_limit', 'Caricamento oltre il limite consentito'),
      );
    }
  };
  upload(req, res, (error) => {
    req.removeListener('data', count);
    next(error);
  });
  req.on('data', count);
};
export function uploadMetadata(value: unknown) {
  try {
    if (typeof value !== 'string') throw new Error();
    return JSON.parse(value);
  } catch {
    throw new ImportSessionError(400, 'invalid_metadata', 'Metadata del caricamento non validi');
  }
}
