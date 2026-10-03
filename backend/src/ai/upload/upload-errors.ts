import multer from 'multer';

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

/**
 * Upload limits rejected by multer, translated into a message that says which limit was hit and
 * how to fix it (never the raw multer code). Returns null for non-multer errors.
 */
export function uploadLimitError(
  error: unknown,
  limits: { maxFileBytes: number; maxFiles: number },
): { status: number; body: { error: string; code: string } } | null {
  if (!(error instanceof multer.MulterError)) return null;
  if (error.code === 'LIMIT_FILE_SIZE')
    return {
      status: 413,
      body: {
        code: 'file_too_large',
        error: `File oltre il limite di ${mb(limits.maxFileBytes)} MB: dividi il PDF o riduci la risoluzione della foto.`,
      },
    };
  if (error.code === 'LIMIT_FILE_COUNT')
    return {
      status: 413,
      body: {
        code: 'too_many_files',
        error: `Puoi caricare al massimo ${limits.maxFiles} file per volta: caricane meno e aggiungi gli altri dopo.`,
      },
    };
  // A file in an unexpected field is a malformed request, not a size limit.
  if (error.code === 'LIMIT_UNEXPECTED_FILE')
    return {
      status: 400,
      body: {
        code: 'invalid_upload',
        error: 'Caricamento non valido: invia i file nel campo «files» (PDF, JPEG o PNG).',
      },
    };
  return {
    status: 413,
    body: {
      code: 'request_limit',
      error: 'Caricamento non accettato: usa file PDF, JPEG o PNG, uno per campo «files».',
    },
  };
}
