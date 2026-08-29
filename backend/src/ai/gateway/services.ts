// REQ-039: read-only domain services for the AI Data Gateway. These are the ONLY data path for the
// runtime. No SQL is exposed; every function enforces tenant + patient scope and returns
// SourceReference-bearing results. All numeric/temporal filtering is deterministic and server-side.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getNarrativeSections } from '../sections/patient-narrative.js';
import { listPatientDocuments } from '../upload/patient-documents.js';
import { assertPatientAllowed, assertTenant, canCrossPatientSearch } from './context.js';
import {
  asCartella,
  filterVitals,
  matchAllergy,
  matchTherapy,
  normalizeSearchText,
  textIncludes,
  nameMatchesAllTokens,
  type VitalItem,
} from './filters.js';
import {
  appointmentSource,
  diarySource,
  documentSource,
  narrativeSource,
  patientFieldSource,
  therapySource,
  vitalSource,
} from './sources.js';
import { gatewayAudit } from './audit.js';
import {
  GatewayError,
  type ClinicalSectionMatch,
  type ClinicalSectionSearchInput,
  type CorrelateInput,
  type PatientSearchInput,
  type PatientSearchResult,
  type SourceReference,
  type SourcedResult,
  type UserContext,
  type VitalSignQueryInput,
} from './types.js';
import {
  validateClinicalSearchInput,
  validateCorrelateInput,
  validatePatientSearchInput,
} from './validation.js';

const nowIso = () => new Date().toISOString();
const displayName = (p: { firstName: string; lastName: string }) =>
  `${p.lastName} ${p.firstName}`.trim();

interface PatientSearchRow {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
  dateOfBirth: Date;
}

async function loadCartella(patientId: string) {
  const c = await prisma.cartella.findUnique({ where: { patientId } });
  return { cartella: asCartella(c?.data), recordId: c?.id ?? patientId };
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

const ACCENTED_LATIN = 'àáâäãåèéêëìíîïòóôöõùúûüç';
const PLAIN_LATIN = 'aaaaaaeeeeiiiiooooouuuuc';

function normalizedLikePattern(value: string): string {
  return likePattern(normalizeSearchText(value));
}

function normalizedSql(value: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(lower(${value}), ${ACCENTED_LATIN}, ${PLAIN_LATIN})`;
}

/** Structured clinical filters run in PostgreSQL before LIMIT and return only projected fields. */
async function searchStructuredPatientRows(
  input: ReturnType<typeof validatePatientSearchInput>,
  ctx: UserContext,
): Promise<PatientSearchRow[]> {
  const predicates: Prisma.Sql[] = [];
  if (ctx.permittedPatientIds !== null) {
    predicates.push(Prisma.sql`p."id" IN (${Prisma.join(ctx.permittedPatientIds)})`);
  }
  for (const token of input.tokens) {
    const pattern = normalizedLikePattern(token);
    predicates.push(Prisma.sql`(
      ${normalizedSql(Prisma.sql`p."firstName"`)} LIKE ${pattern} ESCAPE '\\' OR
      ${normalizedSql(Prisma.sql`p."lastName"`)} LIKE ${pattern} ESCAPE '\\' OR
      ${normalizedSql(Prisma.sql`p."medicalRecordNumber"`)} LIKE ${pattern} ESCAPE '\\'
    )`);
  }
  if (input.admissionFrom) {
    predicates.push(
      Prisma.sql`p."createdAt" >= ${new Date(`${input.admissionFrom}T00:00:00.000Z`)}`,
    );
  }
  if (input.admissionTo) {
    predicates.push(Prisma.sql`p."createdAt" <= ${new Date(`${input.admissionTo}T23:59:59.999Z`)}`);
  }
  if (input.fiscalCode) {
    const fiscalPattern = normalizedLikePattern(input.fiscalCode);
    predicates.push(Prisma.sql`(
      ${normalizedSql(Prisma.sql`COALESCE(p."codiceFiscale", '')`)} LIKE ${fiscalPattern} ESCAPE '\\'
      OR ${normalizedSql(Prisma.sql`COALESCE(c."data"->>'codiceFiscale', '')`)} LIKE ${fiscalPattern} ESCAPE '\\'
    )`);
  }
  if (input.allergy) {
    predicates.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(c."data"->'allergie') = 'array'
          THEN c."data"->'allergie' ELSE '[]'::jsonb END
      ) AS allergy
      WHERE ${normalizedSql(Prisma.sql`COALESCE(allergy->>'allergene', '')`)}
        LIKE ${normalizedLikePattern(input.allergy)} ESCAPE '\\'
    )`);
  }
  if (input.therapy) {
    const therapyPattern = normalizedLikePattern(input.therapy);
    predicates.push(Prisma.sql`(
      EXISTS (
        SELECT 1 FROM "PatientTherapy" therapy
        WHERE therapy."patientId" = p."id"
          AND ${normalizedSql(Prisma.sql`therapy."farmacoNome"`)} LIKE ${therapyPattern} ESCAPE '\\'
      ) OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(c."data"->'terapie') = 'array'
            THEN c."data"->'terapie' ELSE '[]'::jsonb END
        ) AS legacy_therapy
        WHERE ${normalizedSql(Prisma.sql`COALESCE(legacy_therapy->>'descrizione', '')`)}
          LIKE ${therapyPattern} ESCAPE '\\'
      )
    )`);
  }
  const where = Prisma.join(predicates, ' AND ');
  return prisma.$queryRaw<PatientSearchRow[]>(Prisma.sql`
    SELECT p."id", p."firstName", p."lastName", p."medicalRecordNumber", p."dateOfBirth"
    FROM "Patient" p
    LEFT JOIN "Cartella" c ON c."patientId" = p."id"
    WHERE ${where}
    ORDER BY p."lastName" ASC, p."firstName" ASC, p."id" ASC
    LIMIT ${input.limit}
  `);
}

