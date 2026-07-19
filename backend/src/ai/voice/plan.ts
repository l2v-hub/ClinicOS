// REQ-041: deterministic voice-command planner. Maps a transcript to a typed, validated ActionPlan.
// No model, no DB, no clinical inference. A plan that still has `ambiguities` can NEVER be executed.
// (A model-based NL layer can later produce the same ActionPlan; the executor contract is unchanged.)

import { randomUUID } from 'node:crypto';
import type { ActionPlan, VoiceActionType } from './types.js';
import { isWriteAction } from './types.js';
import { matchVital, parseVitalValue, parseSpokenTime } from './vitals.js';

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Issue #130: "scriv…" (scrivi/scrivere/scrivimi) added — the PO example «Scrivi nel diario di …»
// must be recognized as a write command like the other Italian write verbs.
const WRITE_VERB =
  /\b(registra|aggiungi|aggiorna|modifica|cambia|sostituisci|imposta|inserisci|crea|prescriv|scriv\w*|elimina|cancella|rimuovi)\b/;
// SPEC-015 (FR-008/FR-009): every Italian deletion verb AND its inflections is refused outright,
// on every channel, with or without another write verb. "deleta" is matched by explicit inflections
// only, so legitimate words like "deleterio" never trigger a refusal.
const DELETE_VERB =
  /\b(elimin\w*|cancell\w*|rimuov\w*|rimoss\w*|togli\w*|tolg\w*|tolt\w*|svuot\w*|azzer\w*|distrugg\w*|distrutt\w*|cestin\w*|delet(?:a|are|ando|at[oaie]|i|iamo))\b|\bbutt\w*\s+via\b/;

/** SPEC-015: deletion is only ever possible from the traditional UI — never through Agnos. */
export const DELETE_REFUSAL_MESSAGE =
  'La cancellazione dei dati non è possibile tramite l’assistente AI: è consentita solo dall’interfaccia tradizionale di ClinicOS.';
