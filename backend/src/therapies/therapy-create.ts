// backend/src/therapies/therapy-create.ts
// Shared helper: create a PatientTherapy row (+ schedules) inside a Prisma transaction.
// Called by:
//   - POST /patients/:patientId/therapies  (patient-therapies.ts)
//   - intake confirm transaction           (future: confirm-service.ts)

import { prisma } from '../lib/prisma.js';
import {
  normalizeSchedules,
  deriveLegacyFromSchedules,
  type ScheduleInput,
} from '../lib/therapy-dose.js';
import type { PatientTherapy, TherapySchedule } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Prisma interactive-transaction client type. */
type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** A PatientTherapy row with its ordered schedules pre-joined. */
export type PatientTherapyWithSchedules = PatientTherapy & {
  schedules: TherapySchedule[];
};

/** Input accepted by createTherapyInTx. All required fields match the POST body shape. */
export interface TherapyCreateInput {
  farmacoNome: string;
  dataInizio: string;
  dosaggio?: string;
  viaSomministrazione?: string;
  tipo?: string;
  stato?: string;
  dataFine?: string;
  fasceMattina?: boolean;
  fascePranzo?: boolean;
  fascePomeriggio?: boolean;
  fasceSera?: boolean;
  fasceNotte?: boolean;
  orarioSpecifico?: string;
  prescrittore?: string;
  operatoreInseritore?: string;
  note?: string;
  dataSomministrazione?: string;
  orarioSomministrazione?: string;
  commercialStrengthValue?: number | string | null;
  commercialStrengthUnit?: string;
  pharmaceuticalForm?: string;
  allowedFractions?: string;
  drugPackageRef?: string;
  giorniSettimana?: string; // #241: comma list of ISO weekdays (1..7); empty/undefined = every day
  schedules?: unknown;
}

/**
 * #241: normalize a weekday selection to a canonical comma string of ISO weekdays (1=Mon … 7=Sun),
 * deduped + sorted. Accepts a comma string or an array. Returns null when empty OR all 7 days are
 * selected (both mean "every day"), keeping prior every-day behavior fully backward-compatible.
 */
export function normalizeGiorniSettimana(raw: unknown): string | null {
  if (raw == null) return null;
  const parts = Array.isArray(raw) ? raw : String(raw).split(',');
  const days = [...new Set(parts.map((p) => parseInt(String(p).trim(), 10)).filter((n) => n >= 1 && n <= 7))]
    .sort((a, b) => a - b);
  return days.length === 0 || days.length === 7 ? null : days.join(',');
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build a legacy `dosaggio` summary string from structured data.
 * When the caller supplies an explicit dosaggio string it is used verbatim.
 * Otherwise we derive "500 mg compressa"-style display from strength + form.
 */
function deriveDosaggio(
  explicit: string | undefined,
  strengthValue: number | null,
  strengthUnit: string | null,
  form: string | null,
): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const parts: string[] = [];
  if (strengthValue != null && strengthUnit) parts.push(`${strengthValue} ${strengthUnit}`);
  if (form) parts.push(form);
  return parts.join(' ').trim() || '—';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a PatientTherapy (with optional TherapySchedule rows) inside a
 * Prisma transaction. The caller is responsible for:
 *   - validating that the patient exists (route 404 / confirm already created patient)
 *   - wrapping this call in `prisma.$transaction(...)`
 *
 * Throws `Error('Campi obbligatori: farmacoNome, dataInizio')` when either
 * required field is absent so the caller can map it to an HTTP 400 or
 * roll back the surrounding transaction.
 */
export async function createTherapyInTx(
  tx: PrismaTx,
  patientId: string,
  input: TherapyCreateInput,
): Promise<PatientTherapyWithSchedules> {
  const farmacoNome =
    typeof input.farmacoNome === 'string' ? input.farmacoNome.trim() : '';
  const dataInizio =
    typeof input.dataInizio === 'string' ? input.dataInizio : '';

  if (!farmacoNome || !dataInizio) {
    throw new Error('Campi obbligatori: farmacoNome, dataInizio');
  }

  const schedules: ScheduleInput[] = normalizeSchedules(input.schedules);

  const strengthValue =
    input.commercialStrengthValue != null && input.commercialStrengthValue !== ''
      ? Number(input.commercialStrengthValue)
      : null;
  const strengthUnit =
    typeof input.commercialStrengthUnit === 'string' && input.commercialStrengthUnit.trim()
      ? input.commercialStrengthUnit.trim()
      : null;
  const form =
    typeof input.pharmaceuticalForm === 'string' && input.pharmaceuticalForm.trim()
      ? input.pharmaceuticalForm.trim()
      : null;

  const dosaggio = deriveDosaggio(input.dosaggio, strengthValue, strengthUnit, form);

  // Derive legacy fascia boolean flags + orarioSpecifico from structured schedules.
  // When no schedules are supplied fall back to legacy boolean flags from the input.
  const derived = schedules.length
    ? deriveLegacyFromSchedules(schedules)
    : {
        fasceMattina: input.fasceMattina ?? true,
        fascePranzo: input.fascePranzo ?? false,
        fascePomeriggio: input.fascePomeriggio ?? false,
        fasceSera: input.fasceSera ?? false,
        fasceNotte: input.fasceNotte ?? false,
        orarioSpecifico: input.orarioSpecifico ?? null,
      };

  return tx.patientTherapy.create({
    data: {
      patientId,
      farmacoNome,
      dosaggio,
      viaSomministrazione: input.viaSomministrazione || 'orale',
      tipo: input.tipo || 'periodica',
      stato: input.stato || 'attiva',
      dataInizio,
      dataFine: input.dataFine || null,
      fasceMattina: derived.fasceMattina,
      fascePranzo: derived.fascePranzo,
      fascePomeriggio: derived.fascePomeriggio,
      fasceSera: derived.fasceSera,
      fasceNotte: derived.fasceNotte,
      orarioSpecifico: derived.orarioSpecifico,
      prescrittore: input.prescrittore || null,
      operatoreInseritore: input.operatoreInseritore || null,
      note: input.note || null,
      dataSomministrazione: input.dataSomministrazione || null,
      orarioSomministrazione: input.orarioSomministrazione || null,
      commercialStrengthValue: strengthValue,
      commercialStrengthUnit: strengthUnit,
      pharmaceuticalForm: form,
      allowedFractions:
        typeof input.allowedFractions === 'string' && input.allowedFractions.trim()
          ? input.allowedFractions.trim()
          : null,
      drugPackageRef:
        typeof input.drugPackageRef === 'string' && input.drugPackageRef.trim()
          ? input.drugPackageRef.trim()
          : null,
      giorniSettimana: normalizeGiorniSettimana(input.giorniSettimana),
      schedules: schedules.length ? { create: schedules } : undefined,
    },
    include: { schedules: { orderBy: { time: 'asc' } } },
  });
}
