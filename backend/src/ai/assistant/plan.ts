// REQ-040: deterministic query planner for the ClinicOS assistant. Maps a natural-language question
// to a typed QueryPlan over the REQ-039 Data Gateway tools. Pure + testable. No model, no web, no
// clinical inference. (A model-based NL layer can produce the same QueryPlan later; the executor and
// SOURCE_ONLY contract stay identical.)

export type AssistantIntent =
  | 'allergies' | 'therapies' | 'vitals_range' | 'vitals_recent' | 'narrative_search'
  | 'document_search' | 'timeline' | 'appointments' | 'correlate' | 'patient_search'
  | 'refuse_clinical' | 'unknown';

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
    if (/appuntament|agenda/.test(q)) return base('appointments', [{ tool: 'get_patient_appointments', args: { patientId: pid } }]);
    if (/terapia|farmac/.test(q)) return base('therapies', [{ tool: 'get_patient_therapies', args: { patientId: pid } }]);
    const sec = sectionKeyFor(q);
    if (/cerca|trova|consulenz|anamnes|decorso|documenti|sezione/.test(q)) {
      const phrase = searchPhrase(q, original);
      if (/documenti?/.test(q)) return base('document_search', [{ tool: 'search_documents', args: { patientId: pid, query: phrase ?? '' } }]);
      return base('narrative_search', [{ tool: 'search_clinical_sections', args: { patientId: pid, sectionKey: sec, query: phrase ?? sec ?? '' } }]);
    }
  }

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
