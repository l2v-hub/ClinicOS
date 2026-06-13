// Safe logging helpers for the AI flow.
//
// Two hard rules from REQ-013 / REQ-019:
//  1. Secrets (API keys) must never reach logs.
//  2. Full clinical document content must never reach logs.
//
// Everything that gets logged from the AI module should pass through here.

const SECRET_KEY_PATTERN = /(api[_-]?key|gemini[_-]?api[_-]?key|authorization|bearer|secret|token)/i;

// Heuristic for values that look like credentials (long opaque strings).
const SECRET_VALUE_PATTERN = /\bAIza[0-9A-Za-z\-_]{10,}\b|\b[A-Za-z0-9\-_]{32,}\b/g;

/** Mask a single secret-ish string, keeping only a short prefix for debugging. */
export function maskSecret(value: string | undefined | null): string {
  if (!value) return '';
  if (value.length <= 6) return '***';
  return `${value.slice(0, 3)}***`;
}

/** Truncate free text so full clinical content never lands in logs. */
export function truncateForLog(text: string | undefined | null, max = 80): string {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}…[+${flat.length - max} chars]`;
}

/** Redact an arbitrary object for logging: drop secret-named keys, mask secret-looking values. */
export function redactForLog(input: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]';
  if (input == null) return input;
  if (typeof input === 'string') {
    return input.replace(SECRET_VALUE_PATTERN, (m) => maskSecret(m));
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((v) => redactForLog(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = typeof val === 'string' ? maskSecret(val) : '[redacted]';
    } else {
      out[key] = redactForLog(val, depth + 1);
    }
  }
  return out;
}
