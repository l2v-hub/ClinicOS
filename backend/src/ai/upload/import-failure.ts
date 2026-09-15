import { AiExtractionError, type AiErrorKind } from '../types.js';

const FAILURES = {
  AI_AUTH: [
    'config',
    false,
    'Il servizio AI ha rifiutato le credenziali. Verificare chiave e risorsa configurate.',
  ],
  AI_MODEL: [
    'config',
    false,
    'Endpoint o modello AI non trovato. Verificare il deployment configurato.',
  ],
  AI_CONFIG: ['config', false, 'La configurazione del servizio AI richiede una verifica.'],
  AI_INPUT: [
    'capability',
    false,
    'Il servizio AI non supporta il documento o la richiesta ricevuta.',
  ],
  AI_EMPTY: [
    'schema_validation',
    false,
    'Il servizio AI non ha restituito testo o dati utilizzabili.',
  ],
  AI_FILES_MISSING: [
    'config',
    false,
    'I documenti non sono più disponibili sul server. Ricaricarli prima di riprovare.',
  ],
  AI_RATE_LIMIT: [
    'provider_error',
    true,
    'Il servizio AI ha raggiunto un limite di richieste o quota.',
  ],
  AI_TIMEOUT: ['timeout', true, 'Il servizio AI non ha risposto entro il tempo previsto.'],
  AI_PROVIDER: ['provider_error', true, 'Il servizio AI non è momentaneamente disponibile.'],
} as const satisfies Record<string, readonly [AiErrorKind, boolean, string]>;

export type ImportFailureCode = keyof typeof FAILURES;

/** Translate legacy and current errors to an allowlist. Never return provider text. */
export function classifyImportFailure(error: unknown) {
  const obj =
    error && typeof error === 'object' ? (error as { kind?: unknown; message?: unknown }) : null;
  const message = (
    typeof error === 'string' ? error : typeof obj?.message === 'string' ? obj.message : ''
  ).slice(0, 16000);
  const kind = typeof obj?.kind === 'string' ? obj.kind : '';
  const marker = message.match(/\[(AI_[A-Z_]+)\]/)?.[1];
  const http = message.match(/(?:HTTP|status|auth|code|failed)\s*["':=]*\s*(\d{3})\b/i)?.[1];
  let code: ImportFailureCode = 'AI_PROVIDER';
  if (marker && Object.hasOwn(FAILURES, marker)) code = marker as ImportFailureCode;
  else if (
    kind === 'credentials' ||
    /\[credentials\]/.test(message) ||
    http === '401' ||
    http === '403'
  )
    code = 'AI_AUTH';
  else if (http === '404') code = 'AI_MODEL';
  else if (['400', '413', '415', '422'].includes(http ?? '') || kind === 'capability')
    code = 'AI_INPUT';
  else if (http === '429' || kind === 'rate_limit' || /\[rate_limit\]/.test(message))
    code = 'AI_RATE_LIMIT';
  else if (
    http === '408' ||
    http === '504' ||
    kind === 'timeout' ||
    /\btimeout\b|tempo limite|non risponde entro/i.test(message)
  )
    code = 'AI_TIMEOUT';
  else if (/Documenti non pi[uù].*disponibili/i.test(message)) code = 'AI_FILES_MISSING';
  else if (kind === 'config' || /\[config\]|not configured|non configurat/i.test(message))
    code = 'AI_CONFIG';
  else if (kind === 'schema_validation' || /\[schema_validation\]/.test(message)) code = 'AI_EMPTY';
  const [errorKind, retryable, description] = FAILURES[code];
  return { code, kind: errorKind, retryable, message: description };
}

export function safeImportError(error: unknown): string {
  const failure = classifyImportFailure(error);
  return `[${failure.code}] ${failure.message}`;
}

export function importRuntimeError(error: unknown): AiExtractionError {
  const failure = classifyImportFailure(error);
  return new AiExtractionError(failure.kind, safeImportError(error));
}

export function requireOcrText(result: unknown): string {
  const rawText =
    result && typeof result === 'object' ? (result as { rawText?: unknown }).rawText : null;
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new AiExtractionError('schema_validation', '[AI_EMPTY] Nessun testo OCR utilizzabile.');
  }
  return rawText;
}
