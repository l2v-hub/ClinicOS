// REQ-039: read-only domain services for the AI Data Gateway. These are the ONLY data path for the
// runtime. No SQL is exposed; every function enforces tenant + patient scope and returns
// SourceReference-bearing results. All numeric/temporal filtering is deterministic and server-side.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getNarrativeSections } from '../sections/patient-narrative.js';
import {
  AI_PATIENT_DOCUMENT_LIMIT,
  listPatientDocumentsForAi,
} from '../upload/patient-documents.js';
import { assertPatientAllowed, assertTenant, canCrossPatientSearch } from './context.js';
import {
  asCartella,
  boundAllergies,
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
import { DiaryPageInputError, parseDiaryPageQuery } from '../../patients/diary-pagination.js';
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
import {
  searchCrossPatientVitals,
  type CrossVitalsInput,
  type CrossVitalsResult,
} from './cross-vitals.js';
import {
  boundTimeline,
  MAX_TIMELINE_EVENTS,
  MAX_TIMELINE_FIELD_TEXT,
  MAX_TIMELINE_SOURCE_TEXT,
  MAX_TIMELINE_TIMESTAMP_LENGTH,
  normalizeTimelineVital,
  TIMELINE_LOOKAHEAD,
  type TimelineCandidate,
} from './timeline-window.js';
import {
  boundGatewayPatientFeed,
  GATEWAY_PATIENT_FEED_LOOKAHEAD,
  MAX_GATEWAY_APPOINTMENT_NOTES,
  MAX_GATEWAY_DIARY_CONTENT,
  MAX_GATEWAY_PATIENT_FEED_ROWS,
  MAX_GATEWAY_SOURCE_EXCERPT,
  parseGatewayAppointmentRange,
} from './patient-feed-window.js';
import {
  boundPatientVitalRows,
  MAX_PATIENT_VITAL_ID,
  MAX_PATIENT_VITAL_LABEL,
  MAX_PATIENT_VITAL_STATE,
  MAX_PATIENT_VITAL_TIMESTAMP,
  MAX_PATIENT_VITAL_UNIT,
  MAX_PATIENT_VITAL_VALUE,
  parsePatientVitalBoundary,
  PATIENT_VITAL_LOOKAHEAD,
  type PatientVitalRow,
} from './patient-vital-window.js';

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

interface LegacyClinicalMatchRow {
  recordId: string;
  patientId: string;
  allergyAllergene: string | null;
  therapyDescription: string | null;
  therapyStart: string | null;
}

/** Return at most one matching legacy allergy and therapy per candidate, never the chart blob. */
async function loadLegacyClinicalMatches(
  patientIds: string[],
  filters: { allergy?: string; therapy?: string },
): Promise<Map<string, LegacyClinicalMatchRow>> {
  if (patientIds.length === 0 || (!filters.allergy && !filters.therapy)) return new Map();
  const allergyJoin = filters.allergy
    ? Prisma.sql`LEFT JOIN LATERAL (
        SELECT LEFT(item.value->>'allergene', ${MAX_GATEWAY_SOURCE_EXCERPT}) AS "allergene"
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(chart."data"->'allergie') = 'array'
            THEN chart."data"->'allergie' ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS item(value, ordinal)
        WHERE jsonb_typeof(item.value) = 'object'
          AND COALESCE(length(item.value->>'allergene'), 0)
            BETWEEN 1 AND ${MAX_GATEWAY_SOURCE_EXCERPT}
          AND ${normalizedSql(Prisma.sql`COALESCE(item.value->>'allergene', '')`)}
            LIKE ${normalizedLikePattern(filters.allergy)} ESCAPE '\\'
        ORDER BY item.ordinal
        LIMIT 1
      ) allergy ON true`
    : Prisma.sql`LEFT JOIN LATERAL (
        SELECT NULL::text AS "allergene"
      ) allergy ON true`;
  const therapyJoin = filters.therapy
    ? Prisma.sql`LEFT JOIN LATERAL (
        SELECT LEFT(item.value->>'descrizione', ${MAX_GATEWAY_SOURCE_EXCERPT}) AS "description",
               CASE WHEN COALESCE(length(item.value->>'dataInizio'), 0) BETWEEN 1 AND 64
                 THEN item.value->>'dataInizio' END AS "startedAt"
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(chart."data"->'terapie') = 'array'
            THEN chart."data"->'terapie' ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS item(value, ordinal)
        WHERE jsonb_typeof(item.value) = 'object'
          AND COALESCE(length(item.value->>'descrizione'), 0)
            BETWEEN 1 AND ${MAX_GATEWAY_SOURCE_EXCERPT}
          AND ${normalizedSql(Prisma.sql`COALESCE(item.value->>'descrizione', '')`)}
            LIKE ${normalizedLikePattern(filters.therapy)} ESCAPE '\\'
        ORDER BY item.ordinal
        LIMIT 1
      ) therapy ON true`
    : Prisma.sql`LEFT JOIN LATERAL (
        SELECT NULL::text AS "description", NULL::text AS "startedAt"
      ) therapy ON true`;
  const rows = await prisma.$queryRaw<LegacyClinicalMatchRow[]>(Prisma.sql`
    SELECT chart."id" AS "recordId", chart."patientId",
           allergy."allergene" AS "allergyAllergene",
           therapy."description" AS "therapyDescription",
           therapy."startedAt" AS "therapyStart"
    FROM "Cartella" chart
    ${allergyJoin}
    ${therapyJoin}
    WHERE chart."patientId" IN (${Prisma.join(patientIds)})
      AND (allergy."allergene" IS NOT NULL OR therapy."description" IS NOT NULL)
  `);
  return new Map(rows.map((row) => [row.patientId, row]));
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
  const legacyMatches = await loadLegacyClinicalMatches(
    rows.map((row) => row.id),
    { allergy: validated.allergy, therapy: validated.therapy },
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
      const allergy = legacyMatches.get(p.id)?.allergyAllergene;
      if (!allergy) continue; // defensive: the candidate predicate and projection must agree
      matching.push('allergy');
      refs.push(patientFieldSource(p.id, `allergie:${allergy}`, allergy));
    }
    if (validated.therapy) {
      const therapy = therapyByPatient.get(p.id);
      const legacyMatch = legacyMatches.get(p.id);
      if (!therapy && !legacyMatch?.therapyDescription) continue;
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
              legacyMatch?.recordId ?? p.id,
              'terapie',
              legacyMatch!.therapyDescription!,
              legacyMatch?.therapyStart ?? undefined,
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
): Promise<SourcedResult<unknown[]> & { truncated: boolean }> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const { cartella } = await loadCartella(patientId);
  const { data: allergies, truncated } = boundAllergies(cartella.allergie);
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
  return { data: allergies, sourceRefs: refs, truncated };
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
): Promise<SourcedResult<VitalItem[]> & { truncated: boolean }> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, input.patientId);
  // Fase 1a: `days` (finestra andamento) è tradotto server-side in `from` = oggi−days (il planner
  // resta puro, senza clock). Un `from` esplicito già presente ha precedenza.
  const query =
    input.days != null && !input.from
      ? { ...input, from: new Date(Date.now() - input.days * 86400000).toISOString() }
      : input;
  const predicates: Prisma.Sql[] = [Prisma.sql`jsonb_typeof(vital.item) = 'object'`];
  const rawValue = Prisma.sql`btrim(COALESCE(vital.item->>'valore', ''))`;
  const pressurePattern = '^[0-9]{2,3}[[:space:]]*/[[:space:]]*[0-9]{2,3}$';
  const systolic = Prisma.sql`CASE
    WHEN ${rawValue} ~ ${pressurePattern}
    THEN split_part(regexp_replace(${rawValue}, '[[:space:]]', '', 'g'), '/', 1)::double precision
    ELSE NULL
  END`;
  const normalizedValue = Prisma.sql`replace(${rawValue}, ',', '.')`;
  const numericValue = Prisma.sql`CASE
    WHEN ${rawValue} ~ ${pressurePattern}
    THEN split_part(regexp_replace(${rawValue}, '[[:space:]]', '', 'g'), '/', 1)::double precision
    WHEN ${normalizedValue} ~ '^[+-]?[0-9]*[.]?[0-9]+'
    THEN substring(${normalizedValue} from '^[+-]?[0-9]*[.]?[0-9]+')::double precision
    ELSE NULL
  END`;
  if (query.label) {
    predicates.push(
      Prisma.sql`upper(COALESCE(vital.item->>'etichetta', '')) = ${query.label.toUpperCase()}`,
    );
  }
  if (query.systolicMin != null) predicates.push(Prisma.sql`${systolic} >= ${query.systolicMin}`);
  if (query.systolicMax != null) predicates.push(Prisma.sql`${systolic} <= ${query.systolicMax}`);
  if (query.valueMin != null) predicates.push(Prisma.sql`${numericValue} >= ${query.valueMin}`);
  if (query.valueMax != null) predicates.push(Prisma.sql`${numericValue} <= ${query.valueMax}`);
  const fromBoundary = parsePatientVitalBoundary(query.from);
  const toBoundary = parsePatientVitalBoundary(query.to);
  if (query.from && !fromBoundary)
    throw new GatewayError('bad_request', 'Data iniziale non valida');
  if (query.to && !toBoundary) throw new GatewayError('bad_request', 'Data finale non valida');
  const recordedAt = Prisma.sql`btrim(COALESCE(vital.item->>'rilevato', ''))`;
  const datePattern = '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
  const timestampPattern =
    '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9]([.][0-9]{1,6})?)?(Z|[+-](0[0-9]|1[0-4]):[0-5][0-9])$';
  const validCalendarDate = Prisma.sql`CASE
    WHEN substring(${recordedAt} from 1 for 10) ~ ${datePattern}
    THEN CASE
      WHEN substring(${recordedAt} from 1 for 4)::integer BETWEEN 1 AND 9999
        AND substring(${recordedAt} from 6 for 2)::integer BETWEEN 1 AND 12
        AND substring(${recordedAt} from 9 for 2)::integer BETWEEN 1 AND 31
      THEN to_char(to_date(substring(${recordedAt} from 1 for 10), 'YYYY-MM-DD'), 'YYYY-MM-DD')
        = substring(${recordedAt} from 1 for 10)
      ELSE false
    END
    ELSE false
  END`;
  const recordedAtInstant = Prisma.sql`CASE
    WHEN ${recordedAt} ~ ${datePattern} AND (${validCalendarDate})
      THEN (${recordedAt})::date::timestamp AT TIME ZONE 'UTC'
    WHEN ${recordedAt} ~ ${timestampPattern} AND (${validCalendarDate})
      THEN (${recordedAt})::timestamptz
    ELSE NULL
  END`;
  if (fromBoundary) predicates.push(Prisma.sql`${recordedAtInstant} >= ${fromBoundary}`);
  if (toBoundary) predicates.push(Prisma.sql`${recordedAtInstant} <= ${toBoundary}`);
  const rows = await prisma.$queryRaw<PatientVitalRow[]>(Prisma.sql`
    SELECT chart."id" AS "recordId",
      CASE WHEN jsonb_typeof(vital.item->'id') = 'string'
        THEN left(vital.item->>'id', ${MAX_PATIENT_VITAL_ID}) END AS "id",
      CASE WHEN jsonb_typeof(vital.item->'etichetta') = 'string'
        THEN left(vital.item->>'etichetta', ${MAX_PATIENT_VITAL_LABEL}) END AS "etichetta",
      CASE WHEN jsonb_typeof(vital.item->'valore') = 'string'
        THEN left(vital.item->>'valore', ${MAX_PATIENT_VITAL_VALUE}) END AS "valore",
      CASE WHEN jsonb_typeof(vital.item->'unita') = 'string'
        THEN left(vital.item->>'unita', ${MAX_PATIENT_VITAL_UNIT}) END AS "unita",
      CASE WHEN jsonb_typeof(vital.item->'stato') = 'string'
        THEN left(vital.item->>'stato', ${MAX_PATIENT_VITAL_STATE}) END AS "stato",
      CASE WHEN jsonb_typeof(vital.item->'rilevato') = 'string'
        THEN left(vital.item->>'rilevato', ${MAX_PATIENT_VITAL_TIMESTAMP}) END AS "rilevato",
      (COALESCE(length(vital.item->>'id'), 0) > ${MAX_PATIENT_VITAL_ID}
        OR COALESCE(length(vital.item->>'etichetta'), 0) > ${MAX_PATIENT_VITAL_LABEL}
        OR COALESCE(length(vital.item->>'valore'), 0) > ${MAX_PATIENT_VITAL_VALUE}
        OR COALESCE(length(vital.item->>'unita'), 0) > ${MAX_PATIENT_VITAL_UNIT}
        OR COALESCE(length(vital.item->>'stato'), 0) > ${MAX_PATIENT_VITAL_STATE}
        OR COALESCE(length(vital.item->>'rilevato'), 0) > ${MAX_PATIENT_VITAL_TIMESTAMP})
        AS "contentTruncated"
    FROM "Cartella" chart
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(chart."data"->'parametriVitali') = 'array'
        THEN chart."data"->'parametriVitali' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS vital(item, ordinal)
    WHERE chart."patientId" = ${input.patientId}
      AND ${Prisma.join(predicates, ' AND ')}
    ORDER BY vital.ordinal
    LIMIT ${PATIENT_VITAL_LOOKAHEAD}
  `);
  const bounded = boundPatientVitalRows(rows);
  const data: VitalItem[] = bounded.rows.map((row) =>
    Object.fromEntries(
      (['id', 'etichetta', 'valore', 'unita', 'stato', 'rilevato'] as const)
        .filter((field) => row[field] != null)
        .map((field) => [field, row[field]]),
    ),
  );
  const refs = bounded.rows.map((row, index) =>
    vitalSource(
      input.patientId,
      row.id ?? row.recordId,
      row.etichetta ?? 'vital',
      `${row.etichetta ?? 'vital'} ${row.valore ?? ''}`.trim(),
      data[index]?.rilevato,
    ),
  );
  gatewayAudit(
    ctx,
    'get_patient_vital_signs',
    [input.patientId],
    data.length,
    data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data, sourceRefs: refs, truncated: bounded.truncated };
}