async function searchCorrelatedPatientRows(
  input: ReturnType<typeof validateCorrelateInput>,
  ctx: UserContext,
): Promise<PatientSearchRow[]> {
  const predicates: Prisma.Sql[] = [];
  if (ctx.permittedPatientIds !== null) {
    predicates.push(Prisma.sql`p."id" IN (${Prisma.join(ctx.permittedPatientIds)})`);
  }
  if (input.allergy) {
    predicates.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(c."data"->'allergie') = 'array'
          THEN c."data"->'allergie' ELSE '[]'::jsonb END
      ) AS allergy
      WHERE ${normalizedSql(Prisma.sql`COALESCE(allergy->>'allergene', '')`)}
        LIKE ${normalizedLikePattern(input.allergy)} ESCAPE '\\'
    )`);
  }
  if (input.therapy) {
    const therapyPattern = normalizedLikePattern(input.therapy);
    predicates.push(Prisma.sql`(
      EXISTS (
        SELECT 1 FROM "PatientTherapy" therapy
        WHERE therapy."patientId" = p."id"
          AND ${normalizedSql(Prisma.sql`therapy."farmacoNome"`)} LIKE ${therapyPattern} ESCAPE '\\'
      ) OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(c."data"->'terapie') = 'array'
            THEN c."data"->'terapie' ELSE '[]'::jsonb END
        ) AS legacy_therapy
        WHERE ${normalizedSql(Prisma.sql`COALESCE(legacy_therapy->>'descrizione', '')`)}
          LIKE ${therapyPattern} ESCAPE '\\'
      )
    )`);
  }
  if (input.sectionContains) {
    const section = input.sectionContains;
    predicates.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "PatientNarrativeSection" narrative
      WHERE narrative."patientId" = p."id"
        ${section.sectionKey ? Prisma.sql`AND narrative."sectionKey" = ${section.sectionKey}` : Prisma.empty}
        AND ${normalizedSql(Prisma.sql`COALESCE(narrative."reviewedText", narrative."originalText", '')`)}
          LIKE ${normalizedLikePattern(section.text)} ESCAPE '\\'
    )`);
  }
  return prisma.$queryRaw<PatientSearchRow[]>(Prisma.sql`
    SELECT p."id", p."firstName", p."lastName", p."medicalRecordNumber", p."dateOfBirth"
    FROM "Patient" p
    LEFT JOIN "Cartella" c ON c."patientId" = p."id"
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY p."lastName" ASC, p."firstName" ASC, p."id" ASC
    LIMIT ${input.limit}
  `);
}

