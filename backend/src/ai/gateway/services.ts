// REQ-039: read-only domain services for the AI Data Gateway. These are the ONLY data path for the
// runtime. No SQL is exposed; every function enforces tenant + patient scope and returns
// SourceReference-bearing results. All numeric/temporal filtering is deterministic and server-side.

import { prisma } from '../../lib/prisma.js';
import { getNarrativeSections } from '../sections/patient-narrative.js';
import { listPatientDocuments } from '../upload/patient-documents.js';
import {
  assertPatientAllowed, assertTenant, canCrossPatientSearch, canFacilityRead, filterAllowedPatients,
} from './context.js';
import {
  asCartella, filterVitals, matchAllergy, matchTherapy, textIncludes, nameMatchesAllTokens, type VitalItem,
} from './filters.js';
import {
  appointmentSource, clinicalScoreSource, consegnaSource, diarySource, documentSource, narrativeSource,
  operatorShiftSource, patientFieldSource, roomOccupancySource, roomOccupantsSource, therapySource, vitalSource,
} from './sources.js';
import { onDuty, weekdayIt, type ShiftRow } from '../../routes/operator-shifts.js';
import { gatewayAudit } from './audit.js';
import {
  GatewayError, type ClinicalSectionMatch, type ClinicalSectionSearchInput, type CorrelateInput,
  type PatientSearchInput, type PatientSearchResult, type SourceReference, type SourcedResult,
  type UserContext, type VitalSignQueryInput,
} from './types.js';

const nowIso = () => new Date().toISOString();
const displayName = (p: { firstName: string; lastName: string }) => `${p.lastName} ${p.firstName}`.trim();

function clampLimit(n: number | undefined, def = 20, max = 50): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : def;
  return Math.min(max, Math.max(1, v));
}

async function loadCartella(patientId: string) {
  const c = await prisma.cartella.findUnique({ where: { patientId } });
  return { cartella: asCartella(c?.data), recordId: c?.id ?? patientId };
}

// ── Patient search ───────────────────────────────────────────────────────────
export async function searchPatients(input: PatientSearchInput, ctx: UserContext): Promise<PatientSearchResult[]> {
  assertTenant(ctx);
  const limit = clampLimit(input.limit);
  const q = (input.query ?? '').trim();
  // 016 F0: match multi-token — ogni token deve comparire in nome/cognome/MRN (AND fra token),
  // così «Elena Moretti» o «Moretti Elena» trovano il paziente pur avendo i campi separati.
  const tokens = q.split(/\s+/).filter(Boolean);
  const where = tokens.length
    ? { AND: tokens.map((t) => ({ OR: [
        { firstName: { contains: t, mode: 'insensitive' as const } },
        { lastName: { contains: t, mode: 'insensitive' as const } },
        { medicalRecordNumber: { contains: t, mode: 'insensitive' as const } },
      ] })) }
    : {};
  const rows = await prisma.patient.findMany({ where, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], take: 500 });
  const allowed = rows.filter((p) => filterAllowedPatients(ctx, [p.id]).length === 1);

  const results: PatientSearchResult[] = [];
  for (const p of allowed) {
    if (results.length >= limit) break;
    const matching: string[] = [];
    const refs: SourceReference[] = [];
    if (q && (nameMatchesAllTokens(p.firstName, p.lastName, q) || textIncludes(p.medicalRecordNumber, q))) {
      matching.push('name'); refs.push(patientFieldSource(p.id, 'name', displayName(p)));
    }
    // fiscalCode / allergy / therapy need the cartella
    if (input.fiscalCode || input.allergy || input.therapy) {
      const { cartella, recordId } = await loadCartella(p.id);
      const cf = String((cartella as Record<string, unknown>).codiceFiscale ?? '');
      if (input.fiscalCode && textIncludes(cf, input.fiscalCode)) { matching.push('fiscalCode'); refs.push(patientFieldSource(p.id, 'codiceFiscale', cf)); }
      if (input.allergy) {
        const a = matchAllergy(cartella, input.allergy);
        if (a) { matching.push('allergy'); refs.push(patientFieldSource(p.id, `allergie:${a.allergene}`, a.allergene)); } else continue;
      }
      if (input.therapy) {
        const t = matchTherapy(cartella, input.therapy);
        if (t) { matching.push('therapy'); refs.push(therapySource(p.id, recordId, 'terapie', t.descrizione, t.dataInizio)); } else continue;
      }
    }
    if (input.admissionFrom && p.createdAt.toISOString().slice(0, 10) < input.admissionFrom) continue;
    if (input.admissionTo && p.createdAt.toISOString().slice(0, 10) > input.admissionTo) continue;
    // a query with no matched field and no structured filter still lists the patient (name source)
    if (refs.length === 0) { matching.push('patient'); refs.push(patientFieldSource(p.id, 'patient', displayName(p))); }
    results.push({ patientId: p.id, displayName: displayName(p), dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10), matchingFields: matching, sourceRefs: refs });
  }
  gatewayAudit(ctx, 'search_patients', results.map((r) => r.patientId), results.length, results.length ? 'ok' : 'empty', nowIso());
  return results;
}