export async function getCrossPatientVitalSigns(
  input: CrossVitalsInput,
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CrossVitalsResult> {
  const result = await searchCrossPatientVitals(
    input,
    ctx,
    {
      findPatients: async ({ permittedPatientIds, limit }) =>
        prisma.patient.findMany({
          where: permittedPatientIds === null ? undefined : { id: { in: permittedPatientIds } },
          orderBy: { id: 'asc' },
          take: limit,
          select: { id: true },
        }),
      findCartelle: (patientIds, vitalInput) => {
        const vitalPredicates: Prisma.Sql[] = [Prisma.sql`jsonb_typeof(vital.value) = 'object'`];
        if (vitalInput.label) {
          vitalPredicates.push(
            Prisma.sql`upper(COALESCE(vital.value->>'etichetta', '')) = ${vitalInput.label.toUpperCase()}`,
          );
        }
        if (vitalInput.systolicMin != null) {
          vitalPredicates.push(Prisma.sql`(
            CASE
              WHEN COALESCE(vital.value->>'valore', '')
                ~ '^[0-9]{2,3}[[:space:]]*/[[:space:]]*[0-9]{2,3}$'
              THEN split_part(
                regexp_replace(vital.value->>'valore', '[[:space:]]', '', 'g'), '/', 1
              )::integer
              ELSE NULL
            END
          ) >= ${vitalInput.systolicMin}`);
        }
        const vitalWhere = Prisma.sql`WHERE ${Prisma.join(vitalPredicates, ' AND ')}`;
        return prisma.$queryRaw<
          Array<{ id: string; patientId: string; data: Prisma.JsonValue }>
        >(Prisma.sql`
          SELECT
            chart."id",
            chart."patientId",
            jsonb_build_object(
              'parametriVitali',
              COALESCE((
                SELECT jsonb_agg(
                  jsonb_strip_nulls(jsonb_build_object(
                    'id', left(sample.value->>'id', 128),
                    'etichetta', left(sample.value->>'etichetta', 32),
                    'valore', left(sample.value->>'valore', 64),
                    'unita', left(sample.value->>'unita', 32),
                    'stato', left(sample.value->>'stato', 32),
                    'rilevato', left(sample.value->>'rilevato', 64)
                  ))
                  ORDER BY sample.ordinality
                )
                FROM (
                  SELECT vital.value, vital.ordinality
                  FROM jsonb_array_elements(
                    CASE
                      WHEN jsonb_typeof(chart."data"->'parametriVitali') = 'array'
                        THEN chart."data"->'parametriVitali'
                      ELSE '[]'::jsonb
                    END
                  ) WITH ORDINALITY AS vital(value, ordinality)
                  ${vitalWhere}
                  ORDER BY vital.ordinality
                  LIMIT ${vitalInput.limit}
                ) sample
              ), '[]'::jsonb)
            ) AS "data"
          FROM "Cartella" chart
          WHERE chart."patientId" IN (${Prisma.join(patientIds)})
        `);
      },
    },
    env,
  );
  gatewayAudit(
    ctx,
    'search_cross_patient_vitals',
    result.data.map((row) => row.patientId),
    result.data.length,
    result.data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return result;
}

export async function getPatientTherapies(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<unknown[]> & { truncated: boolean }> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const rows = await prisma.patientTherapy.findMany({
    where: { patientId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 101,
    select: {
      id: true,
      farmacoNome: true,
      dosaggio: true,
      viaSomministrazione: true,
      tipo: true,
      stato: true,
      dataInizio: true,
      dataFine: true,
      fasceMattina: true,
      fascePranzo: true,
      fascePomeriggio: true,
      fasceSera: true,
      fasceNotte: true,
      orarioSpecifico: true,
      prescrittore: true,
      note: true,
      dataSomministrazione: true,
      orarioSomministrazione: true,
      commercialStrengthValue: true,
      commercialStrengthUnit: true,
      pharmaceuticalForm: true,
      allowedFractions: true,
      drugPackageRef: true,
      giorniSettimana: true,
    },
  });
  const truncated = rows.length > 100;
  const data = truncated ? rows.slice(0, 100) : rows;
  const refs = data.map((t) =>
    therapySource(patientId, t.id, t.farmacoNome, `${t.farmacoNome} ${t.dosaggio}`, t.dataInizio),
  );
  gatewayAudit(
    ctx,
    'get_patient_therapies',
    [patientId],
    data.length,
    data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data, sourceRefs: refs, truncated };
}

export async function getPatientDiary(
  patientId: string,
  ctx: UserContext,
  opts: { authorType?: string; from?: string; to?: string } = {},
): Promise<SourcedResult<unknown[]> & { truncated: boolean }> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  let filters;
  try {
    filters = parseDiaryPageQuery({ ...opts, limit: String(MAX_GATEWAY_PATIENT_FEED_ROWS) });
  } catch (error) {
    if (error instanceof DiaryPageInputError) {
      throw new GatewayError('bad_request', error.message);
    }
    throw error;
  }
  const predicates: Prisma.Sql[] = [Prisma.sql`diary."patientId" = ${patientId}`];
  if (filters.authorType) {
    predicates.push(Prisma.sql`diary."authorType" = ${filters.authorType}`);
  }
  if (filters.from) predicates.push(Prisma.sql`diary."entryDateTime" >= ${filters.from}`);
  if (filters.to) {
    predicates.push(Prisma.sql`diary."entryDateTime" <= ${`${filters.to}T23:59:59.999`}`);
  }
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string | null;
      authorType: string;
      priority: string;
      status: string;
      entryDateTime: string;
      category: string | null;
      content: string;
      contentTruncated: boolean;
    }>
  >(Prisma.sql`
    SELECT diary."id", diary."title", diary."authorType", diary."priority", diary."status",
           diary."entryDateTime", diary."category",
           LEFT(diary."content", ${MAX_GATEWAY_DIARY_CONTENT}) AS "content",
           length(diary."content") > ${MAX_GATEWAY_DIARY_CONTENT} AS "contentTruncated"
    FROM "PatientDiaryEntry" diary
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY diary."entryDateTime" DESC, diary."id" DESC
    LIMIT ${GATEWAY_PATIENT_FEED_LOOKAHEAD}
  `);
  const result = boundGatewayPatientFeed(rows);
  const refs = result.data.map((d) =>
    diarySource(
      patientId,
      d.id,
      d.authorType,
      d.content.slice(0, MAX_GATEWAY_SOURCE_EXCERPT),
      d.entryDateTime,
    ),
  );
  gatewayAudit(
    ctx,
    'get_patient_diary',
    [patientId],
    result.data.length,
    result.data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: result.data, sourceRefs: refs, truncated: result.truncated };
}

export async function getPatientDocumentsG(
  patientId: string,
  ctx: UserContext,
): Promise<SourcedResult<unknown[]> & { truncated: boolean }> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const rows = await listPatientDocumentsForAi(patientId);
  const truncated = rows.length > AI_PATIENT_DOCUMENT_LIMIT;
  const docs = rows.slice(0, AI_PATIENT_DOCUMENT_LIMIT);
  const refs = docs.map((d) => documentSource(patientId, d.id, d.originalName));
  gatewayAudit(
    ctx,
    'get_patient_documents',
    [patientId],
    docs.length,
    docs.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: docs, sourceRefs: refs, truncated };
}