// ── Patient search ───────────────────────────────────────────────────────────
export async function searchPatients(
  input: PatientSearchInput,
  ctx: UserContext,
): Promise<PatientSearchResult[]> {
  assertTenant(ctx);
  const validated = validatePatientSearchInput(input);
  const { limit, query: q } = validated;
  if (ctx.permittedPatientIds?.length === 0) {
    gatewayAudit(ctx, 'search_patients', [], 0, 'empty', nowIso());
    return [];
  }
  // 016 F0: match multi-token — ogni token deve comparire in nome/cognome/MRN (AND fra token),
  // così «Elena Moretti» o «Moretti Elena» trovano il paziente pur avendo i campi separati.
  const rows = await searchStructuredPatientRows(validated, ctx);
  const cartelle =
    validated.allergy || validated.therapy
      ? await prisma.cartella.findMany({
          where: { patientId: { in: rows.map((row) => row.id) } },
          select: { id: true, patientId: true, data: true },
        })
      : [];
  const cartellaByPatient = new Map(
    cartelle.map((row) => [row.patientId, { recordId: row.id, cartella: asCartella(row.data) }]),
  );
  const therapies = validated.therapy
    ? await prisma.patientTherapy.findMany({
        where: { patientId: { in: rows.map((row) => row.id) } },
        select: { id: true, patientId: true, farmacoNome: true, dosaggio: true, dataInizio: true },
      })
    : [];
  const therapyByPatient = new Map<string, (typeof therapies)[number]>();
  if (validated.therapy) {
    for (const therapy of therapies) {
      if (
        !therapyByPatient.has(therapy.patientId) &&
        textIncludes(therapy.farmacoNome, validated.therapy)
      ) {
        therapyByPatient.set(therapy.patientId, therapy);
      }
    }
  }

  const results: PatientSearchResult[] = [];
  for (const p of rows) {
    if (results.length >= limit) break;
    const matching: string[] = [];
    const refs: SourceReference[] = [];
    if (
      q &&
      (nameMatchesAllTokens(p.firstName, p.lastName, q) || textIncludes(p.medicalRecordNumber, q))
    ) {
      matching.push('name');
      refs.push(patientFieldSource(p.id, 'name', displayName(p)));
    }
    if (validated.fiscalCode) {
      matching.push('fiscalCode');
      // The matching CF stays inside the predicate; do not echo the national identifier in results.
      refs.push(patientFieldSource(p.id, 'codiceFiscale'));
    }
    if (validated.allergy) {
      const cartella = cartellaByPatient.get(p.id)?.cartella ?? asCartella(undefined);
      const allergy = matchAllergy(cartella, validated.allergy);
      if (!allergy) continue; // defensive: SQL and application matching must agree
      matching.push('allergy');
      refs.push(patientFieldSource(p.id, `allergie:${allergy.allergene}`, allergy.allergene));
    }
    if (validated.therapy) {
      const therapy = therapyByPatient.get(p.id);
      const legacyCartella = cartellaByPatient.get(p.id);
      const legacyTherapy = matchTherapy(
        legacyCartella?.cartella ?? asCartella(undefined),
        validated.therapy,
      );
      if (!therapy && !legacyTherapy) continue;
      matching.push('therapy');
      refs.push(
        therapy
          ? therapySource(
              p.id,
              therapy.id,
              therapy.farmacoNome,
              `${therapy.farmacoNome} ${therapy.dosaggio}`,
              therapy.dataInizio,
            )
          : therapySource(
              p.id,
              legacyCartella?.recordId ?? p.id,
              'terapie',
              legacyTherapy!.descrizione,
              legacyTherapy!.dataInizio,
            ),
      );
    }
    // a query with no matched field and no structured filter still lists the patient (name source)
    if (refs.length === 0) {
      matching.push('patient');
      refs.push(patientFieldSource(p.id, 'patient', displayName(p)));
    }
    results.push({
      patientId: p.id,
      displayName: displayName(p),
      dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
      matchingFields: matching,
      sourceRefs: refs,
    });
  }
  gatewayAudit(
    ctx,
    'search_patients',
    results.map((r) => r.patientId),
    results.length,
    results.length ? 'ok' : 'empty',
    nowIso(),
  );
  return results;
}

