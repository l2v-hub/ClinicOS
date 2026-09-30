// Uniform error model of the Tool Layer. Services keep throwing their own typed errors; this
// module only TRANSLATES them, so routes and tools agree on status semantics without either
// owning the other's logic.

import type { ToolErrorCode, ToolErrorShape } from './types.js';

const CODE_BY_STATUS: Record<number, ToolErrorCode> = {
  400: 'invalid_input',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  410: 'gone',
  413: 'invalid_input',
  415: 'invalid_input',
  422: 'unprocessable',
  428: 'confirmation_required',
  502: 'upstream_error',
  503: 'unavailable',
};

const STATUS_BY_CODE: Record<ToolErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  gone: 410,
  unprocessable: 422,
  confirmation_required: 428,
  upstream_error: 502,
  unavailable: 503,
  internal: 500,
};

export class ToolError extends Error {
  readonly code: ToolErrorCode;
  readonly status: number;
  readonly domainCode?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ToolErrorCode,
    message: string,
    extra: { domainCode?: string; details?: Record<string, unknown>; status?: number } = {},
  ) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.status = extra.status ?? STATUS_BY_CODE[code];
    this.domainCode = extra.domainCode;
    this.details = extra.details;
  }

  toShape(): ToolErrorShape {
    return {
      code: this.code,
      status: this.status,
      message: this.message,
      ...(this.domainCode ? { domainCode: this.domainCode } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export function toolError(
  code: ToolErrorCode,
  message: string,
  extra: { domainCode?: string; details?: Record<string, unknown> } = {},
): ToolErrorShape {
  return new ToolError(code, message, extra).toShape();
}

export function codeForStatus(status: number): ToolErrorCode {
  return CODE_BY_STATUS[status] ?? (status >= 500 ? 'internal' : 'invalid_input');
}

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  details?: unknown;
}

// Input/query error classes of the existing modules carry no status: their route maps them to 400.
const VALIDATION_ERROR_NAME = /(Input|Query|Validation)Error$/;

/**
 * Generic translation of an error thrown by an existing service:
 * 1. ToolError passes through;
 * 2. errors carrying their own HTTP `status` (AssessmentError, RosterError, CartellaUpdateError,
 *    ImportSessionError, ConsegnaCreationError, ParameterReadingError, …) keep it;
 * 3. `*InputError` / `*QueryError` → invalid_input (the route's 400);
 * 4. Prisma P2025 → not_found, P2002/P2034 → conflict;
 * 5. anything else → internal, with a generic message (no clinical text leaks).
 */
export function toToolErrorShape(error: unknown): ToolErrorShape {
  if (error instanceof ToolError) return error.toShape();
  const e = (error ?? {}) as ErrorLike;
  const message = typeof e.message === 'string' && e.message ? e.message : 'Errore';
  const domainCode = typeof e.code === 'string' ? e.code : undefined;
  const details =
    e.details && typeof e.details === 'object' ? (e.details as Record<string, unknown>) : undefined;
  const status =
    typeof e.status === 'number' ? e.status : typeof e.statusCode === 'number' ? e.statusCode : 0;

  if (domainCode === 'P2025') return toolError('not_found', 'Risorsa non trovata', { domainCode });
  if (domainCode === 'P2002' || domainCode === 'P2034') {
    return toolError('conflict', 'Conflitto con lo stato corrente', { domainCode });
  }
  if (status >= 400 && status < 600) {
    return {
      code: codeForStatus(status),
      status,
      message,
      ...(domainCode ? { domainCode } : {}),
      ...(details ? { details } : {}),
    };
  }
  // Many domain errors never set `this.name`: fall back to the class name.
  const className = (error as { constructor?: { name?: string } } | null)?.constructor?.name;
  const name = typeof e.name === 'string' && e.name !== 'Error' ? e.name : className;
  if (typeof name === 'string' && VALIDATION_ERROR_NAME.test(name)) {
    return toolError('invalid_input', message, domainCode ? { domainCode } : {});
  }
  return toolError('internal', 'Errore interno durante l’esecuzione dello strumento');
}
