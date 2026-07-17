import type {
  Operatore, Consegna, SlotAgenda,
  RecordClinico, RecordTerapia, ParametroVitale, Allergia, Farmaco,
  UtenteApp, Appuntamento, Camera, ScheduleOperatore, Nota,
  GiornoSettimana, CartellaPaziente,
  TherapySlot, TherapySlotPatient,
} from './types';

// ── Default clinical cartella factory ─────────────────────────────────────────

// BUG-063 (#101): this default must NOT contain demo clinical data. It is the fallback for ANY
// patient whose backend cartella is empty, so hardcoded allergie/diagnosi/farmaci/parametri here
// leaked onto EVERY patient ("sempre le stesse allergie"). Return an EMPTY cartella so each patient
// shows only its own backend-stored data. Real data still merges over this base in loadCartella.
export function createDefaultCartella(pazienteId: string, operatoreId = 'op1'): CartellaPaziente {
  return {
    pazienteId,
    indirizzo: '',
    contattoEmergenzaNome: '',
    contattoEmergenzaTel: '',
    contattoEmergenzaRel: '',
    medicoCurante: '',
    codiceFiscale: '',
    operatoreId,
    cameraNumero: '',
    lettoNumero: '',
    repartoRicovero: '',
    statoRicovero: 'ambulatoriale',
    dataRicovero: today(),
    noteGenerali: '',
    anamnesi: {
      fisiologica: '',
      patologicaRemota: '',
      patologicaProssima: '',
      familiare: '',
      lavorativa: '',
      abitudini: '',
      note: '',
      updatedAt: today() + 'T00:00:00',
      operatore: '',
    },
    diagnosi: [],
    terapie: [],
    farmaci: [],
    allergie: [],
    noteClinica: [],
    visite: [],
    parametriVitali: [],
    interventi: [],
    pianoCura: {
      obiettivi: '',
      interventiPrevisti: '',
      notePianificazione: '',
      dataAggiornamento: today(),
      operatore: '',
    },
    indicatoriRischio: [],
    presaInCarico: undefined,
    documentiConsegnati: [],
    diarioInfermieristico: [],
    diarioMedico: [],
    medicazioniFerite: [],
    contenzioni: [],
    valutazioniBraden: [],
    dimissione: undefined,
    liberatoria: undefined,
  };
}

// ── Today helpers ──────────────────────────────────────────────────────────────

function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export const UTENTE_ADMIN: UtenteApp = {
  id: 'admin1',
  nome: 'Admin Sistema',
  ruolo: 'admin',
  iniziali: 'AS',
  reparto: 'Amministrazione',
};

export const UTENTE_OPERATORE: UtenteApp = {
  id: 'op1',
  nome: 'Dr. Marco Ferretti',
  ruolo: 'operatore',
  iniziali: 'MF',
  reparto: 'Cardiologia',
};

// ── Operatori ──────────────────────────────────────────────────────────────────

export const MOCK_OPERATORI: Operatore[] = [
  {
    id: 'op1', nome: 'Marco', cognome: 'Ferretti', ruolo: 'medico',
    email: 'marco.ferretti@clinicos.it', telefono: '+39 02 1234 5678',
    reparto: 'Cardiologia', stato: 'attivo',
    pazientiAssegnati: 12, appuntamentiOggi: 5, iniziali: 'MF',
    colore: '#2F6BED',
    note: 'Specialista in cardiologia interventistica.',
  },
  {
    id: 'op2', nome: 'Sofia', cognome: 'Moretti', ruolo: 'medico',
    email: 'sofia.moretti@clinicos.it', telefono: '+39 02 1234 5679',
    reparto: 'Medicina Interna', stato: 'attivo',
    pazientiAssegnati: 8, appuntamentiOggi: 4, iniziali: 'SM',
    colore: '#0D9488',
  },
  {
    id: 'op3', nome: 'Giulia', cognome: 'Bianchi', ruolo: 'infermiere',
    email: 'giulia.bianchi@clinicos.it', telefono: '+39 02 1234 5680',
    reparto: 'Reparto Generale', stato: 'attivo',
    pazientiAssegnati: 15, appuntamentiOggi: 7, iniziali: 'GB',
    colore: '#6C4BD1',
  },
  {
    id: 'op4', nome: 'Luca', cognome: 'Esposito', ruolo: 'infermiere',
    email: 'luca.esposito@clinicos.it', telefono: '+39 02 1234 5681',
    reparto: 'Pronto Soccorso', stato: 'attivo',
    pazientiAssegnati: 10, appuntamentiOggi: 3, iniziali: 'LE',
    colore: '#C77700',
  },
  {
    id: 'op5', nome: 'Alessandro', cognome: 'Ricci', ruolo: 'coordinatore',
    email: 'alessandro.ricci@clinicos.it', telefono: '+39 02 1234 5682',
    reparto: 'Oncologia', stato: 'inattivo',
    pazientiAssegnati: 0, appuntamentiOggi: 0, iniziali: 'AR',
    colore: '#8B5CF6',
  },
];