// ── Per-patient getters ──────────────────────────────────────────────────────
export async function getPatientDemographics(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<Record<string, unknown>> | null> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const p = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!p) {
    gatewayAudit(ctx, 'get_patient_demographics', [patientId], 0, 'empty', nowIso());
    return null;
  }
  const data = {
    patientId: p.id,
    medicalRecordNumber: p.medicalRecordNumber,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
    sex: p.sex,
    phone: p.phone,
    address: p.address,
  };
  gatewayAudit(ctx, 'get_patient_demographics', [patientId], 1, 'ok', nowIso());
  return { data, sourceRefs: [patientFieldSource(p.id, 'demographics', displayName(p))] };
}

export async function getPatientAllergies(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const { cartella } = await loadCartella(patientId);
  const allergies = cartella.allergie ?? [];
  const refs = allergies.map((a) =>
    patientFieldSource(patientId, `allergie:${a.allergene ?? ''}`, a.allergene),
  );
  gatewayAudit(
    ctx,
    'get_patient_allergies',
    [patientId],
    allergies.length,
    allergies.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: allergies, sourceRefs: refs };
}

export async function getPatientNarrativeSectionsG(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const sections = await getNarrativeSections(patientId);
  const present = sections.filter((s) => (s.displayText ?? '').trim().length > 0);
  const refs = present.map((s) =>
    narrativeSource(
      patientId,
      s.sectionKey,
      `${patientId}:${s.sectionKey}`,
      s.displayText,
      undefined,
    ),
  );
  gatewayAudit(
    ctx,
    'get_patient_narrative_sections',
    [patientId],
    present.length,
    present.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: present, sourceRefs: refs };
}

export async function getPatientVitalSigns(
  input: VitalSignQueryInput,
  ctx: UserContext,
): Promise<SourcedResult<VitalItem[]>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, input.patientId);
  const { cartella, recordId } = await loadCartella(input.patientId);
  // Fase 1a: `days` (finestra andamento) è tradotto server-side in `from` = oggi−days (il planner
  // resta puro, senza clock). Un `from` esplicito già presente ha precedenza.
  const query =
    input.days != null && !input.from
      ? { ...input, from: new Date(Date.now() - input.days * 86400000).toISOString() }
      : input;
  const filtered = filterVitals(cartella.parametriVitali ?? [], query);
  const refs = filtered.map((v) =>
    vitalSource(
      input.patientId,
      v.id ?? recordId,
      v.etichetta ?? 'vital',
      `${v.etichetta} ${v.valore}`,
      v.rilevato,
    ),
  );
  gatewayAudit(
    ctx,
    'get_patient_vital_signs',
    [input.patientId],
    filtered.length,
    filtered.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: filtered, sourceRefs: refs };
}

export async function getPatientTherapies(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const rows = await prisma.patientTherapy.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });
  const refs = rows.map((t) =>
    therapySource(patientId, t.id, t.farmacoNome, `${t.farmacoNome} ${t.dosaggio}`, t.dataInizio),
  );
  gatewayAudit(
    ctx,
    'get_patient_therapies',
    [patientId],
    rows.length,
    rows.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: rows, sourceRefs: refs };
}

export async function getPatientDiary(
  patientId: string,
  ctx: UserContext,
  opts: { authorType?: string; from?: string; to?: string } = {},
): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const rows = await prisma.patientDiaryEntry.findMany({
    where: { patientId, ...(opts.authorType ? { authorType: opts.authorType } : {}) },
    orderBy: { entryDateTime: 'desc' },
  });
  const inRange = rows.filter(
    (r) => (!opts.from || r.entryDateTime >= opts.from) && (!opts.to || r.entryDateTime <= opts.to),
  );
  const refs = inRange.map((d) =>
    diarySource(patientId, d.id, d.authorType, d.content, d.entryDateTime),
  );
  gatewayAudit(
    ctx,
    'get_patient_diary',
    [patientId],
    inRange.length,
    inRange.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: inRange, sourceRefs: refs };
}

export async function getPatientDocumentsG(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const docs = await listPatientDocuments(patientId);
  const refs = docs.map((d) => documentSource(patientId, d.id, d.originalName));
  gatewayAudit(
    ctx,
    'get_patient_documents',
    [patientId],
    docs.length,
    docs.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: docs, sourceRefs: refs };
}

