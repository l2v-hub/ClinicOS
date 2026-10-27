import type { Prisma } from '@prisma/client';
import { ImportSessionError, object } from '../ai/upload/pages/model.js';
import { isValidCodiceFiscale, normalizeCodiceFiscale } from '../lib/codice-fiscale.js';
import { facilityDate } from '../lib/facility-time.js';

export interface ReviewedIntakeIdentity {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  codiceFiscale: string;
}
export interface ExistingIntakeDraftReference {
  id: string;
  version: number;
  source: string;
  importJobId: string | null;
  createdAt: string;
  updatedAt: string;
}
const identityFields = ['firstName', 'lastName', 'dateOfBirth', 'codiceFiscale'] as const;

/** An absent entire DTO is the legacy protocol; a present DTO never falls back to OCR. */
export function reviewedIntakeIdentity(value: unknown): ReviewedIntakeIdentity | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ImportSessionError(
      400,
      'invalid_reviewed_identity',
      'Identità della revisione non valida',
    );
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).length !== identityFields.length ||
    identityFields.some(
      (field) =>
        !Object.hasOwn(input, field) ||
        typeof input[field] !== 'string' ||
        (input[field] as string).length >
          (field === 'dateOfBirth' ? 32 : field === 'codiceFiscale' ? 64 : 200),
    )
  )
    throw new ImportSessionError(
      400,
      'invalid_reviewed_identity',
      'Verifica i dati anagrafici della revisione',
    );
  return Object.fromEntries(
    identityFields.map((field) => [field, (input[field] as string).trim()]),
  ) as unknown as ReviewedIntakeIdentity;
}

export function applyReviewedIntakeIdentity(
  data: Record<string, unknown>,
  reviewed: ReviewedIntakeIdentity | undefined,
): Record<string, unknown> {
  if (!reviewed) return data;
  const anagrafica: Record<string, unknown> = { ...object(data.anagrafica), ...reviewed };
  if (reviewed.codiceFiscale) anagrafica.codiceFiscaleOrigine = 'import';
  else delete anagrafica.codiceFiscaleOrigine;
  return { ...data, anagrafica };
}

const normalizedName = (value: unknown) =>
  typeof value === 'string'
    ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it-IT')
    : '';
function calendarBirthDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z)?$/.test(input))
    return null;
  const day = input.slice(0, 10),
    parsed = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === day &&
    day <= facilityDate()
    ? day
    : null;
}
export function intakeIdentity(data: unknown) {
  const fields = object(object(data).anagrafica);
  const rawCode = normalizeCodiceFiscale(fields.codiceFiscale);
  return {
    fiscalCode: isValidCodiceFiscale(rawCode) ? rawCode : null,
    firstName: normalizedName(fields.firstName),
    lastName: normalizedName(fields.lastName),
    birthDate: calendarBirthDate(fields.dateOfBirth),
    // Preserve invalid/unknown dates as different edits, without treating them as evidence.
    rawBirthDate: typeof fields.dateOfBirth === 'string' ? fields.dateOfBirth.trim() : '',
  };
}
export function corroboratingIntakeIdentity(left: unknown, right: unknown): boolean {
  const a = intakeIdentity(left),
    b = intakeIdentity(right);
  return (
    !!a.fiscalCode &&
    a.fiscalCode === b.fiscalCode &&
    !!a.firstName &&
    a.firstName === b.firstName &&
    !!a.lastName &&
    a.lastName === b.lastName &&
    !!a.birthDate &&
    a.birthDate === b.birthDate
  );
}
function identitySignature(data: unknown) {
  const value = intakeIdentity(data);
  return JSON.stringify([
    value.fiscalCode,
    value.firstName,
    value.lastName,
    value.birthDate ?? value.rawBirthDate,
  ]);
}

type CandidateRow = Omit<ExistingIntakeDraftReference, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
  anagrafica: unknown;
};

/**
 * Caller already holds its own job→draft locks. This lock serializes identity writers
 * for one server-owned owner; the following separate query gets a fresh RC snapshot.
 * No other candidate row is locked or changed, so no inverse resource dependency exists.
 */
export async function guardOpenIntakeIdentity(
  tx: Prisma.TransactionClient,
  {
    ownerId,
    data,
    previousData,
    draftId,
  }: {
    ownerId: string | null;
    data: Record<string, unknown>;
    previousData?: Record<string, unknown>;
    draftId?: string;
  },
): Promise<void> {
  const identity = intakeIdentity(data);
  if (!identity.fiscalCode) return; // Progressive drafts never match by name alone.
  if (previousData && identitySignature(previousData) === identitySignature(data)) return;
  const ownerKey =
    ownerId === null
      ? 'clinicos:intake-identity:unowned'
      : `clinicos:intake-identity:owner:${ownerId}`;
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${ownerKey}, 0))`;
  const rows = await tx.$queryRaw<CandidateRow[]>`
    SELECT d."id", d."version", d."source", d."importJobId", d."createdAt", d."updatedAt",
           d."data"->'anagrafica' AS anagrafica
    FROM "PatientIntakeDraft" d
    WHERE d."status"='draft' AND d."confirmedPatientId" IS NULL AND d."confirmedAt" IS NULL
      AND d."createdById" IS NOT DISTINCT FROM ${ownerId}
      AND d."id" <> ${draftId ?? ''}
      AND upper(btrim(coalesce(d."data"->'anagrafica'->>'codiceFiscale', ''))) = ${identity.fiscalCode}
    ORDER BY d."updatedAt" DESC, d."id" ASC LIMIT 21
  `;
  if (!rows.length) return;
  if (rows.some((row) => !corroboratingIntakeIdentity(data, { anagrafica: row.anagrafica })))
    throw new ImportSessionError(
      409,
      'intake_identity_conflict',
      'Il codice fiscale è già presente in una pratica con dati diversi o incompleti. Verifica l’identità prima di proseguire.',
    );
  const candidates: ExistingIntakeDraftReference[] = rows.slice(0, 20).map((row) => ({
    id: row.id,
    version: row.version,
    source: row.source,
    importJobId: row.importJobId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  throw new ImportSessionError(
    409,
    rows.length > 1 ? 'ambiguous_intake_drafts' : 'existing_intake_draft',
    rows.length > 1
      ? 'Sono già presenti più pratiche salvate per questa identità. Verificale prima di continuare.'
      : 'È già presente una pratica salvata per questa identità. Puoi riprenderla senza creare un’altra bozza.',
    { candidates, hasMore: rows.length > 20 },
  );
}