// ── Consegne ───────────────────────────────────────────────────────────────────

export const MOCK_CONSEGNE: Consegna[] = [
  {
    id: 'c1', pazienteId: '', pazienteNome: 'Rossi, Giovanni',
    priorita: 'urgente', stato: 'aperta', tipo: 'Monitoraggio',
    note: 'Monitorare PA ogni 2 ore. Se >180/110 chiamare il medico di guardia immediatamente.',
    scadenza: today(), oraScadenza: '08:00',
    operatoreAssegnato: 'Giulia Bianchi', creatoDA: 'Dr. Marco Ferretti',
    createdAt: today() + 'T22:00:00',
  },
  {
    id: 'c2', pazienteId: '', pazienteNome: 'Esposito, Maria',
    priorita: 'alta', stato: 'aperta', tipo: 'Terapia',
    note: 'Somministrazione antibiotico ore 14:00 e 22:00.',
    scadenza: today(), oraScadenza: '14:00',
    operatoreAssegnato: 'Luca Esposito', creatoDA: 'Dr.ssa Sofia Moretti',
    createdAt: today() + 'T07:00:00',
  },
  {
    id: 'c3', pazienteId: '', pazienteNome: 'Verdi, Luigi',
    priorita: 'normale', stato: 'in_corso', tipo: 'Esami',
    note: 'Richiedere esami ematici urgenti: emocromo, PCR, procalcitonina.',
    scadenza: today(), oraScadenza: '16:00',
    operatoreAssegnato: 'Dr. Marco Ferretti', creatoDA: 'Dr.ssa Sofia Moretti',
    createdAt: today() + 'T08:30:00',
  },
  {
    id: 'c4', pazienteId: '', pazienteNome: 'Neri, Carla',
    priorita: 'alta', stato: 'in_corso', tipo: 'Dimissione',
    note: 'Preparare lettera di dimissione e istruzioni per il paziente.',
    scadenza: today(), oraScadenza: '17:00',
    operatoreAssegnato: 'Dr. Marco Ferretti', creatoDA: 'Dr. Marco Ferretti',
    createdAt: today() + 'T09:00:00',
  },
  {
    id: 'c5', pazienteId: '', pazienteNome: 'Colombo, Piero',
    priorita: 'normale', stato: 'completata', tipo: 'Medicazione',
    note: 'Cambio medicazione ferita chirurgica. Eseguito alle 10:30.',
    scadenza: today(), oraScadenza: '10:00',
    operatoreAssegnato: 'Giulia Bianchi', creatoDA: 'Dr. Marco Ferretti',
    createdAt: today(-1) + 'T20:00:00',
  },
  {
    id: 'c6', pazienteId: '', pazienteNome: 'Ferrari, Anna',
    priorita: 'urgente', stato: 'aperta', tipo: 'Consultazione',
    note: 'Richiedere consulenza cardiologica urgente.',
    scadenza: today(), oraScadenza: '11:00',
    operatoreAssegnato: 'Dr. Marco Ferretti', creatoDA: 'Luca Esposito',
    createdAt: today() + 'T10:00:00',
  },
  {
    id: 'c7', pazienteId: '', pazienteNome: 'Romano, Marco',
    priorita: 'normale', stato: 'aperta', tipo: 'Rivalutazione',
    note: 'Rivalutazione clinica post-intervento.',
    scadenza: today(1), oraScadenza: '09:00',
    operatoreAssegnato: 'Dr.ssa Sofia Moretti', creatoDA: 'Dr. Marco Ferretti',
    createdAt: today() + 'T11:00:00',
  },
];

