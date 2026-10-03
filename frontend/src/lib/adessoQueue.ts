// Coda "Da fare subito" della dashboard operatore: un solo elenco ordinato per urgenza, costruito
// dai dati che la dashboard ha già (scadenze terapia, consegne urgenti, anomalie farmaci).
// Nessun dato viene inventato: una consegna senza data o senza ora resta in coda con l'etichetta
// che dice esattamente cosa si sa.
import type { Consegna } from '../types';
import { therapyCalendar, therapyTime, type ScadenzaTerapia } from './dashboardTherapies';
import type { TabId } from '../components/operator/tabGroups';

export type AdessoKind =
  | 'terapia-ritardo'
  | 'consegna-scaduta'
  | 'consegna-imminente'
  | 'terapia-imminente'
  | 'terapia-senza-orario'
  | 'anomalia-farmaci'
  | 'consegna-urgente';

/** Gruppo di urgenza: 1 = più urgente. L'ordine dei gruppi è la regola della coda. */
export const ADESSO_RANK: Record<AdessoKind, number> = {
  'terapia-ritardo': 1,
  'consegna-scaduta': 2,
  'consegna-imminente': 3,
  'terapia-imminente': 4,
  'terapia-senza-orario': 5,
  'anomalia-farmaci': 6,
  'consegna-urgente': 7,
};

/** Sezione della cartella in cui si agisce sulla voce (Prompt 10 §2): «Apri» porta lì, non sulla
 *  Panoramica. Le anomalie farmaci si sanano dalla terapia del paziente. */
export const ADESSO_KIND_TAB: Record<AdessoKind, TabId> = {
  'terapia-ritardo': 'terapia-farmacologica',
  'terapia-imminente': 'terapia-farmacologica',
  'terapia-senza-orario': 'terapia-farmacologica',
  'anomalia-farmaci': 'terapia-farmacologica',
  'consegna-scaduta': 'consegne',
  'consegna-imminente': 'consegne',
  'consegna-urgente': 'consegne',
};

export const ADESSO_KIND_LABEL: Record<AdessoKind, string> = {
  'terapia-ritardo': 'Terapia',
  'consegna-scaduta': 'Consegna',
  'consegna-imminente': 'Consegna',
  'terapia-imminente': 'Terapia',
  'terapia-senza-orario': 'Terapia',
  'anomalia-farmaci': 'Farmaci',
  'consegna-urgente': 'Consegna',
};

/** Soglie di HMI (non cliniche): da confermare con la direzione sanitaria. */
export const CONSEGNA_IMMINENTE_MIN = 60;
export const TERAPIA_IMMINENTE_MIN = 30;

export interface AdessoItem {
  key: string;
  kind: AdessoKind;
  patientId: string;
  nome: string;
  dettaglio: string;
  tempo: string;
  /** Ora della scadenza (HH:MM) quando è nota: colonna di sinistra della riga. */
  ora: string | null;
  /** Camera e letto quando la fonte li porta (terapie). */
  luogo: string | null;
  /** true = la scadenza è passata (in rosso). */
  inRitardo: boolean;
  /** Dentro il gruppo: valore più alto = più urgente. */
  urgenza: number;
}

export interface AnomaliaPazienteRiga {
  patientId: string;
  nome: string;
  esito: { totale: number; verificaIncompleta: boolean };
}