export async function getPatientAppointments(
  patientId: string,
  ctx: UserContext,
  opts: { from?: string; to?: string } = {},
): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const where: Record<string, unknown> = { patientId };
  if (opts.from || opts.to)
    where.scheduledAt = {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    };
  const rows = await prisma.appointment.findMany({ where, orderBy: { scheduledAt: 'asc' } });
  const refs = rows.map((a) =>
    appointmentSource(patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString()),
  );
  gatewayAudit(
    ctx,
    'get_patient_appointments',
    [patientId],
    rows.length,
    rows.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: rows, sourceRefs: refs };
}

export async function getPatientTimeline(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<Array<{ at: string; kind: string; label: string }>>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const [appts, diary, vit] = await Promise.all([
    prisma.appointment.findMany({ where: { patientId }, orderBy: { scheduledAt: 'asc' } }),
    prisma.patientDiaryEntry.findMany({ where: { patientId }, orderBy: { entryDateTime: 'asc' } }),
    loadCartella(patientId),
  ]);
  const events: Array<{ at: string; kind: string; label: string }> = [];
  const refs: SourceReference[] = [];
  for (const a of appts) {
    events.push({
      at: a.scheduledAt.toISOString(),
      kind: 'APPOINTMENT',
      label: a.reason ?? 'appuntamento',
    });
    refs.push(
      appointmentSource(patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString()),
    );
  }
  for (const d of diary) {
    events.push({ at: d.entryDateTime, kind: 'DIARY_ENTRY', label: d.title ?? d.authorType });
    refs.push(diarySource(patientId, d.id, d.authorType, d.content, d.entryDateTime));
  }
  for (const v of vit.cartella.parametriVitali ?? []) {
    if (v.rilevato) {
      events.push({ at: v.rilevato, kind: 'VITAL_SIGN', label: `${v.etichetta} ${v.valore}` });
      refs.push(
        vitalSource(
          patientId,
          v.id ?? vit.recordId,
          v.etichetta ?? 'vital',
          `${v.etichetta} ${v.valore}`,
          v.rilevato,
        ),
      );
    }
  }
  events.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
  gatewayAudit(
    ctx,
    'get_patient_timeline',
    [patientId],
    events.length,
    events.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: events, sourceRefs: refs };
}

// ── Narrative / document search ──────────────────────────────────────────────
export async function searchClinicalSections(
  input: ClinicalSectionSearchInput,
  ctx: UserContext,
): Promise<ClinicalSectionMatch[]> {
  assertTenant(ctx);
  const validated = validateClinicalSearchInput(input, { queryRequired: true });
  if (ctx.permittedPatientIds?.length === 0) return [];
  const predicates: Prisma.Sql[] = [];
  if (ctx.permittedPatientIds !== null) {
    predicates.push(Prisma.sql`section."patientId" IN (${Prisma.join(ctx.permittedPatientIds)})`);
  }
  if (validated.patientId) {
    assertPatientAllowed(ctx, validated.patientId);
    predicates.push(Prisma.sql`section."patientId" = ${validated.patientId}`);
  }
  if (validated.sectionKey) {
    predicates.push(Prisma.sql`section."sectionKey" = ${validated.sectionKey}`);
  }
  predicates.push(
    Prisma.sql`${normalizedSql(Prisma.sql`COALESCE(section."reviewedText", section."originalText", '')`)}
      LIKE ${normalizedLikePattern(validated.query)} ESCAPE '\\'`,
  );
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      patientId: string;
      sectionKey: string;
      reviewedText: string | null;
      originalText: string | null;
      updatedAt: Date;
    }>
  >(Prisma.sql`
    SELECT section."id", section."patientId", section."sectionKey",
           section."reviewedText", section."originalText", section."updatedAt"
    FROM "PatientNarrativeSection" section
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY section."updatedAt" DESC, section."id" ASC
    LIMIT ${validated.limit}
  `);
  const out: ClinicalSectionMatch[] = [];
  for (const r of rows) {
    const text = (r.reviewedText ?? r.originalText) || '';
    const excerpt = excerptAround(text, validated.query);
    out.push({
      patientId: r.patientId,
      sectionKey: r.sectionKey,
      excerpt,
      sourceRefs: [
        narrativeSource(r.patientId, r.sectionKey, r.id, excerpt, r.updatedAt.toISOString()),
      ],
    });
  }
  gatewayAudit(
    ctx,
    'search_clinical_sections',
    out.map((o) => o.patientId),
    out.length,
    out.length ? 'ok' : 'empty',
    nowIso(),
  );
  return out;
}