// ── Agenda slots (legacy, keep for operator dashboard widget) ──────────────────

export const MOCK_AGENDA: SlotAgenda[] = [
  { id: 'a1', ora: '08:30', pazienteNome: 'García, María',   motivo: 'Controllo post-operatorio',   stato: 'completato', operatoreId: 'op1' },
  { id: 'a2', ora: '09:00', pazienteNome: 'López, Carlos',   motivo: 'Revisione ipertensione',      stato: 'completato', operatoreId: 'op1' },
  { id: 'a3', ora: '09:30', pazienteNome: 'Martínez, Ana',   motivo: 'Visita annuale',              stato: 'in_corso',   operatoreId: 'op1' },
  { id: 'a4', ora: '10:30', pazienteNome: 'Rodríguez, Juan', motivo: 'Valutazione dolore toracico', stato: 'programmato', operatoreId: 'op1' },
  { id: 'a5', ora: '11:00', pazienteNome: null,              motivo: '',                             stato: 'libero'      },
  { id: 'a6', ora: '14:00', pazienteNome: 'Sánchez, Elena',  motivo: 'Gestione diabete',            stato: 'programmato', operatoreId: 'op1' },
  { id: 'a7', ora: '15:30', pazienteNome: 'Torres, Miguel',  motivo: 'ECG + Risultati analisi',     stato: 'programmato', operatoreId: 'op2' },
];

// ── Appuntamenti ───────────────────────────────────────────────────────────────

export const MOCK_APPUNTAMENTI: Appuntamento[] = [
  {
    id: 'apt1', data: today(), ora: '08:30', durata: 30,
    pazienteId: null, pazienteNome: 'García, María',
    operatoreId: 'op1', operatoreNome: 'Ferretti Marco',
    tipoIntervento: 'controllo', stato: 'completato', priorita: 'normale',
    note: 'Controllo post-operatorio routine.',
  },
  {
    id: 'apt2', data: today(), ora: '09:00', durata: 60,
    pazienteId: null, pazienteNome: 'López, Carlos',
    operatoreId: 'op1', operatoreNome: 'Ferretti Marco',
    tipoIntervento: 'visita', stato: 'completato', priorita: 'normale',
    note: 'Revisione ipertensione arteriosa.',
  },
  {
    id: 'apt3', data: today(), ora: '10:30', durata: 30,
    pazienteId: null, pazienteNome: 'Martínez, Ana',
    operatoreId: 'op1', operatoreNome: 'Ferretti Marco',
    tipoIntervento: 'follow-up', stato: 'in_corso', priorita: 'normale',
    note: 'Visita annuale. Monitoraggio ECG.',
  },
  {
    id: 'apt4', data: today(), ora: '09:00', durata: 60,
    pazienteId: null, pazienteNome: 'Verdi, Luigi',
    operatoreId: 'op2', operatoreNome: 'Moretti Sofia',
    tipoIntervento: 'visita', stato: 'completato', priorita: 'normale',
    note: '',
  },
  {
    id: 'apt5', data: today(), ora: '11:00', durata: 30,
    pazienteId: null, pazienteNome: 'Neri, Carla',
    operatoreId: 'op2', operatoreNome: 'Moretti Sofia',
    tipoIntervento: 'consulto', stato: 'programmato', priorita: 'alta',
    note: 'Consulto pre-dimissione.',
  },
  {
    id: 'apt6', data: today(), ora: '14:00', durata: 30,
    pazienteId: null, pazienteNome: 'Rossi, Giovanni',
    operatoreId: 'op3', operatoreNome: 'Bianchi Giulia',
    tipoIntervento: 'procedura', stato: 'programmato', priorita: 'urgente',
    note: 'Medicazione e monitoraggio PA.',
  },
  {
    id: 'apt7', data: today(), ora: '15:00', durata: 60,
    pazienteId: null, pazienteNome: 'Sánchez, Elena',
    operatoreId: 'op1', operatoreNome: 'Ferretti Marco',
    tipoIntervento: 'controllo', stato: 'programmato', priorita: 'normale',
    note: 'Controllo diabete.',
  },
  {
    id: 'apt8', data: today(1), ora: '09:00', durata: 30,
    pazienteId: null, pazienteNome: 'Romano, Marco',
    operatoreId: 'op1', operatoreNome: 'Ferretti Marco',
    tipoIntervento: 'follow-up', stato: 'programmato', priorita: 'normale',
    note: 'Rivalutazione post-intervento.',
  },
  {
    id: 'apt9', data: today(1), ora: '10:00', durata: 60,
    pazienteId: null, pazienteNome: 'Ferrari, Anna',
    operatoreId: 'op4', operatoreNome: 'Esposito Luca',
    tipoIntervento: 'urgenza', stato: 'programmato', priorita: 'urgente',
    note: 'Valutazione dolore toracico.',
  },
  {
    id: 'apt10', data: today(-1), ora: '09:30', durata: 30,
    pazienteId: null, pazienteNome: 'Colombo, Piero',
    operatoreId: 'op1', operatoreNome: 'Ferretti Marco',
    tipoIntervento: 'visita', stato: 'completato', priorita: 'normale',
    note: 'Visita di controllo.',
  },
];

