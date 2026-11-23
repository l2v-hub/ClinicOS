// Dati sintetici per provare l'applicazione: un seed completo e un wipe che lascia il sistema
// pulito. Disponibili SOLO dove i dati sono dichiaratamente di prova — mai su una produzione reale.

import type { PrismaClient } from '@prisma/client';
import { deploymentTier, type DeploymentTier } from '../lib/deployment.js';
import { seedDemoDataset } from './demo-dataset.js';
import { seedFullDemoPatient } from './demo-patient.js';
import { seedSyntheticExtras } from './extras.js';
import { seedMiloScenarios } from './milo-scenarios.js';
import { tableCounts, wipeOperationalData, type WipeResult } from './wipe.js';

export const WIPE_CONFIRMATION = 'CANCELLA TUTTO';

export interface SyntheticDataAvailability {
  enabled: boolean;
  tier: DeploymentTier;
  /** Motivo leggibile quando è disabilitata. */
  reason: string | null;
}

/**
 * Dove sono ammesse le API dei dati sintetici. FAIL CLOSED: serve una dichiarazione esplicita e
 * coerente dell'ambiente; una variabile assente o scritta male non abilita mai nulla.
 *
 *  - development / test: solo con NODE_ENV letteralmente `development` o `test` (un NODE_ENV
 *    assente o errato su un servizio ospitato NON è «sviluppo») e nessun CLINICOS_ENV diverso;
 *  - demo: solo con CLINICOS_ENV=demo esplicito E DEMO_DATASET_ID=synthetic-v1 (il tier «demo»
 *    derivato dal solo DEMO_DATASET_ID non basta);
 *  - staging: solo con CLINICOS_ENV=staging esplicito E SYNTHETIC_DATA_API_ENABLED=true;
 *  - production e ogni altro caso: MAI.
 */
export function syntheticDataAvailability(
  env: NodeJS.ProcessEnv = process.env,
): SyntheticDataAvailability {
  const tier = deploymentTier(env);
  const explicitTier = (env.CLINICOS_ENV || '').trim().toLowerCase();
  const nodeEnv = env.NODE_ENV;
  const enabled = { enabled: true, tier, reason: null };
  const disabled = (reason: string) => ({ enabled: false, tier, reason });

  if (tier === 'production') return disabled('Non disponibile in produzione');
  if (tier === 'development' || tier === 'test') {
    // Stesso criterio dell'identità demo (ai/auth.ts): NODE_ENV dichiarato, mai dedotto.
    return nodeEnv === 'development' || nodeEnv === 'test'
      ? enabled
      : disabled('NODE_ENV non dichiarato come development o test');
  }
  if (tier === 'demo') {
    if (explicitTier !== 'demo')
      return disabled('Ambiente demo non dichiarato (CLINICOS_ENV=demo)');
    return env.DEMO_DATASET_ID === 'synthetic-v1'
      ? enabled
      : disabled('Ambiente demo senza dataset sintetico dichiarato');
  }
  if (tier === 'staging') {
    return (env.SYNTHETIC_DATA_API_ENABLED || '').trim().toLowerCase() === 'true'
      ? enabled
      : disabled('Non abilitata su questo ambiente di staging');
  }
  return disabled('Ambiente non riconosciuto');
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

/**
 * Rieseguibile: non duplica nulla. Riporta però ai valori iniziali i record del dataset di base
 * (`SEED-…` e il paziente demo completo): anagrafiche, letti e assegnazioni, stato delle terapie,
 * cartella demo. I dati aggiuntivi (consegne, diario, note, orari, bozza) e tutto ciò che non è
 * del dataset non vengono toccati.
 */
export async function seedSyntheticData(prisma: PrismaClient): Promise<SeedResult> {
  await seedDemoDataset(prisma);
  const { patientId } = await seedFullDemoPatient(prisma);
  await seedSyntheticExtras(prisma);
  await seedMiloScenarios(prisma);
  return { demoPatientId: patientId, counts: await syntheticDataCounts(prisma) };
}

/** Solo l'eliminazione (una transazione): i conteggi successivi li legge chi chiama. */
export async function wipeSyntheticData(prisma: PrismaClient): Promise<WipeResult> {
  return wipeOperationalData(prisma);
}
