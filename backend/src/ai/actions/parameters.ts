// Milo: una rilevazione con più parametri in un solo comando, scritta nella pagina Parametri.
//   «Registra del paziente Bassi pressione 130 su 80, ha evacuato, stato vigile, battito 78»
// Stesso contratto di appuntamenti e consegne: parser puro → grounding (paziente, orario) →
// anteprima → conferma → scrittura con il servizio della pagina (mai un percorso parallelo).
// Un solo parametro numerico resta al comando storico `create_vital_sign` (orario esplicito).

import { randomUUID } from 'node:crypto';
import type { ActionPlan, ActionPreview, VoiceActionType } from '../voice/types.js';
import { isWriteAction } from '../voice/types.js';
import { parseSpokenTime } from '../voice/vitals.js';
import { romeInstant, romeParts } from '../../proactive/time.js';
import { defaultSearchPatients, defaultGetPatient, type PatientHit } from './appointments.js';
import {
  DICTATION_KEYS,
  DICTATION_LABELS,
  parseDictatedParameters,
  shownValue,
  type DictationKey,
} from './parameter-dictation.js';

export function isParameterAction(t: VoiceActionType): boolean {
  return t === 'create_parameter_reading';
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VERB =
  /\b(registra\w*|inserisci\w*|inserire|aggiungi\w*|aggiungere|segna\w*|annota\w*|salva\w*)\b/;
// Comandi di altre azioni: non vanno mai dirottati qui, anche se citano un parametro.
const OTHER_ACTION =
  /\b(nota|note|diario|annotazion\w*|consegn\w*|appuntament\w*|sezione|anamnes\w*)\b/;
// Parametri che il comando storico (un valore, orario esplicito) non sa scrivere.
const ONLY_HERE: readonly DictationKey[] = ['evacuazione', 'coscienza', 'o2'];

// Parole che non sono mai un cognome: parametri, verbi e riempitivi della dettatura.
const NOT_A_NAME = new Set(
  (
    'pressione pa battito battiti polso frequenza temperatura febbre saturazione glicemia dtx ' +
    'ha non stato vigile sveglio sveglia confuso confusa e con alle ore in aria ossigeno evacuato ' +
    'evacuata alvo la il lo i le un una di del della coscienza parametri parametro valori oggi adesso ora'
  ).split(' '),
);
const WORD = "[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ']+";
const CAP = "[A-ZÀ-Þ][a-zà-ÿ']+";

/** Paziente nominato nel comando: «del paziente Bassi», «alla signora Colombo», «per Ricci Franca». */
export function patientQueryOf(original: string): string | null {
  const take = (first: string | undefined, second: string | undefined): string | null => {
    const words: string[] = [];
    for (const word of [first, second]) {
      if (!word || NOT_A_NAME.has(norm(word)) || /\d/.test(word)) break;
      words.push(word);
    }
    return words.length ? words.join(' ') : null;
  };
  const titled = new RegExp(
    `\\b(?:paziente|ospite|signor[ae]?|sig\\.?(?:ra)?)\\s+(${WORD})(?:\\s+(${WORD}))?`,
    'i',
  ).exec(original);
  if (titled) return take(titled[1], titled[2]);
  const prep = new RegExp(`\\b(?:di|del|della|per|a|al|alla)\\s+(${CAP})(?:\\s+(${CAP}))?`).exec(
    original,
  );
  return prep ? take(prep[1], prep[2]) : null;
}

export interface ParameterPlanContext {
  currentPatientId?: string;
}

/** Parser PURO: riconosce il comando o restituisce null (decide un altro planner). */
export function matchParameterCommand(
  transcript: string,
  ctx: ParameterPlanContext = {},
  opts: { genId?: () => string } = {},
): ActionPlan | null {
  const original = (transcript || '').trim();
  const q = norm(original);
  if (!VERB.test(q) || OTHER_ACTION.test(q)) return null;
  const parsed = parseDictatedParameters(original);
  const claims =
    parsed.mentioned.length >= 2 || parsed.mentioned.some((k) => ONLY_HERE.includes(k));
  if (!claims) return null;

  const plan: ActionPlan = {
    actionType: 'create_parameter_reading',
    patientId: ctx.currentPatientId ?? null,
    targetRecordId: null,
    fields: { values: parsed.values, notes: parsed.notes },
    sourceTranscript: original,
    ambiguities: [...parsed.problems],
    requiresConfirmation: isWriteAction('create_parameter_reading'),
    idempotencyKey: (opts.genId ?? randomUUID)(),
  };
  if (!Object.keys(parsed.values).length && !parsed.problems.length)
    plan.ambiguities.push('Nessun valore riconosciuto');
  const t = parseSpokenTime(original);
  if (t.has)
    plan.fields.timeHHMM = `${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')}`;
  const patientQuery = patientQueryOf(original);
  if (patientQuery) {
    plan.fields.patientQuery = patientQuery;
    plan.patientId = null; // risolto dal grounding sul nome indicato
  } else if (!ctx.currentPatientId) plan.ambiguities.push('Paziente non identificato con certezza');
  return plan;
}

// ── grounding (ricerca paziente e orario, iniettabili) ───────────────────────────────────────

export interface ParameterLookupDeps {
  searchPatients?: (query: string) => Promise<PatientHit[]>;
  getPatient?: (id: string) => Promise<PatientHit | null>;
}
const displayName = (p: PatientHit) => `${p.lastName} ${p.firstName}`.trim();
/** Tolleranza sull'orologio di chi detta: oltre, l'orario è nel futuro. */
const FUTURE_SLACK_MS = 5 * 60_000;

/**
 * Risolve paziente e orario e costruisce l'anteprima. MODIFICA il piano (patientId, measuredAt,
 * ambiguità bloccanti). Usata allo stesso modo in anteprima e in esecuzione (riverifica lato server).
 */
export async function groundParameterPlan(
  plan: ActionPlan,
  deps: ParameterLookupDeps = {},
  permittedPatientIds: string[] | null = null,
  now: Date = new Date(),
): Promise<{ plan: ActionPlan; preview: ActionPreview }> {
  const searchPatients =
    deps.searchPatients ?? ((query: string) => defaultSearchPatients(query, permittedPatientIds));
  const getPatient =
    deps.getPatient ?? ((id: string) => defaultGetPatient(id, permittedPatientIds));

  let patientName: string | undefined;
  const query = typeof plan.fields.patientQuery === 'string' ? plan.fields.patientQuery : undefined;
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

  const hhmm = typeof plan.fields.timeHHMM === 'string' ? plan.fields.timeHHMM : undefined;
  let when = 'adesso (ora della conferma)';
  if (hhmm) {
    const instant = romeInstant(romeParts(now).date, hhmm);
    if (instant.getTime() > now.getTime() + FUTURE_SLACK_MS)
      plan.ambiguities.push(
        `Orario ${hhmm} nel futuro: per una rilevazione di ieri usa la pagina Parametri`,
      );
    else plan.fields.measuredAt = instant.toISOString();
    when = `oggi alle ${hhmm}`;
  } else {
    const instant = new Date(now);
    instant.setUTCMilliseconds(0);
    plan.fields.measuredAt = instant.toISOString();
  }

  return { plan, preview: buildParameterPreview(plan, patientName, when) };
}

/** Anteprima leggibile: un rigo per valore, orario esplicito, dove finisce la scrittura. */
export function buildParameterPreview(
  plan: ActionPlan,
  patientName?: string,
  when = 'adesso (ora della conferma)',
): ActionPreview {
  const values = (plan.fields.values ?? {}) as Partial<Record<DictationKey, string>>;
  const lines = DICTATION_KEYS.filter((k) => values[k] !== undefined).map((k) => ({
    label: DICTATION_LABELS[k],
    value: shownValue(k, String(values[k])),
  }));
  return {
    actionType: plan.actionType,
    patientId: plan.patientId,
    patientName,
    title: 'Registra parametri',
    lines: [
      ...lines,
      { label: 'Orario', value: when },
      { label: 'Dove', value: 'Pagina Parametri del paziente' },
    ],
    ambiguities: plan.ambiguities,
    canExecute: plan.ambiguities.length === 0 && !!plan.patientId && lines.length > 0,
    warnings: Array.isArray(plan.fields.notes) ? (plan.fields.notes as string[]) : [],
  };
}
