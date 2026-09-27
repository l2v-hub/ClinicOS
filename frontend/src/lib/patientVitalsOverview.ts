// Tessere dei parametri della Panoramica (HMI 1): ultimo valore rilevato di ogni parametro, con
// l'andamento rispetto al valore precedente, e il NEWS2 dell'ultima rilevazione completa. Tutto
// viene dalle rilevazioni reali; se un dato manca la tessera lo dice.
import { NEWS2_LABELS, news2Parts, type News2Parameter } from './news2';
import { latestCompleteNews2, news2Points, news2Staleness, news2Tone } from './news2History';
import { readingTime, type PatientParameterReading } from './patientParameterReadings';

export type VitalKey = 'fr' | 'spo2' | 'pa' | 'fc' | 'temperatura';
/** Colore della tessera come il prototipo: dal punteggio NEWS2 del parametro (0 · 1–2 · 3). */
export type VitalTone = 'none' | 'warn' | 'crit';

export interface VitalTile {
  key: VitalKey;
  label: string;
  value: string | null;
  unit: string;
  /** "era 20" / "stabile" / null se non c'è un valore precedente. */
  trend: string | null;
  direction: 'up' | 'down' | 'flat' | null;
  tone: VitalTone;
  at: string | null;
}

export interface News2Tile {
  /** Punteggio dell'ultima rilevazione completa, o null se non calcolabile. */
  score: number | null;
  response: string | null;
  at: string | null;
  tone: ReturnType<typeof news2Tone>;
  stale: boolean;
  /** Parametri mancanti nell'ultima rilevazione quando il NEWS2 non è calcolabile. */
  missing: string[];
}

const LABEL: Record<VitalKey, string> = {
  fr: 'FR',
  spo2: 'SpO₂',
  pa: 'PA',
  fc: 'FC',
  temperatura: 'Temp.',
};
const UNIT: Record<VitalKey, string> = {
  fr: 'atti/min',
  spo2: '%',
  pa: 'mmHg',
  fc: 'bpm',
  temperatura: '°C',
};

// Stessi intervalli plausibili del NEWS2: un refuso ("368" per 36,8) non genera un andamento.
const PLAUSIBLE: Record<VitalKey, [number, number]> = {
  fr: [1, 80],
  spo2: [50, 100],
  pa: [40, 300],
  fc: [20, 300],
  temperatura: [30, 45],
};
const numeric = (key: VitalKey, value: string): number | null => {
  const text = (key === 'pa' ? value.split('/')[0] : value).trim();
  if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(text)) return null;
  const n = Number(text.replace(',', '.'));
  return n >= PLAUSIBLE[key][0] && n <= PLAUSIBLE[key][1] ? n : null;
};

/** "08:05" se di oggi (ora della struttura), altrimenti "24/09 08:05". */
export function shortTime(instant: string, now = new Date()): string {
  const full = readingTime(instant); // "dd/mm/yyyy hh:mm"
  const today = readingTime(now.toISOString()).slice(0, 10);
  return full.slice(0, 10) === today ? full.slice(-5) : `${full.slice(0, 5)} ${full.slice(-5)}`;
}

function partTone(score: number | null): VitalTone {
  if (score === null || score === 0) return 'none';
  return score >= 3 ? 'crit' : 'warn';
}

/** `readings` in qualunque ordine: vengono ordinate dalla più recente. */
export function vitalTiles(readings: PatientParameterReading[], now = new Date()): VitalTile[] {
  const sorted = [...readings].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  return (Object.keys(LABEL) as VitalKey[]).map((key) => {
    const withValue = sorted.filter((r) => (r.values[key] ?? '').trim() !== '');
    const latest = withValue[0];
    if (!latest)
      return {
        key,
        label: LABEL[key],
        value: null,
        unit: UNIT[key],
        trend: null,
        direction: null,
        tone: 'none',
        at: null,
      };
    const value = latest.values[key]!.trim();
    const prev = withValue[1]?.values[key]?.trim() ?? null;
    const a = numeric(key, value);
    const b = prev === null ? null : numeric(key, prev);
    const direction = a === null || b === null ? null : a > b ? 'up' : a < b ? 'down' : 'flat';
    const unit =
      key === 'spo2'
        ? latest.values.o2 === 'si'
          ? '% O₂'
          : latest.values.o2 === 'no'
            ? '% aria'
            : '%'
        : UNIT[key];
    const part = news2Parts(latest.values)[key as News2Parameter] ?? null;
    return {
      key,
      label: LABEL[key],
      value,
      unit,
      trend:
        a === null
          ? 'valore da verificare'
          : direction === null
            ? null
            : direction === 'flat'
              ? 'stabile'
              : `era ${prev}`,
      direction,
      tone: partTone(part),
      at: shortTime(latest.measuredAt, now),
    };
  });
}

export function news2Tile(readings: PatientParameterReading[], now = new Date()): News2Tile {
  const points = news2Points(readings);
  const latest = latestCompleteNews2(points);
  if (latest) {
    const staleness = news2Staleness(points, latest, now.getTime());
    return {
      score: latest.result.total,
      response: latest.result.response,
      at: shortTime(latest.reading.measuredAt, now),
      tone: news2Tone(latest),
      stale: staleness.stale,
      missing: [],
    };
  }
  const last = points[0];
  return {
    score: null,
    response: null,
    at: last ? shortTime(last.reading.measuredAt, now) : null,
    tone: 'none',
    stale: false,
    missing: last ? last.result.missing.map((k) => NEWS2_LABELS[k]) : [],
  };
}
