// Dati sintetici per provare l'applicazione: un seed completo e un wipe che lascia il sistema
// pulito. Disponibili SOLO dove i dati sono dichiaratamente di prova — mai su una produzione reale.

import type { PrismaClient } from '@prisma/client';
import { deploymentTier, type DeploymentTier } from '../lib/deployment.js';
import { seedDemoDataset } from './demo-dataset.js';
import { seedFullDemoPatient } from './demo-patient.js';
import { seedSyntheticExtras } from './extras.js';
import { tableCounts, wipeOperationalData, type WipeResult } from './wipe.js';

export const WIPE_CONFIRMATION = 'CANCELLA TUTTO';

export interface SyntheticDataAvailability {
  enabled: boolean;
  tier: DeploymentTier;
  /** Motivo leggibile quando è disabilitata. */
  reason: string | null;
}

/**
 * Dove sono ammesse le API dei dati sintetici:
 *  - development / test: sempre;
 *  - demo: solo se il dataset è dichiarato sintetico (DEMO_DATASET_ID=synthetic-v1);
 *  - staging: solo con SYNTHETIC_DATA_API_ENABLED=true (può contenere copie di dati reali);
 *  - production: MAI, qualunque altra variabile sia impostata.
 */
export function syntheticDataAvailability(
  env: NodeJS.ProcessEnv = process.env,
): SyntheticDataAvailability {
  const tier = deploymentTier(env);
  if (tier === 'development' || tier === 'test') return { enabled: true, tier, reason: null };
  if (tier === 'demo') {
    return env.DEMO_DATASET_ID === 'synthetic-v1'
      ? { enabled: true, tier, reason: null }
      : { enabled: false, tier, reason: 'Ambiente demo senza dataset sintetico dichiarato' };
  }
  if (tier === 'staging') {
    return (env.SYNTHETIC_DATA_API_ENABLED || '').trim().toLowerCase() === 'true'
      ? { enabled: true, tier, reason: null }
      : { enabled: false, tier, reason: 'Non abilitata su questo ambiente di staging' };
  }
  return { enabled: false, tier, reason: 'Non disponibile in produzione' };
}

/** Conteggi letti dopo ogni operazione: ciò che l'operatore ritroverà nell'app. */
const STATUS_TABLES = {
  patients: 'Patient',
  rooms: 'Room',
  beds: 'Bed',
  roomAssignments: 'PatientRoomAssignment',
  therapies: 'PatientTherapy',
  appointments: 'Appointment',
  consegne: 'Consegna',
  diaryEntries: 'PatientDiaryEntry',
  parameterReadings: 'PatientParameterReading',
  notes: 'Nota',
  intakeDrafts: 'PatientIntakeDraft',
  importJobs: 'ImportJob',
  operatorSchedules: 'OperatorSchedule',
  operators: 'Operator',
} as const;

export type SyntheticDataCounts = Record<keyof typeof STATUS_TABLES, number>;

export async function syntheticDataCounts(prisma: PrismaClient): Promise<SyntheticDataCounts> {
  const raw = await tableCounts(prisma, Object.values(STATUS_TABLES));
  return Object.fromEntries(
    Object.entries(STATUS_TABLES).map(([key, table]) => [key, raw[table] ?? 0]),
  ) as SyntheticDataCounts;
}

export interface SeedResult {
  demoPatientId: string;
  counts: SyntheticDataCounts;
}

/** Idempotente: rieseguirlo non duplica nulla e non riporta indietro i dati già lavorati. */
export async function seedSyntheticData(prisma: PrismaClient): Promise<SeedResult> {
  await seedDemoDataset(prisma);
  const { patientId } = await seedFullDemoPatient(prisma);
  await seedSyntheticExtras(prisma);
  return { demoPatientId: patientId, counts: await syntheticDataCounts(prisma) };
}

export async function wipeSyntheticData(
  prisma: PrismaClient,
): Promise<WipeResult & { counts: SyntheticDataCounts }> {
  const result = await wipeOperationalData(prisma);
  return { ...result, counts: await syntheticDataCounts(prisma) };
}