// ── Per-patient getters ──────────────────────────────────────────────────────
export async function getPatientDemographics(patientId: string, ctx: UserContext): Promise<SourcedResult<Record<string, unknown>> | null> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const p = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!p) { gatewayAudit(ctx, 'get_patient_demographics', [patientId], 0, 'empty', nowIso()); return null; }
  const data = {
    patientId: p.id, medicalRecordNumber: p.medicalRecordNumber, firstName: p.firstName, lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10), sex: p.sex, phone: p.phone, address: p.address,
  };
  gatewayAudit(ctx, 'get_patient_demographics', [patientId], 1, 'ok', nowIso());
  return { data, sourceRefs: [patientFieldSource(p.id, 'demographics', displayName(p))] };
}

export async function getPatientAllergies(patientId: string, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const { cartella } = await loadCartella(patientId);
  const allergies = cartella.allergie ?? [];
  const refs = allergies.map((a) => patientFieldSource(patientId, `allergie:${a.allergene ?? ''}`, a.allergene));
  gatewayAudit(ctx, 'get_patient_allergies', [patientId], allergies.length, allergies.length ? 'ok' : 'empty', nowIso());
  return { data: allergies, sourceRefs: refs };
}

export async function getPatientNarrativeSectionsG(patientId: string, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const sections = await getNarrativeSections(patientId);
  const present = sections.filter((s) => (s.displayText ?? '').trim().length > 0);
  const refs = present.map((s) => narrativeSource(patientId, s.sectionKey, `${patientId}:${s.sectionKey}`, s.displayText, undefined));
  gatewayAudit(ctx, 'get_patient_narrative_sections', [patientId], present.length, present.length ? 'ok' : 'empty', nowIso());
  return { data: present, sourceRefs: refs };
}

export async function getPatientVitalSigns(input: VitalSignQueryInput, ctx: UserContext): Promise<SourcedResult<VitalItem[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, input.patientId);
  const { cartella, recordId } = await loadCartella(input.patientId);
  const filtered = filterVitals(cartella.parametriVitali ?? [], input);
  const refs = filtered.map((v) => vitalSource(input.patientId, v.id ?? recordId, v.etichetta ?? 'vital', `${v.etichetta} ${v.valore}`, v.rilevato));
  gatewayAudit(ctx, 'get_patient_vital_signs', [input.patientId], filtered.length, filtered.length ? 'ok' : 'empty', nowIso());
  return { data: filtered, sourceRefs: refs };
}

export async function getPatientTherapies(patientId: string, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const rows = await prisma.patientTherapy.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
  const refs = rows.map((t) => therapySource(patientId, t.id, t.farmacoNome, `${t.farmacoNome} ${t.dosaggio}`, t.dataInizio));
  gatewayAudit(ctx, 'get_patient_therapies', [patientId], rows.length, rows.length ? 'ok' : 'empty', nowIso());
  return { data: rows, sourceRefs: refs };
}

