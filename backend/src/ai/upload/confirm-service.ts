// Transactional, idempotent persistence of a reviewed import (REQ-018).
//
// Creates the Patient + Cartella + links the job's documents in ONE transaction,
// only after explicit confirmation. Detects duplicates, rolls back fully on error,
// and writes an audit trail linking job ↔ patient ↔ documents. The model never
// touches the DB — only reviewed, validated data reaches here.

import { prisma } from '../../lib/prisma.js';
import { AiExtractionError } from '../types.js';
import { normalizeDate } from '../extraction-validate.js';
import { isConfirmBlocked, detectSectionLoss, type SectionsResult } from '../sections/index.js';
import { persistNarrativeFromDraft, type DischargeNarrativeDraft } from '../sections/index.js';
import { persistImportDocuments } from './patient-documents.js';
import { getDraft } from '../../intake/draft-service.js';
import { createTherapyInTx, type TherapyCreateInput } from '../../therapies/therapy-create.js';

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
  /** REQ-026: proceed even when allergy information is contradictory (operator override). */
  confirmAllergyConflict?: boolean;
  /** REQ-021: 'existing' updates an existing patient's cartella instead of creating. */
  mode?: 'new' | 'existing';
  patientId?: string;
  /** Therapies to persist transactionally alongside the new patient (intake confirm path). */
  therapies?: TherapyCreateInput[];
}

export interface DuplicateInfo {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
}

export interface ConfirmResult {
  status: 'created' | 'updated' | 'idempotent' | 'duplicate';
  patient?: { id: string; firstName: string; lastName: string; medicalRecordNumber: string };
  duplicate?: DuplicateInfo;
}

/** Merge reviewed cartella into an existing one: non-empty scalars win, arrays concat+dedup. */
function mergeCartella(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (Array.isArray(v)) {
      const prev = Array.isArray(out[k]) ? (out[k] as unknown[]) : [];
      const seen = new Set(prev.map((x) => JSON.stringify(x)));
      out[k] = [...prev, ...v.filter((x) => !seen.has(JSON.stringify(x)))];
    } else if (v && typeof v === 'object') {
      out[k] = mergeCartella((out[k] as Record<string, unknown>) ?? {}, v as Record<string, unknown>);
    } else if (v !== '' && v != null) {
      out[k] = v;
    }
  }
  return out;
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

