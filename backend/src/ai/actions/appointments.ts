// SPEC-015 T025 (US4): deterministic Italian recognizer + grounding for agenda appointment
// commands. Two commands ONLY (CRU without D — delete never exists here):
//
//   create_appointment: "crea|fissa|prenota appuntamento [tipologia] [domani|dopodomani|il GG/MM]
//                        alle HH[:MM] per <paziente>"
//   update_appointment: "sposta|cambia|modifica l'appuntamento delle HH[:MM] alle HH[:MM]
//                        [di <Paziente>]"  (paziente dal contesto se non indicato)
//
// The module is split like the voice planner: matchAppointmentCommand() is a PURE parser (no DB),
// groundAppointmentPlan() resolves patient/target/conflicts through injectable lookups (defaults
// lazy-load prisma + appointment-service, so tests run without a database).
//
// "cancella/elimina appuntamento" NEVER reaches this module: the orchestrator only calls the
// matcher for non-refusal plans, and the voice planner refuses every deletion verb first.

import { randomUUID } from 'node:crypto';
import type { ActionPlan, ActionPreview, VoiceActionType } from '../voice/types.js';
import { isWriteAction } from '../voice/types.js';

export function isAppointmentAction(t: VoiceActionType): boolean {
  return t === 'create_appointment' || t === 'update_appointment';
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const APPT_RE = /appuntament/;
const CREATE_VERB = /\b(crea|creare|fissa|fissare|prenota|prenotare)\b/;
const UPDATE_VERB = /\b(sposta|spostare|cambia|cambiare|modifica|modificare)\b/;
// Old-time token of an update command ("l'appuntamento delle 15", "dalle 15"). Required for
// cambia/modifica so a narrative text merely containing "appuntamento" is never hijacked.
const OLD_TIME_RE = /\b(?:delle|dalle)(?:\s+ore)?\s+(\d{1,2})(?::(\d{2})|\.(\d{2})|\s+e\s+(\d{1,2}))?\b/;
const NEW_TIME_RE = /\balle(?:\s+ore)?\s+(\d{1,2})(?::(\d{2})|\.(\d{2})|\s+e\s+(\d{1,2}))?\b/;

function hhmm(h: string, m1?: string, m2?: string, m3?: string): string | null {
  const hh = parseInt(h, 10);
  const mm = parseInt(m1 ?? m2 ?? m3 ?? '0', 10);
  if (!Number.isFinite(hh) || hh > 23 || !Number.isFinite(mm) || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Italian relative/explicit date: oggi, domani, dopodomani, "il 12/07[/2026]". */
function parseSpokenDate(q: string, now: Date): string | null {
  if (/\bdopodomani\b/.test(q)) { const d = new Date(now); d.setDate(d.getDate() + 2); return localDate(d); }
  if (/\bdomani\b/.test(q)) { const d = new Date(now); d.setDate(d.getDate() + 1); return localDate(d); }
  if (/\boggi\b/.test(q)) return localDate(now);
  const m = /\b(?:il|del|al)\s+(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/.exec(q);
  if (m) {
    const day = parseInt(m[1], 10), month = parseInt(m[2], 10);
    let year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

// Words that can follow "appuntamento" without being a tipologia.
const TIPOLOGIA_STOPWORDS = new Set([
  'domani', 'dopodomani', 'oggi', 'alle', 'delle', 'dalle', 'il', 'per', 'a', 'al', 'del', 'di', 'con', 'ore',
]);

/** Tipologia = word right after "appuntamento" ("appuntamento fisioterapia", "appuntamento di controllo"). */
function parseTipologia(q: string): string | null {
  const m = /appuntament\w*\s+(?:di\s+|per\s+)?([a-zà-ÿ-]{3,})/.exec(q);
  if (!m) return null;
  const word = m[1];
  return TIPOLOGIA_STOPWORDS.has(word) ? null : word;
}

// Patient from the ORIGINAL text (casing preserved for the DB lookup).
const CREATE_PATIENT_RE = /\bper\s+(?:il\s+paziente\s+|la\s+paziente\s+|il\s+sig\.?\s+|la\s+sig\.?ra\s+)?([A-Za-zÀ-ÿ'][\wÀ-ÿ']+(?:\s+[A-Za-zÀ-ÿ'][\wÀ-ÿ']+)?)\s*[?.!]*\s*$/;
const UPDATE_PATIENT_RE = /\b(?:di|del paziente|della paziente)\s+([A-ZÀ-Ü][\wÀ-ÿ']+(?:\s+[A-ZÀ-Ü][\wÀ-ÿ']+)?)/;

export interface AppointmentPlanContext {
  currentPatientId?: string;
}

/**
 * PURE parser: recognize an Italian appointment create/update command, or return null so the
 * caller falls back to the voice planner. Missing patient/date/time become BLOCKING ambiguities
 * (FR-005: confirmation stays disabled until resolved).
 */
export function matchAppointmentCommand(
  transcript: string,
  ctx: AppointmentPlanContext = {},
  opts: { now?: Date; genId?: () => string } = {},
): ActionPlan | null {
  const original = (transcript || '').trim();
  const q = norm(original);
  if (!APPT_RE.test(q)) return null;
  const now = opts.now ?? new Date();
  const genId = opts.genId ?? randomUUID;

  const make = (actionType: VoiceActionType): ActionPlan => ({
    actionType,
    patientId: ctx.currentPatientId ?? null,
    targetRecordId: null,
    fields: {},
    sourceTranscript: original,
    ambiguities: [],
    requiresConfirmation: isWriteAction(actionType),
    idempotencyKey: genId(),
  });

  const oldTime = OLD_TIME_RE.exec(q);

  // ── update: sposta (always) | cambia/modifica (only with an explicit old-time token) ──
  const updVerb = UPDATE_VERB.exec(q);
  if (updVerb && (updVerb[1].startsWith('sposta') || oldTime)) {
    const plan = make('update_appointment');
    const from = oldTime ? hhmm(oldTime[1], oldTime[2], oldTime[3], oldTime[4]) : null;
    // The new time is the "alle HH" AFTER the old-time token (both use different prepositions).
    const newMatch = NEW_TIME_RE.exec(oldTime ? q.slice((oldTime.index ?? 0) + oldTime[0].length) : q);
    const to = newMatch ? hhmm(newMatch[1], newMatch[2], newMatch[3], newMatch[4]) : null;
    const data = parseSpokenDate(q, now) ?? localDate(now); // update senza data esplicita = oggi
    const patientQuery = UPDATE_PATIENT_RE.exec(original)?.[1]?.trim();

    plan.fields = { data, ...(from ? { oldTime: from } : {}), ...(to ? { newTime: to } : {}), ...(patientQuery ? { patientQuery } : {}) };
    if (!from) plan.ambiguities.push('Orario dell’appuntamento da spostare non riconosciuto (es. «delle 15»)');
    if (!to) plan.ambiguities.push('Nuovo orario non riconosciuto (es. «alle 16»)');
    if (patientQuery) plan.patientId = null; // risolto dal grounding sul nome indicato
    else if (!ctx.currentPatientId) plan.ambiguities.push('Paziente non identificato con certezza');
    return plan;
  }

  // ── create: crea/fissa/prenota ... appuntamento ──
  if (CREATE_VERB.test(q)) {
    const plan = make('create_appointment');
    const data = parseSpokenDate(q, now);
    const t = NEW_TIME_RE.exec(q);
    const ora = t ? hhmm(t[1], t[2], t[3], t[4]) : null;
    const tipologia = parseTipologia(q) ?? 'visita';
    const patientQuery = CREATE_PATIENT_RE.exec(original)?.[1]?.trim();

    plan.fields = { ...(data ? { data } : {}), ...(ora ? { ora } : {}), tipologia, ...(patientQuery ? { patientQuery } : {}) };
    if (!data) plan.ambiguities.push('Manca la data dell’appuntamento (es. «domani», «il 12/07»)');
    if (!ora) plan.ambiguities.push('Manca l’orario dell’appuntamento (es. «alle 10:30»)');
    if (patientQuery) plan.patientId = null; // risolto dal grounding sul nome indicato
    else if (!ctx.currentPatientId) plan.ambiguities.push('Paziente non identificato con certezza');
    return plan;
  }

  return null;
}

// ── grounding (DB lookups, injectable) ──────────────────────────────────────

export interface PatientHit { id: string; firstName: string; lastName: string }
export interface AppointmentHit { id: string; operatorId: string }

export interface AppointmentLookupDeps {
  searchPatients?: (query: string) => Promise<PatientHit[]>;
  getPatient?: (id: string) => Promise<PatientHit | null>;
  /** Same 30-min slot rule as the service: same operator + same date/time = conflict. */
  findConflict?: (operatorId: string, data: string, ora: string, excludeId?: string) => Promise<{ id: string } | null>;
  findAppointmentAt?: (patientId: string, data: string, ora: string) => Promise<AppointmentHit | null>;
}

async function defaultSearchPatients(query: string): Promise<PatientHit[]> {
  const { prisma } = await import('../../lib/prisma.js');
  const tokens = query.split(/\s+/).filter(Boolean);
  return prisma.patient.findMany({
    where: {
      AND: tokens.map((t) => ({
        OR: [
          { lastName: { contains: t, mode: 'insensitive' as const } },
          { firstName: { contains: t, mode: 'insensitive' as const } },
        ],
      })),
    },
    select: { id: true, firstName: true, lastName: true },
    take: 5,
  });
}

async function defaultGetPatient(id: string): Promise<PatientHit | null> {
  const { prisma } = await import('../../lib/prisma.js');
  return prisma.patient.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true } });
}

async function defaultFindConflict(operatorId: string, data: string, ora: string, excludeId?: string) {
  const { findConflict } = await import('../../services/appointment-service.js');
  return findConflict(operatorId, data, ora, excludeId);
}

async function defaultFindAppointmentAt(patientId: string, data: string, ora: string): Promise<AppointmentHit | null> {
  const { findAppointmentAt } = await import('../../services/appointment-service.js');
  const dto = await findAppointmentAt(patientId, data, ora);
  return dto ? { id: dto.id, operatorId: dto.operatorId } : null;
}

const displayName = (p: PatientHit) => `${p.lastName} ${p.firstName}`.trim();

/**
 * Resolve patient / target appointment / slot conflicts and build the preview. MUTATES the plan
 * (patientId, targetRecordId, extra BLOCKING ambiguities — a slot conflict blocks confirmation,
 * FR-003/FR-005). Used identically at plan time (preview) and execute time (tamper-proof re-check).
 */
export async function groundAppointmentPlan(
  plan: ActionPlan,
  operatorId: string,
  deps: AppointmentLookupDeps = {},
): Promise<{ plan: ActionPlan; preview: ActionPreview }> {
  const searchPatients = deps.searchPatients ?? defaultSearchPatients;
  const getPatient = deps.getPatient ?? defaultGetPatient;
  const findConflict = deps.findConflict ?? defaultFindConflict;
  const findAppointmentAt = deps.findAppointmentAt ?? defaultFindAppointmentAt;

  let patientName: string | undefined;
  const query = typeof plan.fields.patientQuery === 'string' ? plan.fields.patientQuery : undefined;

  // 1) patient: named in the command > current context
  if (query) {
    const hits = await searchPatients(query);
    if (hits.length === 1) { plan.patientId = hits[0].id; patientName = displayName(hits[0]); }
    else if (hits.length === 0) plan.ambiguities.push(`Paziente «${query}» non trovato`);
    else plan.ambiguities.push(`Più pazienti corrispondono a «${query}»: specifica nome e cognome`);
  } else if (plan.patientId) {
    const p = await getPatient(plan.patientId);
    if (p) patientName = displayName(p);
    else plan.ambiguities.push('Paziente corrente non trovato');
  }

  const data = typeof plan.fields.data === 'string' ? plan.fields.data : undefined;

  // 2) create: slot conflict for the requesting operator = BLOCKING ambiguity in preview
  if (plan.actionType === 'create_appointment') {
    const ora = typeof plan.fields.ora === 'string' ? plan.fields.ora : undefined;
    if (plan.patientId && data && ora) {
      const conflict = await findConflict(operatorId, data, ora);
      if (conflict) plan.ambiguities.push(`Conflitto slot: esiste già un appuntamento il ${data} alle ${ora} per questo operatore`);
    }
  }

  // 3) update: locate the target appointment, then check the NEW slot for ITS operator
  if (plan.actionType === 'update_appointment') {
    const oldTime = typeof plan.fields.oldTime === 'string' ? plan.fields.oldTime : undefined;
    const newTime = typeof plan.fields.newTime === 'string' ? plan.fields.newTime : undefined;
    if (plan.patientId && data && oldTime) {
      const target = await findAppointmentAt(plan.patientId, data, oldTime);
      if (!target) plan.ambiguities.push(`Nessun appuntamento trovato il ${data} alle ${oldTime}`);
      else {
        plan.targetRecordId = target.id;
        if (newTime) {
          const conflict = await findConflict(target.operatorId, data, newTime, target.id);
          if (conflict) plan.ambiguities.push(`Conflitto slot: esiste già un appuntamento il ${data} alle ${newTime} per questo operatore`);
        }
      }
    }
  }

  return { plan, preview: buildAppointmentPreview(plan, patientName) };
}

/** Human-readable preview (same shape as the voice previews) shown before confirmation. */
export function buildAppointmentPreview(plan: ActionPlan, patientName?: string): ActionPreview {
  const f = plan.fields;
  const val = (v: unknown) => (typeof v === 'string' && v ? v : '—');
  const lines = plan.actionType === 'create_appointment'
    ? [
        { label: 'Data', value: val(f.data) },
        { label: 'Orario', value: val(f.ora) },
        { label: 'Tipologia', value: val(f.tipologia) },
      ]
    : [
        { label: 'Data', value: val(f.data) },
        { label: 'Orario attuale', value: val(f.oldTime) },
        { label: 'Nuovo orario', value: val(f.newTime) },
      ];
  return {
    actionType: plan.actionType,
    patientId: plan.patientId,
    patientName,
    title: plan.actionType === 'create_appointment' ? 'Crea appuntamento' : 'Sposta appuntamento',
    lines,
    ambiguities: plan.ambiguities,
    canExecute: plan.ambiguities.length === 0 && !!plan.patientId
      && (plan.actionType !== 'update_appointment' || !!plan.targetRecordId),
    warnings: [],
  };
}