export async function getPatientDiary(patientId: string, ctx: UserContext, opts: { authorType?: string; from?: string; to?: string } = {}): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const rows = await prisma.patientDiaryEntry.findMany({ where: { patientId, ...(opts.authorType ? { authorType: opts.authorType } : {}) }, orderBy: { entryDateTime: 'desc' } });
  const inRange = rows.filter((r) => (!opts.from || r.entryDateTime >= opts.from) && (!opts.to || r.entryDateTime <= opts.to));
  const refs = inRange.map((d) => diarySource(patientId, d.id, d.authorType, d.content, d.entryDateTime));
  gatewayAudit(ctx, 'get_patient_diary', [patientId], inRange.length, inRange.length ? 'ok' : 'empty', nowIso());
  return { data: inRange, sourceRefs: refs };
}

export async function getPatientDocumentsG(patientId: string, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const docs = await listPatientDocuments(patientId);
  const refs = docs.map((d) => documentSource(patientId, d.id, d.originalName));
  gatewayAudit(ctx, 'get_patient_documents', [patientId], docs.length, docs.length ? 'ok' : 'empty', nowIso());
  return { data: docs, sourceRefs: refs };
}

export async function getPatientAppointments(patientId: string, ctx: UserContext, opts: { from?: string; to?: string } = {}): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const where: Record<string, unknown> = { patientId };
  if (opts.from || opts.to) where.scheduledAt = { ...(opts.from ? { gte: new Date(opts.from) } : {}), ...(opts.to ? { lte: new Date(opts.to) } : {}) };
  const rows = await prisma.appointment.findMany({ where, orderBy: { scheduledAt: 'asc' } });
  const refs = rows.map((a) => appointmentSource(patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString()));
  gatewayAudit(ctx, 'get_patient_appointments', [patientId], rows.length, rows.length ? 'ok' : 'empty', nowIso());
  return { data: rows, sourceRefs: refs };
}

export async function getPatientTimeline(patientId: string, ctx: UserContext): Promise<SourcedResult<Array<{ at: string; kind: string; label: string }>>> {
  assertTenant(ctx); assertPatientAllowed(ctx, patientId);
  const [appts, diary, vit] = await Promise.all([
    prisma.appointment.findMany({ where: { patientId }, orderBy: { scheduledAt: 'asc' } }),
    prisma.patientDiaryEntry.findMany({ where: { patientId }, orderBy: { entryDateTime: 'asc' } }),
    loadCartella(patientId),
  ]);
  const events: Array<{ at: string; kind: string; label: string }> = [];
  const refs: SourceReference[] = [];
  for (const a of appts) { events.push({ at: a.scheduledAt.toISOString(), kind: 'APPOINTMENT', label: a.reason ?? 'appuntamento' }); refs.push(appointmentSource(patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString())); }
  for (const d of diary) { events.push({ at: d.entryDateTime, kind: 'DIARY_ENTRY', label: d.title ?? d.authorType }); refs.push(diarySource(patientId, d.id, d.authorType, d.content, d.entryDateTime)); }
  for (const v of (vit.cartella.parametriVitali ?? [])) { if (v.rilevato) { events.push({ at: v.rilevato, kind: 'VITAL_SIGN', label: `${v.etichetta} ${v.valore}` }); refs.push(vitalSource(patientId, v.id ?? vit.recordId, v.etichetta ?? 'vital', `${v.etichetta} ${v.valore}`, v.rilevato)); } }
  events.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
  gatewayAudit(ctx, 'get_patient_timeline', [patientId], events.length, events.length ? 'ok' : 'empty', nowIso());
  return { data: events, sourceRefs: refs };
}

