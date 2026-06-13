// Server-side validation of extraction output (REQ-015).
// AJV against the ClinicOS output JSON Schema. Used both by providers (to drive
// correction retries) and by the job pipeline (final gate before review_ready).

import { Ajv, type ValidateFunction } from 'ajv';
import { loadOutputSchema } from './config.js';

let validator: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (validator) return validator;
  const ajv = new Ajv({ allErrors: true, strict: false });
  validator = ajv.compile(loadOutputSchema());
  return validator;
}

export interface SchemaValidation {
  valid: boolean;
  /** Short, content-free error messages (path + rule). Safe to log/return. */
  errors: string[];
}

export function validateExtraction(data: unknown): SchemaValidation {
  const validate = getValidator();
  const valid = validate(data) as boolean;
  if (valid) return { valid: true, errors: [] };
  const errors = (validate.errors ?? []).slice(0, 20).map((e) => {
    const where = e.instancePath || '(root)';
    return `${where} ${e.message ?? 'invalid'}`.trim();
  });
  return { valid: false, errors };
}

// Reset compiled validator (used by tests after swapping the schema path).
export function _resetValidator(): void {
  validator = null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const IT_DATE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/** Normalize an Italian/ambiguous date to AAAA-MM-GG when confidently possible.
 *  Never guesses: returns the input unchanged if the format is not recognized. */
export function normalizeDate(value: string): string {
  if (!value) return value;
  const v = value.trim();
  if (ISO_DATE.test(v)) return v;
  const m = IT_DATE.exec(v);
  if (m) {
    const [, d, mo, y] = m;
    const dd = d.padStart(2, '0');
    const mm = mo.padStart(2, '0');
    if (Number(dd) >= 1 && Number(dd) <= 31 && Number(mm) >= 1 && Number(mm) <= 12) {
      return `${y}-${mm}-${dd}`;
    }
  }
  return value;
}
