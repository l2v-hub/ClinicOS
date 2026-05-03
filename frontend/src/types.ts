// ── Auth ──────────────────────────────────────────────────────────────────────

export type RuoloUtente = 'admin' | 'operatore';

export interface UtenteApp {
  id: string;
  nome: string;
  ruolo: RuoloUtente;
  iniziali: string;
  reparto: string;
}

// ── Navigation ─────────────────────────────────────────────────────────────────

export type NavKey =
  | 'login'
  | 'admin-dashboard'
  | 'gestione-operatori'
  | 'agenda-admin'
  | 'posti-letto'
  | 'orari-operatori'
  | 'note'
  | 'operator-dashboard'
  | 'pazienti'
  | 'dettaglio-paziente'
  | 'consegne'
  | 'agenda-operatore';

// ── Patient (API) ──────────────────────────────────────────────────────────────

export interface Paziente {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string | null;
  email: string | null;
  phone: string | null;
}

// ── Patient (local/new) ────────────────────────────────────────────────────────

export interface NuovoPaziente {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  notaClinicaIniziale: string;
  allergie: string;
  farmaci: string;
  operatoreId: string;
}

// ── Operator (mock) ────────────────────────────────────────────────────────────

export type StatoOperatore = 'attivo' | 'inattivo';
export type RuoloOperatore = 'medico' | 'infermiere' | 'coordinatore';

export const OPERATOR_COLOR_PALETTE = [
  '#1A56DB', '#0D9488', '#4338CA', '#D97706', '#DC2626',
  '#8B5CF6', '#059669', '#F59E0B', '#EF4444', '#06B6D4',
];

export interface Operatore {
  id: string;
  nome: string;
  cognome: string;
  ruolo: RuoloOperatore;
  email: string;
  telefono: string;
  reparto: string;
  stato: StatoOperatore;
  pazientiAssegnati: number;
  appuntamentiOggi: number;
  iniziali: string;
  colore: string;
  note?: string;
}

// ── Consegna (Handover) ────────────────────────────────────────────────────────

export type PrioritaConsegna = 'normale' | 'alta' | 'urgente';
export type StatoConsegna = 'aperta' | 'in_corso' | 'completata';

export interface Consegna {
  id: string;
  pazienteId: string;
  pazienteNome: string;
  priorita: PrioritaConsegna;
  stato: StatoConsegna;
  tipo: string;
  note: string;
  scadenza: string;
  oraScadenza?: string;
  operatoreAssegnato: string;
  creatoDA: string;
  createdAt: string;
}

// ── Agenda slots (legacy) ──────────────────────────────────────────────────────

export type StatoSlot = 'completato' | 'in_corso' | 'programmato' | 'libero' | 'annullato';

export interface SlotAgenda {
  id: string;
  ora: string;
  pazienteNome: string | null;
  motivo: string;
  stato: StatoSlot;
  operatoreId?: string;
}

// ── Appointment ────────────────────────────────────────────────────────────────

export type StatoAppuntamento = 'programmato' | 'in_corso' | 'completato' | 'annullato';
export type TipoIntervento = 'visita' | 'controllo' | 'procedura' | 'urgenza' | 'consulto' | 'follow-up' | 'altro';

export interface Appuntamento {
  id: string;
  data: string;           // YYYY-MM-DD
  ora: string;            // HH:MM
  durata: number;         // minutes: 30 | 60 | 90 | 120
  pazienteId: string | null;
  pazienteNome: string | null;
  operatoreId: string;
  operatoreNome: string;
  tipoIntervento: TipoIntervento;
  stato: StatoAppuntamento;
  priorita: 'normale' | 'alta' | 'urgente';
  cameraId?: string;
  note: string;
}

// ── Rooms & Beds ───────────────────────────────────────────────────────────────

export type StatoLetto = 'libero' | 'occupato' | 'manutenzione';
export type TipoCamera = 'singola' | 'doppia';

export interface Letto {
  id: string;
  numero: number;
  stato: StatoLetto;
  pazienteId?: string;
  pazienteNome?: string;
  note?: string;
}

export interface Camera {
  id: string;
  numero: string;
  tipo: TipoCamera;
  piano: string;
  reparto: string;
  letti: Letto[];
  stato: 'attiva' | 'inattiva';
  note: string;
}

