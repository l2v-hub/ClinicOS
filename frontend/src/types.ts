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
  | 'agenda-operatore'
  | 'parametri-multipaziente'
  | 'ai-assistant';

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
  // Anagrafica
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  codiceFiscale: string;
  // Contatti
  phone: string;
  email: string;
  address: string;
  comune: string;
  provincia: string;
  cap: string;
  // Referente
  referenteNome: string;
  referenteTelefono: string;
  referenteRelazione: string;
  emergencyContact: string;
  // Ingresso
  provenienza: 'accesso_diretto' | 'ospedale' | 'centro_medico' | 'altra_struttura' | 'familiare_caregiver' | '';
  centroInviante: string;
  dataIngresso: string;
  motivoIngresso: string;
  condizioniIniziali: string;
  // Assegnazione
  operatoreId: string;
  camera: string;
  letto: string;
  statoPaziente: 'ricoverato' | 'day_hospital' | 'ambulatoriale' | '';
  priorita: 'normale' | 'alta' | 'urgente' | '';
  alertOperativi: string;
  // Note
  notaClinicaIniziale: string;
  noteIniziali: string;
  allergie: string;
  farmaci: string;
  alertClinici: string;
  osservazioniLibere: string;
}

// ── Operator (mock) ────────────────────────────────────────────────────────────

export type StatoOperatore = 'attivo' | 'inattivo';
export type RuoloOperatore = 'medico' | 'infermiere' | 'coordinatore';

