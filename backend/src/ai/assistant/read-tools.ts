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
  'query_data',
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
    args: { patientId: 'string', label: 'string?', systolicMin: 'number?' },
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
  // 016 F3: motore di query componibile — porta un piano DSL in args.plan (validato server-side).
  { name: 'query_data', args: { plan: 'object' } },
];
