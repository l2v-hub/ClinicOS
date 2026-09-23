import { createHash } from 'node:crypto';
import { AssessmentError, PAINAD_KEYS, PAINAD_VERSION, type PainadAnswers } from './types.js';
import { TRANSFERS_VERSION, type AssessmentType } from './types.js';
import { parseTransfersAnswers } from './transfers.js';
import { TINETTI_VERSION } from './tinetti-types.js';
import { parseTinettiAnswers } from './tinetti.js';
import { MNA_VERSION } from './mna-types.js';
import { parseMnaAnswers, mnaAssessmentDate } from './mna-input.js';
import { GDS15_VERSION } from './gds15-types.js';
import { parseGds15Answers } from './gds15.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assessmentId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value))
    throw new AssessmentError('Identificativo non valido');
  return value;
}
export function requestId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value))
    throw new AssessmentError('Identificativo richiesta non valido');
  return value.toLowerCase();
}
export function bodyObject(
  value: unknown,
  keys: readonly string[],
  maxBytes = 16_384,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key)) ||
    Buffer.byteLength(JSON.stringify(value)) > maxBytes
  )
    throw new AssessmentError('Richiesta non valida');
  return value as Record<string, unknown>;
}
export function parseInstant(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    throw new AssessmentError('Data e ora della valutazione non valide');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value)
    throw new AssessmentError('Data e ora della valutazione non valide');
  return value;
}
export function parseAnswers(value: unknown): PainadAnswers {
  const input = bodyObject(value, PAINAD_KEYS);
  if (
    PAINAD_KEYS.some(
      (key) => !Object.hasOwn(input, key) || ![null, 0, 1, 2].includes(input[key] as never),
    )
  )
    throw new AssessmentError('Inserisci una risposta valida o null per ciascun item');
  return Object.fromEntries(PAINAD_KEYS.map((key) => [key, input[key]])) as PainadAnswers;
}
export function expectedVersion(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) >= 2_147_483_647)
    throw new AssessmentError('Versione non valida');
  return value as number;
}
export function correctionReason(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 1000)
    throw new AssessmentError('Motivo della rettifica non valido');
  return value.trim();
}
export function parseCreate(value: unknown) {
  const input = bodyObject(
    value,
    [
      'requestId',
      'type',
      'formVersion',
      'assessedAt',
      'answers',
      'predecessorId',
      'correctionReason',
    ],
    32_768,
  );
  if (!(
    (input.type === 'painad' && input.formVersion === PAINAD_VERSION) ||
    (input.type === 'postural_transfers' && input.formVersion === TRANSFERS_VERSION) ||
    (input.type === 'tinetti' && input.formVersion === TINETTI_VERSION) ||
    (input.type === 'mna' && input.formVersion === MNA_VERSION) ||
    (input.type === 'gds15' && input.formVersion === GDS15_VERSION)
  ))
    throw new AssessmentError('Tipo o versione del modulo non supportati');
  if (input.type === 'painad' && Buffer.byteLength(JSON.stringify(value)) > 16_384)
    throw new AssessmentError('Richiesta non valida');
  const predecessorId = input.predecessorId == null ? null : assessmentId(input.predecessorId);
  const reason = correctionReason(input.correctionReason);
  if (Boolean(predecessorId) !== Boolean(reason))
    throw new AssessmentError('Indica valutazione precedente e motivo della rettifica');
  const assessedAt = parseInstant(input.assessedAt);
  if (input.type === 'mna') mnaAssessmentDate(assessedAt);
  return {
    requestId: requestId(input.requestId),
    type: input.type as AssessmentType,
    formVersion: input.formVersion as
      | typeof PAINAD_VERSION
      | typeof TRANSFERS_VERSION
      | typeof TINETTI_VERSION
      | typeof MNA_VERSION
      | typeof GDS15_VERSION,
    assessedAt,
    answers:
      input.type === 'gds15'
        ? parseGds15Answers(input.answers)
        : input.type === 'mna'
          ? parseMnaAnswers(input.answers)
          : input.type === 'painad'
            ? parseAnswers(input.answers)
            : input.type === 'tinetti'
              ? parseTinettiAnswers(input.answers)
              : parseTransfersAnswers(input.answers),
    predecessorId,
    correctionReason: reason,
  };
}
export function parsePatch(value: unknown, type: AssessmentType = 'painad') {
  const input = bodyObject(
    value,
    ['expectedVersion', 'assessedAt', 'answers', 'correctionReason'],
    type === 'painad' ? 16_384 : 32_768,
  );
  const assessedAt = parseInstant(input.assessedAt);
  if (type === 'mna') mnaAssessmentDate(assessedAt);
  return {
    expectedVersion: expectedVersion(input.expectedVersion),
    assessedAt,
    answers:
      type === 'gds15'
        ? parseGds15Answers(input.answers)
        : type === 'mna'
          ? parseMnaAnswers(input.answers)
          : type === 'painad'
            ? parseAnswers(input.answers)
            : type === 'tinetti'
              ? parseTinettiAnswers(input.answers)
              : parseTransfersAnswers(input.answers),
    correctionReason: correctionReason(input.correctionReason),
  };
}
export function parseFinalize(value: unknown) {
  const input = bodyObject(value, ['requestId', 'expectedVersion']);
  return {
    requestId: requestId(input.requestId),
    expectedVersion: expectedVersion(input.expectedVersion),
  };
}
export const payloadHash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
