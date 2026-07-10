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
const GENERIC_OPERATOR = [
  'Quante camere sono occupate?',                // rooms_occupancy
  'Consegne di oggi',                            // consegne
  'Appuntamenti di oggi',                        // appointments
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