export async function searchDocuments(
  input: ClinicalSectionSearchInput,
  ctx: UserContext,
): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  const validated = validateClinicalSearchInput(input, { queryRequired: false });
  if (ctx.permittedPatientIds?.length === 0) {
    gatewayAudit(ctx, 'search_documents', [], 0, 'empty', nowIso());
    return { data: [], sourceRefs: [] };
  }
  const predicates: Prisma.Sql[] = [];
  if (ctx.permittedPatientIds !== null) {
    predicates.push(Prisma.sql`document."patientId" IN (${Prisma.join(ctx.permittedPatientIds)})`);
  }
  if (validated.patientId) assertPatientAllowed(ctx, validated.patientId);
  if (validated.patientId) {
    predicates.push(Prisma.sql`document."patientId" = ${validated.patientId}`);
  }
  if (validated.query) {
    const pattern = normalizedLikePattern(validated.query);
    predicates.push(Prisma.sql`(
      ${normalizedSql(Prisma.sql`document."originalName"`)} LIKE ${pattern} ESCAPE '\\'
      OR ${normalizedSql(Prisma.sql`document."documentType"`)} LIKE ${pattern} ESCAPE '\\'
    )`);
  }
  const rows = await prisma.$queryRaw<
    Array<{ id: string; patientId: string; originalName: string; documentType: string }>
  >(Prisma.sql`
    SELECT document."id", document."patientId", document."originalName", document."documentType"
    FROM "PatientDocument" document
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY document."createdAt" DESC, document."id" ASC
    LIMIT ${validated.limit}
  `);
  const data = rows.map((d) => ({
    id: d.id,
    patientId: d.patientId,
    originalName: d.originalName,
    documentType: d.documentType,
  }));
  const refs = data.map((d) => documentSource(d.patientId, d.id, d.originalName));
  gatewayAudit(
    ctx,
    'search_documents',
    data.map((d) => d.patientId),
    data.length,
    data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data, sourceRefs: refs };
}

