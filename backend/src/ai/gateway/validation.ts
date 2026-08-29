import {
  GatewayError,
  type ClinicalSectionSearchInput,
  type CorrelateInput,
  type PatientSearchInput,
} from './types.js';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;
const SAFE_SECTION_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface ValidPatientSearchInput {
  query: string;
  tokens: string[];
  fiscalCode?: string;
  allergy?: string;
  therapy?: string;
  admissionFrom?: string;
  admissionTo?: string;
  limit: number;
}

function bad(message: string): never {
  throw new GatewayError('bad_request', message);
}

function boundedText(value: unknown, name: string, max: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') bad(`${name} must be text`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) bad(`${name} is invalid`);
  return normalized;
}

function boundedLimit(value: unknown, fallback = 20, max = 50): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    bad(`limit must be an integer between 1 and ${max}`);
  }
  return value;
}

function isoDate(value: unknown, name: string): string | undefined {
  const text = boundedText(value, name, 10);
  if (!text) return undefined;
  const match = ISO_DATE.exec(text);
  if (!match) bad(`${name} must use YYYY-MM-DD`);
  const [, year, month, day] = match;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    bad(`${name} is not a valid date`);
  }
  return text;
}

export function validatePatientSearchInput(input: unknown): ValidPatientSearchInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) bad('search body required');
  const source = input as PatientSearchInput;
  const query = boundedText(source.query, 'query', 100) ?? '';
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length > 5) bad('query has too many tokens');
  const fiscalCode = boundedText(source.fiscalCode, 'fiscalCode', 32);
  const allergy = boundedText(source.allergy, 'allergy', 100);
  const therapy = boundedText(source.therapy, 'therapy', 100);
  const admissionFrom = isoDate(source.admissionFrom, 'admissionFrom');
  const admissionTo = isoDate(source.admissionTo, 'admissionTo');
  if (!query && !fiscalCode && !allergy && !therapy && !admissionFrom && !admissionTo) {
    bad('at least one search filter is required');
  }
  if (admissionFrom && admissionTo && admissionFrom > admissionTo) {
    bad('admissionFrom must not be after admissionTo');
  }
  return {
    query,
    tokens,
    fiscalCode,
    allergy,
    therapy,
    admissionFrom,
    admissionTo,
    limit: boundedLimit(source.limit),
  };
}

export interface ValidClinicalSearchInput {
  query: string;
  patientId?: string;
  sectionKey?: string;
  limit: number;
}

export interface ValidCorrelateInput {
  allergy?: string;
  therapy?: string;
  sectionContains?: { sectionKey?: string; text: string };
  limit: number;
}

export function validateCorrelateInput(input: unknown): ValidCorrelateInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) bad('correlation body required');
  const source = input as CorrelateInput;
  const allergy = boundedText(source.allergy, 'allergy', 100);
  const therapy = boundedText(source.therapy, 'therapy', 100);
  let sectionContains: ValidCorrelateInput['sectionContains'];
  if (source.sectionContains !== undefined) {
    if (
      !source.sectionContains ||
      typeof source.sectionContains !== 'object' ||
      Array.isArray(source.sectionContains)
    ) {
      bad('sectionContains is invalid');
    }
    const text = boundedText(source.sectionContains.text, 'sectionContains.text', 100);
    if (!text) bad('sectionContains.text required');
    const sectionKey = boundedText(source.sectionContains.sectionKey, 'sectionKey', 64);
    if (sectionKey && !SAFE_SECTION_KEY.test(sectionKey)) bad('sectionKey is invalid');
    sectionContains = { text, ...(sectionKey ? { sectionKey } : {}) };
  }
  if (!allergy && !therapy && !sectionContains) bad('at least one correlation filter is required');
  return { allergy, therapy, sectionContains, limit: boundedLimit(source.limit) };
}

export function validateClinicalSearchInput(
  input: unknown,
  options: { queryRequired: boolean },
): ValidClinicalSearchInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) bad('search body required');
  const source = input as ClinicalSectionSearchInput;
  const query = boundedText(source.query, 'query', 100) ?? '';
  const patientId = boundedText(source.patientId, 'patientId', 128);
  if (patientId && !SAFE_ID.test(patientId)) bad('patientId is invalid');
  const sectionKey = boundedText(source.sectionKey, 'sectionKey', 64);
  if (sectionKey && !SAFE_SECTION_KEY.test(sectionKey)) bad('sectionKey is invalid');
  if ((options.queryRequired && !query) || (!query && !patientId)) {
    bad(options.queryRequired ? 'query required' : 'query or patientId required');
  }
  return { query, patientId, sectionKey, limit: boundedLimit(source.limit) };
}

/** Build a Prisma-compatible ACL predicate before any row cap is applied. */
export function patientScopeWhere(permittedPatientIds: string[] | null): Record<string, unknown> {
  return permittedPatientIds === null ? {} : { patientId: { in: permittedPatientIds } };
}

/** Patient-table predicate: ACL, textual tokens and admission range all precede Prisma `take`. */
export function patientSearchWhere(
  input: ValidPatientSearchInput,
  permittedPatientIds: string[] | null,
): Record<string, unknown> {
  const and: Record<string, unknown>[] = [];
  if (permittedPatientIds !== null) and.push({ id: { in: permittedPatientIds } });
  and.push(
    ...input.tokens.map((token) => ({
      OR: [
        { firstName: { contains: token, mode: 'insensitive' } },
        { lastName: { contains: token, mode: 'insensitive' } },
        { medicalRecordNumber: { contains: token, mode: 'insensitive' } },
      ],
    })),
  );
  if (input.admissionFrom || input.admissionTo) {
    and.push({
      createdAt: {
        ...(input.admissionFrom ? { gte: new Date(`${input.admissionFrom}T00:00:00.000Z`) } : {}),
        ...(input.admissionTo ? { lte: new Date(`${input.admissionTo}T23:59:59.999Z`) } : {}),
      },
    });
  }
  return and.length ? { AND: and } : {};
}
