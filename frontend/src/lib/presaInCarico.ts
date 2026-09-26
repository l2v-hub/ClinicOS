// Mapping tra il passaggio "Ingresso" del wizard di intake e la presa in carico della cartella.
// Il wizard e il tab "Presa in carico" sono nati con chiavi e vocabolari diversi: senza questo
// mapping i dati di ingresso finivano alla radice della cartella e il tab non li mostrava mai.
// Regola: si copia solo ciò che l'operatore ha inserito — nessuna valutazione clinica
// (coscienza, autonomia, condizioni…) viene inventata qui.
import type { PresaInCarico } from '../types';

/** Campi del passaggio Ingresso del wizard (vedi StepIngresso.IngressoData). */
export interface IntakeIngresso {
  dataPresa?: string;
  oraPresa?: string;
  provenienza?: string;
  centroInviante?: string;
  modalitaIngresso?: string;
  motivoIngresso?: string;
  operatoreResponsabile?: string;
  noteIniziali?: string;
}

/** Chiavi di ingresso che le cartelle confermate prima del fix hanno alla radice. */
export const LEGACY_INGRESSO_KEYS = [
  'dataPresa',
  'oraPresa',
  'provenienza',
  'centroInviante',
  'modalitaIngresso',
  'motivoIngresso',
  'operatoreResponsabile',
  'noteIniziali',
] as const;

// Vocabolario del wizard → vocabolario del tab. Il wizard dice "ospedale" dove il tab dice
// "dimissione_ospedaliera"; gli altri valori coincidono.
const PROVENIENZA: Record<string, PresaInCarico['provenienza']> = {
  accesso_diretto: 'accesso_diretto',
  ospedale: 'dimissione_ospedaliera',
  dimissione_ospedaliera: 'dimissione_ospedaliera',
  centro_medico: 'centro_medico',
  altra_struttura: 'altra_struttura',
  familiare_caregiver: 'familiare_caregiver',
};

// Nel wizard "modalità ingresso" è il TIPO di ingresso; nel tab è il MEZZO di arrivo.
const TIPO_INGRESSO = ['urgenza', 'programmato', 'trasferimento', 'day_hospital'] as const;
const MEZZO_ARRIVO = ['ambulante', 'barella', 'sedia_rotelle'] as const;

export const TIPO_INGRESSO_LABEL: Record<NonNullable<PresaInCarico['tipoIngresso']>, string> = {
  urgenza: 'Urgenza',
  programmato: 'Programmato',
  trasferimento: 'Trasferimento',
  day_hospital: 'Day hospital',
};

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined;

/** Presa in carico parziale costruita dai soli campi inseriti al passaggio Ingresso. */
export function mapIngressoToPresaInCarico(
  ingresso: IntakeIngresso | Record<string, unknown>,
): Partial<PresaInCarico> {
  const src = ingresso as Record<string, unknown>;
  const out: Partial<PresaInCarico> = {};
  const data = text(src.dataPresa);
  if (data) out.dataIngresso = data;
  const ora = text(src.oraPresa);
  if (ora) out.oraIngresso = ora;
  const prov = text(src.provenienza);
  if (prov && PROVENIENZA[prov]) out.provenienza = PROVENIENZA[prov];
  const modalita = text(src.modalitaIngresso);
  if (modalita && (TIPO_INGRESSO as readonly string[]).includes(modalita)) {
    out.tipoIngresso = modalita as PresaInCarico['tipoIngresso'];
  } else if (modalita && (MEZZO_ARRIVO as readonly string[]).includes(modalita)) {
    out.modalitaIngresso = modalita as PresaInCarico['modalitaIngresso'];
  }
  for (const key of [
    'centroInviante',
    'motivoIngresso',
    'operatoreResponsabile',
    'noteIniziali',
  ] as const) {
    const v = text(src[key]);
    if (v) out[key] = v;
  }
  return out;
}

/**
 * Presa in carico da mostrare per una cartella: quella salvata se esiste, altrimenti quella
 * derivata dai campi legacy alla radice (cartelle confermate prima del fix), altrimenti undefined.
 */
export function resolvePresaInCarico(
  cartella: { presaInCarico?: PresaInCarico } & Record<string, unknown>,
): Partial<PresaInCarico> | undefined {
  // Un oggetto vuoto non è una presa in carico: non deve nascondere i campi legacy.
  if (cartella.presaInCarico && Object.keys(cartella.presaInCarico).length > 0) {
    return cartella.presaInCarico;
  }
  const legacy = mapIngressoToPresaInCarico(cartella);
  return Object.keys(legacy).length > 0 ? legacy : undefined;
}
