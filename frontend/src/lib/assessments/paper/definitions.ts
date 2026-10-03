// Paper-form definitions of the clinical scales (Moduli/*.pdf, 2026-10-03 owner decisions).
// This file is byte-identical in backend/src/assessments/paper/ and frontend/src/lib/assessments/paper/
// (a backend test pins the equality): edit both copies together. Pure data, no imports.
// Obvious source typos are corrected silently (owner default); wording is otherwise the paper's.

export type PaperLayout = 'table' | 'grid' | 'stacked' | 'yesno';
export type PaperTone = 'red' | 'yellow' | 'green' | 'blue';
export type PaperFieldId =
  | 'patient'
  | 'patientCode'
  | 'date'
  | 'birthDate'
  | 'operator'
  | 'examiner'
  | 'ward'
  | 'score'
  | 'weight'
  | 'height';
export interface PaperOption {
  value: number | boolean;
  points: number;
  label: string;
}
export interface PaperItem {
  key: string;
  /** Printed number/letter; consecutive items with the same number share one printed row group. */
  number: string;
  label: string;
  note?: string;
  subLabel?: string;
  /** Exactly one item of the same group must be answered (MNA-SF F1 / F2). */
  group?: string;
  /** Answer required only when this key is answered and > 0; must be empty when it is 0. */
  dependsOn?: string;
  /** Not part of the total (NPI caregiver distress). */
  excludedFromTotal?: boolean;
  options: readonly PaperOption[];
}
export interface PaperSection {
  id: string;
  title: string;
  note?: string;
  maximum: number;
  items: readonly PaperItem[];
}
export interface PaperBand {
  id: string;
  min: number;
  max: number;
  range: string;
  title: string;
  text: string;
  label: string;
  tone: PaperTone;
}
export interface PaperScale {
  type: 'painad' | 'tinetti' | 'gds15' | 'mna' | 'barthel' | 'ucla_npi_sleep';
  version: string;
  sourceSha256: string;
  /** Short name used by the app chrome (catalog, history, archive). */
  appTitle: string;
  appDescription: string;
  title: string;
  subtitle: string;
  header: 'band' | 'dark-band' | 'plain-left' | 'plain-center';
  accent: string;
  patientBoxTitle?: string;
  fields: readonly { id: PaperFieldId; label: string }[];
  instruction?: { label: string; text: string };
  intro?: string;
  layout: PaperLayout;
  columns: readonly string[];
  sectionStyle: 'bar' | 'rule' | 'heading';
  sections: readonly PaperSection[];
  scoring: 'sum' | 'npi';
  maximum: number;
  totalLabel: string;
  totalParts?: readonly { id: string; label: string; maximum: number }[];
  bandsTitle?: string;
  bandsStyle: 'badges' | 'table' | 'bullets';
  bandColumns?: readonly [string, string, string];
  bands: readonly PaperBand[];
  scoringNotes?: readonly string[];
  signature: boolean;
  footer?: string;
  pageNumbers: boolean;
  notes: boolean;
  measures?: readonly ('weightKg' | 'heightM' | 'calfCm')[];
}

const o = (points: number, label: string): PaperOption => ({ value: points, points, label });