export async function getPatientAppointments(
  patientId: string,
  ctx: UserContext,
  opts: { from?: string; to?: string } = {},
): Promise<SourcedResult<unknown[]> & { truncated: boolean }> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const range = parseGatewayAppointmentRange(opts);
  const predicates: Prisma.Sql[] = [Prisma.sql`appointment."patientId" = ${patientId}`];
  if (range.from) predicates.push(Prisma.sql`appointment."scheduledAt" >= ${range.from}`);
  if (range.to) predicates.push(Prisma.sql`appointment."scheduledAt" <= ${range.to}`);
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      scheduledAt: Date;
      durationMinutes: number;
      reason: string | null;
      status: string;
      notes: string | null;
      notesTruncated: boolean;
    }>
  >(Prisma.sql`
    SELECT appointment."id", appointment."scheduledAt", appointment."durationMinutes",
           appointment."reason", appointment."status",
           LEFT(appointment."notes", ${MAX_GATEWAY_APPOINTMENT_NOTES}) AS "notes",
           COALESCE(length(appointment."notes"), 0) > ${MAX_GATEWAY_APPOINTMENT_NOTES}
             AS "notesTruncated"
    FROM "Appointment" appointment
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY appointment."scheduledAt" ASC, appointment."id" ASC
    LIMIT ${GATEWAY_PATIENT_FEED_LOOKAHEAD}
  `);
  const result = boundGatewayPatientFeed(rows);
  const refs = result.data.map((a) =>
    appointmentSource(patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString()),
  );
  gatewayAudit(
    ctx,
    'get_patient_appointments',
    [patientId],
    result.data.length,
    result.data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: result.data, sourceRefs: refs, truncated: result.truncated };
}