// ── Narrative / document search ──────────────────────────────────────────────
export async function searchClinicalSections(input: ClinicalSectionSearchInput, ctx: UserContext): Promise<ClinicalSectionMatch[]> {
  assertTenant(ctx);
  if (!input.query?.trim()) throw new GatewayError('bad_request', 'query required');
  const limit = clampLimit(input.limit);
  const where: Record<string, unknown> = {};
  if (input.patientId) { assertPatientAllowed(ctx, input.patientId); where.patientId = input.patientId; }
  if (input.sectionKey) where.sectionKey = input.sectionKey;
  const rows = await prisma.patientNarrativeSection.findMany({ where, take: 1000 });
  const out: ClinicalSectionMatch[] = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    if (!isAllowedPatient(ctx, r.patientId)) continue;
    const text = (r.reviewedText ?? r.originalText) || '';
    if (!textIncludes(text, input.query)) continue;
    const excerpt = excerptAround(text, input.query);
    out.push({ patientId: r.patientId, sectionKey: r.sectionKey, excerpt, sourceRefs: [narrativeSource(r.patientId, r.sectionKey, r.id, excerpt, r.updatedAt.toISOString())] });
  }
  gatewayAudit(ctx, 'search_clinical_sections', out.map((o) => o.patientId), out.length, out.length ? 'ok' : 'empty', nowIso());
  return out;
}

export async function searchDocuments(input: ClinicalSectionSearchInput, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  if (input.patientId) assertPatientAllowed(ctx, input.patientId);
  const where: Record<string, unknown> = input.patientId ? { patientId: input.patientId } : {};
  const rows = await prisma.patientDocument.findMany({ where, take: 1000 });
  const matched = rows.filter((d) => isAllowedPatient(ctx, d.patientId) && (!input.query || textIncludes(d.originalName, input.query) || textIncludes(d.documentType, input.query)));
  const data = matched.slice(0, clampLimit(input.limit)).map((d) => ({ id: d.id, patientId: d.patientId, originalName: d.originalName, documentType: d.documentType }));
  const refs = data.map((d) => documentSource(d.patientId, d.id, d.originalName));
  gatewayAudit(ctx, 'search_documents', data.map((d) => d.patientId), data.length, data.length ? 'ok' : 'empty', nowIso());
  return { data, sourceRefs: refs };
}

// ── Correlation (descriptive only — never clinical inference) ─────────────────
export async function correlate(input: CorrelateInput, ctx: UserContext): Promise<SourcedResult<PatientSearchResult[]>> {
  assertTenant(ctx);
  const limit = clampLimit(input.limit);
  const patients = await prisma.patient.findMany({ orderBy: [{ lastName: 'asc' }] , take: 1000 });
  const out: PatientSearchResult[] = [];
  const allRefs: SourceReference[] = [];
  for (const p of patients) {
    if (out.length >= limit) break;
    if (!isAllowedPatient(ctx, p.id)) continue;
    const matching: string[] = [];
    const refs: SourceReference[] = [];
    if (input.allergy || input.therapy) {
      const { cartella, recordId } = await loadCartella(p.id);
      if (input.allergy) { const a = matchAllergy(cartella, input.allergy); if (!a) continue; matching.push('allergy'); refs.push(patientFieldSource(p.id, `allergie:${a.allergene}`, a.allergene)); }
      if (input.therapy) { const t = matchTherapy(cartella, input.therapy); if (!t) continue; matching.push('therapy'); refs.push(therapySource(p.id, recordId, 'terapie', t.descrizione, t.dataInizio)); }
    }
    if (input.sectionContains) {
      const secWhere: Record<string, unknown> = { patientId: p.id };
      if (input.sectionContains.sectionKey) secWhere.sectionKey = input.sectionContains.sectionKey;
      const secs = await prisma.patientNarrativeSection.findMany({ where: secWhere });
      const hit = secs.find((s) => textIncludes((s.reviewedText ?? s.originalText) || '', input.sectionContains!.text));
      if (!hit) continue;
      matching.push('section'); refs.push(narrativeSource(p.id, hit.sectionKey, hit.id, excerptAround((hit.reviewedText ?? hit.originalText) || '', input.sectionContains.text)));
    }
    if (matching.length === 0) continue;
    out.push({ patientId: p.id, displayName: displayName(p), dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10), matchingFields: matching, sourceRefs: refs });
    allRefs.push(...refs);
  }
  gatewayAudit(ctx, 'correlate_structured_data', out.map((o) => o.patientId), out.length, out.length ? 'ok' : 'empty', nowIso());
  return { data: out, sourceRefs: allRefs };
}