export const PAINAD_PAPER: PaperScale = {
  type: 'painad',
  version: 'painad-it-2026-09-22-v1',
  sourceSha256: '2a3c3b2724ed7cc46aa09db715680b0d494a63b587898b45d61c8db8ec73abb1',
  appTitle: 'PAINAD',
  appDescription: 'Rilevazione del dolore nel paziente non verbale (0–10).',
  title: 'Scala PAINAD — Scheda di Valutazione',
  subtitle:
    'Pain Assessment in Advanced Dementia — Rilevazione del Dolore nel Paziente Non Verbale',
  header: 'dark-band',
  accent: '#1F7FC6',
  patientBoxTitle: 'ANAGRAFICA PAZIENTE & VALUTAZIONE',
  fields: [
    { id: 'patient', label: 'Paziente' },
    { id: 'date', label: 'Data' },
    { id: 'birthDate', label: 'Data di Nascita' },
    { id: 'operator', label: 'Operatore' },
    { id: 'ward', label: 'Reparto/ Stanza' },
  ],
  layout: 'grid',
  columns: ['Item', 'Punteggio 0', 'Punteggio 1', 'Punteggio 2', 'Punti'],
  sectionStyle: 'rule',
  sections: [
    {
      id: 'grid',
      title: 'GRIGLIA DI VALUTAZIONE OSSERVAZIONALE',
      maximum: 10,
      items: [
        {
          key: 'respiration',
          number: '1',
          label: 'Respirazione',
          options: [
            o(0, 'Normale'),
            o(1, 'Occasionalmente affannosa. Brevi periodi di iperventilazione.'),
            o(2, 'RUMOROSA. Respiro stertoroso. Iperventilazione prolungata.'),
          ],
        },
        {
          key: 'negativeVocalization',
          number: '2',
          label: 'Vocalizzazione negativa',
          options: [
            o(0, 'Nessuna'),
            o(1, 'Lamenti o gemiti occasionali. Parlare a bassa voce con tono negativo.'),
            o(2, 'Chiamate ripetute a voce alta. Gemiti o lamenti costanti. Pianto.'),
          ],
        },
        {
          key: 'facialExpression',
          number: '3',
          label: 'Espressione facciale',
          options: [
            o(0, 'Sorridente o inespressiva'),
            o(1, 'Triste, spaventata, corrucciata, smorfia occasionale.'),
            o(2, 'Smorfia marcata e costante. Serramento della mascella / denti stretti.'),
          ],
        },
        {
          key: 'bodyLanguage',
          number: '4',
          label: 'Linguaggio del corpo',
          options: [
            o(0, 'Rilassato'),
            o(1, 'Teso, irrequieto, pacing (camminare avanti e indietro).'),
            o(2, 'Rigido. Pugni chiusi. Ginocchia al petto. Spinge via o colpisce.'),
          ],
        },
        {
          key: 'consolability',
          number: '5',
          label: 'Consolabilità',
          options: [
            o(0, 'Non necessaria'),
            o(1, 'Rassicurato o distratto dalla voce o dal contatto fisico.'),
            o(2, 'Impossibile da rassicurare, distrarre o consolare.'),
          ],
        },
      ],
    },
  ],
  scoring: 'sum',
  maximum: 10,
  totalLabel: 'PUNTEGGIO TOTALE PAINAD (0 - 10):',
  bandsTitle: 'INTERPRETAZIONE DEL PUNTEGGIO TOTALE',
  bandsStyle: 'bullets',
  bands: [
    {
      id: 'none',
      min: 0,
      max: 0,
      range: '0 punti:',
      title: '',
      text: 'Nessun dolore rilevato.',
      label: 'Nessun dolore rilevato',
      tone: 'green',
    },
    {
      id: 'mild',
      min: 1,
      max: 3,
      range: '1 – 3 punti:',
      title: '',
      text: 'Dolore lieve.',
      label: 'Dolore lieve',
      tone: 'yellow',
    },
    {
      id: 'moderate',
      min: 4,
      max: 6,
      range: '4 – 6 punti:',
      title: '',
      text: 'Dolore moderato (richiede intervento/monitoraggio).',
      label: 'Dolore moderato',
      tone: 'red',
    },
    {
      id: 'severe',
      min: 7,
      max: 10,
      range: '7 – 10 punti:',
      title: '',
      text: 'Dolore severo (richiede intervento analgesico e rivalutazione).',
      label: 'Dolore severo',
      tone: 'red',
    },
  ],
  signature: false,
  footer:
    'Scheda clinica per la valutazione del dolore non verbale — Conservare nella cartella del paziente',
  pageNumbers: false,
  notes: false,
};