// ── Cameras e Letti ────────────────────────────────────────────────────────────

export const MOCK_CAMERE: Camera[] = [
  {
    id: 'cam101', numero: '101', tipo: 'singola', piano: '1°', reparto: 'Cardiologia',
    stato: 'attiva', note: 'Camera con monitoraggio continuo.',
    letti: [
      { id: 'l101a', numero: 1, stato: 'occupato', pazienteNome: 'Rossi, Giovanni', note: 'PA monitorata' },
    ],
  },
  {
    id: 'cam102', numero: '102', tipo: 'singola', piano: '1°', reparto: 'Cardiologia',
    stato: 'attiva', note: '',
    letti: [
      { id: 'l102a', numero: 1, stato: 'libero' },
    ],
  },
  {
    id: 'cam201', numero: '201', tipo: 'doppia', piano: '2°', reparto: 'Medicina Interna',
    stato: 'attiva', note: '',
    letti: [
      { id: 'l201a', numero: 1, stato: 'occupato', pazienteNome: 'Verdi, Luigi' },
      { id: 'l201b', numero: 2, stato: 'libero' },
    ],
  },
  {
    id: 'cam202', numero: '202', tipo: 'doppia', piano: '2°', reparto: 'Medicina Interna',
    stato: 'attiva', note: '',
    letti: [
      { id: 'l202a', numero: 1, stato: 'occupato', pazienteNome: 'Neri, Carla' },
      { id: 'l202b', numero: 2, stato: 'occupato', pazienteNome: 'Esposito, Maria' },
    ],
  },
  {
    id: 'cam301', numero: '301', tipo: 'singola', piano: '3°', reparto: 'Oncologia',
    stato: 'attiva', note: 'In attesa di manutenzione straordinaria.',
    letti: [
      { id: 'l301a', numero: 1, stato: 'manutenzione' },
    ],
  },
  {
    id: 'camPS01', numero: 'PS-01', tipo: 'singola', piano: 'PT', reparto: 'Pronto Soccorso',
    stato: 'attiva', note: 'Camera isolamento PS.',
    letti: [
      { id: 'lPS01a', numero: 1, stato: 'occupato', pazienteNome: 'Ferrari, Anna', note: 'Urgenza cardiaca' },
    ],
  },
];

// ── Schedules ──────────────────────────────────────────────────────────────────

const GIORNI_LAVORATIVI: GiornoSettimana[] = ['lunedi','martedi','mercoledi','giovedi','venerdi'];

