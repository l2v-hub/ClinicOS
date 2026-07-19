import { prisma } from '../lib/prisma.js';
import type { DischargeNarrativeDraft } from '../ai/sections/narrative.js';
import { parseDischargeTherapy } from './parse-discharge-therapy.js';

// ── Allergene sanitation (import seeding) ────────────────────────────────────
// CLINICAL SAFETY: an `allergene` is a CONCISE allergen name, never a clinical narrative. Real
// discharge letters sometimes make the allergies extraction over-capture the surrounding text
// (anamnesi, patologie, home therapy). Seeding that blob verbatim creates one false 1000+ char
// "allergy". These guards reject blobs and split a clean allergy text into individual allergen rows.

const MAX_ALLERGEN_LEN = 120;
// Headers that mark NON-allergy clinical sections — their presence means the text is a narrative dump.
const NON_ALLERGY_MARKERS =
  /(patologie|anamnesi|a\.\s*(pat|familiare|fisiologica)|tp\s+domiciliare|terapia\s+domiciliare|ospite|diagnosi|ricover|decorso|dislipidemia|ipertensione)/i;

/** True only when the text plausibly IS an allergen (concise, single block), not a narrative. */
export function isPlausibleAllergenText(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (t.length > 400) return false; // whole-narrative dump
  if (/\n\s*\n/.test(t)) return false; // blank-line-separated sections
  if (NON_ALLERGY_MARKERS.test(t)) return false;
  return true;
}

/** Concise allergy text → one allergen per line/`;`, trimmed + length-capped. [] for a blob. */
export function deriveAllergens(text: string): string[] {
  if (!isPlausibleAllergenText(text)) return [];
  return (text ?? '')
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.length <= MAX_ALLERGEN_LEN)
    .slice(0, 10);
}

// ── Patient Intake Draft Service (F3 EPIC #120 / Issue #125) ─────────────────
// CRUD + autosave for PatientIntakeDraft. patchDraft shallow-merges top-level
// keys of `patch` into the stored `data` JSON (last-write-wins per section).

export interface CreateDraftOpts {
  createdById?: string;
  source?: 'manual' | 'import';
  importJobId?: string;
}

export async function createDraft(opts: CreateDraftOpts = {}) {
  return prisma.patientIntakeDraft.create({
    data: {
      status: 'draft',
      source: opts.source ?? 'manual',
      createdById: opts.createdById,
      importJobId: opts.importJobId,
      data: {},
    },
  });
}

export async function getDraft(id: string) {
  return prisma.patientIntakeDraft.findUnique({ where: { id } });
}

export async function patchDraft(id: string, patch: Record<string, unknown>) {
  const current = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id } });
  const existingData = (current.data ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existingData, ...patch };
  return prisma.patientIntakeDraft.update({
    where: { id },
    data: {
      data: merged as Parameters<typeof prisma.patientIntakeDraft.update>[0]['data']['data'],
    },
  });
}