export const BARTHEL_PAPER: PaperScale = {
  type: 'barthel',
  version: 'barthel-it-2026-10-03-v1',
  sourceSha256: '8640724ebeb9778fc673df6716102acd03569044d7aa2ee757992e97dde106a7',
  appTitle: 'Indice di Barthel',
  appDescription: 'Autonomia nelle attività della vita quotidiana (ADL), 0–100 punti.',
  title: 'INDICE DI BARTHEL',
  subtitle:
    "Barthel Index (BI) - Valutazione dell'Autonomia nelle Attività della Vita Quotidiana (ADL)",
  header: 'band',
  accent: '#2F6DB5',
  fields: [
    { id: 'patient', label: 'Paziente' },
    { id: 'date', label: 'Data Valut.' },
    { id: 'birthDate', label: 'Data Nascita' },
    { id: 'operator', label: 'Operatore' },
  ],
  layout: 'table',
  columns: ['#', 'Funzione / Attività', 'Descrizione e Criteri di Valutazione', 'Punti', 'Sel.'],
  sectionStyle: 'bar',
  sections: [
    {
      id: 'adl',
      title: 'VALUTAZIONE DELLE ATTIVITÀ FONDAMENTALI (Max 100 Punti)',
      maximum: 100,
      items: [
        {
          key: 'alimentazione',
          number: '1',
          label: 'Alimentazione',
          options: [
            o(0, 'Incapace, necessita di essere imboccato'),
            o(5, 'Necessita di aiuto per tagliare la carne, spalmare il burro, ecc.'),
            o(10, 'Autonomo (capace di mangiare cibo preparato nel piatto)'),
          ],
        },
        {
          key: 'igiene',
          number: '2',
          label: 'Igiene personale (Doccia/ Bagno)',
          options: [o(0, 'Dipendente'), o(5, 'Autonomo nella doccia o nel bagno')],
        },
        {
          key: 'curaPersona',
          number: '3',
          label: 'Cura della persona (Viso, capelli, denti)',
          options: [
            o(0, 'Bisogno di aiuto nelle operazioni di cura personale'),
            o(5, 'Autonomo (lavare viso, pettinarsi, lavare i denti, radersi)'),
          ],
        },
        {
          key: 'abbigliamento',
          number: '4',
          label: 'Abbigliamento',
          options: [
            o(0, 'Dipendente'),
            o(
              5,
              'Necessita di aiuto (es. allacciare scarpe, cerniere, ecc.) ma svolge almeno metà del lavoro',
            ),
            o(10, 'Autonomo nel vestirsi, allacciarsi le scarpe, ecc.'),
          ],
        },
        {
          key: 'intestino',
          number: '5',
          label: 'Controllo intestinale',
          options: [
            o(0, 'Incontinente (o necessita di perette frequenti)'),
            o(
              5,
              'Occasionali incidenti (1 volta/settimana o bisogno di aiuto per supposte/clisteri)',
            ),
            o(10, "Continente (autonomo nell'uso di supposte/clisteri se necessari)"),
          ],
        },
        {
          key: 'vescica',
          number: '6',
          label: 'Controllo vescicale',
          options: [
            o(0, 'Incontinente o cateterizzato/incapace di gestione'),
            o(5, 'Occasionali incidenti (massimo 1 nelle 24 ore)'),
            o(10, 'Continente (per più di 7 giorni o gestione autonoma del catetere)'),
          ],
        },
        {
          key: 'gabinetto',
          number: '7',
          label: 'Uso del gabinetto (Toilette)',
          options: [
            o(0, 'Dipendente'),
            o(5, "Necessita di aiuto per l'equilibrio, pulirsi, svestirsi o vestirsi"),
            o(10, 'Autonomo (andare in bagno, pulirsi, rivestirsi)'),
          ],
        },
        {
          key: 'trasferimenti',
          number: '8',
          label: 'Trasferimenti (Letto-Sedia)',
          options: [
            o(0, "Incapace, non mantiene l'equilibrio da seduto"),
            o(5, 'Grande aiuto (1-2 persone, assistenza fisica significativa)'),
            o(10, 'Piccolo aiuto (supervisione verbale o leggero supporto)'),
            o(15, 'Autonomo'),
          ],
        },
        {
          key: 'deambulazione',
          number: '9',
          label: 'Deambulazione (in piano)',
          options: [
            o(0, 'Immobile o cammina < 50 metri'),
            o(5, 'Indipendente con sedia a rotelle (per oltre 50 metri)'),
            o(10, "Cammina con l'aiuto di una persona per oltre 50 metri"),
            o(15, 'Autonomo per oltre 50 metri (può usare ausili come bastone/tripode)'),
          ],
        },
        {
          key: 'scale',
          number: '10',
          label: 'Uso delle scale',
          options: [
            o(0, 'Incapace'),
            o(5, 'Necessita di aiuto o supervisione'),
            o(10, 'Autonomo (può usare corrimano o bastoni)'),
          ],
        },
      ],
    },
  ],
  scoring: 'sum',
  maximum: 100,
  totalLabel: 'PUNTEGGIO TOTALE BARTHEL:',
  bandsTitle: 'Sintesi del Punteggio e Livello di Dipendenza (0 - 100 Punti)',
  bandsStyle: 'badges',
  bands: [
    {
      id: 'total',
      min: 0,
      max: 20,
      range: '0 - 20 Punti',
      title: 'Dipendenza TOTALE:',
      text: 'Grave limitazione funzionale, assistenza continua.',
      label: 'Dipendenza totale',
      tone: 'red',
    },
    {
      id: 'severe',
      min: 21,
      max: 60,
      range: '21 - 60 Punti',
      title: 'Dipendenza GRAVE:',
      text: 'Necessità di supporto costante nelle attività quotidiane.',
      label: 'Dipendenza grave',
      tone: 'red',
    },
    {
      id: 'moderate',
      min: 61,
      max: 90,
      range: '61 - 90 Punti',
      title: 'Dipendenza MODERATA:',
      text: 'Parzialmente autonomo, aiuto per alcune funzioni.',
      label: 'Dipendenza moderata',
      tone: 'yellow',
    },
    {
      id: 'mild',
      min: 91,
      max: 99,
      range: '91 - 99 Punti',
      title: 'Dipendenza LIEVE:',
      text: 'Minime limitazioni, quasi completamente autonomo.',
      label: 'Dipendenza lieve',
      tone: 'green',
    },
    {
      id: 'independent',
      min: 100,
      max: 100,
      range: '100 Punti',
      title: 'COMPLETAMENTE AUTONOMO:',
      text: 'Indipendenza completa nelle ADL.',
      label: 'Completamente autonomo',
      tone: 'green',
    },
  ],
  signature: true,
  pageNumbers: true,
  notes: false,
};

