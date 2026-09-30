// Skill Catalog of record (Phase 3, extended in Phase 4). Every skill is a COMPOSITION of Tool
// Layer tools that exist in backend/src/tools (checked by skills-unit.test.ts); none adds business
// logic. `.ai-architecture/phase-3-skills/SKILL_CATALOG.json` is generated from this file by
// scripts/ai-architecture/build-skill-catalog.ts.
//
// Order matters for the deterministic interpreter: the first skill whose keywords match wins, so
// writes ("registra", "aggiungi") come before the reads that share their nouns.

import type { SkillDefinition } from './types.js';

const CARE_AND_SUPERVISION = ['doctor', 'nurse', 'oss', 'supervisor'] as const;

const PATIENT_AMBIGUITY =
  'Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.';

export const SKILL_CATALOG: readonly SkillDefinition[] = [
  // ── Clinical / documentation writes (preview + explicit confirmation) ─────────────────────
  {
    id: 'vitals.record',
    name: 'Registra parametri vitali',
    description:
      'Registra una rilevazione di parametri vitali (pressione, SpO2, frequenza cardiaca, temperatura, frequenza respiratoria, glicemia/DTX, ossigeno, coscienza) per un ospite.',
    category: 'clinical',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['patients.search', 'parameters.create_reading'],
    optionalTools: ['parameters.list_readings'],
    slots: ['patient', 'values'],
    output: 'Rilevazione salvata (id, orario) e verificata rileggendo le rilevazioni del giorno.',
    steps: [
      'identify_patient: patients.search | contesto pagina + resident access scope',
      'collect_values: slot values (validazione con parseParameterReading, la stessa del servizio)',
      'preview: ospite, valori, orario, autore, origine AI',
      'confirm: evento UI esplicito legato al previewId',
      'execute: parameters.create_reading (requestId stabile → retry senza duplicati)',
      'verify: parameters.list_readings (se disponibile)',
      'audit: skill:vitals.record:* + tool:parameters.create_reading',
    ],
    kind: 'write',
    confirmation: 'SENSITIVE_WRITE',
    sensitivity: 'high',
    ambiguity:
      PATIENT_AMBIGUITY + ' Valori mancanti o non validi → NEEDS_CLARIFICATION sui valori.',
    failure:
      'Errore di validazione/servizio → FAILED con il messaggio del backend; retry riusa lo stesso requestId (dedupe del servizio).',
    audit:
      'request, proposal (preview id, nomi dei campi), confirmation, execute + evento del tool.',
    executable: true,
    classicScreen: { screen: 'parametri-multipaziente', label: 'Parametri' },
    starters: {
      withResident: 'Registra i parametri di questo ospite',
      general: 'Registra i parametri di un ospite',
    },
    keywords: [
      /\b(registra|inserisci|aggiungi|annota|salva|segna)\b.*\b(parametr|pressione|pa\b|saturazion|spo2|temperatur|temp\b|febbre|frequenza|fc\b|fr\b|polso|glicemi|dtx|ossigeno)/i,
      /\b(pressione|pa)\s*\d{2,3}\s*\/\s*\d{2,3}/i,
    ],
  },
  {
    id: 'diary.add_observation',
    name: 'Aggiungi osservazione al diario',
    description:
      "Aggiunge un'osservazione (nota di diario clinico-assistenziale) alla cartella di un ospite, attribuita all'operatore corrente.",
    category: 'clinical',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['patients.search', 'diary.create'],
    optionalTools: ['diary.list'],
    slots: ['patient', 'text'],
    output: 'Voce di diario creata (id, autore risolto dal server).',
    steps: [
      'identify_patient: patients.search | contesto pagina + resident access scope',
      'collect_text: slot text (testo integrale, mai riscritto)',
      'preview: ospite, testo, data, autore, origine AI',
      'confirm: evento UI esplicito legato al previewId',
      'execute: diary.create (una sola esecuzione per workflow: il tool non è idempotente)',
      'audit',
    ],
    kind: 'write',
    confirmation: 'SENSITIVE_WRITE',
    sensitivity: 'high',
    ambiguity: PATIENT_AMBIGUITY,
    failure:
      'diary.create non è idempotente: il workflow blocca una seconda esecuzione; dopo un esito incerto non ritenta da solo.',
    audit: 'request, proposal, confirmation, execute + tool:diary.create.',
    executable: true,
    classicScreen: {
      screen: 'dettaglio-paziente',
      label: 'Cartella → Diario',
      needsResident: true,
    },
    starters: { withResident: 'Aggiungi un’osservazione nel diario di questo ospite' },
    keywords: [
      /\b(aggiungi|registra|scrivi|annota|inserisci|metti)\b.*\b(osservazion|nota|diario|annotazion)/i,
    ],
  },
  {
    id: 'handover.create',
    name: 'Crea consegna',
    description:
      'Crea una consegna (passaggio di informazioni al turno) riferita a un ospite. Priorità normale e tipo «Assistente AI» di default; l’urgenza viene solo segnalata.',
    category: 'operational',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['patients.search', 'consegne.create'],
    optionalTools: [],
    slots: ['patient', 'text'],
    output: 'Consegna creata (id, priorità, tipo Assistente AI).',
    steps: [
      'identify_patient + resident access scope',
      'collect_text',
      'preview: ospite, testo, priorità normale, tipo Assistente AI, avviso se il testo sembra urgente',
      'modify (facoltativo): cambio priorità esplicito → nuova anteprima',
      'confirm: evento UI esplicito legato al previewId',
      'execute: consegne.create (requestId stabile)',
      'audit',
    ],
    kind: 'write',
    confirmation: 'LOW_RISK_WRITE',
    sensitivity: 'medium',
    ambiguity: PATIENT_AMBIGUITY,
    failure: 'FAILED con il messaggio del backend; retry idempotente sul requestId.',
    audit: 'request, proposal, confirmation, execute + tool:consegne.create.',
    executable: true,
    classicScreen: { screen: 'consegne', label: 'Consegne' },
    starters: { withResident: 'Crea una consegna per questo ospite' },
    keywords: [/\b(crea|aggiungi|registra|lascia|scrivi|nuova)\b.*\bconsegn/i],
  },
  // ── HIGH_RISK: prepared by the assistant, confirmed ONLY by the professional (UI event) ──
  {
    id: 'therapy.prescribe',
    name: 'Prepara prescrizione',
    description:
      'Prepara una nuova prescrizione dal testo dettato (stesso interprete del Diario → Terapia): anteprima strutturata, poi SOLO il medico la conferma con il pulsante Conferma. L’assistente non conferma mai.',
    category: 'clinical',
    intendedRoles: ['doctor'],
    requiredTools: ['patients.search', 'diary.therapy_preview', 'diary.create_with_therapy'],
    optionalTools: [],
    slots: ['patient', 'text'],
    output: 'Voce di diario «terapia» + terapia collegata (ids), create dal medico.',
    steps: [
      'identify_patient + resident access scope',
      'prepare: diary.therapy_preview (regole + proposta AI solo sui campi vuoti)',
      'preview: farmaco, dosaggio, via, orari, date, avvisi; Conferma nascosta se mancano dati',
      'confirm: evento UI esplicito legato al previewId, con la terapia mappata dal form Terapia',
      'check: la terapia confermata corrisponde alla bozza (farmaco, orari, inizio)',
      'execute: diary.create_with_therapy (requestId stabile)',
      'audit',
    ],
    kind: 'write',
    confirmation: 'HIGH_RISK',
    sensitivity: 'critical',
    ambiguity:
      PATIENT_AMBIGUITY +
      ' Testo che indica sospensione/somministrazione/modifica → non è una prescrizione: rimando alla scheda Terapia.',
    failure:
      'Dati mancanti o conflitti di fascia → nessun pulsante Conferma, rimando alla scheda Terapia; errore del servizio → FAILED.',
    audit:
      'request, proposal (preview id), confirmation (preview id), execute + tool:diary.create_with_therapy.',
    customerValidation:
      'Prescrizione preparata dall’assistente e confermata dal medico: validare con il direttore sanitario prima dell’uso reale.',
    executable: true,
    classicScreen: {
      screen: 'dettaglio-paziente',
      label: 'Cartella → Terapia',
      needsResident: true,
    },
    starters: {
      withResident: 'Prepara una prescrizione per questo ospite',
      general: 'Prepara una prescrizione',
    },
    keywords: [/\b(prescriv|prescrizion|nuova terapia|imposta (una )?terapia)/i],
  },
  {
    id: 'administration.record',
    name: 'Registra somministrazione',
    description:
      'Prepara la registrazione di una somministrazione in attesa dell’ospite (giro terapia del giorno): anteprima, poi SOLO l’operatore autorizzato conferma con il pulsante Conferma dopo aver somministrato.',
    category: 'clinical',
    intendedRoles: ['nurse', 'supervisor'],
    requiredTools: ['patients.search', 'administration.list_slots', 'administration.confirm'],
    optionalTools: [],
    slots: ['patient', 'administration'],
    optionalSlots: ['date'],
    output: 'Somministrazione registrata (terapia, fascia, data) dall’operatore autenticato.',
    steps: [
      'identify_patient + resident access scope',
      'read: administration.list_slots (oggi) → somministrazioni in attesa dell’ospite',
      'choose: una sola → selezionata; più → scelta esplicita',
      'preview: farmaco, dose, via, fascia/ora, data, avviso «conferma solo dopo la somministrazione»',
      'confirm: evento UI esplicito legato al previewId',
      'execute: administration.confirm',
      'audit',
    ],
    kind: 'action',
    confirmation: 'HIGH_RISK',
    sensitivity: 'critical',
    ambiguity:
      PATIENT_AMBIGUITY + ' Più somministrazioni in attesa → scelta esplicita tra i candidati.',
    failure:
      'Nessuna somministrazione in attesa → nessuna scrittura; errore del servizio → FAILED.',
    audit:
      'request, proposal (preview id), confirmation (preview id), execute + tool:administration.confirm.',
    customerValidation:
      'Doppio controllo / identificazione dell’ospite al letto: da definire con il cliente prima dell’uso in reparto.',
    executable: true,
    classicScreen: { screen: 'terapie', label: 'Terapia → somministrazioni' },
    starters: { withResident: 'Registra una somministrazione per questo ospite' },
    keywords: [
      /\b(registra|segna|conferma)\b.*\bsomministrazion|\bsomministrat[oa]\b|non somministrat/i,
    ],
  },
  // ── Query / knowledge (READ) ──────────────────────────────────────────────────────────────
  {
    id: 'vitals.recent',
    name: 'Parametri recenti',
    description: 'Mostra le ultime rilevazioni dei parametri vitali di un ospite.',
    category: 'query',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['patients.search', 'parameters.list_readings'],
    optionalTools: [],
    slots: ['patient'],
    output: 'Ultime rilevazioni (orario, valori).',
    steps: ['identify_patient', 'read: parameters.list_readings (limit 5)', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'high',
    ambiguity: PATIENT_AMBIGUITY,
    failure: 'Errore di lettura → FAILED con il messaggio del backend.',
    audit: 'request + tool:parameters.list_readings.',
    executable: true,
    classicScreen: { screen: 'parametri-multipaziente', label: 'Parametri' },
    starters: { withResident: 'Mostrami i parametri recenti di questo ospite' },
    keywords: [/\b(parametr|pressione|saturazion|temperatur|rilevazion|vital)/i],
  },
  {
    id: 'diary.recent',
    name: 'Diario recente',
    description: 'Mostra le ultime voci del diario di un ospite.',
    category: 'query',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['patients.search', 'diary.list'],
    optionalTools: [],
    slots: ['patient'],
    output: 'Ultime voci di diario (data, autore, testo breve).',
    steps: ['identify_patient', 'read: diary.list', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'high',
    ambiguity: PATIENT_AMBIGUITY,
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:diary.list.',
    executable: true,
    classicScreen: {
      screen: 'dettaglio-paziente',
      label: 'Cartella → Diario',
      needsResident: true,
    },
    starters: { withResident: 'Mostrami il diario di questo ospite' },
    keywords: [/\b(diario\b|osservazion|note\b)/i],
  },
  {
    id: 'patient.overview',
    name: 'Informazioni sull’ospite',
    description:
      'Mostra le informazioni disponibili su un ospite: stato ricovero, allergie, terapie, consegne aperte, ultimi parametri.',
    category: 'query',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['patients.search', 'patients.clinical_summary'],
    optionalTools: ['parameters.list_readings'],
    slots: ['patient'],
    output: 'Sintesi clinica + ultima rilevazione (se consentita).',
    steps: [
      'identify_patient',
      'read: patients.clinical_summary',
      'read (opzionale): parameters.list_readings',
      'answer',
    ],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'high',
    ambiguity: PATIENT_AMBIGUITY,
    failure: 'FAILED con il messaggio del backend; un tool opzionale negato riduce la risposta.',
    audit: 'request + tool:* invocati.',
    executable: true,
    classicScreen: { screen: 'dettaglio-paziente', label: 'Cartella ospite', needsResident: true },
    starters: { withResident: 'Dimmi tutto su questo ospite' },
    keywords: [
      /\b(informazion|scheda|riepilogo|sintesi|situazion|come sta\b|dimmi (tutto )?(su|di)\b)/i,
    ],
  },
  {
    id: 'clinical.question',
    name: 'Domanda sulla cartella',
    description:
      'Risponde a una domanda puntuale sulla cartella (allergie, terapie in corso, documenti) tramite l’assistente di sola lettura esistente.',
    category: 'query',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['assistant.query'],
    optionalTools: [],
    slots: ['query'],
    optionalSlots: ['patient'],
    output: 'Risposta dell’assistente di sola lettura con le fonti.',
    steps: ['read: assistant.query (domanda + ospite corrente)', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'high',
    ambiguity: 'L’assistente di lettura gestisce da sé ospiti ambigui (chiede di specificare).',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:assistant.query.',
    executable: true,
    classicScreen: { screen: 'dettaglio-paziente', label: 'Cartella ospite', needsResident: true },
    starters: { withResident: 'Quali allergie ha questo ospite?' },
    keywords: [
      /\b(allergi|intolleranz|quali terapie|terapie in corso|che farmaci prende|document)/i,
    ],
  },
  {
    id: 'therapy.due_administrations',
    name: 'Somministrazioni del giorno',
    description: 'Elenca le somministrazioni previste in una giornata (giro terapia).',
    category: 'operational',
    intendedRoles: ['doctor', 'nurse', 'supervisor'],
    requiredTools: ['administration.list_slots'],
    optionalTools: [],
    slots: [],
    optionalSlots: ['date'],
    output: 'Somministrazioni per fascia e stato.',
    steps: ['read: administration.list_slots (data, default oggi)', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'high',
    ambiguity: 'Data assente → oggi (fuso Europe/Rome).',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:administration.list_slots.',
    executable: true,
    classicScreen: { screen: 'terapie', label: 'Terapia' },
    starters: { general: 'Quali somministrazioni ci sono oggi?' },
    keywords: [/\b(somministrazion|giro (di )?terapi|terapie da (dare|fare|somministrare))/i],
  },
  {
    id: 'handover.overview',
    name: 'Situazione consegne',
    description: 'Riepilogo delle consegne aperte del reparto.',
    category: 'supervisory',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['consegne.overview'],
    optionalTools: [],
    slots: [],
    output: 'Conteggi e consegne aperte.',
    steps: ['read: consegne.overview', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'medium',
    ambiguity: 'Nessuna.',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:consegne.overview.',
    executable: true,
    classicScreen: { screen: 'consegne', label: 'Consegne' },
    starters: { general: 'Come sono le consegne?' },
    keywords: [/\bconsegn/i],
  },
  {
    id: 'appointments.day',
    name: 'Appuntamenti del giorno',
    description: 'Elenca gli appuntamenti di una giornata.',
    category: 'operational',
    intendedRoles: CARE_AND_SUPERVISION,
    requiredTools: ['appointments.list'],
    optionalTools: [],
    slots: [],
    optionalSlots: ['date'],
    output: 'Appuntamenti (ora, ospite, tipologia).',
    steps: ['read: appointments.list (data, default oggi)', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'medium',
    ambiguity: 'Data assente → oggi.',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:appointments.list.',
    executable: true,
    classicScreen: { screen: 'agenda-operatore', label: 'Agenda' },
    starters: { general: 'Appuntamenti di oggi' },
    keywords: [/\b(appuntament|agenda\b|visite\b)/i],
  },
  {
    id: 'facility.occupancy',
    name: 'Occupazione posti letto',
    description: 'Mostra l’occupazione di camere e posti letto della struttura.',
    category: 'supervisory',
    intendedRoles: ['supervisor', 'administrator'],
    requiredTools: ['rooms.occupancy'],
    optionalTools: [],
    slots: [],
    output: 'Posti letto totali, occupati, liberi.',
    steps: ['read: rooms.occupancy', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'low',
    ambiguity: 'Nessuna.',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:rooms.occupancy.',
    executable: true,
    classicScreen: { screen: 'posti-letto', label: 'Posti letto' },
    starters: { general: 'Quanti posti letto sono occupati?' },
    keywords: [/\b(occupazion|posti letto|letti liberi|camere (libere|occupate)|occupat)/i],
  },
  {
    id: 'drug.lookup',
    name: 'Cerca farmaco',
    description: 'Cerca un farmaco nell’anagrafica farmaci.',
    category: 'query',
    intendedRoles: ['doctor', 'nurse', 'oss', 'supervisor', 'administrator'],
    requiredTools: ['drugs.search'],
    optionalTools: [],
    slots: ['query'],
    output: 'Farmaci corrispondenti (nome, principio attivo).',
    steps: ['read: drugs.search', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'low',
    ambiguity: 'Nome assente → NEEDS_CLARIFICATION.',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:drugs.search.',
    executable: true,
    classicScreen: { screen: 'anagrafica-farmaci', label: 'Anagrafica farmaci' },
    starters: { general: 'Cerca un farmaco' },
    keywords: [/\b(farmac|medicinal|principio attivo)/i],
  },
  {
    id: 'patient.find',
    name: 'Cerca ospite',
    description: 'Cerca un ospite per nome, cognome o codice fiscale.',
    category: 'query',
    intendedRoles: ['doctor', 'nurse', 'oss', 'supervisor', 'administrator'],
    requiredTools: ['patients.search'],
    optionalTools: [],
    slots: ['query'],
    output: 'Ospiti trovati (nome).',
    steps: ['read: patients.search', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'medium',
    ambiguity: 'Testo assente → NEEDS_CLARIFICATION.',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:patients.search.',
    executable: true,
    classicScreen: { screen: 'pazienti', label: 'Pazienti' },
    starters: { general: 'Cerca un ospite' },
    keywords: [/\b(cerca|trova|dov['’]?è|dove si trova)\b.*\b(ospit|pazient|residente)/i],
  },
  // ── Administrative ─────────────────────────────────────────────────────────────────────────
  {
    id: 'admin.roster_contexts',
    name: 'Ordinamenti dei reparti',
    description: 'Elenca i contesti di ordinamento degli elenchi ospiti (configurazione).',
    category: 'administrative',
    intendedRoles: ['administrator', 'supervisor'],
    requiredTools: ['roster.list_contexts'],
    optionalTools: [],
    slots: [],
    output: 'Contesti e ordinamento predefinito.',
    steps: ['read: roster.list_contexts', 'answer'],
    kind: 'read',
    confirmation: 'READ',
    sensitivity: 'low',
    ambiguity: 'Nessuna.',
    failure: 'FAILED con il messaggio del backend.',
    audit: 'request + tool:roster.list_contexts.',
    executable: true,
    classicScreen: { screen: 'pazienti', label: 'Pazienti' },
    starters: { general: 'Mostrami gli ordinamenti dei reparti' },
    keywords: [/\b(ordinament|contest[oi] (di )?ordin|roster)/i],
  },
];

const BY_ID = new Map(SKILL_CATALOG.map((skill) => [skill.id, skill]));

export function skillById(id: string): SkillDefinition | undefined {
  return BY_ID.get(id);
}

/** Starter suggestions for the Assistant UI: only executable skills AVAILABLE to the caller. */
export function startersFor(
  availableIds: ReadonlySet<string>,
  hasResident: boolean,
  limit = 8,
): { skillId: string; label: string }[] {
  const out: { skillId: string; label: string }[] = [];
  for (const skill of SKILL_CATALOG) {
    if (!skill.executable || !availableIds.has(skill.id) || !skill.starters) continue;
    const label = hasResident
      ? (skill.starters.withResident ?? skill.starters.general)
      : skill.starters.general;
    if (label) out.push({ skillId: skill.id, label });
  }
  // With a resident open, resident-centred actions first.
  if (hasResident) {
    out.sort(
      (a, b) =>
        Number(!skillById(a.skillId)?.slots.includes('patient')) -
        Number(!skillById(b.skillId)?.slots.includes('patient')),
    );
  }
  return out.slice(0, limit);
}
