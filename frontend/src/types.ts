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
}