export const TINETTI_PAPER: PaperScale = {
  type: 'tinetti',
  version: 'tinetti-it-2026-10-03-v2',
  sourceSha256: 'feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6',
  appTitle: 'Scala di Tinetti',
  appDescription: 'Equilibrio e andatura (POMA), 0–28 punti.',
  title: 'SCALA DI TINETTI',
  subtitle:
    'Performance-Oriented Mobility Assessment (POMA) - Valutazione di Equilibrio e Andatura',
  header: 'band',
  accent: '#2F6DB5',
  fields: [
    { id: 'patient', label: 'Paziente' },
    { id: 'date', label: 'Data Valut.' },
    { id: 'birthDate', label: 'Data Nascita' },
    { id: 'operator', label: 'Operatore' },
  ],
  layout: 'table',
  columns: ['#', 'Parametro', 'Descrizione e Criteri di Valutazione', 'Punti', 'Sel.'],
  sectionStyle: 'bar',
  sections: [
    {
      id: 'balance',
      title: "1. VALUTAZIONE DELL'EQUILIBRIO (Max 16 Punti)",
      maximum: 16,
      items: [
        {
          key: 'equilibrioSeduto',
          number: '1',
          label: 'Equilibrio da seduto',
          options: [o(0, 'Inclinato, scivola dalla sedia'), o(1, 'Sicuro, saldo, stabile')],
        },
        {
          key: 'alzarsi',
          number: '2',
          label: 'Alzarsi dalla sedia',
          options: [
            o(0, 'Incapace senza aiuto'),
            o(1, 'Capace, ma usa le braccia per spingersi'),
            o(2, 'Capace senza usare le braccia'),
          ],
        },
        {
          key: 'tentativiAlzarsi',
          number: '3',
          label: 'Tentativi di alzarsi',
          options: [
            o(0, 'Incapace senza aiuto'),
            o(1, 'Capace ma richiede più di un tentativo'),
            o(2, 'Capace al primo tentativo'),
          ],
        },
        {
          key: 'equilibrioImmediato',
          number: '4',
          label: 'Equilibrio ortostatico immediato (primi 5 sec)',
          options: [
            o(0, 'Instabile (ondeggia, muove i piedi, marcata oscillazione del tronco)'),
            o(1, "Stabile ma usa deambulatore/bastone o allarga la base d'appoggio"),
            o(2, 'Stabile senza ausili, piedi uniti o posizione normale'),
          ],
        },
        {
          key: 'equilibrioProlungato',
          number: '5',
          label: 'Equilibrio ortostatico prolungato',
          options: [
            o(0, 'Instabile'),
            o(1, 'Stabile ma a base allargata (> 10 cm) o con supporto/ausilio'),
            o(2, 'Stabile a base stretta senza supporto'),
          ],
        },
        {
          key: 'rombergSpinta',
          number: '6',
          label: 'Test della spinta',
          note: 'Spinta leggera sullo sterno 3 volte',
          options: [
            o(0, 'Incomincia a cadere'),
            o(1, 'Oscilla, si afferra ma si mantiene in piedi'),
            o(2, 'Stabile'),
          ],
        },
        {
          key: 'occhiChiusi',
          number: '7',
          label: 'A occhi chiusi',
          note: 'A piedi uniti',
          options: [o(0, 'Instabile'), o(1, 'Stabile')],
        },
        {
          key: 'girarsi360Passi',
          number: '8',
          label: 'Giro a 360°',
          options: [o(0, 'Passi discontinui / a scatti'), o(1, 'Passi continui')],
        },
        {
          key: 'girarsi360Stabilita',
          number: '8',
          label: 'Giro a 360°',
          options: [o(0, 'Instabile (si afferra, oscilla)'), o(1, 'Stabile durante il giro')],
        },
        {
          key: 'sedersi',
          number: '9',
          label: 'Sedersi',
          options: [
            o(0, 'Non sicuro (valuta male le distanze, cade sulla sedia)'),
            o(1, 'Usa le braccia o il movimento non è fluido'),
            o(2, 'Sicuro, movimento fluido e controllato'),
          ],
        },
      ],
    },
    {
      id: 'gait',
      title: "2. VALUTAZIONE DELL'ANDATURA (Max 12 Punti)",
      note: 'Paziente cammina lungo un corridoio (circa 3 metri) a passo normale e poi rapido. Uso di ausili consentito.',
      maximum: 12,
      items: [
        {
          key: 'iniziazione',
          number: '10',
          label: 'Inizio della deambulazione',
          options: [o(0, 'Esitazione o più tentativi per partire'), o(1, 'Nessuna esitazione')],
        },
        {
          key: 'lunghezzaPassoDx',
          number: '11',
          label: 'Lunghezza e altezza del passo',
          subLabel: 'Lunghezza passo DX',
          options: [
            o(0, 'Piede DX non supera il SX durante la fase di volo'),
            o(1, 'Piede DX supera il SX'),
          ],
        },
        {
          key: 'altezzaPassoDx',
          number: '11',
          label: 'Lunghezza e altezza del passo',
          subLabel: 'Altezza passo DX',
          options: [
            o(0, 'Il piede DX non si stacca completamente da terra'),
            o(1, 'Il piede DX si stacca completamente da terra'),
          ],
        },
        {
          key: 'lunghezzaPassoSx',
          number: '11',
          label: 'Lunghezza e altezza del passo',
          subLabel: 'Lunghezza passo SX',
          options: [
            o(0, 'Piede SX non supera il DX durante la fase di volo'),
            o(1, 'Piede SX supera il DX'),
          ],
        },
        {
          key: 'altezzaPassoSx',
          number: '11',
          label: 'Lunghezza e altezza del passo',
          subLabel: 'Altezza passo SX',
          options: [
            o(0, 'Il piede SX non si stacca completamente da terra'),
            o(1, 'Il piede SX si stacca completamente da terra'),
          ],
        },
        {
          key: 'simmetria',
          number: '12',
          label: 'Simmetria del passo',
          options: [
            o(0, 'Passo DX e SX non appaiono di lunghezza uguale'),
            o(1, 'Passo DX e SX appaiono di lunghezza uguale'),
          ],
        },
        {
          key: 'continuita',
          number: '13',
          label: 'Continuità del passo',
          options: [
            o(0, 'Interruzione o discontinuità tra i passi'),
            o(1, 'I passi appaiono continui'),
          ],
        },
        {
          key: 'traiettoria',
          number: '14',
          label: 'Traiettoria',
          note: 'Valutata su 3 metri',
          options: [
            o(0, 'Marcata deviazione dalla linea retta'),
            o(1, 'Lieve/moderata deviazione o usa ausilio per mantenere la rotta'),
            o(2, 'Traiettoria dritta senza ausili'),
          ],
        },
        {
          key: 'tronco',
          number: '15',
          label: 'Tronco',
          options: [
            o(0, 'Marcata oscillazione o uso di ausili'),
            o(1, 'Flessione delle ginocchia o del tronco o allargamento delle braccia'),
            o(2, 'Nessuna oscillazione, tronco eretto, braccia coordinate'),
          ],
        },
        {
          key: 'cammino',
          number: '16',
          label: 'Base di appoggio',
          options: [
            o(0, 'Talloni separati durante la deambulazione'),
            o(1, 'Talloni quasi si toccano durante la deambulazione'),
          ],
        },
      ],
    },
  ],
  scoring: 'sum',
  maximum: 28,
  totalLabel: 'PUNTEGGIO TOTALE:',
  totalParts: [
    { id: 'balance', label: 'Punteggio Equilibrio:', maximum: 16 },
    { id: 'gait', label: 'Punteggio Andatura:', maximum: 12 },
  ],
  bandsTitle: 'Sintesi del Punteggio e Rischio Caduta (0 - 28 Punti)',
  bandsStyle: 'badges',
  bands: [
    {
      id: 'high',
      min: 0,
      max: 18,
      range: '< 19 Punti',
      title: 'Rischio Caduta ELEVATO:',
      text: "Grave compromissione dell'equilibrio e/o dell'andatura.",
      label: 'Rischio caduta elevato',
      tone: 'red',
    },
    {
      id: 'moderate',
      min: 19,
      max: 23,
      range: '19 - 23 Punti',
      title: 'Rischio Caduta MODERATO:',
      text: 'Moderata compromissione, consigliato monitoraggio e prevenzione.',
      label: 'Rischio caduta moderato',
      tone: 'yellow',
    },
    {
      id: 'low',
      min: 24,
      max: 28,
      range: '24 - 28 Punti',
      title: 'Rischio Caduta BASSO / Normale:',
      text: 'Buona autonomia motoria e stabilità.',
      label: 'Rischio caduta basso / normale',
      tone: 'green',
    },
  ],
  signature: true,
  pageNumbers: true,
  notes: true,
};