export async function listDrafts(createdById?: string) {
  return prisma.patientIntakeDraft.findMany({
    where: {
      status: 'draft',
      ...(createdById ? { createdById } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });
}

// ── F5 #124 — seed an intake draft from a finished AI extraction job ──────────

export interface SeedDraftFromImportOpts {
  createdById?: string;
}

/**
 * Build the `data` object for an import-seeded intake draft.
 * Shapes match what the intake workspace editors actually read:
 *   - anagrafica: flat demographics object (IntakeWorkspace / StepAnagrafica)
 *   - anamnesi:   Record<string,unknown> with `patologicaProssima` (AnamnesisEditor)
 *   - diagnosi:   Diagnosi[] single-item array (DiagnosisEditor)
 *   - allergie:   AllergiaItem[] single-item array (AllergiesEditor)
 *   - _narrative: lossless copy for confirmDraft (confirm-service reads draft.data._narrative)
 *   - _sections:  raw sections pass output (preserved for review panel)
 *   - _importedFields: which top-level keys were seeded (for compare panel / UI hints)
 */
export function buildImportDraftData(
  narrative: DischargeNarrativeDraft,
  rawSections: unknown,
): Record<string, unknown> {
  const seeded: Record<string, unknown> = {};

  // 1. Anagrafica — always present (even if mostly empty).
  const anagrafica: Record<string, unknown> = {
    firstName: narrative.firstName ?? '',
    lastName: narrative.lastName ?? '',
    dateOfBirth: narrative.dateOfBirth ?? '',
    ...(narrative.sex ? { sex: narrative.sex } : {}),
    ...(narrative.fiscalCode ? { codiceFiscale: narrative.fiscalCode } : {}),
    ...(narrative.phone ? { phone: narrative.phone } : {}),
    ...(narrative.email ? { email: narrative.email } : {}),
    ...(narrative.address ? { address: narrative.address } : {}),
  };
  seeded.anagrafica = anagrafica;

  // 2. Anamnesi — AnamnesisEditor reads value as Record<string,unknown> with named sub-keys.
  //    `patologicaProssima` is "Anamnesi generale" (first field), the best fit for narrative text.
  if (narrative.anamnesisText) {
    seeded.anamnesi = { patologicaProssima: narrative.anamnesisText };
  }

  // 3. Diagnosi — DiagnosisEditor reads value as Diagnosi[].
  if (narrative.diagnosisText) {
    seeded.diagnosi = [
      {
        id: crypto.randomUUID(),
        descrizione: narrative.diagnosisText,
        tipo: 'principale',
        stato: 'attiva',
        dataInsorgenza: '',
        dataRisoluzione: undefined,
        operatore: '',
        note: '',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  // 4. Allergie — AllergiesEditor reads value as AllergiaItem[].
  //    CLINICAL SAFETY: only seed a real allergy row when the status affirmatively
  //    indicates an allergy is present (or contradictory and needs operator review).
  //    A "nessuna allergia nota" discharge document has allergiesText but
  //    allergyStatus 'explicitly_absent' / 'not_documented' — seeding a row there
  //    would create a FALSE allergy record. Status is always preserved in _narrative.
  const ALLERGY_SEED_STATUSES: ReadonlyArray<DischargeNarrativeDraft['allergyStatus']> = [
    'present',
    'conflicting',
  ];
  //    Seed one row PER concise allergen; reject a narrative blob (deriveAllergens returns [] →
  //    no false allergy row; the full text stays in _narrative below for operator review).
  if (narrative.allergiesText && ALLERGY_SEED_STATUSES.includes(narrative.allergyStatus)) {
    const allergens = deriveAllergens(narrative.allergiesText);
    if (allergens.length > 0) {
      seeded.allergie = allergens.map((allergene) => ({
        id: crypto.randomUUID(),
        allergene,
        gravita: 'lieve' as const,
        reazione: '',
        documentato: '',
        documentatoDa: '',
      }));
    }
  }

  // 5. Terapia rilevata (#156) — parse the discharge therapy text into STRUCTURED rows, ONE per
  //    drug, under a DEDICATED key `terapiaImport` (the "Terapie rilevate dalla lettera" review
  //    section). It is intentionally NOT `data.terapia`: that key belongs to the manual
  //    TherapyFormValue editor and its confirm mapper (therapyFormToInput) — putting a
  //    ParsedTherapyRow there would break confirm. Incomplete lines keep stato 'da_verificare'
  //    (never dropped); the raw text is stashed under _terapiaText for lossless audit.
  if (narrative.therapyText) {
    const rows = parseDischargeTherapy(narrative.therapyText);
    if (rows.length > 0) seeded.terapiaImport = rows;
    seeded._terapiaText = narrative.therapyText;
  }

  // 6. Lossless provenance — preserved for confirmDraft + compare panel.
  seeded._narrative = narrative;
  seeded._sections = rawSections ?? null;
  seeded._importedFields = (
    ['anagrafica', 'anamnesi', 'diagnosi', 'allergie', 'terapiaImport'] as const
  ).filter((k) => seeded[k] !== undefined);

  return seeded;
}

/**
 * Find or create a `source='import'` intake draft seeded from a finished extraction job.
 * Idempotent: if a draft already exists for `jobId`, returns it without creating a second one.
 */
export async function seedDraftFromImport(jobId: string, opts: SeedDraftFromImportOpts = {}) {
  // Idempotency check: return existing draft for this job.
  const existing = await prisma.patientIntakeDraft.findFirst({
    where: { importJobId: jobId },
  });
  if (existing) return existing;

  // Load the extraction job.
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });

  const resultData = job.resultData as Record<string, unknown> | null;
  const narrative = resultData?._narrative as DischargeNarrativeDraft | undefined;

  if (!narrative) {
    throw new Error(
      `importJob ${jobId} has no _narrative in resultData — extraction must complete before seeding a draft`,
    );
  }

  const data = buildImportDraftData(narrative, resultData?._sections ?? null);

  try {
    return await prisma.patientIntakeDraft.create({
      data: {
        status: 'draft',
        source: 'import',
        importJobId: jobId,
        createdById: opts.createdById,
        data: data as Parameters<typeof prisma.patientIntakeDraft.create>[0]['data']['data'],
      },
    });
  } catch (err) {
    // Concurrency guard: a parallel POST /from-import for the same job may have created
    // the draft between our findFirst and this create. The @unique on importJobId makes
    // that a P2002 — re-read and return the existing draft instead of failing.
    if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
      const raced = await prisma.patientIntakeDraft.findFirst({ where: { importJobId: jobId } });
      if (raced) return raced;
    }
    throw err;
  }
}
