// REQ-040: deterministic query planner for the ClinicOS assistant. Maps a natural-language question
// to a typed QueryPlan over the REQ-039 Data Gateway tools. Pure + testable. No model, no web, no
// clinical inference. (A model-based NL layer can produce the same QueryPlan later; the executor and
// SOURCE_ONLY contract stay identical.)

export type AssistantIntent =
  | 'allergies'
  | 'therapies'
  | 'vitals_range'
  | 'vitals_recent'
  | 'vitals_trend'
  | 'narrative_search'
  | 'document_search'
  | 'timeline'
  | 'appointments'
  | 'correlate'
  | 'patient_search'
  | 'rooms_occupancy'
  | 'staff_list'
  | 'facility_snapshot'
  | 'operator_queue'
  | 'refuse_clinical'
  | 'data_query'
  // Milo fase 1
  | 'parameters_overview'
  | 'clinical_score'
  | 'diary'
  | 'assessments'
  | 'administrations'
  | 'staff_shifts'
  | 'agenda'
  // Milo, casi d'uso
  | 'patient_status'
  | 'care_contacts'
  // Passaggio guidato al flusso «Prepara prescrizione» (nessuna lettura, nessuna scrittura).
  | 'prescription_handoff'
  | 'unknown';

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

import { addDays, dayFromText, type SeriesKey } from '../gateway/clinical-series.js';

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Requests for clinical judgement are refused outright (no diagnosis/therapy/prognosis/triage).
const CLINICAL_REFUSAL = [
  /\bsuggerisci\b/,
  /\bconsiglia\b/,
  /che (terapia|cura|farmaco) (dovrei|devo|si dovrebbe)/,
  /\bdiagnosi\b.*\?/,
  /che (diagnosi|malattia|patologia)/,
  /\bprognosi\b/,
  /\bcausa\b.*\bmalattia\b/,
  /quale paziente e (piu|più) grave/,
  /\bpiu grave\b/,
  /\bpiù grave\b/,
  /stabilisci.*priorita/,
  /interpreta.*valori/,
  /e (grave|preoccupante)\b/,
  // ipotetico clinico («cosa succede se sospendo il farmaco?»): è una previsione, non una lettura.
  /cosa (succede|succederebbe|accade|accadrebbe) se\b/,
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

// Fase 1a: mappa la parola-parametro all'etichetta canonica della cartella.
const VITAL_LABELS: Array<{ re: RegExp; label: string }> = [
  { re: /pression|sistolic|\bpa\b/, label: 'PA' },
  { re: /frequenz|\bfc\b|battit|cardiac/, label: 'FC' },
  { re: /satur|spo2/, label: 'SpO2' },
  { re: /temperatur|febbre|\btc\b/, label: 'TC' },
  { re: /glicem|\bdtx\b/, label: 'DTX' },
];
function vitalLabelFor(q: string): string | undefined {
  for (const v of VITAL_LABELS) if (v.re.test(q)) return v.label;
  return undefined;
}
/** Finestra dell'andamento in giorni. «N giorni» esplicito, altrimenti mese=30, due settimane=15, default 7. */
function trendWindowDays(q: string): number {
  const m = /(\d{1,3})\s*giorni/.exec(q);
  if (m) return Math.min(90, Math.max(1, parseInt(m[1], 10)));
  if (/\bmese\b|mensile/.test(q)) return 30;
  if (/due settimane|quindic/.test(q)) return 15;
  return 7;
}

/** Extract a quoted phrase or the words after "cerca/trova … '<phrase>'". */
function searchPhrase(q: string, original: string): string | undefined {
  const quoted = /["“”']([^"“”']{2,})["“”']/.exec(original);
  if (quoted) return quoted[1].trim();
  const after = /(?:cerca|trova|frase|contien\w*)\s+(.{3,})/.exec(q);
  return after ? after[1].replace(/[?.!]+$/, '').trim() : undefined;
}

// Coda che delimita una domanda "di struttura"/"di turno": la frase deve finire lì oppure
// proseguire verso il qui-e-ora (reparto, oggi, adesso). Se prosegue verso un caso specifico
// («…a Mario Rossi», «…per la medicazione di Rossi») NON è una domanda facility: deve cadere
// negli intent sul paziente.
const HERE_AND_NOW = String.raw`(\s+(nella|nel|in|qui|dentro|adesso|ora|oggi|stamattina|stamane|stasera|stanotte)\b|[\s?!.,]*$)`;

// «Cosa sta succedendo nella struttura» — istantanea composta (occupazione + eccezioni + agenda).
const FACILITY_SNAPSHOT = [
  new RegExp(String.raw`cosa (sta )?succed\w*${HERE_AND_NOW}`),
  /(situazione|panoramica|riepilogo|quadro|stato)\b[^?]{0,20}(struttura|reparto|clinica|casa di cura)/,
  /(struttura|reparto)\b[^?]{0,20}(situazione|panoramica|riepilogo)/,
  /come va (la struttura|il reparto|oggi)/,
];

// «Cosa devo fare adesso» — coda di lavoro dell'operatore (terapie dovute + consegne aperte).
const OPERATOR_QUEUE = [
  new RegExp(String.raw`cosa (devo|dobbiamo|c'?e da) fare${HERE_AND_NOW}`),
  /cosa (mi )?manca (oggi|adesso|ora|da fare)/,
  /attivita (mancanti|da fare|aperte)/,
  /prossim[ae] (terapia|terapie|somministrazion\w*)(\s+(da (fare|somministrare|dare)|di oggi|in scadenza|in reparto|adesso|ora|oggi)\b|[\s?!.,]*$)/,
  /(le mie|mie) (consegne|attivita|cose da fare)/,
  /da fare adesso/,
];

export interface PlanContext {
  /** The patient currently open in the UI, if any (default scope on the patient page). */
  currentPatientId?: string;
  /** Sub-agent di partenza; l'intent può instradare all'altro (resolveAgent). Type-only import
   *  avoids a runtime cycle. */
  agent?: import('./agents.js').AgentId;
  /** Nome dell'operatore chiamante (header, non verificato): serve SOLO a ordinare la coda
   *  operatore per probabile assegnatario, mai a filtrare o ad allargare un permesso. */
  operatorName?: string;
  /** Giorno di struttura (YYYY-MM-DD) per «oggi/domani/lunedì»: iniettato da chi chiama, il
   *  pianificatore resta puro e senza orologio. Assente ⇒ le date relative non sono risolte. */
  today?: string;
  /** Milo fase 2: ultimi scambi della conversazione (testo, non istruzioni) per il team. */
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  /** Etichetta del paziente aperto (nome) per il contesto del team. */
  currentPatientLabel?: string;
}

// ── Milo fase 1: parole che indicano le nuove letture ──
const SERIES_WORDS: Array<{ re: RegExp; key: SeriesKey }> = [
  { re: /pression|sistolic|diastolic|\bpa\b/, key: 'pa' },
  { re: /frequenza cardiaca|battit|\bfc\b|polso/, key: 'fc' },
  { re: /satur|spo2|ossigen/, key: 'spo2' },
  { re: /temperatur|febbre|\btc\b/, key: 'temperatura' },
  { re: /frequenza respiratoria|respir|\bfr\b/, key: 'fr' },
  { re: /glicem|\bdtx\b|zucchero/, key: 'dtx' },
  { re: /\bpeso\b/, key: 'peso' },
];
function seriesKeysIn(q: string): SeriesKey[] {
  return SERIES_WORDS.filter((w) => w.re.test(q)).map((w) => w.key);
}
const NEWS2_WORDS =
  /news ?2|early warning|punteggio di (allerta|allarme|rischio)|deterioramento|score di allerta/;
const DIARY_WORDS =
  /\bdiari\w*|osservazion\w* (infermier|medic)|annotazion\w*|cosa (e|è) stato (scritto|annotato)/;
const ASSESSMENT_WORDS =
  /\bscal[ae]\b|valutazion\w*|\btinetti\b|\bmna\b|\bgds\b|painad|nutrizional|equilibrio|rischio (di )?cadut/;
const ADMINISTRATION_WORDS =
  /somministr\w*|erogat\w*|(ha|hanno) (preso|assunto|ricevuto)|dose (data|somministrata)/;
const SHIFT_WORDS =
  /\bturn[oi]\b|di turno|chi (lavora|e in servizio|è in servizio|c'?e|c'è)|in servizio|reperibil\w*/;
const AGENDA_WORDS =
  /visit\w* (del|dei|della) (medic|dottor|special)|quando (passa|viene) il (medico|dottore)|agenda (di |della )?(domani|settimana|dopodomani|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)|appuntament\w* (di |per )?(domani|dopodomani|settimana|questa settimana|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)/;
const DOCTOR = /medic|dottor/;
// «Chi ha fatto l'ultima visita / registrato i parametri…»: persone che hanno seguito il paziente.
const CARE_CONTACT_WORDS =
  /chi (ha|aveva|a) (fatto|registrat\w*|rilevat\w*|misurat\w*|visitat\w*|pres[oi]|inserit\w*|segnat\w*|controllat\w*)|chi (lo|la|l) ?(ha )?(visitat\w*|seguit\w*|vist\w*)|ultim[ao] (visita|registrazione|rilevazione)|da chi (e|è) stat[oa] (visitat\w*|vist\w*|seguit\w*)/;
// «Come va il paziente… cosa devo controllare»: quadro del periodo + punti da protocollo.
const PATIENT_STATUS_WORDS =
  /come (va|sta|procede|si trova|e messo|è messo)\b|valori (dell ?ultim\w*|degli ultimi|di questa|della settimana)|cosa (devo|bisogna|dovrei|c ?e da|c'?è da) (controllare|indagare|monitorare|verificare|tenere)|da (controllare|indagare|tenere d ?occhio|monitorare)|fondamentale (indagare|controllare)/;
/** La domanda chiede il quadro del paziente o che cosa controllare (vale per ogni percorso). */
export function asksPatientStatus(question: string): boolean {
  return PATIENT_STATUS_WORDS.test(norm(question));
}
/** Periodo in giorni chiesto per un andamento: «N giorni», settimana, mese, default 7. */
function periodDays(q: string): number {
  const m = /(\d{1,3})\s*giorni/.exec(q);
  if (m) return Math.min(90, Math.max(1, parseInt(m[1], 10)));
  if (/\bmese\b|mensile|30 giorni/.test(q)) return 30;
  if (/due settimane|quindic/.test(q)) return 15;
  if (/\bsettiman/.test(q)) return 7;
  if (/\boggi\b|ultime 24|ultimo giorno/.test(q)) return 1;
  return 7;
}

/** Produce a typed, validated plan for a question. Never executes anything. */
export function planQuery(question: string, ctx: PlanContext = {}): QueryPlan {
  const original = question || '';
  const q = norm(original);
  const onPatient = !!ctx.currentPatientId;
  const scope: QueryScope =
    onPatient && !/\b(pazienti|chiunque|chi assume|tutti i pazienti|across)\b/.test(q)
      ? 'current_patient'
      : 'cross_patient';
  const base = (
    intent: AssistantIntent,
    tools: PlannedToolCall[],
    requiresCross = false,
    refusalReason?: string,
  ): QueryPlan => ({
    intent,
    scope,
    tools,
    requiresCrossPatientAccess: requiresCross,
    refusalReason,
  });

  if (CLINICAL_REFUSAL.some((re) => re.test(q))) {
    return base('refuse_clinical', [], false, 'clinical_advice_not_allowed');
  }

  // ── facility-level "istantanea" e coda operatore ──
  // Valutati PRIMA degli intent sul paziente aperto: «cosa sta succedendo» e «cosa devo fare
  // adesso» restano domande sulla giornata della struttura anche stando su una cartella. Entrambe
  // sono letture facility (role-independent, gated da canFacilityRead a valle), mai cross-paziente.
  if (FACILITY_SNAPSHOT.some((re) => re.test(q))) {
    return base('facility_snapshot', [{ tool: 'get_facility_snapshot', args: {} }]);
  }
  if (OPERATOR_QUEUE.some((re) => re.test(q))) {
    return base('operator_queue', [{ tool: 'get_operator_queue', args: {} }]);
  }
  // Milo fase 1 — struttura: turni del personale e agenda di un giorno (letture di struttura,
  // gated da canFacilityRead; nessun dato clinico).
  const day = ctx.today ? dayFromText(original, ctx.today) : null;
  // Prima dei turni: «chi ha registrato i parametri di X e quali sono i suoi turni» è una domanda sul
  // paziente (persone che lo hanno seguito, con i loro turni), non l'elenco dei turni di tutti.
  if (ctx.currentPatientId && CARE_CONTACT_WORDS.test(q))
    return base('care_contacts', [
      { tool: 'get_patient_care_contacts', args: { patientId: ctx.currentPatientId } },
    ]);
  if (SHIFT_WORDS.test(q) && !/terapi|farmac/.test(q)) {
    const ruolo = DOCTOR.test(q)
      ? 'medico'
      : /infermier/.test(q)
        ? 'infermier'
        : /\boss\b/.test(q)
          ? 'oss'
          : undefined;
    return base('staff_shifts', [
      {
        tool: 'query_staff_shifts',
        args: { ...(day ? { date: day } : {}), ...(ruolo ? { ruolo } : {}) },
      },
    ]);
  }
  if (AGENDA_WORDS.test(q)) {
    const from = day ?? ctx.today;
    const to = /settiman/.test(q) && from ? addDays(from, 6) : from;
    return base('agenda', [
      {
        tool: 'query_agenda',
        args: { ...(from ? { from, to } : {}), ...(DOCTOR.test(q) ? { ruolo: 'medico' } : {}) },
      },
    ]);
  }

  const pid = ctx.currentPatientId;
  // ── current-patient retrieval intents (need a patient in context) ──
  if (scope === 'current_patient' && pid) {
    if (/\ballerg/.test(q))
      return base('allergies', [{ tool: 'get_patient_allergies', args: { patientId: pid } }]);
    // Milo fase 1 — letture del paziente che prima non esistevano.
    if (NEWS2_WORDS.test(q))
      return base('clinical_score', [
        { tool: 'get_patient_news2', args: { patientId: pid, days: periodDays(q) } },
      ]);
    if (ADMINISTRATION_WORDS.test(q))
      return base('administrations', [
        { tool: 'get_patient_administrations', args: { patientId: pid, days: periodDays(q) } },
      ]);
    if (ASSESSMENT_WORDS.test(q)) {
      const type = /tinetti|equilibrio|cadut/.test(q)
        ? 'tinetti'
        : /\bmna\b|nutrizional/.test(q)
          ? 'mna'
          : /\bgds\b|depress/.test(q)
            ? 'gds15'
            : /painad|dolore/.test(q)
              ? 'painad'
              : undefined;
      return base('assessments', [
        { tool: 'get_patient_assessments', args: { patientId: pid, ...(type ? { type } : {}) } },
      ]);
    }
    if (DIARY_WORDS.test(q))
      return base('diary', [
        { tool: 'get_patient_diary', args: { patientId: pid, days: periodDays(q) } },
      ]);
    // «Come va… cosa devo controllare»: parametri del periodo (con i punti da protocollo) e NEWS2.
    if (PATIENT_STATUS_WORDS.test(q)) {
      const days = periodDays(q);
      return base('patient_status', [
        { tool: 'get_patient_parameters', args: { patientId: pid, days } },
        { tool: 'get_patient_news2', args: { patientId: pid, days } },
      ]);
    }
    // Andamento di più parametri, o «come sono i parametri»: serie unificate con aggregati.
    const keys = seriesKeysIn(q);
    if (
      (/andamento|trend|grafic|storico|evoluzion|correl|confront|insieme|e la|e il/.test(q) &&
        keys.length >= 2) ||
      /(come (sono|vanno|stanno)|riepilogo|quadro|sintesi) (i |dei )?parametri/.test(q)
    )
      return base('parameters_overview', [
        {
          tool: 'get_patient_parameters',
          args: { patientId: pid, days: periodDays(q), ...(keys.length ? { params: keys } : {}) },
        },
      ]);
    // Fase 1a: andamento di un parametro su finestra (7/15/30gg). Prima di vitals_recent, così una
    // domanda di "andamento" non viene assorbita dalla lettura recente. Solo lettura, SOURCE_ONLY.
    if (/andamento|trend|grafic|storico|evoluzion/.test(q)) {
      const label = vitalLabelFor(q);
      if (label)
        return base('vitals_trend', [
          {
            tool: 'get_patient_vital_signs',
            args: { patientId: pid, label, days: trendWindowDays(q) },
          },
        ]);
    }
    if (
      /(parametri|pressione|pa\b|frequenza|spo2|temperatura).*(ultim|7|sette|giorni|recenti)/.test(
        q,
      ) ||
      /ultimi parametri/.test(q)
    )
      return base('vitals_recent', [{ tool: 'get_patient_vital_signs', args: { patientId: pid } }]);
    const sysGt = /(pressione|sistolic|pa).*?(\d{2,3})/.exec(q);
    if (/pression|sistolic/.test(q) && sysGt)
      return base('vitals_range', [
        {
          tool: 'get_patient_vital_signs',
          args: { patientId: pid, label: 'PA', systolicMin: parseInt(sysGt[2], 10) + 1 },
        },
      ]);
    if (/timeline|sequenza temporale|cronologia/.test(q))
      return base('timeline', [{ tool: 'get_patient_timeline', args: { patientId: pid } }]);
    if (/appuntament\w*|agenda/.test(q))
      return base('appointments', [{ tool: 'get_patient_appointments', args: { patientId: pid } }]);
    // 016 F0: plurali/sinonimi (terapia/terapie/farmaco/farmaci/prescriz…)
    if (/terapi\w*|farmac\w*|prescriz\w*/.test(q))
      return base('therapies', [{ tool: 'get_patient_therapies', args: { patientId: pid } }]);
    const sec = sectionKeyFor(q);
    if (/cerca|trova|consulenz|anamnes|decorso|documenti|sezione/.test(q)) {
      const phrase = searchPhrase(q, original);
      if (/documenti?/.test(q))
        return base('document_search', [
          { tool: 'search_documents', args: { patientId: pid, query: phrase ?? '' } },
        ]);
      return base('narrative_search', [
        {
          tool: 'search_clinical_sections',
          args: { patientId: pid, sectionKey: sec, query: phrase ?? sec ?? '' },
        },
      ]);
    }
  }

  // ── cross-patient intents (role + env gated downstream) ──
  // Fase 1b: elenco del personale con qualifica — dato organizzativo (nome/ruolo/reparto/qualifica),
  // MAI dati clinici né pazienti. Facility-level read, gated downstream da canFacilityRead come
  // rooms_occupancy. Prima del ramo correlate, così «chi sono gli infermieri» non diventa una
  // ricerca cross-patient.
  if (
    /\b(personale|staff|equipe|organico)\b/.test(q) ||
    /(elenc\w*|lista|mostra|quant[ie]|qual[ie]|chi sono).*(operator[ie]|infermier[ie]|medic[ih]|coordinator[ie])/.test(
      q,
    )
  ) {
    return base('staff_list', [{ tool: 'query_staff_list', args: {} }]);
  }
  if (
    /valori? pressori? (superior|maggior|sopra).*?(\d{2,3})/.test(q) ||
    /pressione.*(superiore a|>)\s*(\d{2,3})/.test(q)
  ) {
    const m = /(\d{2,3})/.exec(q);
    const min = m ? parseInt(m[1], 10) + 1 : 151;
    return base(
      'correlate',
      [{ tool: 'search_across_patients', args: { systolicMin: min } }],
      true,
    );
  }
  if (/quali pazienti|chi assume|chi ha\b|pazienti con/.test(q)) {
    const allergy = /allerg\w*\s+(?:a|al|alla|alle|ai)?\s*([a-zàèéìòù]+)/.exec(q)?.[1];
    return base('correlate', [{ tool: 'correlate_structured_data', args: { allergy } }], true);
  }
  // issue #239: aggregate rooms/beds occupancy (counts only, never patient names/identifiers —
  // facility-level read, gated downstream by canFacilityRead, NOT a cross-patient PHI search).
  if (
    /(camere?|stanze?|letti?).*(occupat|liber|disponibil|manutenzione)|occupazione.*(camere?|stanze?|letti?)/.test(
      q,
    )
  ) {
    return base('rooms_occupancy', [{ tool: 'query_rooms_occupancy', args: {} }]);
  }
  if (/appuntamenti (di )?oggi|agenda oggi/.test(q))
    return base('appointments', [{ tool: 'query_appointments_today', args: {} }], true);
  if (/cerca|trova/.test(q)) {
    const phrase = searchPhrase(q, original);
    if (/documenti?/.test(q))
      return base(
        'document_search',
        [{ tool: 'search_documents', args: { query: phrase ?? '' } }],
        true,
      );
    return base(
      'narrative_search',
      [{ tool: 'search_across_patients', args: { query: phrase ?? '' } }],
      true,
    );
  }
  if (/paziente|cerca paziente|trova paziente/.test(q))
    return base(
      'patient_search',
      [{ tool: 'search_patients', args: { query: original.trim() } }],
      true,
    );

  return base('unknown', []);
}

// 016 F0: risoluzione del paziente nominato nel testo. Il planner resta puro; la risoluzione
// nome→id (che richiede il DB) è fatta da service.ts, che usa questo estrattore.
// Parole capitalizzate note che NON sono nomi di paziente (evita falsi positivi a fine frase).
const NAME_STOPWORDS = new Set([
  'PA',
  'SpO2',
  'TC',
  'FC',
  'DTX',
  'RX',
  'TAC',
  'RMN',
  'ECG',
  'PS',
  'MRN',
]);

/**
 * Estrae un nome paziente dalla domanda, se presente. Due euristiche:
 *  1) dopo una preposizione esplicita: «…di/del/della/dei/per/al paziente <Nome [Cognome]>»
 *  2) uno o due token capitalizzati in coda (non iniziali di frase), es. «…assume Rossi».
 * Ritorna null quando nessun paziente è nominato (nessuna invenzione).
 */
const LOWER_NAME_STOP = new Set([
  'mi',
  'ha',
  'ho',
  'e',
  'è',
  'che',
  'con',
  'per',
  'dei',
  'del',
  'gli',
  'i',
  'il',
  'la',
  'le',
  'lo',
  'come',
  'cosa',
  'quali',
  'quale',
  'quando',
  'dai',
  'dammi',
  'sono',
  'sta',
  'va',
  'nel',
  'nella',
  'aperto',
  'corrente',
  'attuale',
  'questo',
  'questa',
  'oggi',
  'ieri',
  'pressione',
  'parametri',
  'registra',
  'aggiungi',
  'una',
  'uno',
  'un',
  'non',
  'dell',
  'della',
  'degli',
  'delle',
  'chi',
]);

export function extractPatientName(question: string): string | null {
  const text = (question || '').trim();
  if (!text) return null;
  const NAME = "[A-ZÀ-Þ][a-zà-ÿ']+(?:\\s+[A-ZÀ-Þ][a-zà-ÿ']+)?";

  const prep = new RegExp(
    `\\b(?:di|del|della|dei|delle|per|al|allo|alla|paziente)\\s+(${NAME})`,
  ).exec(text);
  if (prep) return prep[1].trim();
  // Dopo «paziente/ospite» il nome vale anche in minuscolo (digitazione o dettatura): «paziente
  // bassi». Al massimo due parole, fermandosi alla prima che non può essere un nome.
  const lower = /\b(?:paziente|ospite)\s+([a-zà-ÿ']{3,}(?:\s+[a-zà-ÿ']{3,})?)/i.exec(text);
  if (lower) {
    const words: string[] = [];
    for (const word of lower[1].split(/\s+/)) {
      if (LOWER_NAME_STOP.has(word.toLowerCase())) break;
      words.push(word);
    }
    if (words.length) return words.join(' ');
  }

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