const yesNo = (pointForYes: boolean): readonly PaperOption[] => [
  { value: true, points: pointForYes ? 1 : 0, label: 'SÌ' },
  { value: false, points: pointForYes ? 0 : 1, label: 'NO' },
];
const gds = (n: number, label: string, pointForYes: boolean): PaperItem => ({
  key: `q${n}`,
  number: String(n),
  label,
  options: yesNo(pointForYes),
});

export const GDS15_PAPER: PaperScale = {
  type: 'gds15',
  version: 'gds15-it-2026-10-03-v2',
  sourceSha256: '6e615b3bbcffc152f9362247abfdf8c5cd30df1fa7b0d1bf8f312aeb3be5b5e9',
  appTitle: 'GDS-15',
  appDescription: 'Screening della depressione nell’anziano, 15 quesiti (0–15).',
  title: 'Geriatric Depression Scale (GDS-15)',
  subtitle: "Versione a 15 quesiti (Short Form) per lo screening della depressione nell'anziano",
  header: 'plain-center',
  accent: '#2A5288',
  fields: [
    { id: 'patientCode', label: 'Paziente / Codice' },
    { id: 'date', label: 'Data' },
    { id: 'examiner', label: 'Esaminatore' },
    { id: 'score', label: 'Punteggio' },
  ],
  instruction: {
    label: 'Istruzioni per la somministrazione:',
    text: "Rispondere a ciascuna domanda scegliendo la risposta che meglio descrive come il paziente si è sentito nell'ultima settimana. Somministrare in forma scritta o tramite intervista orale.",
  },
  layout: 'yesno',
  columns: ['#', 'Domanda', 'SÌ', 'NO'],
  sectionStyle: 'heading',
  sections: [
    {
      id: 'questionnaire',
      title: 'Questionario',
      maximum: 15,
      items: [
        gds(1, 'È fondamentalmente soddisfatto/a della Sua vita?', false),
        gds(2, 'Ha rinunciato a molte delle Sue attività e interessi?', true),
        gds(3, 'Sente che la Sua vita è vuota?', true),
        gds(4, 'Si annoia spesso?', true),
        gds(5, 'È di buon umore per la maggior parte del tempo?', false),
        gds(6, 'Ha paura che stia per succederLe qualcosa di brutto?', true),
        gds(7, 'Si sente felice per la maggior parte del tempo?', false),
        gds(8, 'Si sente spesso indifeso/a (privo/a di aiuto)?', true),
        gds(9, 'Preferisce stare a casa anziché uscire e fare cose nuove?', true),
        gds(10, 'Sente di avere più problemi di memoria della maggior parte degli altri?', true),
        gds(11, 'Pensa che sia meraviglioso essere vivo/a in questo momento?', false),
        gds(12, 'Si sente del tutto inutile nello stato in cui si trova ora?', true),
        gds(13, 'Si sente pieno/a di energia?', false),
        gds(14, 'Sente che la Sua situazione sia disperata?', true),
        gds(15, 'Pensa che la maggior parte della gente stia meglio di Lei?', true),
      ],
    },
  ],
  scoring: 'sum',
  maximum: 15,
  totalLabel: 'Punteggio:',
  bandsTitle: 'Istruzioni per il Calcolo del Punteggio',
  scoringNotes: [
    'Assegnare 1 punto per ciascuna risposta di tipo depressivo:',
    '• Risposta NO alle domande: 1, 5, 7, 11, 13',
    '• Risposta SÌ alle domande: 2, 3, 4, 6, 8, 9, 10, 12, 14, 15',
  ],
  bandsStyle: 'table',
  bandColumns: ['Punteggio Totale', 'Significato Clinico', 'Intervento consigliato'],
  bands: [
    {
      id: 'none',
      min: 0,
      max: 5,
      range: '0 - 5 punti',
      title: 'Normalità',
      text: 'Assenza di sintomi depressivi clinicamente rilevanti.',
      label: 'Normalità',
      tone: 'green',
    },
    {
      id: 'mild_moderate',
      min: 6,
      max: 9,
      range: '6 - 9 punti',
      title: 'Depressione lieve-moderata',
      text: "Suggerisce l'opportunità di un approfondimento clinico.",
      label: 'Depressione lieve-moderata',
      tone: 'yellow',
    },
    {
      id: 'severe',
      min: 10,
      max: 15,
      range: '10 - 15 punti',
      title: 'Depressione grave',
      text: 'Forte indicazione di stato depressivo. Richiede valutazione medica.',
      label: 'Depressione grave',
      tone: 'red',
    },
  ],
  signature: false,
  pageNumbers: false,
  notes: true,
};