/** Resolve a NARRATIVE_SECTION source back to its exact stored text. */
export async function resolveNarrativeSource(recordId: string, ctx: UserContext): Promise<SourcedResult<{ patientId: string; sectionKey: string; exactText: string }> | null> {
  assertTenant(ctx);
  const row = await prisma.patientNarrativeSection.findUnique({ where: { id: recordId } });
  if (!row) return null;
  assertPatientAllowed(ctx, row.patientId);
  const exactText = (row.reviewedText ?? row.originalText) || '';
  gatewayAudit(ctx, 'get_source_reference', [row.patientId], 1, 'ok', nowIso());
  return { data: { patientId: row.patientId, sectionKey: row.sectionKey, exactText }, sourceRefs: [narrativeSource(row.patientId, row.sectionKey, row.id, exactText, row.updatedAt.toISOString())] };
}

/** Broad cross-patient search — gated by env + role; never on by default. */
export async function searchAcrossPatients(input: ClinicalSectionSearchInput, ctx: UserContext): Promise<ClinicalSectionMatch[]> {
  assertTenant(ctx);
  if (!canCrossPatientSearch(ctx)) throw new GatewayError('cross_patient_disabled', 'Cross-patient search is disabled');
  return searchClinicalSections({ ...input, patientId: undefined }, ctx);
}

// ── Agnos KB (Task 2): camere (aggregato + occupanti), consegne, scale cliniche ──────────────
// Occupazione attiva = PatientRoomAssignment con endDate === null. Il letto in manutenzione
// (stato === 'manutenzione' e nessuna occupazione attiva) NON è conteggiato tra i liberi.
// L'aggregato (RoomsAggregate) non deve MAI contenere nomi paziente (spec §2) — solo occupantRows
// li espone, replicando la disclosure già presente nella UI attuale (assegnazione letti).

export interface RoomsAggregate {
  totalRooms: number; totalBeds: number; occupiedBeds: number; freeBeds: number;
  maintenanceBeds: number; occupancyPct: number;
}

export interface RoomOccupantRow {
  roomNumero: string; bedLabel: string; patientId: string; patientName: string; startDate: string;
}

type BedRow = {
  id: string; stato: string; label: string; room: { numero: string };
  active: { patientId: string; startDate: string; patient: { firstName: string; lastName: string } } | null;
};

export function aggregateRooms(totalRooms: number, beds: BedRow[]): RoomsAggregate {
  const occupiedBeds = beds.filter((b) => b.active).length;
  const maintenanceBeds = beds.filter((b) => !b.active && b.stato === 'manutenzione').length;
  const totalBeds = beds.length;
  const freeBeds = totalBeds - occupiedBeds - maintenanceBeds;
  return {
    totalRooms, totalBeds, occupiedBeds, freeBeds, maintenanceBeds,
    occupancyPct: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  };
}

export function occupantRows(beds: BedRow[], roomNumero?: string): RoomOccupantRow[] {
  return beds
    .filter((b) => b.active && (!roomNumero || b.room.numero === roomNumero))
    .map((b) => ({
      roomNumero: b.room.numero, bedLabel: b.label, patientId: b.active!.patientId,
      patientName: `${b.active!.patient.lastName} ${b.active!.patient.firstName}`.trim(),
      startDate: b.active!.startDate,
    }));
}

async function loadBeds(): Promise<{ totalRooms: number; beds: BedRow[] }> {
  const totalRooms = await prisma.room.count({ where: { stato: 'attiva' } });
  const rows = await prisma.bed.findMany({
    where: { room: { stato: 'attiva' } },
    include: {
      room: { select: { numero: true } },
      assignments: { where: { endDate: null }, include: { patient: { select: { firstName: true, lastName: true } } }, take: 1 },
    },
  });
  const beds: BedRow[] = rows.map((b) => ({
    id: b.id, stato: b.stato, label: b.label, room: { numero: b.room.numero },
    active: b.assignments[0]
      ? { patientId: b.assignments[0].patientId, startDate: b.assignments[0].startDate, patient: b.assignments[0].patient }
      : null,
  }));
  return { totalRooms, beds };
}