// ── Operator Schedule ─────────────────────────────────────────────────────────

export type GiornoSettimana = 'lunedi' | 'martedi' | 'mercoledi' | 'giovedi' | 'venerdi' | 'sabato' | 'domenica';

export const GIORNI_SETTIMANA: GiornoSettimana[] = [
  'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica',
];

export const GIORNO_LABEL: Record<GiornoSettimana, string> = {
  lunedi: 'Lun', martedi: 'Mar', mercoledi: 'Mer', giovedi: 'Gio',
  venerdi: 'Ven', sabato: 'Sab', domenica: 'Dom',
};

export interface TurnoOperatore {
  giorno: GiornoSettimana;
  oraInizio: string;
  oraFine: string;
  disponibile: boolean;
}

export interface ScheduleOperatore {
  id: string;
  operatoreId: string;
  turni: TurnoOperatore[];
  note: string;
}

// ── Notes / Messaging ─────────────────────────────────────────────────────────

export type PrioritaNota = 'normale' | 'alta' | 'urgente';
export type StatoNota = 'non_letta' | 'letta' | 'risolta';

export interface Nota {
  id: string;
  autoreId: string;
  autoreNome: string;
  destinatarioId: string;   // operatoreId | 'admin' | 'tutti'
  destinatarioNome: string;
  pazienteId?: string;
  pazienteNome?: string;
  priorita: PrioritaNota;
  messaggio: string;
  stato: StatoNota;
  createdAt: string;
}

// ── Clinical (mock) ────────────────────────────────────────────────────────────

export type StatoClinico = 'attivo' | 'risolto' | 'monitoraggio';

export interface RecordClinico {
  data: string;
  tipo: string;
  descrizione: string;
  operatore: string;
  stato: StatoClinico;
}

export interface RecordTerapia {
  data: string;
  trattamento: string;
  dosaggio?: string;
  note: string;
  operatore: string;
}

export interface ParametroVitale {
  etichetta: string;
  valore: string;
  unita: string;
  stato: 'normale' | 'attenzione' | 'critico';
  rilevato: string;
}

export interface Allergia {
  allergene: string;
  reazione: string;
  gravita: 'lieve' | 'moderata' | 'grave';
  documentato: string;
}

export interface Farmaco {
  nome: string;
  dose: string;
  frequenza: string;
  inizio: string;
}

// ── Extended Clinical Record ──────────────────────────────────────────────────

export interface Anamnesi {
  fisiologica: string;
  patologicaRemota: string;
  patologicaProssima: string;
  familiare: string;
  lavorativa: string;
  abitudini: string;
  note: string;
  updatedAt: string;
  operatore: string;
}

export interface Diagnosi {
  id: string;
  codiceICD?: string;
  descrizione: string;
  tipo: 'principale' | 'secondaria' | 'differenziale' | 'comorbidita';
  stato: 'attiva' | 'risolta' | 'monitoraggio' | 'sospetta';
  dataInsorgenza: string;
  dataRisoluzione?: string;
  operatore: string;
  note: string;
  createdAt: string;
}

export interface TerapiaItem {
  id: string;
  tipo: 'farmacologica' | 'chirurgica' | 'riabilitativa' | 'palliativa' | 'altra';
  descrizione: string;
  dataInizio: string;
  dataFine?: string;
  stato: 'attiva' | 'completata' | 'sospesa';
  operatore: string;
  note: string;
  createdAt: string;
}

export interface FarmacoItem {
  id: string;
  nome: string;
  dose: string;
  frequenza: string;
  via?: string;
  inizio: string;
  fine?: string;
  stato: 'attivo' | 'sospeso' | 'completato';
  prescrittoDA: string;
  indicazione?: string;
  note?: string;
}

export interface AllergiaItem {
  id: string;
  allergene: string;
  reazione: string;
  gravita: 'lieve' | 'moderata' | 'grave';
  documentato: string;
  documentatoDa: string;
  note?: string;
}