export const MOCK_SCHEDULES: ScheduleOperatore[] = [
  {
    id: 'sch1', operatoreId: 'op1', note: 'Disponibile per urgenze anche il sabato mattina.',
    turni: GIORNI_LAVORATIVI.map(g => ({ giorno: g, oraInizio: '08:00', oraFine: '18:00', disponibile: true })),
  },
  {
    id: 'sch2', operatoreId: 'op2', note: '',
    turni: GIORNI_LAVORATIVI.map(g => ({ giorno: g, oraInizio: '09:00', oraFine: '17:00', disponibile: true })),
  },
  {
    id: 'sch3', operatoreId: 'op3', note: 'Turno mattina.',
    turni: (['lunedi','martedi','mercoledi','giovedi','venerdi','sabato'] as GiornoSettimana[])
      .map(g => ({ giorno: g, oraInizio: '07:00', oraFine: '15:00', disponibile: true })),
  },
  {
    id: 'sch4', operatoreId: 'op4', note: 'Turno pomeriggio/sera.',
    turni: (['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'] as GiornoSettimana[])
      .map(g => ({ giorno: g, oraInizio: '15:00', oraFine: '23:00', disponibile: true })),
  },
];

// ── Note/Messaggi ──────────────────────────────────────────────────────────────

export const MOCK_NOTE: Nota[] = [
  {
    id: 'n1', autoreId: 'op1', autoreNome: 'Dr. Marco Ferretti',
    destinatarioId: 'op3', destinatarioNome: 'Giulia Bianchi',
    pazienteNome: 'Rossi, Giovanni', priorita: 'urgente', stato: 'non_letta',
    messaggio: 'Monitorare PA ogni 2 ore. Se >180/110 chiamare immediatamente.',
    createdAt: today() + 'T07:30:00',
  },
  {
    id: 'n2', autoreId: 'op2', autoreNome: 'Dr.ssa Sofia Moretti',
    destinatarioId: 'admin', destinatarioNome: 'Amministrazione',
    priorita: 'alta', stato: 'letta',
    messaggio: 'Richiedere consulenza cardiologica per paziente Martínez. Urgenza relativa.',
    createdAt: today() + 'T08:15:00',
  },
  {
    id: 'n3', autoreId: 'op4', autoreNome: 'Luca Esposito',
    destinatarioId: 'tutti', destinatarioNome: 'Tutti gli operatori',
    priorita: 'alta', stato: 'non_letta',
    messaggio: 'Attenzione: aggiornare protocollo igienico reparto PS. Nuove disposizioni in vigore da oggi.',
    createdAt: today() + 'T09:00:00',
  },
  {
    id: 'n4', autoreId: 'op1', autoreNome: 'Dr. Marco Ferretti',
    destinatarioId: 'op2', destinatarioNome: 'Dr.ssa Sofia Moretti',
    pazienteNome: 'Neri, Carla', priorita: 'normale', stato: 'letta',
    messaggio: 'Preparare lettera di dimissione per Neri, Carla. Da completare entro le 17:00.',
    createdAt: today() + 'T10:30:00',
  },
  {
    id: 'n5', autoreId: 'op3', autoreNome: 'Giulia Bianchi',
    destinatarioId: 'admin', destinatarioNome: 'Amministrazione',
    priorita: 'normale', stato: 'risolta',
    messaggio: 'Richiesta fornitura materiale sterile reparto. Scorte in esaurimento.',
    createdAt: today(-1) + 'T16:00:00',
  },
];

// ── Cartella clinica ───────────────────────────────────────────────────────────

export const MOCK_STORIA_CLINICA: RecordClinico[] = [
  { data: '2024-11-12', tipo: 'Consulto', descrizione: 'Visita annuale. Paziente riferisce affaticamento e lieve dispnea da sforzo. PA elevata 142/90.', operatore: 'Dr. A. Martínez', stato: 'risolto' },
  { data: '2024-08-03', tipo: 'Urgenza', descrizione: 'Valutazione dolore toracico. ECG nella norma. Troponina I negativa ×2. Dimesso stabile.', operatore: 'Dr. R. Okonkwo', stato: 'risolto' },
  { data: '2024-03-15', tipo: 'Follow-up', descrizione: 'Revisione ipertensione. PA in miglioramento con terapia combinata. Aderenza confermata.', operatore: 'Dr. A. Martínez', stato: 'attivo' },
  { data: '2023-10-22', tipo: 'Procedura', descrizione: 'Ecocardiogramma: FE 58%. Lieve rigurgito mitralico. Nessuna anomalia strutturale significativa.', operatore: 'Dr. C. Nakamura', stato: 'monitoraggio' },
  { data: '2023-05-09', tipo: 'Diagnosi', descrizione: 'Ipertensione essenziale (I10) diagnosticata. Avviata counselling su modifiche dello stile di vita.', operatore: 'Dr. A. Martínez', stato: 'attivo' },
];