export interface AdessoInput {
  now: Date;
  scadute: ScadenzaTerapia[];
  prossime: ScadenzaTerapia[];
  /** Somministrazioni senza orario verificabile: vanno controllate. */
  senzaOrario?: ScadenzaTerapia[];
  urgenti: Consegna[];
  anomalie: AnomaliaPazienteRiga[];
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Giorni civili fra `day` e `today` (entrambi YYYY-MM-DD); null se la data non è valida. */
function civilDayDiff(day: unknown, today: string): number | null {
  if (typeof day !== 'string') return null;
  const a = ISO_DAY.exec(day);
  const b = ISO_DAY.exec(today);
  if (!a || !b) return null;
  const utc = (m: RegExpExecArray) => Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const diff = Math.round((utc(a) - utc(b)) / 86_400_000);
  return Number.isFinite(diff) ? diff : null;
}

const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

function consegnaItem(c: Consegna, cal: { oggi: string; minuto: number }): AdessoItem {
  const giorni = civilDayDiff(c.scadenza, cal.oggi);
  const ora = therapyTime(c.oraScadenza);
  const oraLabel = c.oraScadenza ?? '';
  const dettaglio = c.note?.trim() ? `${c.tipo} — ${c.note.trim()}` : c.tipo;
  const base = {
    key: `consegna:${c.id}`,
    patientId: c.pazienteId,
    nome: c.pazienteNome,
    dettaglio,
    ora: ora !== null ? (c.oraScadenza ?? null) : null,
    luogo: null,
  };

  if (giorni === null) {
    return {
      ...base,
      kind: 'consegna-urgente',
      tempo: 'Scadenza non indicata',
      inRitardo: false,
      urgenza: -1e9,
    };
  }
  if (ora !== null) {
    const minuti = giorni * 1440 + ora - cal.minuto;
    if (minuti < 0) {
      const tempo =
        giorni === 0
          ? `Scaduta alle ${oraLabel}`
          : giorni === -1
            ? `Scaduta ieri alle ${oraLabel}`
            : `Scaduta il ${dayLabel(c.scadenza)}`;
      return { ...base, kind: 'consegna-scaduta', tempo, inRitardo: true, urgenza: -minuti };
    }
    if (minuti <= CONSEGNA_IMMINENTE_MIN) {
      return {
        ...base,
        kind: 'consegna-imminente',
        // vicino a mezzanotte la scadenza può cadere domani: si dice
        tempo: giorni === 0 ? `Entro le ${oraLabel}` : `Domani alle ${oraLabel}`,
        inRitardo: false,
        urgenza: -minuti,
      };
    }
    const tempo =
      giorni === 0
        ? `Entro le ${oraLabel}`
        : giorni === 1
          ? `Domani alle ${oraLabel}`
          : `Entro il ${dayLabel(c.scadenza)}`;
    return { ...base, kind: 'consegna-urgente', tempo, inRitardo: false, urgenza: -minuti };
  }
  // Solo la data: si sa il giorno, non l'ora.
  if (giorni < 0) {
    const tempo = giorni === -1 ? 'Scaduta ieri' : `Scaduta da ${-giorni} giorni`;
    return {
      ...base,
      kind: 'consegna-scaduta',
      tempo,
      inRitardo: true,
      // scaduta a fine giornata: i minuti passati da mezzanotte più i giorni interi
      urgenza: cal.minuto + (-giorni - 1) * 1440,
    };
  }
  const tempo =
    giorni === 0
      ? 'Entro oggi'
      : giorni === 1
        ? 'Entro domani'
        : `Entro il ${dayLabel(c.scadenza)}`;
  // entro fine giornata: più lontana di qualunque ora di quel giorno
  return {
    ...base,
    kind: 'consegna-urgente',
    tempo,
    inRitardo: false,
    urgenza: -((giorni + 1) * 1440 - cal.minuto),
  };
}

const luogoTerapia = (row: ScadenzaTerapia) =>
  [row.camera ? `Camera ${row.camera}` : '', row.letto ? `Letto ${row.letto}` : '']
    .filter(Boolean)
    .join(' · ') || null;

function terapiaItem(row: ScadenzaTerapia, kind: AdessoKind): AdessoItem {
  const minuti = row.minuti ?? 0;
  const tempo =
    kind === 'terapia-senza-orario'
      ? 'Orario da verificare'
      : kind === 'terapia-ritardo'
        ? `In ritardo di ${-minuti} min`
        : minuti === 0
          ? 'Adesso'
          : `Tra ${minuti} min`;
  return {
    key: `terapia:${row.id}`,
    kind,
    patientId: row.patientId,
    nome: row.nome,
    dettaglio: `${row.farmaco} · ${row.dose} · ${row.via}`,
    tempo,
    ora: kind === 'terapia-senza-orario' ? null : row.ora,
    luogo: luogoTerapia(row),
    inRitardo: kind === 'terapia-ritardo',
    urgenza: kind === 'terapia-senza-orario' ? 0 : -minuti,
  };
}

/** Elenco completo, già ordinato: chi lo mostra decide quante righe far vedere. */
export function buildAdessoQueue(input: AdessoInput): AdessoItem[] {
  const cal = therapyCalendar(input.now);
  const items: AdessoItem[] = [];
  for (const row of input.scadute) {
    if (row.minuti !== null && row.minuti < 0) items.push(terapiaItem(row, 'terapia-ritardo'));
  }
  for (const row of input.prossime) {
    if (row.minuti !== null && row.minuti >= 0 && row.minuti <= TERAPIA_IMMINENTE_MIN) {
      items.push(terapiaItem(row, 'terapia-imminente'));
    }
  }
  // Orario da verificare: solo le somministrazioni di oggi (quelle di domani non sono "adesso").
  for (const row of input.senzaOrario ?? []) {
    if (row.data === cal.oggi) items.push(terapiaItem(row, 'terapia-senza-orario'));
  }
  for (const c of input.urgenti) items.push(consegnaItem(c, cal));
  for (const p of input.anomalie) {
    if (p.esito.totale <= 0) continue;
    const n = p.esito.totale;
    items.push({
      key: `anomalia:${p.patientId}`,
      kind: 'anomalia-farmaci',
      patientId: p.patientId,
      nome: p.nome,
      dettaglio: `${n} ${n === 1 ? 'farmaco' : 'farmaci'} da verificare${p.esito.verificaIncompleta ? ' · verifica incompleta' : ''}`,
      tempo: 'Da verificare',
      ora: null,
      luogo: null,
      inRitardo: false,
      urgenza: n,
    });
  }
  return items.sort(
    (a, b) =>
      ADESSO_RANK[a.kind] - ADESSO_RANK[b.kind] ||
      b.urgenza - a.urgenza ||
      a.nome.localeCompare(b.nome, 'it') ||
      a.key.localeCompare(b.key),
  );
}