export const OPERATOR_COLOR_PALETTE = [
  '#2F6BED', '#0D9488', '#6C4BD1', '#C77700', '#DC2626',
  '#8B5CF6', '#059669', '#C77700', '#EF4444', '#06B6D4',
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
  h08?: string;
  h12?: string;
  h16?: string;
  h18?: string;
  h20?: string;
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

// #244: explicit allergy status so an empty list is never ambiguous
// ('presenti' = list has detail · 'assenti' = verified none · 'paziente_nega' = patient denies).
export type AllergyStatus = 'presenti' | 'assenti' | 'paziente_nega';

export interface NotaClinica {
  id: string;
  tipo: 'clinica' | 'nursing' | 'dietetica' | 'psicologica' | 'fisioterapia' | 'altra';
  contenuto: string;
  operatore: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EsameClinicoRecord {
  id: string;
  data: string;
  ora?: string;
  descrizione: string;
  esito: string;
  allegati?: string;
  operatore: string;
  note?: string;
  createdAt: string;
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
  parametriMensili?: ParametriMensili[];
  diabetico?: boolean;
  ipertensione?: boolean;
  terapiaTriturata?: boolean;
  patologiaIngresso?: string;
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
  allergieStatus?: AllergyStatus; // #244: explicit assenti / paziente_nega / presenti
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
  valutazioniTinetti?: ScalaTinettiValutazione[];
  valutazioniNRS?: ScalaNRSValutazione[];
  dimissione?: DimissioneInfermieristica;
  liberatoria?: Liberatoria;
  // Esami & Consulenze
  esamiEmatici?: EsameClinicoRecord[];
  esamiStrumentali?: EsameClinicoRecord[];
  consulenze?: EsameClinicoRecord[];
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
  // Infermieristico extras
  priorita?: 'normale' | 'alta' | 'urgente';
  stato?: 'aperta' | 'in_corso' | 'completata';
  sigla?: string;
  collegamento?: string;
  // Medico extras
  prescrizione?: string;
  evoluzione?: string;
  firmaMedico?: string;
  allegati?: string;
}

// ── Diario Paziente (unified API) ──────────────────────────────────────────────

export type DiarioAuthorType = 'medico' | 'infermiere' | 'oss' | 'fisioterapista' | 'operatore' | 'altro';

export interface DiarioPazienteEntry {
  id: string;
  patientId: string;
  authorType: DiarioAuthorType;
  authorName: string;
  title: string | null;
  content: string;
  priority: 'normale' | 'importante' | 'urgente';
  status: 'aperta' | 'completata' | 'da_rivedere';
  entryDateTime: string;  // ISO YYYY-MM-DDTHH:mm
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParametroGiorno {
  giorno: number;
  pa?: string;
  fc?: string;
  spo2?: string;
  temperatura?: string;
  dtx08?: string;
  dtx12?: string;
  dtx18?: string;
  evacuazione?: string;
  catetere?: string;
  firmaIpM?: string;
  firmaIpP?: string;
  note?: string;
}

export interface ParametriMensili {
  id: string;
  mese: number;
  anno: number;
  giorni: ParametroGiorno[];
  createdAt: string;
}

// ── Medicazione Ferite ─────────────────────────────────────────────────────────

export type EssudatoLivello = 'assente' | 'scarso' | 'moderato' | 'abbondante';

export interface FollowUpMedicazione {
  id: string;
  data: string;
  siglaOperatore: string;
  motivoSostituzione: 'termine' | 'bagnata' | 'sporca';
  note: string;
  createdAt: string;
}

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
  followUps?: FollowUpMedicazione[];
}

// ── Contenzione / Protezione ───────────────────────────────────────────────────

export type TipoContenzione = 'cintura' | 'polsino' | 'guanto' | 'spondina' | 'altro';
export type FrequenzaContenzione = 'sempre' | 'notturna' | 'diurna' | 'altro';

export interface Contenzione {
  id: string;
  dataInizio: string;
  oraInizio: string;
  tipo: TipoContenzione;
  motivoClinico: string;
  autorizzazioneMedico: boolean;
  autorizzazioneTutore: boolean;
  dataFine: string;
  oraFine: string;
  attiva: boolean;
  operatore: string;
  note: string;
  createdAt: string;
  // Extended fields
  camera?: string;
  letto?: string;
  firmaMedicoInizio?: string;
  firmaMedicoFine?: string;
  // Sponde al letto
  spondineAttive?: boolean;
  spondineFrequenza?: FrequenzaContenzione;
  spondineAltro?: string;
  // Contenzioni specifiche
  cinturaCarrozzina?: boolean;
  cinturaCarrozzinaFreq?: FrequenzaContenzione;
  cinturaPoltrona?: boolean;
  cinturaPoltronaFreq?: FrequenzaContenzione;
  cinturaSedia?: boolean;
  cinturaSediaFreq?: FrequenzaContenzione;
  cinturaLetto?: boolean;
  cinturaLettoFreq?: FrequenzaContenzione;
  carrozzinaConTavolino?: boolean;
  altriPresidi?: string;
  // Motivazioni
  motivAgitazione?: boolean;
  motivConfusionale?: boolean;
  motivCadute?: boolean;
  motivAutoEtero?: boolean;
  motivInconsapevolezza?: boolean;
  motivAltro?: string;
  // Consenso
  firmaPazienteReferente?: string;
  firmaParente?: string;
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

// ── Scala Tinetti ──────────────────────────────────────────────────────────────

export interface ScalaTinettiValutazione {
  id: string;
  data: string;
  // Equilibrio (balance) — max 16
  equilibrioSeduto: 0 | 1;
  alzarsi: 0 | 1 | 2;
  tentativiAlzarsi: 0 | 1 | 2;
  equilibrioImmediato: 0 | 1 | 2;
  equilibrioProlungato: 0 | 1 | 2;
  rombergSpinta: 0 | 1 | 2;
  occhiChiusi: 0 | 1;
  girarsi360Passi: 0 | 1;
  girarsi360Stabilita: 0 | 1;
  sedersi: 0 | 1 | 2;
  // Andatura (gait) — max 12
  iniziazione: 0 | 1;
  lunghezzaPassoDx: 0 | 1;
  altezzaPassoDx: 0 | 1;
  lunghezzaPassoSx: 0 | 1;
  altezzaPassoSx: 0 | 1;
  simmetria: 0 | 1;
  continuita: 0 | 1;
  traiettoria: 0 | 1 | 2;
  tronco: 0 | 1 | 2;
  cammino: 0 | 1;
  operatore: string;
  note: string;
  createdAt: string;
}

// ── Scala NRS ──────────────────────────────────────────────────────────────────

export interface ScalaNRSValutazione {
  id: string;
  data: string;
  ora?: string;
  punteggio: number;   // 0..10
  aRiposo?: number;    // optional 0..10
  inMovimento?: number;// optional 0..10
  sede?: string;
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
  // Respirazione
  respAutonomo?: boolean;
  respO2Terapia?: boolean;
  respO2LitriMin?: string;
  respCannulaTracheale?: boolean;
  respUltimaSostituzione?: string;
  // Alimentazione
  alimentAutonomo?: boolean;
  alimentAssistito?: boolean;
  alimentDieta?: string;
  alimentSNG?: string;
  alimentPEG?: string;
  // Eliminazione
  elimContinente?: boolean;
  elimParzialmenteIncontinente?: boolean;
  elimIncontinenzaFeci?: boolean;
  elimIncontinenzaUrine?: boolean;
  elimDataUltimaEvacuazione?: string;
  elimCatetereVescicale?: string;
  elimStomia?: boolean;
  // Mobilizzazione
  mobAutonomo?: boolean;
  mobAllettato?: boolean;
  mobAssistitoCon?: string;
  mobRischioCaduta?: boolean;
  mobContenzione?: string;
  // Igiene e vestizione
  igieneAutonomo?: boolean;
  igieneDipendente?: boolean;
  igieneParzialmenteDipendente?: boolean;
  // Lesioni da pressione
  lesioniNo?: boolean;
  lesioniSi?: boolean;
  lesioniSede?: string;
  lesioniGrado?: string;
  lesioniTipoMedicazione?: string;
  lesioniFrequenza?: string;
  lesioniNote?: string;
  // Disturbi del sonno
  sonnoNo?: boolean;
  sonnoSi?: boolean;
  sonnoNote?: string;
  // Uso farmaci
  farmaciNo?: boolean;
  farmaciSi?: boolean;
  farmaciDettaglio?: string;
  // Comunicazione / Orientamento
  commOrientato?: boolean;
  commParzialmenteOrientato?: boolean;
  commDisorientato?: boolean;
  commAlterazioniSensoriali?: string;
  commComunicaSi?: boolean;
  commComunicaNo?: boolean;
  commDifficolta?: string;
  // Servizi territoriali
  servizioSocialeSi?: boolean;
  servizioSocialeNo?: boolean;
  servizioDomiciliareSi?: boolean;
  servizioDomiciliareNo?: boolean;
}

// ── Liberatoria di Uscita ──────────────────────────────────────────────────────

export interface UscitaLog {
  id: string;
  data: string;
  ora: string;
  oraRientro?: string;
  referenteNome?: string;
  firma?: string;
  operatore: string;
  note?: string;
}

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
  // Extended fields
  referenteNome?: string;
  referenteDataNascita?: string;
  referenteRapporto?: string;
  soloUscitaParenti?: boolean;
  usciteLog?: UscitaLog[];
}

// ── Therapy Slot (Agenda) ────────────────────────────────────────────────────

export type FasciaOrariaTerapia = 'mattina' | 'pranzo' | 'pomeriggio' | 'sera' | 'notte';

export type StatoSomministrazione = 'da_erogare' | 'erogata' | 'non_erogata';

export type MotivoNonErogazione =
  | 'rifiutata_paziente'
  | 'paziente_assente'
  | 'sospesa_medico'
  | 'farmaco_non_disponibile'
  | 'impossibilita_clinica'
  | 'altro';

export interface TherapyAdministration {
  administrationId: string | null;
  therapyId: string;
  drugName: string;
  dosage: string;
  quantityLabel?: string | null; // REQ-093: "1/2 compressa — equivalente a 50 mg"
  route: string;
  scheduledTime: string;
  status: 'pending' | 'administered' | 'not_administered';
  administeredAt: string | null;
  administeredBy: string | null;
  notAdministeredReason: string | null;
}

export interface TherapySlotPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  room: string;
  bed: string;
  administrations: TherapyAdministration[];
}

export interface TherapySlotSummary {
  total: number;
  administered: number;
  notAdministered: number;
  pending: number;
}

export interface TherapySlot {
  id: string;
  fascia: FasciaOrariaTerapia;
  label: string;
  ora: string;
  summary: TherapySlotSummary;
  patients: TherapySlotPatient[];
}

// ── Patient Therapy (API) ──────────────────────────────────────────────────

// REQ-093: per-administration-time prescribed quantity as an exact fraction.
export interface TherapyScheduleAPI {
  id: string;
  therapyId: string;
  time: string;                 // "HH:MM"
  fascia: string;               // mattina|pranzo|pomeriggio|sera|notte
  quantityNumerator: number;
  quantityDenominator: number;
  administrationUnit: string;   // compressa | ml | gocce | unità | bustina | ...
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientTherapyAPI {
  id: string;
  patientId: string;
  farmacoNome: string;
  dosaggio: string;
  viaSomministrazione: string;
  tipo: 'periodica' | 'una_tantum' | 'al_bisogno';
  stato: 'attiva' | 'sospesa' | 'conclusa';
  dataInizio: string;
  dataFine: string | null;
  fasceMattina: boolean;
  fascePranzo: boolean;
  fascePomeriggio: boolean;
  fasceSera: boolean;
  fasceNotte: boolean;
  orarioSpecifico: string | null;
  prescrittore: string | null;
  operatoreInseritore: string | null;
  note: string | null;
  dataSomministrazione: string | null;
  orarioSomministrazione: string | null;
  // REQ-093 structured fields
  commercialStrengthValue?: number | null;
  commercialStrengthUnit?: string | null;
  pharmaceuticalForm?: string | null;
  allowedFractions?: string | null;
  drugPackageRef?: string | null;
  giorniSettimana?: string | null; // #241: comma list of ISO weekdays (1..7); null = every day
  schedules?: TherapyScheduleAPI[];
  createdAt: string;
  updatedAt: string;
}
