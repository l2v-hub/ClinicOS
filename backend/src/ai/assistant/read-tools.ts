// 016 F1: allowlist esplicita dei tool di SOLA LETTURA che l'executor del gateway sa eseguire
// (deny-by-default). È lo schema esposto al planner LLM e il filtro di validazione del suo output:
// un piano che nomina un tool non presente qui viene scartato (→ fallback deterministico).
// Nessun tool di scrittura/cancellazione è rappresentato: l'LLM non può proporne uno eseguibile.

export const READ_TOOLS = [
  'get_patient_allergies',
  'get_patient_therapies',
  'get_patient_vital_signs',
  'get_patient_timeline',
  'get_patient_appointments',
  'search_clinical_sections',
  'search_documents',
  'search_patients',
  'search_across_patients',
  'correlate_structured_data',
  'query_appointments_today',
  'query_staff_list',
  'query_data',
  'get_facility_snapshot',
  'get_operator_queue',
  'query_rooms_occupancy',
  // Milo fase 1 (docs/architecture/milo-ai-first.md)
  'get_patient_parameters',
  'get_patient_news2',
  'get_patient_diary',
  'get_patient_assessments',
  'get_patient_administrations',
  'query_staff_shifts',
  'query_agenda',
] as const;

export type ReadTool = (typeof READ_TOOLS)[number];

const READ_SET = new Set<string>(READ_TOOLS);

/** True solo per i tool di lettura in allowlist. Deny-by-default per tutto il resto. */
export function isReadTool(name: string): name is ReadTool {
  return READ_SET.has(name);
}

/** Schema minimale dei tool esposto al planner LLM (nome + argomenti attesi). */
export const READ_TOOL_SCHEMA: Array<{ name: string; args: Record<string, string> }> = [
  { name: 'get_patient_allergies', args: { patientId: 'string' } },
  { name: 'get_patient_therapies', args: { patientId: 'string' } },
  {
    name: 'get_patient_vital_signs',
    args: { patientId: 'string', label: 'string?', systolicMin: 'number?', days: 'number?' },
  },
  { name: 'get_patient_timeline', args: { patientId: 'string' } },
  { name: 'get_patient_appointments', args: { patientId: 'string' } },
  {
    name: 'search_clinical_sections',
    args: { patientId: 'string', sectionKey: 'string?', query: 'string' },
  },
  { name: 'search_documents', args: { patientId: 'string?', query: 'string' } },
  { name: 'search_patients', args: { query: 'string' } },
  { name: 'search_across_patients', args: { query: 'string?', systolicMin: 'number?' } },
  { name: 'correlate_structured_data', args: { allergy: 'string?' } },
  { name: 'query_appointments_today', args: {} },
  // Fase 1b: elenco del personale (nome/ruolo/reparto/qualifica) — dato organizzativo, mai clinico.
  { name: 'query_staff_list', args: {} },
  // 016 F3: motore di query componibile — porta un piano DSL in args.plan (validato server-side).
  { name: 'query_data', args: { plan: 'object' } },
  // Istantanea della struttura: occupazione + terapie in ritardo + consegne scadute + appuntamenti
  // di oggi in una sola lettura aggregata. Nessun argomento: nulla di ciò che decide il perimetro
  // della lettura arriva dal modello.
  { name: 'get_facility_snapshot', args: {} },
  // Coda di lavoro dell'operatore chiamante. Nessun argomento: l'identità dell'operatore è presa
  // dal contesto server, MAI da un argomento proposto dal modello.
  { name: 'get_operator_queue', args: {} },
  // Occupazione aggregata di camere e letti (solo conteggi, nessun paziente).
  { name: 'query_rooms_occupancy', args: {} },
  // Milo fase 1. Parametri da entrambi gli archivi con serie e aggregati per giorno;
  // params ⊂ pa, fc, spo2, temperatura, fr, dtx, peso. Periodo: days (1–90) oppure from/to YYYY-MM-DD.
  {
    name: 'get_patient_parameters',
    args: {
      patientId: 'string',
      days: 'number?',
      from: 'string?',
      to: 'string?',
      params: 'string[]?',
    },
  },
  // NEWS2 calcolato dal backend (RCP 2017) sulle rilevazioni complete: mai calcolato dal modello.
  { name: 'get_patient_news2', args: { patientId: 'string', days: 'number?' } },
  {
    name: 'get_patient_diary',
    args: { patientId: 'string', days: 'number?', authorType: 'string?' },
  },
  // Scale finalizzate: painad, tinetti, mna, gds15, transfers.
  {
    name: 'get_patient_assessments',
    args: { patientId: 'string', type: 'string?', days: 'number?' },
  },
  { name: 'get_patient_administrations', args: { patientId: 'string', days: 'number?' } },
  // Turni del personale in un giorno (YYYY-MM-DD) o nella settimana; ruolo es. "medico", "infermiere".
  { name: 'query_staff_shifts', args: { date: 'string?', ruolo: 'string?' } },
  // Agenda della struttura in un periodo (max 31 giorni); ruolo dell'operatore, es. "medico".
  { name: 'query_agenda', args: { from: 'string?', to: 'string?', ruolo: 'string?' } },
];
