import { assertTenant, canCrossPatientSearch, isPatientAllowed } from './context.js';
import { asCartella, filterVitals, type VitalItem } from './filters.js';
import { vitalSource } from './sources.js';
import { GatewayError, type SourceReference, type UserContext } from './types.js';

const MAX_PATIENT_SCAN = 100;
const MAX_PATIENT_RESULTS = 50;
const MAX_VITALS_PER_PATIENT = 50;

export interface CrossVitalsInput {
  label?: string;
  systolicMin?: number;
  patientLimit?: number;
  resultLimit?: number;
  vitalLimitPerPatient?: number;
}

interface CrossVitalsPatient {
  id: string;
}

interface CrossVitalsCartella {
  id: string;
  patientId: string;
  data: unknown;
}

export interface CrossVitalsReaders {
  findPatients(input: {
    permittedPatientIds: string[] | null;
    limit: number;
  }): Promise<CrossVitalsPatient[]>;
  findCartelle(patientIds: string[]): Promise<CrossVitalsCartella[]>;
}

export interface CrossVitalsResult {
  data: Array<{ patientId: string; vitals: VitalItem[] }>;
  sourceRefs: SourceReference[];
  truncated: boolean;
}

function boundedInteger(value: number | undefined, fallback: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(1, Math.floor(value)));
}

/**
 * Bounded cross-patient vital search. Readers keep the Prisma dependency at the gateway edge,
 * while this function makes authorization, ordering, caps and source alignment unit-testable.
 */
export async function searchCrossPatientVitals(
  input: CrossVitalsInput,
  ctx: UserContext,
  readers: CrossVitalsReaders,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CrossVitalsResult> {
  assertTenant(ctx, env);
  if (!canCrossPatientSearch(ctx, env)) {
    throw new GatewayError('cross_patient_disabled', 'Cross-patient search is disabled');
  }
  if (input.systolicMin != null && !Number.isFinite(input.systolicMin)) {
    throw new GatewayError('bad_request', 'Invalid vital-sign threshold');
  }

  const patientLimit = boundedInteger(input.patientLimit, MAX_PATIENT_SCAN, MAX_PATIENT_SCAN);
  const resultLimit = boundedInteger(input.resultLimit, MAX_PATIENT_RESULTS, MAX_PATIENT_RESULTS);
  const vitalLimit = boundedInteger(
    input.vitalLimitPerPatient,
    MAX_VITALS_PER_PATIENT,
    MAX_VITALS_PER_PATIENT,
  );
  if (ctx.permittedPatientIds?.length === 0) {
    return { data: [], sourceRefs: [], truncated: false };
  }

  const candidateRows = await readers.findPatients({
    permittedPatientIds: ctx.permittedPatientIds,
    // One-row look-ahead distinguishes an exact-size result from a genuinely truncated scan.
    limit: patientLimit + 1,
  });
  // Defence in depth: filter before sort/cap even though the DB reader also applies this predicate.
  const allowedCandidates = candidateRows
    .filter((patient) => isPatientAllowed(ctx, patient.id))
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const patients = allowedCandidates.slice(0, patientLimit);
  const patientIds = patients.map((patient) => patient.id);
  if (patientIds.length === 0) {
    return { data: [], sourceRefs: [], truncated: false };
  }

  const cartelle = await readers.findCartelle(patientIds);
  const allowedPatientIds = new Set(patientIds);
  const cartellaByPatient = new Map(
    cartelle
      .filter((row) => allowedPatientIds.has(row.patientId))
      .map((row) => [row.patientId, row] as const),
  );
  const matches: Array<{ patientId: string; vitals: VitalItem[] }> = [];
  const sourceRefs: SourceReference[] = [];
  let truncated = allowedCandidates.length > patientLimit;

  for (const patient of patients) {
    const row = cartellaByPatient.get(patient.id);
    const storedVitals = asCartella(row?.data).parametriVitali;
    const filtered = filterVitals(Array.isArray(storedVitals) ? storedVitals : [], {
      label: input.label,
      systolicMin: input.systolicMin,
    });
    if (filtered.length === 0) continue;
    if (matches.length >= resultLimit || sourceRefs.length >= resultLimit) {
      truncated = true;
      break;
    }
    const remainingVitalBudget = resultLimit - sourceRefs.length;
    const vitals = filtered.slice(0, Math.min(vitalLimit, remainingVitalBudget));
    if (filtered.length > vitals.length) truncated = true;
    matches.push({ patientId: patient.id, vitals });
    for (const vital of vitals) {
      sourceRefs.push(
        vitalSource(
          patient.id,
          vital.id ?? row?.id ?? patient.id,
          vital.etichetta ?? 'vital',
          `${vital.etichetta} ${vital.valore}`,
          vital.rilevato,
        ),
      );
    }
  }

  return { data: matches, sourceRefs, truncated };
}