export async function getPatientTimeline(
  patientId: string,
  ctx: UserContext,
): Promise<
  SourcedResult<Array<{ at: string; kind: string; label: string }>> & {
    truncated: boolean;
  }
> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, patientId);
  const [appointmentRows, diaryRows, vitalRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId },
      select: { id: true, scheduledAt: true, reason: true },
      orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
      take: TIMELINE_LOOKAHEAD,
    }),
    prisma.$queryRaw<
      Array<{
        id: string;
        entryDateTime: string;
        title: string | null;
        authorType: string;
        excerpt: string;
      }>
    >(Prisma.sql`
      SELECT diary."id", diary."entryDateTime", diary."title", diary."authorType",
             LEFT(diary."content", ${MAX_TIMELINE_SOURCE_TEXT}) AS "excerpt"
      FROM "PatientDiaryEntry" diary
      WHERE diary."patientId" = ${patientId}
      ORDER BY diary."entryDateTime" DESC, diary."id" DESC
      LIMIT ${TIMELINE_LOOKAHEAD}
    `),
    prisma.$queryRaw<
      Array<{
        recordId: string;
        id: string | null;
        recordedAt: string;
        label: string | null;
        value: string | null;
      }>
    >(Prisma.sql`
      SELECT cartella."id" AS "recordId",
             LEFT(vital.item->>'id', ${MAX_TIMELINE_FIELD_TEXT}) AS "id",
             LEFT(vital.item->>'rilevato', ${MAX_TIMELINE_TIMESTAMP_LENGTH}) AS "recordedAt",
             LEFT(vital.item->>'etichetta', ${MAX_TIMELINE_FIELD_TEXT}) AS "label",
             LEFT(vital.item->>'valore', ${MAX_TIMELINE_FIELD_TEXT}) AS "value"
      FROM "Cartella" cartella
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(cartella."data"->'parametriVitali') = 'array'
            THEN cartella."data"->'parametriVitali'
          ELSE '[]'::jsonb
        END
      ) WITH ORDINALITY AS vital(item, ordinal)
      WHERE cartella."patientId" = ${patientId}
        AND jsonb_typeof(vital.item) = 'object'
        AND jsonb_typeof(vital.item->'rilevato') = 'string'
        AND NULLIF(vital.item->>'rilevato', '') IS NOT NULL
        AND length(vital.item->>'rilevato') <= ${MAX_TIMELINE_TIMESTAMP_LENGTH}
      ORDER BY vital.item->>'rilevato' DESC,
               COALESCE(vital.item->>'id', '') DESC,
               vital.ordinal DESC
      LIMIT ${TIMELINE_LOOKAHEAD}
    `),
  ]);
  const sourceTruncated = [appointmentRows, diaryRows, vitalRows].some(
    (rows) => rows.length > MAX_TIMELINE_EVENTS,
  );
  const candidates: TimelineCandidate[] = [];
  for (const appointment of appointmentRows.slice(0, MAX_TIMELINE_EVENTS)) {
    const at = appointment.scheduledAt.toISOString();
    const label = appointment.reason ?? 'appuntamento';
    candidates.push({
      event: { at, kind: 'APPOINTMENT', label },
      source: appointmentSource(patientId, appointment.id, label, at),
    });
  }
  for (const diary of diaryRows.slice(0, MAX_TIMELINE_EVENTS)) {
    candidates.push({
      event: {
        at: diary.entryDateTime,
        kind: 'DIARY_ENTRY',
        label: diary.title ?? diary.authorType,
      },
      source: diarySource(
        patientId,
        diary.id,
        diary.authorType,
        diary.excerpt,
        diary.entryDateTime,
      ),
    });
  }
  for (const row of vitalRows.slice(0, MAX_TIMELINE_EVENTS)) {
    const vital = normalizeTimelineVital(row);
    if (!vital) continue;
    candidates.push({
      event: { at: vital.at, kind: 'VITAL_SIGN', label: vital.label },
      source: vitalSource(patientId, vital.recordId, vital.sourceLabel, vital.label, vital.at),
    });
  }
  const result = boundTimeline(candidates, sourceTruncated);
  gatewayAudit(
    ctx,
    'get_patient_timeline',
    [patientId],
    result.data.length,
    result.data.length ? 'ok' : 'empty',
    nowIso(),
  );
  return result;
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
  const [legacyMatches, therapies, sections] = await Promise.all([
    loadLegacyClinicalMatches(patientIds, {
      allergy: validated.allergy,
      therapy: validated.therapy,
    }),
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
      const allergy = legacyMatches.get(p.id)?.allergyAllergene;
      if (!allergy) continue;
      matching.push('allergy');
      refs.push(patientFieldSource(p.id, `allergie:${allergy}`, allergy));
    }
    if (validated.therapy) {
      const therapy = therapyByPatient.get(p.id);
      const legacyMatch = legacyMatches.get(p.id);
      if (!therapy && !legacyMatch?.therapyDescription) continue;
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
              legacyMatch?.recordId ?? p.id,
              'terapie',
              legacyMatch!.therapyDescription!,
              legacyMatch?.therapyStart ?? undefined,
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
