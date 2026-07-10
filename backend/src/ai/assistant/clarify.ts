// Agnos KB (Task 6): esito `clarify` — quando la domanda non è stata capita (intent unknown o
// nessun risultato senza rifiuto), l'assistente propone chip cliccabili da un catalogo STATICO di
// template invece di indovinare una risposta o tornare un "non trovato" muto (spec §3b,
// anti-allucinazione strutturale). Ogni voce del catalogo corrisponde 1:1 a un intent già eseguibile
// dal planner (plan.ts) — nessun testo libero: il chip è sempre eseguibile per costruzione.
export interface ClarifyCtx { currentPatientId?: string; currentPatientName?: string; roles: string[] }

const WITH_PATIENT = (nome: string) => [
  `Ultimi parametri di ${nome}`,                 // vitals_recent
  `Confronta la pressione di ${nome} con ieri`,  // vitals_compare
  `Terapie attive di ${nome}`,                   // therapies
  `Consegne per ${nome}`,                        // consegne
];
// 2026-07-10 decision: operators_on_duty ("Chi è di turno oggi?") is organizational data, not
// clinical/PHI — available to both roles (gate admin-only removed from queryOperators). The old
// 'Appuntamenti di oggi' chip routed to query_appointments_today, which always sets
// requiresCrossPatientAccess:true — a role header is untrusted, so operators were always refused
// (spec §3 invariant violated: every chip must be executable). Replaced with a chip that resolves
// to operators_on_duty, which carries no cross-patient flag.
const GENERIC_OPERATOR = [
  'Quante camere sono occupate?',                // rooms_occupancy
  'Consegne di oggi',                            // consegne
  'Chi è di turno oggi?',                        // operators_on_duty
];
const GENERIC_ADMIN = [
  'Quante camere sono occupate?',                // rooms_occupancy
  'La camera 12 è occupata da chi?',             // rooms_occupants
  'Chi è di turno oggi?',                        // operators_on_duty
  'Consegne di oggi',                            // consegne
];

export function suggestFor(ctx: ClarifyCtx): string[] {
  if (ctx.currentPatientId && ctx.currentPatientName) return WITH_PATIENT(ctx.currentPatientName);
  return (ctx.roles.includes('admin') ? GENERIC_ADMIN : GENERIC_OPERATOR).slice(0, 4);
}
