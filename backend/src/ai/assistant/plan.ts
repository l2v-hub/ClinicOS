// REQ-040: deterministic query planner for the ClinicOS assistant. Maps a natural-language question
// to a typed QueryPlan over the REQ-039 Data Gateway tools. Pure + testable. No model, no web, no
// clinical inference. (A model-based NL layer can produce the same QueryPlan later; the executor and
// SOURCE_ONLY contract stay identical.)

export type AssistantIntent =
  | 'allergies' | 'therapies' | 'vitals_range' | 'vitals_recent' | 'narrative_search'
  | 'document_search' | 'timeline' | 'appointments' | 'correlate' | 'patient_search'
  | 'refuse_clinical' | 'data_query' | 'unknown'
  // Agnos KB (Task 5): 8 nuovi intent di lettura + 'clarify' (predisposto per Task 6).
  | 'vitals_compare' | 'vitals_trend' | 'rooms_occupancy' | 'rooms_occupants' | 'consegne'
  | 'diary_notes' | 'clinical_scores' | 'operators_on_duty' | 'clarify';

export type QueryScope = 'current_patient' | 'cross_patient';

export interface PlannedToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface QueryPlan {
  intent: AssistantIntent;
  scope: QueryScope;
  tools: PlannedToolCall[];
  requiresCrossPatientAccess: boolean;
  /** Why the assistant refuses (clinical advice) — set only for refuse_clinical. */
  refusalReason?: string;
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Requests for clinical judgement are refused outright (no diagnosis/therapy/prognosis/triage).
const CLINICAL_REFUSAL = [
  /\bsuggerisci\b/, /\bconsiglia\b/, /che (terapia|cura|farmaco) (dovrei|devo|si dovrebbe)/,
  /\bdiagnosi\b.*\?/, /che (diagnosi|malattia|patologia)/, /\bprognosi\b/, /\bcausa\b.*\bmalattia\b/,
  /quale paziente e (piu|più) grave/, /\bpiu grave\b/, /\bpiù grave\b/, /stabilisci.*priorita/,
  /interpreta.*valori/, /e (grave|preoccupante)\b/,
];

const SECTION_HINTS: Array<{ re: RegExp; key: string }> = [
  { re: /anamnes/, key: 'ANAMNESIS' },
  { re: /decorso/, key: 'HOSPITAL_COURSE' },
  { re: /consulenz/, key: 'CONSULTATIONS' },
  { re: /diagnostica|imaging|radiolog|ecograf/, key: 'IMAGING_DIAGNOSTICS' },
  { re: /prestazion|intervent|procedur/, key: 'PROCEDURES_AND_INTERVENTIONS' },
  { re: /terapia/, key: 'THERAPY' },
  { re: /consigli|controlli|follow/, key: 'ADVICE_AND_FOLLOW_UP' },
  { re: /allerg/, key: 'ALLERGIES' },
];

function sectionKeyFor(q: string): string | undefined {
  for (const s of SECTION_HINTS) if (s.re.test(q)) return s.key;
  return undefined;
}

/** Extract a quoted phrase or the words after "cerca/trova … '<phrase>'". */
function searchPhrase(q: string, original: string): string | undefined {
  const quoted = /["“”']([^"“”']{2,})["“”']/.exec(original);
  if (quoted) return quoted[1].trim();
  const after = /(?:cerca|trova|frase|contien\w*)\s+(.{3,})/.exec(q);
  return after ? after[1].replace(/[?.!]+$/, '').trim() : undefined;
}

export interface PlanContext {
  /** The patient currently open in the UI, if any (default scope on the patient page). */
  currentPatientId?: string;
}

/** Produce a typed, validated plan for a question. Never executes anything. */
export function planQuery(question: string, ctx: PlanContext = {}): QueryPlan {
  const original = question || '';
  const q = norm(original);
  const onPatient = !!ctx.currentPatientId;
  const scope: QueryScope = onPatient && !/\b(pazienti|chiunque|chi assume|tutti i pazienti|across)\b/.test(q)
    ? 'current_patient' : 'cross_patient';
  const base = (intent: AssistantIntent, tools: PlannedToolCall[], requiresCross = false, refusalReason?: string): QueryPlan =>
    ({ intent, scope, tools, requiresCrossPatientAccess: requiresCross, refusalReason });

  if (CLINICAL_REFUSAL.some((re) => re.test(q))) {
    return base('refuse_clinical', [], false, 'clinical_advice_not_allowed');
  }

  const pid = ctx.currentPatientId;
  // ── current-patient retrieval intents (need a patient in context) ──
  if (scope === 'current_patient' && pid) {
    if (/\ballerg/.test(q)) return base('allergies', [{ tool: 'get_patient_allergies', args: { patientId: pid } }]);
    if (/(parametri|pressione|pa\b|frequenza|spo2|temperatura).*(ultim|7|sette|giorni|recenti)/.test(q) || /ultimi parametri/.test(q))
      return base('vitals_recent', [{ tool: 'get_patient_vital_signs', args: { patientId: pid } }]);
    const sysGt = /(pressione|sistolic|pa).*?(\d{2,3})/.exec(q);
    if (/pression|sistolic/.test(q) && sysGt) return base('vitals_range', [{ tool: 'get_patient_vital_signs', args: { patientId: pid, label: 'PA', systolicMin: parseInt(sysGt[2], 10) + 1 } }]);
    if (/timeline|sequenza temporale|cronologia/.test(q)) return base('timeline', [{ tool: 'get_patient_timeline', args: { patientId: pid } }]);
    if (/appuntament\w*|agenda/.test(q)) return base('appointments', [{ tool: 'get_patient_appointments', args: { patientId: pid } }]);
    // 016 F0: plurali/sinonimi (terapia/terapie/farmaco/farmaci/prescriz…)
    if (/terapi\w*|farmac\w*|prescriz\w*/.test(q)) return base('therapies', [{ tool: 'get_patient_therapies', args: { patientId: pid } }]);
    // Agnos KB (Task 5): confronti/andamento parametri, diario, scale cliniche, consegne del
    // paziente in contesto — PRIMA del match generico cerca|trova.
    if (/(rispetto a|confronta.*con|vs\.?)\s*(ieri|luned|marted|mercoled|gioved|venerd|sabato|domenica|\d{4}-\d{2}-\d{2})/.test(q)
        && /(pression|pa\b|frequenza|fc\b|temperatura|spo2|satur)/.test(q))
      return base('vitals_compare', [{ tool: 'compare_patient_vitals', args: { patientId: pid, label: vitalLabel(q), dayB: refDay(q) } }]);
    if (/(andamento|trend|ultim[ai] (7|sette) giorni|questa settimana)/.test(q) && /(pression|pa\b|frequenza|fc\b|temperatura|spo2|satur|parametr)/.test(q))
      return base('vitals_trend', [{ tool: 'get_patient_vitals_trend', args: { patientId: pid, label: vitalLabel(q) } }]);
    if (/\bdiario\b|\bnote\b.*\bscritt/.test(q) || /cosa .*scritto/.test(q))
      return base('diary_notes', [{ tool: 'get_patient_diary', args: { patientId: pid, ...dayWindow(q) } }]);
    if (/braden|tinetti|nrs|medicazion|contenzion|scala|punteggio/.test(q))
      return base('clinical_scores', [{ tool: 'get_clinical_scores', args: { patientId: pid, scale: scaleKey(q) } }]);
    if (/\bconsegn/.test(q))
      return base('consegne', [{ tool: 'get_consegne', args: { patientId: pid } }]);

    const sec = sectionKeyFor(q);
    if (/cerca|trova|consulenz|anamnes|decorso|documenti|sezione/.test(q)) {
      const phrase = searchPhrase(q, original);
      if (/documenti?/.test(q)) return base('document_search', [{ tool: 'search_documents', args: { patientId: pid, query: phrase ?? '' } }]);
      return base('narrative_search', [{ tool: 'search_clinical_sections', args: { patientId: pid, sectionKey: sec, query: phrase ?? sec ?? '' } }]);
    }
  }

  // ── cross / organizzativi (Agnos KB Task 5): camere, consegne senza paziente, turni ──
  const roomNum = /camera\s*(\d+)/.exec(q)?.[1];
  if (roomNum && /(occupat|da chi|chi c'?e)/.test(q))
    return base('rooms_occupants', [{ tool: 'query_room_occupants', args: { roomNumero: roomNum } }]);
  if (/(camere?|stanze?|letti?).*(occupat|liber|disponibil|manutenzione)|occupazione.*(camere?|stanze?|letti?)/.test(q))
    return base('rooms_occupancy', [{ tool: 'query_rooms_occupancy', args: {} }]);
  if (/\bconsegn/.test(q))
    return base('consegne', [{ tool: 'get_consegne', args: { day: todayStrPlan() } }]);
  if (/(chi e|chi è) di turno|turni (di )?oggi|operatori disponibili/.test(q))
    return base('operators_on_duty', [{ tool: 'query_operators', args: {} }]);

  // ── cross-patient intents (role + env gated downstream) ──
  if (/valori? pressori? (superior|maggior|sopra).*?(\d{2,3})/.test(q) || /pressione.*(superiore a|>)\s*(\d{2,3})/.test(q)) {
    const m = /(\d{2,3})/.exec(q); const min = m ? parseInt(m[1], 10) + 1 : 151;
    return base('correlate', [{ tool: 'search_across_patients', args: { systolicMin: min } }], true);
  }
  if (/quali pazienti|chi assume|chi ha\b|pazienti con/.test(q)) {
    const allergy = /allerg\w*\s+(?:a|al|alla|alle|ai)?\s*([a-zàèéìòù]+)/.exec(q)?.[1];
    return base('correlate', [{ tool: 'correlate_structured_data', args: { allergy } }], true);
  }
  if (/appuntamenti (di )?oggi|agenda oggi/.test(q)) return base('appointments', [{ tool: 'query_appointments_today', args: {} }], true);
  if (/cerca|trova/.test(q)) {
    const phrase = searchPhrase(q, original);
    if (/documenti?/.test(q)) return base('document_search', [{ tool: 'search_documents', args: { query: phrase ?? '' } }], true);
    return base('narrative_search', [{ tool: 'search_across_patients', args: { query: phrase ?? '' } }], true);
  }
  if (/paziente|cerca paziente|trova paziente/.test(q)) return base('patient_search', [{ tool: 'search_patients', args: { query: original.trim() } }], true);

  return base('unknown', []);
}

// 016 F0: risoluzione del paziente nominato nel testo. Il planner resta puro; la risoluzione
// nome→id (che richiede il DB) è fatta da service.ts, che usa questo estrattore.
// Parole capitalizzate note che NON sono nomi di paziente (evita falsi positivi a fine frase).
const NAME_STOPWORDS = new Set([
  'PA', 'SpO2', 'TC', 'FC', 'DTX', 'RX', 'TAC', 'RMN', 'ECG', 'PS', 'MRN',
]);

/**
 * Estrae un nome paziente dalla domanda, se presente. Due euristiche:
 *  1) dopo una preposizione esplicita: «…di/del/della/dei/per/al paziente <Nome [Cognome]>»
 *  2) uno o due token capitalizzati in coda (non iniziali di frase), es. «…assume Rossi».
 * Ritorna null quando nessun paziente è nominato (nessuna invenzione).
 */
export function extractPatientName(question: string): string | null {
  const text = (question || '').trim();
  if (!text) return null;
  const NAME = "[A-ZÀ-Þ][a-zà-ÿ']+(?:\\s+[A-ZÀ-Þ][a-zà-ÿ']+)?";

  const prep = new RegExp(`\\b(?:di|del|della|dei|delle|per|al|allo|alla|paziente)\\s+(${NAME})`).exec(text);
  if (prep) return prep[1].trim();

  // token capitalizzati in coda, ma non se sono la prima parola della frase (verbo iniziale).
  const trailing = new RegExp(`(?:\\s)(${NAME})\\s*[?.!]*$`).exec(text);
  if (trailing) {
    const cand = trailing[1].trim();
    if (!NAME_STOPWORDS.has(cand.split(/\s+/)[0])) return cand;
  }
  return null;
}

/** Decide l'esito della risoluzione a partire dai risultati di ricerca pazienti (puro).
 *  Univoco ⇒ { patientId }; nessuno ⇒ 'none'; più di uno ⇒ 'ambiguous' (nessuna scelta arbitraria). */
export function pickResolvedPatient(
  matches: Array<{ patientId: string }>,
): { patientId: string } | 'none' | 'ambiguous' {
  if (matches.length === 0) return 'none';
  if (matches.length > 1) return 'ambiguous';
  return { patientId: matches[0].patientId };
}

// ── Agnos KB (Task 5): helper puri per i nuovi intent — nessun accesso a rete/DB, solo testo. ──

/** Mappa la parola-chiave di parametro vitale nella domanda alla label canonica della cartella. */
function vitalLabel(q: string): string {
  if (/pression/.test(q)) return 'PA';
  if (/frequenza|fc\b/.test(q)) return 'FC';
  if (/temperatura/.test(q)) return 'TC';
  if (/spo2|satur/.test(q)) return 'SPO2';
  return 'PA';
}

/** Giorno di riferimento per il confronto (dayB): 'ieri'/giorno della settimana → sentinella
 *  'yesterday' risolta dal dispatch (service.ts); una data esplicita AAAA-MM-GG è usata com'è. */
function refDay(q: string): string {
  const explicit = /\d{4}-\d{2}-\d{2}/.exec(q);
  return explicit ? explicit[0] : 'yesterday';
}

/** Finestra temporale per la ricerca nel diario: 'ieri' → il giorno prima; default ultimi 3 giorni. */
function dayWindow(q: string): { from?: string; to?: string } {
  const toDay = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  if (/\bieri\b/.test(q)) {
    const y = new Date(today.getTime() - 86400000);
    const d = toDay(y);
    return { from: `${d}T00:00:00.000Z`, to: `${d}T23:59:59.999Z` };
  }
  const from = new Date(today.getTime() - 2 * 86400000);
  return { from: `${toDay(from)}T00:00:00.000Z`, to: `${toDay(today)}T23:59:59.999Z` };
}

/** Scala clinica citata nella domanda, se riconoscibile (nessuna invenzione: undefined altrimenti). */
function scaleKey(q: string): 'braden' | 'tinetti' | 'nrs' | 'medicazioni' | 'contenzioni' | undefined {
  if (/braden/.test(q)) return 'braden';
  if (/tinetti/.test(q)) return 'tinetti';
  if (/\bnrs\b/.test(q)) return 'nrs';
  if (/medicazion/.test(q)) return 'medicazioni';
  if (/contenzion/.test(q)) return 'contenzioni';
  return undefined;
}

/** Data odierna AAAA-MM-GG (server-local), per i tool organizzativi senza paziente in contesto. */
function todayStrPlan(): string {
  return new Date().toISOString().slice(0, 10);
}