export const MOCK_STORIA_TERAPIA: RecordTerapia[] = [
  { data: '2024-11-12', trattamento: 'Losartan', dosaggio: '50 mg 1×/die', note: 'Continuato. Risposta pressoria soddisfacente.', operatore: 'Dr. A. Martínez' },
  { data: '2024-08-03', trattamento: 'Aspirina', dosaggio: '300 mg stat', note: 'Somministrata al PS durante accertamento per dolore toracico.', operatore: 'Dr. R. Okonkwo' },
  { data: '2024-03-15', trattamento: 'Amlodipina', dosaggio: '5 mg 1×/die', note: 'Aggiunta per controllo pressorio insufficiente in monoterapia.', operatore: 'Dr. A. Martínez' },
  { data: '2023-10-22', trattamento: 'Ecocardiogramma', note: 'Esame cardiologico per valutazione strutturale.', operatore: 'Dr. C. Nakamura' },
  { data: '2023-05-09', trattamento: 'Intervento sullo stile di vita', note: 'Dieta DASH, sodio <2 g/die, attività aerobica 150 min/settimana.', operatore: 'Dr. A. Martínez' },
];

export const MOCK_PARAMETRI_VITALI: ParametroVitale[] = [
  { etichetta: 'Pressione Arteriosa', valore: '138/86', unita: 'mmHg',  stato: 'attenzione', rilevato: '2024-11-12' },
  { etichetta: 'Frequenza Cardiaca',  valore: '74',     unita: 'bpm',   stato: 'normale',    rilevato: '2024-11-12' },
  { etichetta: 'SpO₂',               valore: '97',     unita: '%',     stato: 'normale',    rilevato: '2024-11-12' },
  { etichetta: 'Temperatura',         valore: '36,8',   unita: '°C',    stato: 'normale',    rilevato: '2024-11-12' },
  { etichetta: 'BMI',                 valore: '27,4',   unita: 'kg/m²', stato: 'attenzione', rilevato: '2024-11-12' },
  { etichetta: 'Glicemia',            valore: '5,2',    unita: 'mmol/L',stato: 'normale',    rilevato: '2024-11-12' },
];

export const MOCK_ALLERGIE: Allergia[] = [
  { allergene: 'Penicillina',       reazione: 'Anafilassi',            gravita: 'grave',    documentato: '2020-03-14' },
  { allergene: 'FANS (Ibuprofene)', reazione: 'Ulcera gastrica',       gravita: 'moderata', documentato: '2021-07-22' },
  { allergene: 'Lattice',           reazione: 'Dermatite da contatto', gravita: 'lieve',    documentato: '2022-01-05' },
];

export const MOCK_FARMACI: Farmaco[] = [
  { nome: 'Losartan',   dose: '50 mg', frequenza: '1×/die', inizio: '2023-05-09' },
  { nome: 'Amlodipina', dose: '5 mg',  frequenza: '1×/die', inizio: '2024-03-15' },
  { nome: 'Aspirina',   dose: '75 mg', frequenza: '1×/die', inizio: '2024-08-03' },
];

// ── Therapy Slots (Agenda) ───────────────────────────────────────────────────

