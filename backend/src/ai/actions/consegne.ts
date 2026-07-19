// Issue #130: deterministic Italian recognizer + grounding for consegna (handover) commands.
// ONE command only (create — CRU without D, delete never exists here):
//
//   create_consegna: "aggiungi|crea|scrivi|inserisci|registra [una|la|nuova] consegna
//                     [per <paziente>]: <testo>"   (+ variante "consegna per <paziente>: <testo>")
//
// The module is split like the appointment planner: matchConsegnaCommand() is a PURE parser
// (no DB), groundConsegnaPlan() resolves the patient through injectable lookups (defaults are
// the SAME lazy-prisma lookups used by the appointment grounding, so tests run without a DB).
//
// "cancella/elimina la consegna" NEVER reaches this module: the orchestrator only calls the
// matcher for non-refusal plans, and the voice planner refuses every deletion verb first.

import { randomUUID } from 'node:crypto';
import type { ActionPlan, ActionPreview, VoiceActionType } from '../voice/types.js';
import { isWriteAction } from '../voice/types.js';
import { defaultSearchPatients, defaultGetPatient, type PatientHit } from './appointments.js';

export function isConsegnaAction(t: VoiceActionType): boolean {
  return t === 'create_consegna';
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Verb DIRECTLY followed by (optional article +) "consegna": a diary/narrative command whose
// payload merely mentions "consegna" is never hijacked ("scrivi nel diario: … la consegna …").
const CONSEGNA_CMD_RE =
  /\b(aggiungi|aggiungere|crea|creare|scrivi|scrivere|inserisci|inserire|registra|registrare)\s+(?:una\s+|la\s+|nuova\s+)?consegn\w*\b/;
// Variant without a verb: the command STARTS with "consegna per …".
const CONSEGNA_LEAD_RE = /^consegn\w*\s+per\b/;

// Patient from the ORIGINAL text (casing preserved for the DB lookup): up to two words after
// "consegna per", stopping naturally before the ":" separator.
const CONSEGNA_PATIENT_RE =
  /consegn\w*\s+per\s+(?:il\s+paziente\s+|la\s+paziente\s+|il\s+sig\.?\s+|la\s+sig\.?ra\s+)?([A-Za-zÀ-ÿ'][\wÀ-ÿ']*(?:\s+[A-Za-zÀ-ÿ'][\wÀ-ÿ']*)?)/;

export interface ConsegnaPlanContext {
  currentPatientId?: string;
}

/**
 * PURE parser: recognize an Italian "add consegna" command, or return null so the caller falls
 * back to the voice planner. Missing patient / empty text become BLOCKING ambiguities (FR-005:
 * confirmation stays disabled until resolved). Patient comes from the text ("per <paziente>")
 * or from the current-patient context.
 */
export function matchConsegnaCommand(
  transcript: string,
  ctx: ConsegnaPlanContext = {},
  opts: { genId?: () => string } = {},
): ActionPlan | null {
  const original = (transcript || '').trim();
  const q = norm(original);
  if (!CONSEGNA_CMD_RE.test(q) && !CONSEGNA_LEAD_RE.test(q)) return null;
  const genId = opts.genId ?? randomUUID;

  const plan: ActionPlan = {
    actionType: 'create_consegna',
    patientId: ctx.currentPatientId ?? null,
    targetRecordId: null,
    fields: {},
    sourceTranscript: original,
    ambiguities: [],
    requiresConfirmation: isWriteAction('create_consegna'),
    idempotencyKey: genId(),
  };

  const patientMatch = CONSEGNA_PATIENT_RE.exec(original);
  const patientQuery = patientMatch?.[1]?.trim();

  // Testo della consegna: dopo i due punti, altrimenti ciò che segue il nome del paziente.
  const colonIdx = original.indexOf(':');
  let note = '';
  if (colonIdx >= 0) {
    note = original.slice(colonIdx + 1).trim();
  } else if (patientMatch) {
    note = original
      .slice((patientMatch.index ?? 0) + patientMatch[0].length)
      .replace(/^[,;-]\s*/, '')
      .trim();
  }
  note = note.replace(/[?.!]+$/, '').trim();

  plan.fields = { note, ...(patientQuery ? { patientQuery } : {}) };
  if (!note)
    plan.ambiguities.push(
      'Testo della consegna non riconosciuto (es. «consegna per Rossi: controllare la pressione»)',
    );
  if (patientQuery)
    plan.patientId = null; // risolto dal grounding sul nome indicato
  else if (!ctx.currentPatientId) plan.ambiguities.push('Paziente non identificato con certezza');
  return plan;
}

// ── grounding (DB lookups, injectable) ──────────────────────────────────────

export interface ConsegnaLookupDeps {
  searchPatients?: (query: string) => Promise<PatientHit[]>;
  getPatient?: (id: string) => Promise<PatientHit | null>;
}

const displayName = (p: PatientHit) => `${p.lastName} ${p.firstName}`.trim();

/**
 * Resolve the patient and build the preview. MUTATES the plan (patientId, fields.pazienteNome,
 * extra BLOCKING ambiguities). Used identically at plan time (preview) and execute time
 * (tamper-proof re-check) — same contract as groundAppointmentPlan.
 */
export async function groundConsegnaPlan(
  plan: ActionPlan,
  deps: ConsegnaLookupDeps = {},
): Promise<{ plan: ActionPlan; preview: ActionPreview }> {
  const searchPatients = deps.searchPatients ?? defaultSearchPatients;
  const getPatient = deps.getPatient ?? defaultGetPatient;

  let patientName: string | undefined;
  const query = typeof plan.fields.patientQuery === 'string' ? plan.fields.patientQuery : undefined;

  // patient: named in the command > current context
  if (query) {
    const hits = await searchPatients(query);
    if (hits.length === 1) {
      plan.patientId = hits[0].id;
      patientName = displayName(hits[0]);
    } else if (hits.length === 0) plan.ambiguities.push(`Paziente «${query}» non trovato`);
    else plan.ambiguities.push(`Più pazienti corrispondono a «${query}»: specifica nome e cognome`);
  } else if (plan.patientId) {
    const p = await getPatient(plan.patientId);
    if (p) patientName = displayName(p);
    else plan.ambiguities.push('Paziente corrente non trovato');
  }
  // il writer condiviso richiede pazienteNome (stesso contratto della route /consegne)
  if (patientName) plan.fields.pazienteNome = patientName;

  return { plan, preview: buildConsegnaPreview(plan, patientName) };
}

/** Human-readable preview (same shape as the voice previews) shown before confirmation. */
export function buildConsegnaPreview(plan: ActionPlan, patientName?: string): ActionPreview {
  const note = typeof plan.fields.note === 'string' && plan.fields.note ? plan.fields.note : '—';
  return {
    actionType: plan.actionType,
    patientId: plan.patientId,
    patientName,
    title: 'Aggiungi consegna',
    lines: [
      { label: 'Testo', value: note },
      { label: 'Priorità', value: 'normale' },
    ],
    ambiguities: plan.ambiguities,
    canExecute: plan.ambiguities.length === 0 && !!plan.patientId,
    warnings: [],
  };
}