// #239 chatbot: recognise natural Italian questions as reads (only ever checked when there is NO
// write verb, so broadening cannot hijack a write command). Covers common interrogatives that
// operators actually type ("che terapie…", "quante camere…", "com'è…", "dove…").
const READ_VERB =
  /\b(mostra|mostrami|apri|cerca|trova|elenca|visualizza|leggi|dimmi|fammi vedere|quali|quale|quant\w*|che|cosa|chi|qual e|qual'?e|come|com'?e|quando|dove|perch\w*|c'?e|ci sono)\b/;

// Clinical judgement is refused outright (mirrors the read assistant's refusal set).
const CLINICAL_REFUSAL = [
  /\bsuggerisci\b/,
  /\bconsiglia\b/,
  /che (terapia|cura|farmaco) (dovrei|devo|si dovrebbe)/,
  /\bdiagnosi\b/,
  /\bprognosi\b/,
  /\bcausa\b.*\bmalattia\b/,
  /\bpiu grave\b/,
  /interpreta.*valori/,
];

// Narrative section recognition (Italian → canonical key).
const SECTION_HINTS: Array<{ re: RegExp; key: string }> = [
  { re: /anamnes/, key: 'ANAMNESIS' },
  { re: /decorso/, key: 'HOSPITAL_COURSE' },
  { re: /consulenz/, key: 'CONSULTATIONS' },
  { re: /diagnostica|imaging|radiolog|ecograf/, key: 'IMAGING_DIAGNOSTICS' },
  { re: /prestazion|intervent|procedur/, key: 'PROCEDURES_AND_INTERVENTIONS' },
  { re: /consigli|controlli|follow/, key: 'ADVICE_AND_FOLLOW_UP' },
  { re: /diagnosi/, key: 'DIAGNOSIS' },
];

function sectionKeyFor(q: string): string | undefined {
  for (const s of SECTION_HINTS) if (s.re.test(q)) return s.key;
  return undefined;
}

// Capture the free-text value after a connector ("con"/"in"/"a"/":"/"aggiungendo"), from the
// ORIGINAL text so casing/accents of an address or narrative note are preserved.
function valueAfter(original: string): string | undefined {
  const m = /(?:\baggiungendo\b|\bcon\b|\bin\b|\ba\b|:)\s+(.{2,})$/i.exec(original.trim());
  return m ? m[1].replace(/[?.!]+$/, '').trim() : undefined;
}

export interface VoicePlanContext {
  currentPatientId?: string;
  currentPatientName?: string;
}

export function planAction(
  transcript: string,
  ctx: VoicePlanContext = {},
  genId: () => string = randomUUID,
): ActionPlan {
  const original = (transcript || '').trim();
  const q = norm(original);
  const pid = ctx.currentPatientId ?? null;

  const make = (actionType: VoiceActionType, extra: Partial<ActionPlan> = {}): ActionPlan => ({
    actionType,
    patientId: pid,
    targetRecordId: null,
    fields: {},
    sourceTranscript: original,
    ambiguities: [],
    requiresConfirmation: isWriteAction(actionType),
    idempotencyKey: genId(),
    ...extra,
  });

  if (!original) return make('unknown', { ambiguities: ['Comando vuoto'] });

  const hasWriteVerb = WRITE_VERB.test(q);

  // 1) clinical refusal
  if (CLINICAL_REFUSAL.some((re) => re.test(q))) {
    return make('refuse_clinical', {
      refusalReason: 'L’assistente non fornisce diagnosi, terapie o valutazioni cliniche.',
    });
  }

  // 2) deletions are refused outright (SPEC-015: CRU-only — no write verb required, any inflection)
  if (DELETE_VERB.test(q)) {
    return make('refuse_forbidden', {
      refusalReason: DELETE_REFUSAL_MESSAGE,
      refusalKind: 'delete',
    });
  }
  // 2b) other forbidden writes (v1): therapy changes, allergy changes
  if (hasWriteVerb && /\b(terapia|terapie|farmac|prescriv)\b/.test(q)) {
    return make('refuse_forbidden', {
      refusalReason:
        'Le modifiche a terapie e farmaci richiedono una conferma rafforzata e non sono disponibili via voce.',
    });
  }
  if (hasWriteVerb && /\ballerg/.test(q)) {
    return make('refuse_forbidden', {
      refusalReason:
        'Le modifiche alle allergie richiedono una conferma rafforzata e non sono disponibili via voce.',
    });
  }

  // 3) reads (questions or explicit read verbs, with no write verb) → delegate to the assistant
  if (!hasWriteVerb && (READ_VERB.test(q) || original.endsWith('?'))) {
    return make('read', { readQuery: original });
  }

  // 4) writes
  if (hasWriteVerb) {
    const needPatient = (plan: ActionPlan): ActionPlan => {
      if (!pid) plan.ambiguities.push('Paziente non identificato con certezza');
      return plan;
    };

    // 4a) vital sign
    const vital = matchVital(q);
    if (vital) {
      const plan = make('create_vital_sign');
      const val = parseVitalValue(vital, q);
      const t = parseSpokenTime(q);
      plan.fields = {
        etichetta: vital.etichetta,
        label: vital.label,
        valore: val.valore,
        unita: vital.unita,
      };
      plan.ambiguities.push(...val.ambiguities);
      if (!t.has) plan.ambiguities.push('Manca l’orario del parametro');
      else
        plan.fields.timeHHMM = `${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')}`;
      (plan.fields as Record<string, unknown>).warnings = val.warnings;
      return needPatient(plan);
    }

    // 4b) demographics
    const demoField = /telefon|cellulare|numero/.test(q)
      ? 'phone'
      : /\bemail\b|posta elettronica|mail/.test(q)
        ? 'email'
        : /indirizz|residenza|via\b/.test(q)
          ? 'address'
          : /contatto.*emergenz|emergenz.*contatto/.test(q)
            ? 'emergencyContactName'
            : null;
    if (demoField) {
      const plan = make('update_patient_demographics');
      let raw = valueAfter(original);
      if (demoField === 'phone' && raw)
        raw = (/(\+?\d[\d\s]{4,})/.exec(raw)?.[1] ?? raw).replace(/\s+/g, '');
      if (!raw) plan.ambiguities.push('Nuovo valore non riconosciuto');
      plan.fields = { field: demoField, value: raw ?? '' };
      return needPatient(plan);
    }

    // 4c) narrative section
    const sec = sectionKeyFor(q);
    if (/sezione|anamnes|decorso|consulenz|diagnos|consigli/.test(q) && sec) {
      const plan = make('update_narrative_section', { sectionKey: sec });
      const text = valueAfter(original);
      if (!text) plan.ambiguities.push('Testo da aggiungere non riconosciuto');
      plan.fields = { mode: 'append', addedText: text ?? '' };
      return needPatient(plan);
    }

    // 4d) diary note
    if (/\bnota\b|diario|annotazion/.test(q)) {
      const plan = make('add_diary_note');
      const text = valueAfter(original);
      if (!text) plan.ambiguities.push('Contenuto della nota non riconosciuto');
      plan.fields = { content: text ?? '' };
      return needPatient(plan);
    }
  }

  return make('unknown', { ambiguities: ['Comando non riconosciuto'] });
}