export interface NotaClinica {
  id: string;
  tipo: 'clinica' | 'nursing' | 'dietetica' | 'psicologica' | 'fisioterapia' | 'altra';
  contenuto: string;
  operatore: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VisitaRecord {
  id: string;
  tipo: string;
  data: string;
  ora?: string;
  operatore: string;
  descrizione: string;
  esito: string;
  followUp?: string;
  createdAt: string;
}

export interface VitaleItem {
  id: string;
  etichetta: string;
  valore: string;
  unita: string;
  stato: 'normale' | 'attenzione' | 'critico';
  rilevato: string;
  rilevatoDa: string;
  note?: string;
}

export interface Intervento {
  id: string;
  tipo: string;
  data: string;
  operatore: string;
  descrizione: string;
  esito: string;
  note: string;
  createdAt: string;
}

export interface IndicatoreRischio {
  id: string;
  tipo: 'caduta' | 'lesioni_pressione' | 'nutrizione' | 'sepsi' | 'trombosi' | 'dolore' | 'altro';
  livello: 'basso' | 'medio' | 'alto' | 'critico';
  descrizione: string;
  dataValutazione: string;
  operatore: string;
}

export interface PianoCura {
  obiettivi: string;
  interventiPrevisti: string;
  notePianificazione: string;
  dataAggiornamento: string;
  operatore: string;
}

export interface CartellaPaziente {
  pazienteId: string;
  // Extended personal info
  indirizzo?: string;
  contattoEmergenzaNome?: string;
  contattoEmergenzaTel?: string;
  contattoEmergenzaRel?: string;
  medicoCurante?: string;
  codiceFiscale?: string;
  operatoreId?: string;
  cameraNumero?: string;
  lettoNumero?: string;
  repartoRicovero?: string;
  statoRicovero: 'ricoverato' | 'ambulatoriale' | 'day_hospital' | 'dimesso';
  dataRicovero?: string;
  noteGenerali?: string;
  // Clinical sections
  anamnesi: Anamnesi;
  diagnosi: Diagnosi[];
  terapie: TerapiaItem[];
  farmaci: FarmacoItem[];
  allergie: AllergiaItem[];
  noteClinica: NotaClinica[];
  visite: VisitaRecord[];
  parametriVitali: VitaleItem[];
  interventi: Intervento[];
  pianoCura: PianoCura;
  indicatoriRischio: IndicatoreRischio[];
  // Extended clinical modules
  presaInCarico?: PresaInCarico;
  documentiConsegnati: DocumentoConsegnato[];
  diarioInfermieristico: DiarioEntry[];
  diarioMedico: DiarioEntry[];
  medicazioniFerite: MedicazioneRecord[];
  contenzioni: Contenzione[];
  valutazioniBraden: ScalaBradenValutazione[];
  dimissione?: DimissioneInfermieristica;
  liberatoria?: Liberatoria;
}

// ── Presa in Carico ────────────────────────────────────────────────────────────

export interface PresaInCarico {
  dataIngresso: string;
  oraIngresso: string;
  provenienza: 'accesso_diretto' | 'centro_medico' | 'altra_struttura' | 'dimissione_ospedaliera' | 'familiare_caregiver';
  centroInviante?: string;
  modalitaIngresso: 'ambulante' | 'barella' | 'sedia_rotelle';
  accompagnatoDa: string;
  motivoIngresso: string;
  operatoreResponsabile?: string;
  condizioniGenerali: 'buone' | 'discrete' | 'scadenti' | 'critiche';
  condizioniIniziali?: string;
  noteIniziali?: string;
  camera?: string;
  letto?: string;
  documentiRicevuti?: string;
  documentiMancanti?: string;
  sigla?: string;
  statoCoscienza: 'vigile' | 'confuso' | 'soporoso' | 'stuporoso' | 'comatoso';
  orientamento: 'orientato' | 'disorientato' | 'parzialmente_orientato';
  autonomia: 'autonomo' | 'parzialmente_autonomo' | 'non_autonomo' | 'allettato';
  comunicazione: string;
  udito: string;
  vista: string;
  dentizione: string;
  alimentazione: string;
  eliminazioneUrinaria: string;
  eliminazioneIntestinale: string;
  mobilita: string;
  cuteIntegrita: string;
  dolore: 'assente' | 'presente';
  doloreLivello: number;
  materialeConsegnato: boolean;
  operatore: string;
  note: string;
  compilatoAt: string;
}

// ── Documenti Consegnati ───────────────────────────────────────────────────────

export type TipoDocumento =
  | 'documento_identita'
  | 'tessera_sanitaria'
  | 'consenso_privacy'
  | 'consenso_trattamento'
  | 'invio_centro_medico'
  | 'lettera_dimissione'
  | 'referto'
  | 'prescrizione'
  | 'delega'
  | 'liberatoria_uscita'
  | 'consenso_contenzioni'
  | 'documentazione_medicazioni'
  | 'consenso_informato'
  | 'privacy'
  | 'regolamento'
  | 'carta_servizi'
  | 'modulo_allergie'
  | 'piano_terapeutico'
  | 'altro';

export type StatoDocumento = 'ricevuto' | 'mancante' | 'da_verificare' | 'firmato' | 'scaduto';

export interface DocumentoConsegnato {
  id: string;
  tipo: TipoDocumento;
  descrizione: string;
  dataConsegna: string;
  firmatoDA: string;
  operatore: string;
  note: string;
  stato?: StatoDocumento;
  provenienza?: string;
  scadenza?: string;
  archiviato?: boolean;
}

// ── Diario Clinico ─────────────────────────────────────────────────────────────

export type TurnoDiario = 'mattina' | 'pomeriggio' | 'notte';
export type TipoDiarioEntry = 'ordinario' | 'segnalazione' | 'urgente';

export interface DiarioEntry {
  id: string;
  data: string;
  ora: string;
  turno: TurnoDiario;
  tipo: TipoDiarioEntry;
  testo: string;
  operatore: string;
  createdAt: string;
}

// ── Medicazione Ferite ─────────────────────────────────────────────────────────

export type EssudatoLivello = 'assente' | 'scarso' | 'moderato' | 'abbondante';

export interface MedicazioneRecord {
  id: string;
  data: string;
  dataFine?: string;
  sede: string;
  tipoLesione: string;
  grado?: string;
  tipoMedicazione: string;
  materiale: string;
  aspettoLesione: string;
  dimensioni: string;
  odore: boolean;
  essudato: EssudatoLivello;
  cutePerilisionale: string;
  prossimaMedicazione: string;
  desutura?: string;
  sigla?: string;
  operatore: string;
  note: string;
  createdAt: string;
}

// ── Contenzione / Protezione ───────────────────────────────────────────────────

export type TipoContenzione = 'cintura' | 'polsino' | 'guanto' | 'spondina' | 'altro';

export interface Contenzione {
  id: string;
  dataInizio: string;
  oraInizio: string;
  tipo: TipoContenzione;
  motivoClinico: string;
  autorizzazioneMedico: boolean;
  autorizzazioneTutore: boolean;
  intervalloRivalutazione: number;
  dataFine: string;
  oraFine: string;
  attiva: boolean;
  operatore: string;
  note: string;
  createdAt: string;
}

// ── Scala Braden ───────────────────────────────────────────────────────────────

export interface ScalaBradenValutazione {
  id: string;
  data: string;
  percezioneSensoriale: 1 | 2 | 3 | 4;
  umidita: 1 | 2 | 3 | 4;
  attivita: 1 | 2 | 3 | 4;
  mobilita: 1 | 2 | 3 | 4;
  nutrizione: 1 | 2 | 3 | 4;
  frizione: 1 | 2 | 3;
  operatore: string;
  note: string;
  createdAt: string;
}

// ── Dimissione Infermieristica ─────────────────────────────────────────────────

export interface DimissioneInfermieristica {
  data: string;
  ora: string;
  condizioni: 'buone' | 'discrete' | 'scadenti' | 'stabili';
  autonomiaResidua: string;
  pianoCuraConsegnato: boolean;
  istruzioni: string;
  controlliProgrammati: string;
  personaAccompagna: string;
  mezzoTrasporto: string;
  destinazione: 'domicilio' | 'altra_struttura' | 'hospice' | 'ospedale';
  materialeConsegnato: string;
  operatore: string;
  note: string;
  compilatoAt: string;
}

// ── Liberatoria di Uscita ──────────────────────────────────────────────────────

export interface Liberatoria {
  data: string;
  ora: string;
  controParereMedico: boolean;
  consapevoleRischi: boolean;
  firmaPatient: string;
  firmaTestimone: string;
  operatore: string;
  note: string;
  compilatoAt: string;
}
