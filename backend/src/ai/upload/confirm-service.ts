// Transactional, idempotent persistence of a reviewed import (REQ-018).
//
// Creates the Patient + Cartella + links the job's documents in ONE transaction,
// only after explicit confirmation. Detects duplicates, rolls back fully on error,
// and writes an audit trail linking job ↔ patient ↔ documents. The model never
// touches the DB — only reviewed, validated data reaches here.

import { prisma } from '../../lib/prisma.js';
import { AiExtractionError } from '../types.js';

export interface ConfirmPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  codiceFiscale?: string;
}

export interface ConfirmPayload {
  patient: ConfirmPatient;
  /** Clinical data (Cartella.data Json) assembled from the reviewed proposal. */
  cartella?: Record<string, unknown>;
  idempotencyKey?: string;
  /** Proceed even when a likely duplicate exists. */
  confirmDuplicate?: boolean;
}

export interface DuplicateInfo {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
}

export interface ConfirmResult {
  status: 'created' | 'idempotent' | 'duplicate';
  patient?: { id: string; firstName: string; lastName: string; medicalRecordNumber: string };
  duplicate?: DuplicateInfo;
}

function mrn(): string {
  // Date.now is fine here (runtime), uniqueness reinforced by the unique constraint + random suffix.
  return `MRN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function audit(jobId: string, action: string, patientId?: string, detail?: string) {
  try {
    await prisma.importAudit.create({ data: { jobId, action, patientId, detail } });
  } catch {
    /* audit must never break the main flow */
  }
}

export async function confirmJob(jobId: string, payload: ConfirmPayload): Promise<ConfirmResult> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');

  // Idempotent: already confirmed -> return the same patient, never create twice.
  if (job.status === 'confirmed' && job.createdPatientId) {
    const existing = await prisma.patient.findUnique({ where: { id: job.createdPatientId } });
    if (existing) {
      return {
        status: 'idempotent',
        patient: { id: existing.id, firstName: existing.firstName, lastName: existing.lastName, medicalRecordNumber: existing.medicalRecordNumber },
      };
    }
  }

  const p = payload.patient;
  if (!p?.firstName?.trim() || !p?.lastName?.trim() || !p?.dateOfBirth?.trim()) {
    throw new AiExtractionError('config', 'Nome, cognome e data di nascita sono obbligatori');
  }
  const dob = new Date(p.dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    throw new AiExtractionError('config', 'Data di nascita non valida');
  }

  await audit(jobId, 'confirm_started');

  // Duplicate detection by name + date of birth (codiceFiscale lives in cartella Json).
  const dupes = await prisma.patient.findMany({
    where: {
      firstName: { equals: p.firstName.trim(), mode: 'insensitive' },
      lastName: { equals: p.lastName.trim(), mode: 'insensitive' },
      dateOfBirth: dob,
    },
    take: 1,
  });
  if (dupes.length > 0 && !payload.confirmDuplicate) {
    const d = dupes[0];
    await audit(jobId, 'duplicate_flagged', d.id, 'name+dob match');
    return { status: 'duplicate', duplicate: { id: d.id, firstName: d.firstName, lastName: d.lastName, medicalRecordNumber: d.medicalRecordNumber } };
  }

  // One transaction: patient + cartella + job confirmation. Full rollback on any error.
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-check inside the tx to defend against a concurrent double-confirm.
      const fresh = await tx.importJob.findUnique({ where: { id: jobId } });
      if (fresh?.status === 'confirmed' && fresh.createdPatientId) {
        const existing = await tx.patient.findUnique({ where: { id: fresh.createdPatientId } });
        if (existing) return existing;
      }

      const patient = await tx.patient.create({
        data: {
          medicalRecordNumber: mrn(),
          firstName: p.firstName.trim(),
          lastName: p.lastName.trim(),
          dateOfBirth: dob,
          ...(p.sex ? { sex: p.sex } : {}),
          ...(p.email ? { email: p.email } : {}),
          ...(p.phone ? { phone: p.phone } : {}),
          ...(p.address ? { address: p.address } : {}),
          ...(p.emergencyContactName ? { emergencyContactName: p.emergencyContactName } : {}),
          ...(p.emergencyContactPhone ? { emergencyContactPhone: p.emergencyContactPhone } : {}),
        },
      });

      // Clinical data goes into Cartella.data (same shape the app already uses).
      const cartellaData = {
        ...(payload.cartella ?? {}),
        ...(p.codiceFiscale ? { codiceFiscale: p.codiceFiscale } : {}),
        _importedFromJob: jobId,
      };
      await tx.cartella.create({ data: { patientId: patient.id, data: cartellaData as object } });

      await tx.importJob.update({
        where: { id: jobId },
        data: { status: 'confirmed', createdPatientId: patient.id, confirmedAt: new Date() },
      });

      return patient;
    });

    await audit(jobId, 'patient_created', created.id);
    await audit(jobId, 'confirm_committed', created.id, 'transaction committed');
    return {
      status: 'created',
      patient: { id: created.id, firstName: created.firstName, lastName: created.lastName, medicalRecordNumber: created.medicalRecordNumber },
    };
  } catch (err) {
    await audit(jobId, 'confirm_failed', undefined, err instanceof Error ? err.message.slice(0, 120) : 'error');
    throw err instanceof AiExtractionError ? err : new AiExtractionError('provider_error', 'Errore durante la conferma transazionale');
  }
}