export const MNA_SF_PAPER: PaperScale = {
  type: 'mna',
  version: 'mna-sf-it-2026-10-03-v2',
  sourceSha256: '03f7a6e758cb3ac82efb7a61994f17403f291b8e95189bd50d33ecf0b2847d52',
  appTitle: 'MNA®-SF',
  appDescription: 'Screening rapido dello stato nutrizionale (Short-Form, 0–14).',
  title: 'Scala MNA®-SF (Mini Nutritional Assessment Short-Form)',
  subtitle:
    'Strumento di screening rapido validato per la valutazione dello stato nutrizionale del paziente geriatrico.',
  header: 'plain-left',
  accent: '#2F6DB5',
  fields: [
    { id: 'patient', label: 'Nome Paziente' },
    { id: 'date', label: 'Data' },
    { id: 'weight', label: 'Peso (kg)' },
    { id: 'height', label: 'Altezza (m)' },
    { id: 'operator', label: 'Operatore' },
  ],
  layout: 'stacked',
  columns: ['Quesito', 'Opzioni', 'Punti'],
  sectionStyle: 'heading',
  sections: [
    {
      id: 'screening',
      title: 'QUESITI DI SCREENING',
      maximum: 14,
      items: [
        {
          key: 'a',
          number: 'A',
          label:
            "Il paziente ha mostrato una riduzione dell'assunzione di cibo negli ultimi 3 mesi?",
          note: '(A causa di perdita di appetito, problemi digestivi, difficoltà di masticazione o deglutizione)',
          options: [
            o(0, "Grave riduzione dell'assunzione di cibo"),
            o(1, "Moderata riduzione dell'assunzione di cibo"),
            o(2, "Nessuna riduzione dell'assunzione di cibo"),
          ],
        },
        {
          key: 'b',
          number: 'B',
          label: 'Perdita di peso negli ultimi 3 mesi:',
          options: [
            o(0, 'Perdita di peso superiore a 3 kg'),
            o(1, 'Non sa / Non è sicuro'),
            o(2, 'Perdita di peso compresa tra 1 e 3 kg'),
            o(3, 'Nessuna perdita di peso'),
          ],
        },
        {
          key: 'c',
          number: 'C',
          label: 'Mobilità:',
          options: [
            o(0, 'Costretto a letto o in sedia a rotelle'),
            o(1, 'In grado di alzarsi dal letto/sedia ma non esce di casa'),
            o(2, 'Autonomo negli spostamenti (esce di casa)'),
          ],
        },
        {
          key: 'd',
          number: 'D',
          label:
            'Il paziente ha sofferto di stress psicologico o malattie acute negli ultimi 3 mesi?',
          options: [o(0, 'Sì'), o(2, 'No')],
        },
        {
          key: 'e',
          number: 'E',
          label: 'Problemi neuropsicologici:',
          options: [
            o(0, 'Demenza grave o depressione grave'),
            o(1, 'Demenza moderata'),
            o(2, 'Nessun problema psicologico'),
          ],
        },
        {
          key: 'f1',
          number: 'F1',
          label: 'Indice di Massa Corporea (BMI): [Peso kg / (Altezza m)²]',
          note: '(In alternativa, se il BMI non è disponibile, utilizzare la domanda F2 sulla circonferenza del polpaccio)',
          group: 'f',
          options: [
            o(0, 'BMI inferiore a 19'),
            o(1, 'BMI da 19 a meno di 21'),
            o(2, 'BMI da 21 a meno di 23'),
            o(3, 'BMI uguale o superiore a 23'),
          ],
        },
        {
          key: 'f2',
          number: 'F2',
          label: 'Circonferenza del polpaccio (CC):',
          note: '(Da usare SOLO se non è possibile calcolare il BMI)',
          group: 'f',
          options: [
            o(0, 'Circonferenza polpaccio minore di 31 cm'),
            o(3, 'Circonferenza polpaccio uguale o maggiore di 31 cm'),
          ],
        },
      ],
    },
  ],
  scoring: 'sum',
  maximum: 14,
  totalLabel: 'PUNTEGGIO TOTALE (Massimo 14 punti):',
  bandsTitle: 'INTERPRETAZIONE DEI RISULTATI',
  bandsStyle: 'table',
  bandColumns: ['Punteggio', 'Stato Nutrizionale', 'Soglia di Intervento'],
  bands: [
    {
      id: 'normal',
      min: 12,
      max: 14,
      range: '12 - 14 punti',
      title: 'Stato nutrizionale normale',
      text: 'Nessun intervento richiesto. Monitoraggio periodico.',
      label: 'Stato nutrizionale normale',
      tone: 'green',
    },
    {
      id: 'at_risk',
      min: 8,
      max: 11,
      range: '8 - 11 punti',
      title: 'Rischio di malnutrizione',
      text: 'Monitoraggio attento del peso, rivalutazione periodica.',
      label: 'Rischio di malnutrizione',
      tone: 'yellow',
    },
    {
      id: 'malnourished',
      min: 0,
      max: 7,
      range: '0 - 7 punti',
      title: 'Malnutrito',
      text: 'Necessita di intervento nutrizionale e valutazione medica.',
      label: 'Malnutrito',
      tone: 'red',
    },
  ],
  signature: false,
  pageNumbers: false,
  notes: false,
  measures: ['weightKg', 'heightM', 'calfCm'],
};