// ── Correlation (descriptive only — never clinical inference) ─────────────────
export async function correlate(
  input: CorrelateInput,
  ctx: UserContext,
): Promise<SourcedResult<PatientSearchResult[]>> {
  assertTenant(ctx);
  const validated = validateCorrelateInput(input);
  if (ctx.permittedPatientIds?.length === 0) {
    gatewayAudit(ctx, 'correlate_structured_data', [], 0, 'empty', nowIso());
    return { data: [], sourceRefs: [] };
  }
  const patients = await searchCorrelatedPatientRows(validated, ctx);
  const patientIds = patients.map((patient) => patient.id);
  const [cartelle, therapies, sections] = await Promise.all([
    validated.allergy || validated.therapy
      ? prisma.cartella.findMany({
          where: { patientId: { in: patientIds } },
          select: { id: true, patientId: true, data: true },
        })
      : Promise.resolve([]),
    validated.therapy
      ? prisma.patientTherapy.findMany({
          where: { patientId: { in: patientIds } },
          select: {
            id: true,
            patientId: true,
            farmacoNome: true,
            dosaggio: true,
            dataInizio: true,
          },
        })
      : Promise.resolve([]),
    validated.sectionContains && patientIds.length
      ? prisma.$queryRaw<
          Array<{
            id: string;
            patientId: string;
            sectionKey: string;
            originalText: string | null;
            reviewedText: string | null;
          }>
        >(Prisma.sql`
          SELECT DISTINCT ON (section."patientId")
            section."id", section."patientId", section."sectionKey",
            section."originalText", section."reviewedText"
          FROM "PatientNarrativeSection" section
          WHERE section."patientId" IN (${Prisma.join(patientIds)})
            ${
              validated.sectionContains.sectionKey
                ? Prisma.sql`AND section."sectionKey" = ${validated.sectionContains.sectionKey}`
                : Prisma.empty
            }
            AND ${normalizedSql(Prisma.sql`COALESCE(section."reviewedText", section."originalText", '')`)}
              LIKE ${normalizedLikePattern(validated.sectionContains.text)} ESCAPE '\\'
          ORDER BY section."patientId", section."updatedAt" DESC, section."id" ASC
        `)
      : Promise.resolve([]),
  ]);
  const cartellaByPatient = new Map(
    cartelle.map((row) => [row.patientId, { recordId: row.id, cartella: asCartella(row.data) }]),
  );
  const therapyByPatient = new Map<string, (typeof therapies)[number]>();
  if (validated.therapy) {
    for (const therapy of therapies) {
      if (
        !therapyByPatient.has(therapy.patientId) &&
        textIncludes(therapy.farmacoNome, validated.therapy)
      ) {
        therapyByPatient.set(therapy.patientId, therapy);
      }
    }
  }
  const sectionByPatient = new Map(sections.map((row) => [row.patientId, row]));
  const out: PatientSearchResult[] = [];
  const allRefs: SourceReference[] = [];
  for (const p of patients) {
    const matching: string[] = [];
    const refs: SourceReference[] = [];
    if (validated.allergy) {
      const allergy = matchAllergy(
        cartellaByPatient.get(p.id)?.cartella ?? asCartella(undefined),
        validated.allergy,
      );
      if (!allergy) continue;
      matching.push('allergy');
      refs.push(patientFieldSource(p.id, `allergie:${allergy.allergene}`, allergy.allergene));
    }
    if (validated.therapy) {
      const therapy = therapyByPatient.get(p.id);
      const legacyCartella = cartellaByPatient.get(p.id);
      const legacyTherapy = matchTherapy(
        legacyCartella?.cartella ?? asCartella(undefined),
        validated.therapy,
      );
      if (!therapy && !legacyTherapy) continue;
      matching.push('therapy');
      refs.push(
        therapy
          ? therapySource(
              p.id,
              therapy.id,
              therapy.farmacoNome,
              `${therapy.farmacoNome} ${therapy.dosaggio}`,
              therapy.dataInizio,
            )
          : therapySource(
              p.id,
              legacyCartella?.recordId ?? p.id,
              'terapie',
              legacyTherapy!.descrizione,
              legacyTherapy!.dataInizio,
            ),
      );
    }
    if (validated.sectionContains) {
      const hit = sectionByPatient.get(p.id);
      if (!hit) continue;
      const text = (hit.reviewedText ?? hit.originalText) || '';
      matching.push('section');
      refs.push(
        narrativeSource(
          p.id,
          hit.sectionKey,
          hit.id,
          excerptAround(text, validated.sectionContains.text),
        ),
      );
    }
    if (matching.length === 0) continue;
    out.push({
      patientId: p.id,
      displayName: displayName(p),
      dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
      matchingFields: matching,
      sourceRefs: refs,
    });
    allRefs.push(...refs);
  }
  gatewayAudit(
    ctx,
    'correlate_structured_data',
    out.map((o) => o.patientId),
    out.length,
    out.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: out, sourceRefs: allRefs };
}

/** Resolve a NARRATIVE_SECTION source back to its exact stored text. */
export async function resolveNarrativeSource(
  recordId: string,
  ctx: UserContext,
): Promise<SourcedResult<{ patientId: string; sectionKey: string; exactText: string }> | null> {
  assertTenant(ctx);
  const row = await prisma.patientNarrativeSection.findUnique({ where: { id: recordId } });
  if (!row) return null;
  assertPatientAllowed(ctx, row.patientId);
  const exactText = (row.reviewedText ?? row.originalText) || '';
  gatewayAudit(ctx, 'get_source_reference', [row.patientId], 1, 'ok', nowIso());
  return {
    data: { patientId: row.patientId, sectionKey: row.sectionKey, exactText },
    sourceRefs: [
      narrativeSource(
        row.patientId,
        row.sectionKey,
        row.id,
        exactText,
        row.updatedAt.toISOString(),
      ),
    ],
  };
}

/** Broad cross-patient search — gated by env + role; never on by default. */
export async function searchAcrossPatients(
  input: ClinicalSectionSearchInput,
  ctx: UserContext,
): Promise<ClinicalSectionMatch[]> {
  assertTenant(ctx);
  if (!canCrossPatientSearch(ctx))
    throw new GatewayError('cross_patient_disabled', 'Cross-patient search is disabled');
  return searchClinicalSections({ ...input, patientId: undefined }, ctx);
}

function excerptAround(text: string, needle: string, radius = 120): string {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const i = norm(text).indexOf(norm(needle));
  if (i < 0) return text.slice(0, radius);
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + needle.length + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}