/** Facility-wide, aggregate-only (never names) — gated by AI_FACILITY_QUERIES_ENABLED like every
 *  other room/bed/occupancy read in the gateway (see query/engine.ts canFacilityRead usage). */
export async function queryRoomsOccupancy(ctx: UserContext): Promise<SourcedResult<[RoomsAggregate]>> {
  assertTenant(ctx);
  if (!canFacilityRead()) throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const { totalRooms, beds } = await loadBeds();
  const agg = aggregateRooms(totalRooms, beds);
  const text = `${agg.occupiedBeds}/${agg.totalBeds} letti occupati; ${agg.totalRooms} camere censite`;
  gatewayAudit(ctx, 'query_rooms_occupancy', [], 1, 'ok', nowIso());
  return { data: [agg], sourceRefs: [roomOccupancySource('rooms-aggregate', text)] };
}

/** Per-camera occupant names — disclosure equivalent to the existing bed-assignment UI. Still
 *  gated by facility read (rooms/beds are facility data) AND per-row patient permission. */
export async function queryRoomOccupants(input: { roomNumero?: string }, ctx: UserContext): Promise<SourcedResult<RoomOccupantRow[]>> {
  assertTenant(ctx);
  if (!canFacilityRead()) throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const { beds } = await loadBeds();
  const rows = occupantRows(beds, input.roomNumero).filter(
    (r) => ctx.permittedPatientIds === null || ctx.permittedPatientIds.includes(r.patientId),
  );
  gatewayAudit(ctx, 'query_room_occupants', rows.map((r) => r.patientId), rows.length, rows.length ? 'ok' : 'empty', nowIso());
  return {
    data: rows,
    sourceRefs: rows.map((r) => roomOccupantsSource(r.patientId, `room-${r.roomNumero}-${r.bedLabel}`,
      `Camera ${r.roomNumero} letto ${r.bedLabel}: ${r.patientName}`)),
  };
}

const CONSEGNA_SEVERITY: Record<string, number> = { urgente: 0, alta: 1, normale: 2 };

/** Prisma orders only by scadenza (asc); priorita is NOT alphabetically sortable
 *  (urgente > normale > alta would be wrong). Tiebreak here with an explicit severity map. */
export function sortConsegne<T extends { scadenza: string; priorita: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.scadenza !== b.scadenza) return a.scadenza < b.scadenza ? -1 : 1;
    const sa = CONSEGNA_SEVERITY[a.priorita] ?? 99;
    const sb = CONSEGNA_SEVERITY[b.priorita] ?? 99;
    return sa - sb;
  });
}

export async function getConsegne(input: { patientId?: string; day?: string }, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  if (input.patientId) assertPatientAllowed(ctx, input.patientId);
  const rows = await prisma.consegna.findMany({
    where: {
      ...(input.patientId ? { pazienteId: input.patientId } : {}),
      ...(input.day ? { scadenza: input.day } : {}),
      stato: { not: 'completata' },
    },
    orderBy: [{ scadenza: 'asc' }],
    take: 50,
  });
  const sorted = sortConsegne(rows);
  const allowed = sorted.filter((c) => !c.pazienteId || ctx.permittedPatientIds === null || ctx.permittedPatientIds.includes(c.pazienteId));
  gatewayAudit(ctx, 'get_consegne', allowed.map((c) => c.pazienteId).filter(Boolean), allowed.length, allowed.length ? 'ok' : 'empty', nowIso());
  return {
    data: allowed,
    sourceRefs: allowed.map((c) => consegnaSource(c.pazienteId, c.id, c.tipo, `${c.tipo}: ${c.note}`, c.scadenza)),
  };
}

