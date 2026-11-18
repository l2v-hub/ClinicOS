// «Sistema pulito»: elimina tutti i dati operativi lasciando l'applicazione avviabile.
//
// SI ELIMINA: pazienti e tutto ciò che vi è collegato (cartella, documenti, valutazioni, terapie,
// somministrazioni, diario, parametri, assegnazioni letto), agenda, consegne, note, bozze
// d'ingresso, sessioni d'import, camere e letti, orari degli operatori.
// SI CONSERVA: identità di accesso (User/Operator e preferenze), policy autorizzativa, anagrafica
// farmaci AIFA e audit (append-only: la traccia di chi ha svuotato il sistema non si cancella).
//
// Alcune tabelle cliniche sono protette da trigger "append-only" (valutazioni, prese visione,
// ricevute di lettura). Il wipe li sospende SOLO dentro la propria transazione e li riattiva prima
// del commit: un errore annulla tutto, trigger compresi.

import { Prisma, type PrismaClient } from '@prisma/client';
import { removeJobDir } from '../ai/upload/storage.js';

/**
 * Tabelle svuotate. TRUNCATE senza CASCADE: se una nuova tabella referenzia una di queste e non è
 * in elenco, il wipe fallisce in modo esplicito invece di cancellare a cascata dati imprevisti.
 */
export const WIPED_TABLES = [
  'PatientAssessmentAttestation',
  'PatientDocument',
  'PatientAssessment',
  'PatientNarrativeSection',
  'Cartella',
  'PatientParameterReading',
  'ClinicalNote',
  'ClinicalRecord',
  'Appointment',
  'MedicationAdministration',
  'TherapyAdministrationReceipt',
  'PrnAdministration',
  'PatientIntakeDocument',
  'DiaryEntryAcknowledgement',
  'DiaryEntryReadReceipt',
  'PatientDiaryEntry',
  'TherapySchedule',
  'PatientTherapy',
  'PatientRoomAssignment',
  'Bed',
  'Room',
  'Patient',
  'ConsegnaAcknowledgement',
  'ConsegnaReadReceipt',
  'ConsegnaCreationReceipt',
  'Consegna',
  'NotaRecipientState',
  'Nota',
  'PatientIntakeDraft',
  'ImportAudit',
  'ImportDocument',
  'ImportProcessingUnit',
  'ImportMutation',
  'ImportJob',
  'OperatorSchedule',
] as const;

/** Mai toccate dal wipe: senza queste non si accede più o si perde la traccia delle azioni. */
export const PRESERVED_TABLES = [
  'User',
  'Operator',
  'RosterContext',
  'OperatorRosterPreference',
  'RosterEpoch',
  'AuthzPolicyVersion',
  'AiAuditEvent',
  'Farmaco',
  'FarmacoPrincipioAttivo',
  'FarmacoImport',
] as const;

export type WipeCounts = Record<string, number>;

const quoted = (table: string) => Prisma.raw(`"${table}"`);

export async function tableCounts(
  db: Pick<PrismaClient, '$queryRaw'>,
  tables: readonly string[] = WIPED_TABLES,
): Promise<WipeCounts> {
  const counts: WipeCounts = {};
  for (const table of tables) {
    const rows = await db.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM ${quoted(table)}`,
    );
    counts[table] = Number(rows[0]?.count ?? 0);
  }
  return counts;
}

export interface WipeResult {
  deleted: WipeCounts;
  totalDeleted: number;
}

export async function wipeOperationalData(prisma: PrismaClient): Promise<WipeResult> {
  // I file temporanei degli import stanno su disco: si rimuovono dopo il commit.
  const jobs = await prisma.importJob.findMany({ select: { id: true } });
  const deleted = await prisma.$transaction(
    async (tx) => {
      const before = await tableCounts(tx);
      for (const table of WIPED_TABLES)
        await tx.$executeRaw(Prisma.sql`ALTER TABLE ${quoted(table)} DISABLE TRIGGER USER`);
      await tx.$executeRaw(
        Prisma.sql`TRUNCATE TABLE ${Prisma.join(WIPED_TABLES.map(quoted))} RESTART IDENTITY`,
      );
      for (const table of WIPED_TABLES)
        await tx.$executeRaw(Prisma.sql`ALTER TABLE ${quoted(table)} ENABLE TRIGGER USER`);
      // TRUNCATE non esegue i trigger di riga: l'ordinamento del roster va invalidato a mano.
      await tx.$executeRaw`UPDATE "RosterEpoch" SET "roster" = "roster" + 1, "therapy" = "therapy" + 1 WHERE "id" = 1`;
      return before;
    },
    { maxWait: 15000, timeout: 60000 },
  );
  await Promise.all(jobs.map((job) => removeJobDir(job.id).catch(() => undefined)));
  return {
    deleted,
    totalDeleted: Object.values(deleted).reduce((sum, value) => sum + value, 0),
  };
}