export function createMockTherapySlots(_data: string): TherapySlot[] {
  const mockPatients: TherapySlotPatient[] = [
    {
      patientId: 'tp1',
      firstName: 'Giovanni',
      lastName: 'Rossi',
      room: '101',
      bed: '1',
      administrations: [
        { administrationId: 'a1', therapyId: 'th1', drugName: 'Losartan', dosage: '50 mg', route: 'orale', scheduledTime: '08:00', status: 'administered', administeredAt: _data + 'T08:05:00', administeredBy: 'Giulia Bianchi', notAdministeredReason: null },
        { administrationId: 'a2', therapyId: 'th2', drugName: 'Aspirina', dosage: '100 mg', route: 'orale', scheduledTime: '08:00', status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null },
      ],
    },
    {
      patientId: 'tp2',
      firstName: 'Maria',
      lastName: 'Esposito',
      room: '202',
      bed: '2',
      administrations: [
        { administrationId: 'a3', therapyId: 'th3', drugName: 'Amlodipina', dosage: '5 mg', route: 'orale', scheduledTime: '08:00', status: 'administered', administeredAt: _data + 'T08:10:00', administeredBy: 'Giulia Bianchi', notAdministeredReason: null },
        { administrationId: null, therapyId: 'th4', drugName: 'Atorvastatina', dosage: '20 mg', route: 'orale', scheduledTime: '08:00', status: 'not_administered', administeredAt: null, administeredBy: null, notAdministeredReason: 'rifiutata_paziente' },
      ],
    },
    {
      patientId: 'tp3',
      firstName: 'Luigi',
      lastName: 'Verdi',
      room: '201',
      bed: '1',
      administrations: [
        { administrationId: null, therapyId: 'th5', drugName: 'Furosemide', dosage: '25 mg', route: 'ev', scheduledTime: '08:00', status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null },
      ],
    },
  ];

  const pranzoPatients: TherapySlotPatient[] = [
    {
      patientId: 'tp1',
      firstName: 'Giovanni',
      lastName: 'Rossi',
      room: '101',
      bed: '1',
      administrations: [
        { administrationId: null, therapyId: 'th6', drugName: 'Insulina', dosage: '10 UI', route: 'sc', scheduledTime: '12:00', status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null },
      ],
    },
    {
      patientId: 'tp3',
      firstName: 'Luigi',
      lastName: 'Verdi',
      room: '201',
      bed: '1',
      administrations: [
        { administrationId: null, therapyId: 'th7', drugName: 'Metformina', dosage: '500 mg', route: 'orale', scheduledTime: '12:00', status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null },
      ],
    },
  ];

  const pomeriggioPatientsData: TherapySlotPatient[] = [
    {
      patientId: 'tp2',
      firstName: 'Maria',
      lastName: 'Esposito',
      room: '202',
      bed: '2',
      administrations: [
        { administrationId: null, therapyId: 'th8', drugName: 'Omeprazolo', dosage: '20 mg', route: 'orale', scheduledTime: '16:00', status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null },
        { administrationId: null, therapyId: 'th9', drugName: 'Enoxaparina', dosage: '4000 UI', route: 'sc', scheduledTime: '16:00', status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null },
      ],
    },
  ];

  return [
    {
      id: 'ts-mattina',
      fascia: 'mattina',
      label: 'Terapia Mattina',
      ora: '08:00',
      summary: { total: 5, administered: 2, notAdministered: 1, pending: 2 },
      patients: mockPatients,
    },
    {
      id: 'ts-pranzo',
      fascia: 'pranzo',
      label: 'Terapia Pranzo',
      ora: '12:00',
      summary: { total: 2, administered: 0, notAdministered: 0, pending: 2 },
      patients: pranzoPatients,
    },
    {
      id: 'ts-pomeriggio',
      fascia: 'pomeriggio',
      label: 'Terapia Pomeriggio',
      ora: '16:00',
      summary: { total: 2, administered: 0, notAdministered: 0, pending: 2 },
      patients: pomeriggioPatientsData,
    },
    {
      id: 'ts-sera',
      fascia: 'sera',
      label: 'Terapia Sera',
      ora: '20:00',
      summary: { total: 0, administered: 0, notAdministered: 0, pending: 0 },
      patients: [],
    },
    {
      id: 'ts-notte',
      fascia: 'notte',
      label: 'Terapia Notte',
      ora: '22:00',
      summary: { total: 0, administered: 0, notAdministered: 0, pending: 0 },
      patients: [],
    },
  ];
}
