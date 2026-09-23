// A draft and its OCR job share one locked, atomic confirmation boundary.
import { prisma } from '../../lib/prisma.js';
import { AiExtractionError } from '../types.js';
import {
  isConfirmBlocked,
  detectSectionLoss,
  persistNarrativeFromDraft,
  type SectionsResult,
  type DischargeNarrativeDraft,
} from '../sections/index.js';
import { persistImportDocuments } from './patient-documents.js';
import { createTherapyInTx, type TherapyCreateInput } from '../../therapies/therapy-create.js';
import {
  therapiesWithAuthenticatedActor,
  type ClinicalActor,
} from '../../therapies/clinical-actor.js';
import {
  validateConfirmTherapies,
  isTherapyValidationError,
} from '../../intake/confirm-therapies.js';
import { validateDraftTherapySelection } from '../../intake/therapy-selection.js';
import {
  normalizePatientIdentity,
  PatientIdentityInputError,
} from '../../patients/progressive-identity.js';
import { patientScopeWhere, hasGlobalPatientScope } from '../../patients/patient-scope.js';
import { canAccessOwnedResource } from '../ownership-policy.js';
import { ImportSessionError } from './pages/model.js';
import {
  preparePageArchive,
  assertPreparedPageArchive,
  persistPageArchive,
} from './pages/archive.js';

export interface ConfirmPatient {
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  sex?: string;
  email?: string;
  phone?: string | null;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  codiceFiscale?: string | null;
}
export interface ConfirmPayload {
  patient: ConfirmPatient;
  cartella?: Record<string, unknown>;
  idempotencyKey?: string;
  confirmDuplicate?: boolean;
  confirmAllergyConflict?: boolean;
  mode?: 'new' | 'existing';
  patientId?: string;
  therapies?: TherapyCreateInput[];
  _importSource?: { manifestRevision: number; resultHash: string };
}
export interface DuplicateInfo {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
}
export interface ConfirmResult {
  status: 'created' | 'updated' | 'idempotent' | 'duplicate';
  patient?: DuplicateInfo;
  duplicate?: DuplicateInfo;
}
type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Actor = ClinicalActor & { role?: string };
type Data = Record<string, unknown>;
const asData = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};
const identity = ({
  id,
  firstName,
  lastName,
  medicalRecordNumber,
}: DuplicateInfo): DuplicateInfo => ({ id, firstName, lastName, medicalRecordNumber });
const fiscalConflict = () =>
  new AiExtractionError(
    'config',
    'Codice fiscale già presente. Correggere il dato oppure usare il percorso per il paziente esistente.',
  );
const cleanCartella = (data: Data): Data =>
  Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== 'codiceFiscale' && !key.startsWith('_')),
  );

/** Non-empty scalars win; existing clinical arrays are kept and deduplicated. */
function mergeCartella(existing: Data, incoming: Data): Data {
  const out = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      const previous = Array.isArray(out[key]) ? (out[key] as unknown[]) : [];
      const seen = new Set(previous.map((x) => JSON.stringify(x)));
      out[key] = [...previous, ...value.filter((x) => !seen.has(JSON.stringify(x)))];
    } else if (value && typeof value === 'object')
      out[key] = mergeCartella(asData(out[key]), asData(value));
    else if (value !== '' && value != null) out[key] = value;
  }
  return out;
}

async function audit(
  jobId: string | undefined,
  action: string,
  patientId?: string,
  detail?: string,
) {
  if (!jobId) return;
  try {
    await prisma.importAudit.create({ data: { jobId, action, patientId, detail } });
  } catch {
    /* Best effort only; clinical persistence has already committed or rolled back. */
  }
}

async function resolveRegisteredById(
  tx: PrismaTx,
  ownerId: string | null | undefined,
  actorId: string,
) {
  const operators = await tx.operator.findMany({
    where: { id: { in: [...new Set([actorId, ownerId].filter((x): x is string => !!x))] } },
    select: { id: true },
  });
  const ids = new Set(operators.map((x) => x.id));
  if (!ids.has(actorId)) throw new AiExtractionError('config', 'Operatore autenticato non valido');
  return ownerId && ids.has(ownerId) ? ownerId : actorId;
}

function clinicalGuards(
  resultData: Data,
  narrative: DischargeNarrativeDraft | null,
  payload: ConfirmPayload,
) {
  if (
    isConfirmBlocked(resultData._sections as SectionsResult | undefined) &&
    !payload.confirmAllergyConflict
  )
    throw new AiExtractionError(
      'config',
      'Conferma bloccata: informazioni sulle allergie contrastanti. Verificare e confermare esplicitamente.',
    );
  if (narrative) {
    const raw =
      typeof resultData.cleanedRawText === 'string' && resultData.cleanedRawText.trim()
        ? resultData.cleanedRawText
        : typeof resultData.rawText === 'string'
          ? resultData.rawText
          : '';
    const lost = detectSectionLoss(raw, narrative);
    if (lost.length)
      throw new AiExtractionError(
        'config',
        `Importazione bloccata: testo clinico rilevato ma non importato per: ${lost.join(', ')}. Riprocessare i documenti.`,
      );
  }
}