export const UCLA_NPI_SLEEP_PAPER: PaperScale = {
  type: 'ucla_npi_sleep',
  version: 'ucla-npi-sleep-it-2026-10-03-v1',
  sourceSha256: 'cce5879fc77b7027ee5d078ded1287096de92be6674280aeb4bcb122656d9bef',
  appTitle: 'UCLA · Ritmo sonno-veglia (NPI)',
  appDescription: 'Item Sonno del Neuropsychiatric Inventory: frequenza × gravità (0–12).',
  title: 'Scale Cliniche UCLA per il Ritmo Sonno-Veglia',
  subtitle: 'UCLA Neuropsychiatric Inventory (NPI) - Item Sonno',
  header: 'plain-center',
  accent: '#0B5A5E',
  fields: [
    { id: 'patient', label: 'Paziente' },
    { id: 'date', label: 'Data' },
    { id: 'operator', label: 'Operatore' },
  ],
  intro:
    "In ambito neuro-geriatrico e psicogeriatrico, l'NPI della UCLA è lo standard d'oro per valutare i disturbi comportamentali nelle demenze (es. Alzheimer). L'area specifica del sonno esplora le inversioni del ritmo circadiano e i comportamenti notturni problematici.",
  layout: 'stacked',
  columns: ['Parametro', 'Punteggio / Descrizione'],
  sectionStyle: 'heading',
  sections: [
    {
      id: 'npi',
      title: '1. UCLA Neuropsychiatric Inventory (NPI) - Item Sonno',
      maximum: 12,
      items: [
        {
          key: 'frequency',
          number: '',
          label: 'Frequenza',
          options: [
            o(0, 'Mai'),
            o(1, 'Raramente (< 1 volta a settimana)'),
            o(2, 'Talvolta (≥ 1 volta a settimana)'),
            o(3, 'Frequentemente (più volte a settimana)'),
            o(4, 'Quasi costantemente (1 o più volte al giorno)'),
          ],
        },
        {
          key: 'severity',
          number: '',
          label: 'Gravità',
          note: '(Solo se la frequenza è diversa da 0)',
          dependsOn: 'frequency',
          options: [
            o(1, 'Lieve (nessun particolare disturbo per il paziente)'),
            o(2, 'Moderata (comporta disturbo evidente)'),
            o(3, 'Severa (molto disturbante, richiede farmaci)'),
          ],
        },
        {
          key: 'distress',
          number: '',
          label: 'Stress del caregiver',
          note: '(Solo se la frequenza è diversa da 0; non entra nel punteggio)',
          dependsOn: 'frequency',
          excludedFromTotal: true,
          options: [
            o(0, 'Nessuno'),
            o(1, 'Minimo'),
            o(2, 'Lieve'),
            o(3, 'Moderato'),
            o(4, 'Severo'),
            o(5, 'Molto severo o estremo'),
          ],
        },
      ],
    },
  ],
  scoring: 'npi',
  maximum: 12,
  totalLabel: 'Moltiplicazione (Frequenza × Gravità) =',
  bandsTitle: 'Punteggio Totale',
  bandsStyle: 'bullets',
  bands: [
    {
      id: 'absent',
      min: 0,
      max: 0,
      range: '0 punti:',
      title: '',
      text: 'Frequenza 0 (Mai): disturbo assente, punteggio 0.',
      label: 'Disturbo del sonno assente',
      tone: 'green',
    },
    {
      id: 'present',
      min: 1,
      max: 12,
      range: '1 – 12 punti:',
      title: '',
      text: 'Genera un valore da 1 a 12. Un valore elevato indica una severa alterazione del ritmo circadiano.',
      label: 'Disturbo del sonno presente',
      tone: 'yellow',
    },
  ],
  signature: false,
  pageNumbers: false,
  notes: false,
};

export const PAPER_SCALES: readonly PaperScale[] = [
  PAINAD_PAPER,
  BARTHEL_PAPER,
  TINETTI_PAPER,
  GDS15_PAPER,
  MNA_SF_PAPER,
  UCLA_NPI_SLEEP_PAPER,
];