// ── Shared materialization helper ─────────────────────────────────────────────
// Called by both confirmJob and confirmDraft inside a prisma.$transaction.
// Creates patient + cartella + (optional) narrative + (optional) linked documents.
// Returns the created Patient row.
interface MaterializeArgs {
  patient: ConfirmPatient;
  cartellaData: Record<string, unknown>;
  narrative: DischargeNarrativeDraft | null;
  /** When provided, links source documents from this import job to the new patient. */
  jobId?: string;
  /** Therapies to create transactionally alongside the new patient (intake confirm path only). */
  therapies?: TherapyCreateInput[];
}

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function materializePatient(tx: PrismaTx, { patient: p, cartellaData, narrative, jobId, therapies }: MaterializeArgs) {
  const dob = new Date(normalizeDate(p.dateOfBirth.trim()));
  const created = await tx.patient.create({
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

  await tx.cartella.create({ data: { patientId: created.id, data: cartellaData as object } });

  if (therapies?.length) {
    for (const t of therapies) {
      await createTherapyInTx(tx, created.id, t);
    }
  }

  if (narrative) await persistNarrativeFromDraft(tx, created.id, narrative, jobId ?? null);
  if (jobId) await persistImportDocuments(tx, created.id, jobId);

  return created;
}

// ── confirmDraft ───────────────────────────────────────────────────────────────
// Transactional, idempotent patient creation from a PatientIntakeDraft.
// If the draft is already confirmed, returns the existing patient (idempotent).
// On success sets draft status='confirmed', confirmedPatientId, confirmedAt.
// Full rollback if the transaction throws — draft stays 'draft'.
export async function confirmDraft(draftId: string, payload: ConfirmPayload): Promise<ConfirmResult> {
  const draft = await getDraft(draftId);
  if (!draft) throw new AiExtractionError('config', 'Bozza non trovata');

  // Idempotent: already confirmed -> return the same patient.
  if (draft.status === 'confirmed' && draft.confirmedPatientId) {
    const existing = await prisma.patient.findUnique({ where: { id: draft.confirmedPatientId } });
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
  const dob = new Date(normalizeDate(p.dateOfBirth.trim()));
  if (Number.isNaN(dob.getTime())) {
    throw new AiExtractionError('config', 'Data di nascita non valida');
  }

  // Narrative from draft data if present (opt-in; skipped for manual drafts without narrative).
  const narrative = (draft.data as { _narrative?: DischargeNarrativeDraft } | null)?._narrative ?? null;

  // ── Clinical-safety guards (parity with confirmJob) ──────────────────────────
  // Import-seeded drafts carry a linked importJob whose resultData holds the
  // _sections pass + lossless raw text. Re-run the SAME two hard blocks the old
  // import path enforces BEFORE the duplicate check / transaction. Manual drafts
  // (no importJobId) have no narrative/sections and skip these — unchanged.
  if (draft.importJobId) {
    const job = await prisma.importJob.findUnique({ where: { id: draft.importJobId } });
    const resultData = job?.resultData as
      | { _sections?: SectionsResult; cleanedRawText?: string; rawText?: string }
      | null;

    // REQ-026: contradictory allergy reading blocks confirmation until operator override.
    const sections = resultData?._sections;
    if (isConfirmBlocked(sections) && !payload.confirmAllergyConflict) {
      await audit(draft.importJobId, 'allergy_conflict_blocked', undefined, 'allergie conflicting');
      throw new AiExtractionError('config', 'Conferma bloccata: informazioni sulle allergie contrastanti. Verificare e confermare esplicitamente.');
    }

    // BUG-051: clinical text detected in source but lost from the narrative blocks confirm.
    if (narrative) {
      const sourceText = resultData?.cleanedRawText?.trim() ? resultData.cleanedRawText : (resultData?.rawText ?? '');
      const lost = detectSectionLoss(sourceText, narrative);
      if (lost.length > 0) {
        await audit(draft.importJobId, 'narrative_content_lost_blocked', undefined, lost.join(','));
        throw new AiExtractionError('config', `Importazione bloccata: testo clinico rilevato ma non importato per: ${lost.join(', ')}. Riprocessare i documenti.`);
      }
    }
  }

  // Duplicate detection (same as confirmJob).
  const dupes = await prisma.patient.findMany({
    where: {
      firstName: { equals: p.firstName.trim(), mode: 'insensitive' },
      lastName: { equals: p.lastName.trim(), mode: 'insensitive' },
      dateOfBirth: dob,
    },
    take: 1,
  });
  if (dupes.length > 0 && !payload.confirmDuplicate) {
    const dup = dupes[0];
    // Audit: best-effort using linked importJobId if available (ImportAudit FK requires a valid job).
    if (draft.importJobId) await audit(draft.importJobId, 'duplicate_flagged', dup.id, `draft:${draftId}`);
    return { status: 'duplicate', duplicate: { id: dup.id, firstName: dup.firstName, lastName: dup.lastName, medicalRecordNumber: dup.medicalRecordNumber } };
  }

  const cartellaData: Record<string, unknown> = {
    ...(payload.cartella ?? {}),
    ...(p.codiceFiscale ? { codiceFiscale: p.codiceFiscale } : {}),
    _importedFromDraft: draftId,
    ...(draft.importJobId ? { _importedFromJob: draft.importJobId } : {}),
  };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const pat = await materializePatient(tx, {
        patient: p,
        cartellaData,
        narrative,
        jobId: draft.importJobId ?? undefined,
        therapies: payload.therapies,
      });

      // Mark the draft confirmed within the same transaction for atomicity.
      await tx.patientIntakeDraft.update({
        where: { id: draftId },
        data: { status: 'confirmed', confirmedPatientId: pat.id, confirmedAt: new Date() },
      });

      return pat;
    });

    // Best-effort audit: only when a linked import job exists (FK constraint).
    if (draft.importJobId) await audit(draft.importJobId, 'patient_created', created.id, `draft:${draftId}`);

    return {
      status: 'created',
      patient: { id: created.id, firstName: created.firstName, lastName: created.lastName, medicalRecordNumber: created.medicalRecordNumber },
    };
  } catch (err) {
    if (draft.importJobId) await audit(draft.importJobId, 'confirm_failed', undefined, err instanceof Error ? err.message.slice(0, 120) : 'error');
    throw err instanceof AiExtractionError ? err : new AiExtractionError('provider_error', 'Errore durante la conferma transazionale della bozza');
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

  // REQ-026: allergies are top priority — a contradictory allergy reading blocks the
  // confirmation until an operator explicitly overrides it. Only triggers when a
  // sections pass produced a 'conflicting' status; otherwise this is a no-op.
  const sections = (job.resultData as { _sections?: SectionsResult } | null)?._sections;
  // REQ-029: faithful narrative draft persisted into PatientNarrativeSection on confirm.
  const narrative = (job.resultData as { _narrative?: DischargeNarrativeDraft } | null)?._narrative ?? null;
  if (isConfirmBlocked(sections) && !payload.confirmAllergyConflict) {
    await audit(jobId, 'allergy_conflict_blocked', undefined, 'allergie conflicting');
    throw new AiExtractionError('config', 'Conferma bloccata: informazioni sulle allergie contrastanti. Verificare e confermare esplicitamente.');
  }

  // BUG-051: a section detected with non-empty text in the source must never be persisted with
  // an empty originalText. Block the confirmation rather than silently create empty narrative
  // blocks (editor opening blank). Checked against the same (header-cleaned) text the draft was
  // built from. No AI re-run — the operator should reprocess the documents.
  if (narrative) {
    const rd = job.resultData as { cleanedRawText?: string; rawText?: string } | null;
    const sourceText = rd?.cleanedRawText?.trim() ? rd.cleanedRawText : (rd?.rawText ?? '');
    const lost = detectSectionLoss(sourceText, narrative);
    if (lost.length > 0) {
      await audit(jobId, 'narrative_content_lost_blocked', undefined, lost.join(','));
      throw new AiExtractionError('config', `Importazione bloccata: testo clinico rilevato ma non importato per: ${lost.join(', ')}. Riprocessare i documenti.`);
    }
  }

  const p = payload.patient;
  if (!p?.firstName?.trim() || !p?.lastName?.trim() || !p?.dateOfBirth?.trim()) {
    throw new AiExtractionError('config', 'Nome, cognome e data di nascita sono obbligatori');
  }
  // Accept Italian dd/mm/yyyy (what the OCR model often returns) as well as ISO.
  const dob = new Date(normalizeDate(p.dateOfBirth.trim()));
  if (Number.isNaN(dob.getTime())) {
    throw new AiExtractionError('config', 'Data di nascita non valida');
  }

  await audit(jobId, 'confirm_started');

  // ── REQ-021: update an EXISTING patient's cartella (no new patient created) ──
  if (payload.mode === 'existing' && payload.patientId) {
    const existing = await prisma.patient.findUnique({ where: { id: payload.patientId } });
    if (!existing) throw new AiExtractionError('config', 'Paziente esistente non trovato');
    const updated = await prisma.$transaction(async (tx) => {
      const cur = await tx.cartella.findUnique({ where: { patientId: existing.id } });
      const merged = mergeCartella(
        (cur?.data as Record<string, unknown>) ?? {},
        { ...(payload.cartella ?? {}), ...(p.codiceFiscale ? { codiceFiscale: p.codiceFiscale } : {}), _lastImportJob: jobId },
      );
      await tx.cartella.upsert({
        where: { patientId: existing.id },
        create: { patientId: existing.id, data: merged as object },
        update: { data: merged as object },
      });
      if (narrative) await persistNarrativeFromDraft(tx, existing.id, narrative, jobId);
      await persistImportDocuments(tx, existing.id, jobId);
      await tx.importJob.update({ where: { id: jobId }, data: { status: 'confirmed', createdPatientId: existing.id, confirmedAt: new Date() } });
      return existing;
    });
    await audit(jobId, 'confirm_committed', updated.id, 'existing patient cartella updated');
    return {
      status: 'updated',
      patient: { id: updated.id, firstName: updated.firstName, lastName: updated.lastName, medicalRecordNumber: updated.medicalRecordNumber },
    };
  }

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

      // Clinical data (cartella shape the app already uses).
      const cartellaData: Record<string, unknown> = {
        ...(payload.cartella ?? {}),
        ...(p.codiceFiscale ? { codiceFiscale: p.codiceFiscale } : {}),
        _importedFromJob: jobId,
      };

      // REQ-029: faithful narrative persisted when present.
      // REQ-035 v2: permanently link imported source documents to the patient.
      const patient = await materializePatient(tx, { patient: p, cartellaData, narrative, jobId });

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