async function confirm(
  target: { draftId?: string; jobId?: string },
  payload: ConfirmPayload,
  actor: Actor,
): Promise<ConfirmResult> {
  const operator = { ...actor, role: actor.role ?? 'operator' };
  let jobId = target.jobId;
  try {
    const preparedArchive = await preparePageArchive(target, operator);
    const result = await prisma.$transaction(
      async (tx): Promise<ConfirmResult> => {
        // The order is always job → draft → patient; autosave only ever locks its draft.
        if (target.draftId) {
          const hint = await tx.patientIntakeDraft.findUnique({ where: { id: target.draftId } });
          if (!hint || !canAccessOwnedResource(operator, hint.createdById))
            throw new AiExtractionError('not_found', 'Bozza non trovata');
          jobId = hint.importJobId ?? undefined;
        }
        if (jobId)
          await tx.$queryRaw`SELECT "id" FROM "ImportJob" WHERE "id" = ${jobId} FOR UPDATE`;
        const job = jobId ? await tx.importJob.findUnique({ where: { id: jobId } }) : null;
        if (jobId && (!job || !canAccessOwnedResource(operator, job.createdById)))
          throw new AiExtractionError('not_found', 'Job non trovato');
        const draftHint = target.draftId
          ? { id: target.draftId }
          : jobId
            ? await tx.patientIntakeDraft.findUnique({
                where: { importJobId: jobId },
                select: { id: true },
              })
            : null;
        if (draftHint)
          await tx.$queryRaw`SELECT "id" FROM "PatientIntakeDraft" WHERE "id" = ${draftHint.id} FOR UPDATE`;
        const draft = draftHint
          ? await tx.patientIntakeDraft.findUnique({ where: { id: draftHint.id } })
          : null;
        if (draftHint && (!draft || !canAccessOwnedResource(operator, draft.createdById)))
          throw new AiExtractionError('not_found', 'Bozza non trovata');
        const registeredById = await resolveRegisteredById(
          tx,
          draft?.createdById ?? job?.createdById,
          actor.id,
        );
        if (
          draft?.confirmedPatientId &&
          job?.createdPatientId &&
          draft.confirmedPatientId !== job.createdPatientId
        )
          throw new AiExtractionError(
            'config',
            'I riferimenti della precedente conferma non coincidono. Verificare le schede esistenti.',
          );
        const alreadyId = draft?.confirmedPatientId ?? job?.createdPatientId;
        if (alreadyId) {
          const existing = await tx.patient.findUnique({ where: { id: alreadyId } });
          if (!existing)
            throw new AiExtractionError(
              'config',
              'La conferma fa riferimento a una scheda non disponibile',
            );
          if (
            existing.registeredById &&
            existing.registeredById !== operator.id &&
            !hasGlobalPatientScope(operator.role)
          )
            throw new AiExtractionError('not_found', 'Paziente non trovato');
          await tx.patient.updateMany({
            where: { id: existing.id, registeredById: null },
            data: { registeredById },
          });
          // Reconcile historical confirmations too: both entry points must converge.
          if (draft && !draft.confirmedPatientId)
            await tx.patientIntakeDraft.update({
              where: { id: draft.id },
              data: { status: 'confirmed', confirmedPatientId: alreadyId, confirmedAt: new Date() },
            });
          if (job && !job.createdPatientId)
            await tx.importJob.update({
              where: { id: job.id },
              data: { status: 'confirmed', createdPatientId: alreadyId, confirmedAt: new Date() },
            });
          return { status: 'idempotent', patient: identity(existing) };
        }
        if (draft && draft.status !== 'draft')
          throw new AiExtractionError('config', 'La bozza non è più confermabile');
        const draftData = asData(draft?.data);
        const jobData = asData(job?.resultData);
        if (job && asData(job.manifest).version === 1)
          assertPreparedPageArchive(
            job,
            draft ? draftData : undefined,
            preparedArchive,
            payload._importSource,
          );
        const narrative = (draftData._narrative ?? jobData._narrative) as
          DischargeNarrativeDraft | undefined;
        clinicalGuards(jobData, narrative ?? null, payload);
        validateConfirmTherapies(payload.therapies);
        const selection = draft
          ? validateDraftTherapySelection(draftData, payload.therapies)
          : null;
        const therapies = therapiesWithAuthenticatedActor(payload.therapies, actor);
        let patient;
        let status: 'created' | 'updated' = 'created';
        if (payload.mode === 'existing') {
          if (!job || !payload.patientId)
            throw new AiExtractionError('config', 'Seleziona il paziente esistente');
          await tx.$queryRaw`SELECT "id" FROM "Patient" WHERE "id" = ${payload.patientId} FOR UPDATE`;
          patient = await tx.patient.findFirst({
            where: { id: payload.patientId, ...patientScopeWhere(operator) },
          });
          if (!patient) throw new AiExtractionError('not_found', 'Paziente non trovato');
          status = 'updated';
        } else {
          const p = payload.patient;
          const canonical = normalizePatientIdentity(asData(p));
          if (
            canonical.codiceFiscale &&
            (await tx.patient.findUnique({
              where: { codiceFiscale: canonical.codiceFiscale },
              select: { id: true },
            }))
          )
            throw fiscalConflict();
          const duplicate = await tx.patient.findFirst({
            where: {
              ...patientScopeWhere(operator),
              firstName: { equals: canonical.firstName, mode: 'insensitive' },
              lastName: { equals: canonical.lastName, mode: 'insensitive' },
              ...(canonical.dateOfBirth ? { dateOfBirth: canonical.dateOfBirth } : {}),
            },
          });
          if (duplicate && !payload.confirmDuplicate)
            return { status: 'duplicate', duplicate: identity(duplicate) };
          patient = await tx.patient.create({
            data: {
              ...canonical,
              registeredById,
              medicalRecordNumber: `MRN-${crypto.randomUUID()}`,
              ...(p.sex ? { sex: p.sex } : {}),
              ...(p.email ? { email: p.email } : {}),
              ...(p.address ? { address: p.address } : {}),
              ...(p.emergencyContactName ? { emergencyContactName: p.emergencyContactName } : {}),
              ...(p.emergencyContactPhone
                ? { emergencyContactPhone: p.emergencyContactPhone }
                : {}),
            },
          });
        }
        const cartella = {
          ...cleanCartella(payload.cartella ?? {}),
          ...(draft ? { _importedFromDraft: draft.id } : {}),
          ...(job ? { _importedFromJob: job.id } : {}),
        };
        const current =
          status === 'updated'
            ? await tx.cartella.findUnique({ where: { patientId: patient.id } })
            : null;
        const merged = mergeCartella(asData(current?.data), cartella);
        delete merged.codiceFiscale;
        await tx.cartella.upsert({
          where: { patientId: patient.id },
          create: { patientId: patient.id, data: merged as object },
          update: { data: merged as object },
        });
        const therapyIds: string[] = [];
        for (const therapy of therapies ?? [])
          therapyIds.push((await createTherapyInTx(tx, patient.id, therapy)).id);
        if (narrative) await persistNarrativeFromDraft(tx, patient.id, narrative, jobId ?? null);
        if (job) {
          if (preparedArchive) await persistPageArchive(tx, patient.id, preparedArchive, actor.id);
          else await persistImportDocuments(tx, patient.id, job.id);
        }
        const confirmedAt = new Date();
        if (draft)
          await tx.patientIntakeDraft.update({
            where: { id: draft.id },
            data: {
              status: 'confirmed',
              confirmedPatientId: patient.id,
              confirmedAt,
              data: {
                ...draftData,
                _confirmation: {
                  ...selection,
                  therapyIds,
                  actorId: actor.id,
                  confirmedAt: confirmedAt.toISOString(),
                },
              } as object,
            },
          });
        if (job)
          await tx.importJob.update({
            where: { id: job.id },
            data: { status: 'confirmed', createdPatientId: patient.id, confirmedAt },
          });
        return { status, patient: identity(patient) };
      },
      { maxWait: 15000, timeout: 30000 },
    );
    await audit(
      jobId,
      result.status === 'created' ? 'patient_created' : 'confirm_committed',
      result.patient?.id,
      result.status,
    );
    return result;
  } catch (error) {
    await audit(jobId, 'confirm_failed', undefined, 'transaction_failed');
    if (error instanceof AiExtractionError || error instanceof ImportSessionError) throw error;
    if (error instanceof PatientIdentityInputError || isTherapyValidationError(error))
      throw new AiExtractionError('config', error.message);
    const unique = error as { code?: string; meta?: { target?: string[] } };
    if (unique.code === 'P2002' && unique.meta?.target?.includes('codiceFiscale'))
      throw fiscalConflict();
    throw new AiExtractionError(
      'provider_error',
      'Errore durante la conferma transazionale. La bozza è conservata: riprova.',
    );
  }
}

export const confirmDraft = (draftId: string, payload: ConfirmPayload, actor: Actor) =>
  confirm({ draftId }, payload, actor);
export const confirmJob = (jobId: string, payload: ConfirmPayload, actor: Actor) =>
  confirm({ jobId }, payload, actor);
