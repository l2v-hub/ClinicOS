import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { hasGlobalPatientScope } from './patient-scope.js';

export class CartellaUpdateError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonEqual(value, right[index]))
    );
  const a = left as Record<string, unknown>,
    b = right as Record<string, unknown>;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => Object.hasOwn(b, key) && jsonEqual(a[key], b[key]))
  );
}
/** Call only after locking the patient and existing Cartella row in the write transaction. */
function preserveLegacyHistory(
  current: unknown,
  incoming: Record<string, unknown>,
  key: 'valutazioniTinetti' | 'valutazioniNRS',
  label: 'Tinetti' | 'NRS',
  code: string,
  allowEmptyWhenAbsent = false,
) {
  const output = { ...incoming };
  const hasLegacy =
    !!current &&
    typeof current === 'object' &&
    !Array.isArray(current) &&
    Object.hasOwn(current, key);
  const legacy = hasLegacy ? (current as Record<string, unknown>)[key] : undefined;
  if (allowEmptyWhenAbsent && !hasLegacy && Array.isArray(output[key]) && output[key].length === 0)
    delete output[key];
  if (Object.hasOwn(output, key) && (!hasLegacy || !jsonEqual(output[key], legacy)))
    throw new CartellaUpdateError(
      `Lo storico ${label} precedente è di sola lettura. Ricarica la cartella; le modifiche non sono state salvate.`,
      409,
      code,
    );
  if (hasLegacy) output[key] = legacy;
  return output;
}
export function preserveTinettiHistory(
  current: unknown,
  incoming: Record<string, unknown>,
  allowEmptyWhenAbsent = false,
) {
  return preserveLegacyHistory(
    current,
    incoming,
    'valutazioniTinetti',
    'Tinetti',
    'tinetti_legacy_read_only',
    allowEmptyWhenAbsent,
  );
}
export function preserveNrsHistory(current: unknown, incoming: Record<string, unknown>) {
  return preserveLegacyHistory(current, incoming, 'valutazioniNRS', 'NRS', 'nrs_legacy_read_only');
}
export async function saveCartella(patientId: string, value: unknown, actor: Operator) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CartellaUpdateError(
      'Campo "data" obbligatorio (oggetto JSON)',
      400,
      'cartella_invalid_input',
    );
  const { codiceFiscale: _legacyIdentity, ...clinicalData } = value as Record<string, unknown>;
  return prisma.$transaction(async (tx) => {
    // Parent lock also serializes creation when the Cartella row does not exist yet.
    const patients = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id FROM "Patient" p WHERE p.id = ${patientId}
        ${hasGlobalPatientScope(actor.role) ? Prisma.empty : Prisma.sql`AND p."registeredById" = ${actor.id}`}
      FOR UPDATE OF p`);
    if (!patients.length)
      throw new CartellaUpdateError('Paziente non trovato', 404, 'patient_not_found');
    const rows = await tx.$queryRaw<Array<{ data: Prisma.JsonValue }>>`
      SELECT data FROM "Cartella" WHERE "patientId" = ${patientId} FOR UPDATE`;
    const protectedData = preserveNrsHistory(
      rows[0]?.data,
      preserveTinettiHistory(rows[0]?.data, clinicalData),
    );
    return tx.cartella.upsert({
      where: { patientId },
      create: { patientId, data: protectedData as Prisma.InputJsonObject },
      update: { data: protectedData as Prisma.InputJsonObject },
    });
  });
}