const CLINICAL_SCALE_KEYS = {
  braden: 'valutazioniBraden', tinetti: 'valutazioniTinetti', nrs: 'valutazioniNRS',
  medicazioni: 'medicazioniFerite', contenzioni: 'contenzioni',
} as const;
type ClinicalScale = keyof typeof CLINICAL_SCALE_KEYS;

/** Cartella arrays are written newest-first by the frontend ([newEntry, ...list]):
 *  array newest-first (frontend prepend): slice(0,n) = più recenti. */
export function latestScores<T>(rows: T[], n = 3): T[] {
  return (rows ?? []).slice(0, n);
}

export async function getClinicalScores(input: { patientId: string; scale?: ClinicalScale }, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, input.patientId);
  const { cartella, recordId } = await loadCartella(input.patientId);
  const all: Record<string, unknown[]> = {};
  for (const [scale, key] of Object.entries(CLINICAL_SCALE_KEYS)) {
    all[scale] = (cartella[key] as unknown[] | undefined) ?? [];
  }
  const picked = input.scale ? { [input.scale]: all[input.scale] ?? [] } : all;
  const data = Object.entries(picked).flatMap(([scale, rows]) => latestScores(rows ?? []).map((r) => ({ scale, ...(r as object) })));
  gatewayAudit(ctx, 'get_clinical_scores', [input.patientId], data.length, data.length ? 'ok' : 'empty', nowIso());
  return {
    data,
    sourceRefs: data.map((d, i) => clinicalScoreSource(input.patientId, `${recordId}-${i}`, (d as { scale: string }).scale, `Scala ${(d as { scale: string }).scale}`)),
  };
}

export interface OperatorDutyRow {
  operatoreId: string; operatoreNome: string; oraInizio: string; oraFine: string; pazientiInCarico: number;
}

export function dutyRows(shifts: ShiftRow[], counts: Map<string, number>, giorno: string): OperatorDutyRow[] {
  return onDuty(shifts, giorno).map((s) => ({
    operatoreId: s.operatoreId, operatoreNome: s.operatoreNome,
    oraInizio: s.oraInizio, oraFine: s.oraFine, pazientiInCarico: counts.get(s.operatoreId) ?? 0,
  }));
}

// Decisione 2026-07-10: turni = dato organizzativo non clinico (nessun dato paziente) → disponibile
// a entrambi i ruoli. La route pubblica fissa roles=['operatore'] per design (privilege never from
// public header).
export async function queryOperators(input: { day?: string }, ctx: UserContext): Promise<SourcedResult<OperatorDutyRow[]>> {
  assertTenant(ctx);
  const day = input.day ?? new Date().toISOString().slice(0, 10);
  const shifts = await prisma.operatorShift.findMany();
  // pazienti in carico ≈ appuntamenti odierni per operatore (fonte reale disponibile).
  // Server-local day boundaries — consistent with appointmentsToday in assistant/service.ts
  const from = new Date(`${day}T12:00:00`); from.setHours(0, 0, 0, 0);
  const to = new Date(`${day}T12:00:00`); to.setHours(23, 59, 59, 999);
  const appts = await prisma.appointment.groupBy({ by: ['operatorId'], where: { scheduledAt: { gte: from, lte: to }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }, _count: { _all: true } });
  const counts = new Map(appts.map((a) => [a.operatorId, a._count._all]));
  const rows = dutyRows(shifts as ShiftRow[], counts, weekdayIt(day));
  gatewayAudit(ctx, 'query_operators', [], rows.length, rows.length ? 'ok' : 'empty', nowIso());
  return { data: rows, sourceRefs: [operatorShiftSource(`duty-${day}`, `${rows.length} operatori disponibili ${day}`)] };
}

function isAllowedPatient(ctx: UserContext, patientId: string): boolean {
  return ctx.permittedPatientIds === null || ctx.permittedPatientIds.includes(patientId);
}

function excerptAround(text: string, needle: string, radius = 120): string {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const i = norm(text).indexOf(norm(needle));
  if (i < 0) return text.slice(0, radius);
  const start = Math.max(0, i - radius); const end = Math.min(text.length, i + needle.length + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}
