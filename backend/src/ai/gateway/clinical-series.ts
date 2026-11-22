// Serie dei parametri vitali e date di struttura per le letture di Milo. Modulo puro: nessun
// accesso al database, così che aggregati e risoluzione delle date siano verificabili a unità.
//
// Due archivi alimentano gli stessi parametri:
//   - `PatientParameterReading` (pagina Parametri, giro, skill vitals.record): una rilevazione con
//     più valori misurati insieme (`values.pa`, `values.fc`, … come stringhe);
//   - il JSON storico `Cartella.data.parametriVitali` (voce del pannello Assistente, dati vecchi):
//     una riga per valore con `etichetta` canonica (PA, FC, TC, SpO2, DTX, FR, Peso).
// Qui confluiscono in un'unica forma: rilevazioni con chiavi della tabella.

/** Parametri numerici di una rilevazione, con le chiavi di `PatientParameterReading.values`. */
export const SERIES_KEYS = ['pa', 'fc', 'spo2', 'temperatura', 'fr', 'dtx', 'peso'] as const;
export type SeriesKey = (typeof SERIES_KEYS)[number];

export const SERIES_LABELS: Record<SeriesKey, { label: string; unit: string }> = {
  pa: { label: 'Pressione arteriosa', unit: 'mmHg' },
  fc: { label: 'Frequenza cardiaca', unit: 'bpm' },
  spo2: { label: 'Saturazione', unit: '%' },
  temperatura: { label: 'Temperatura', unit: '°C' },
  fr: { label: 'Frequenza respiratoria', unit: 'atti/min' },
  dtx: { label: 'Glicemia', unit: 'mg/dL' },
  peso: { label: 'Peso', unit: 'kg' },
};

/** Etichetta canonica del JSON storico → chiave della tabella. Etichette ignote: nessuna chiave. */
const LEGACY_LABELS: Record<string, SeriesKey> = {
  PA: 'pa',
  FC: 'fc',
  SPO2: 'spo2',
  TC: 'temperatura',
  FR: 'fr',
  DTX: 'dtx',
  PESO: 'peso',
};
export function legacyLabelKey(label: unknown): SeriesKey | null {
  return typeof label === 'string' ? (LEGACY_LABELS[label.trim().toUpperCase()] ?? null) : null;
}
/** Chiave della tabella → etichetta canonica (filtro `label` degli strumenti esistenti). */
export function labelForKey(key: SeriesKey): string {
  return (
    Object.entries(LEGACY_LABELS)
      .find(([, k]) => k === key)?.[0]
      .replace('SPO2', 'SpO2') ?? key
  );
}

export interface UnifiedReading {
  id: string;
  /** ISO istante della misura. */
  measuredAt: string;
  source: 'parametri' | 'cartella';
  /** Valori come scritti (stringhe), solo le chiavi presenti. */
  values: Record<string, string>;
  author?: string;
}

/** Numero di una misura; per la pressione `which` sceglie sistolica o diastolica. */
export function numericValue(
  key: SeriesKey,
  raw: string | undefined,
  which: 'sistolica' | 'diastolica' = 'sistolica',
): number | null {
  const text = raw?.trim();
  if (!text) return null;
  if (key === 'pa') {
    const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(text);
    return m ? Number(which === 'sistolica' ? m[1] : m[2]) : null;
  }
  const m = /^[+-]?\d+(?:[.,]\d+)?/.exec(text.replace(/\s/g, ''));
  if (!m) return null;
  const value = Number(m[0].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export interface SeriesPoint {
  at: string;
  value: number;
  readingId: string;
}
export interface DailyAggregate {
  day: string;
  count: number;
  min: number;
  max: number;
  avg: number;
}
export interface ParameterSeries {
  key: string;
  label: string;
  unit: string;
  count: number;
  first: SeriesPoint | null;
  last: SeriesPoint | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  /** Differenza fra ultima e prima misura del periodo (stessa unità); null con meno di 2 misure. */
  change: number | null;
  points: SeriesPoint[];
  daily: DailyAggregate[];
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Giorno di calendario della struttura (Europe/Rome) di un istante. */
export function facilityDay(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function seriesOf(
  key: string,
  label: string,
  unit: string,
  points: SeriesPoint[],
): ParameterSeries {
  const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at));
  const values = sorted.map((p) => p.value);
  const byDay = new Map<string, number[]>();
  for (const p of sorted) {
    const day = facilityDay(p.at);
    byDay.set(day, [...(byDay.get(day) ?? []), p.value]);
  }
  return {
    key,
    label,
    unit,
    count: sorted.length,
    first: sorted[0] ?? null,
    last: sorted.at(-1) ?? null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    avg: values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    change: sorted.length >= 2 ? round(sorted.at(-1)!.value - sorted[0].value) : null,
    points: sorted,
    daily: [...byDay].map(([day, v]) => ({
      day,
      count: v.length,
      min: Math.min(...v),
      max: Math.max(...v),
      avg: round(v.reduce((a, b) => a + b, 0) / v.length),
    })),
  };
}

/**
 * Serie per parametro dalle rilevazioni unificate. La pressione diventa due serie (sistolica e
 * diastolica). Valori illeggibili sono esclusi dalla serie ma la rilevazione resta fra le fonti.
 */
export function parameterSeries(
  readings: UnifiedReading[],
  keys: readonly SeriesKey[] = SERIES_KEYS,
): ParameterSeries[] {
  const out: ParameterSeries[] = [];
  for (const key of keys) {
    const { label, unit } = SERIES_LABELS[key];
    const parts: Array<['sistolica' | 'diastolica' | null, string, string]> =
      key === 'pa'
        ? [
            ['sistolica', 'pa_sistolica', `${label} sistolica`],
            ['diastolica', 'pa_diastolica', `${label} diastolica`],
          ]
        : [[null, key, label]];
    for (const [which, seriesKey, seriesLabel] of parts) {
      const points = readings.flatMap((r) => {
        const value = numericValue(key, r.values[key], which ?? 'sistolica');
        return value === null ? [] : [{ at: r.measuredAt, value, readingId: r.id }];
      });
      if (points.length) out.push(seriesOf(seriesKey, seriesLabel, unit, points));
    }
  }
  return out;
}

/** Righe del JSON storico (una per valore) → rilevazioni, raggruppando i valori dello stesso istante. */
export function legacyVitalsToReadings(
  rows: Array<{ id?: string; etichetta?: string; valore?: string; rilevato?: string }>,
): UnifiedReading[] {
  const byInstant = new Map<string, UnifiedReading>();
  for (const row of rows) {
    const key = legacyLabelKey(row.etichetta);
    const at = row.rilevato ? new Date(row.rilevato) : null;
    if (!key || !row.valore || !at || !Number.isFinite(at.getTime())) continue;
    const measuredAt = at.toISOString();
    const reading = byInstant.get(measuredAt) ?? {
      id: `cartella:${row.id ?? measuredAt}`,
      measuredAt,
      source: 'cartella' as const,
      values: {},
    };
    reading.values[key] = row.valore;
    byInstant.set(measuredAt, reading);
  }
  return [...byInstant.values()];
}

// ── Giorni della settimana e date di struttura ──────────────────────────────────────────────
export const WEEKDAYS = [
  'domenica',
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Aggiunge giorni a una data YYYY-MM-DD (calendario, senza ore). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekdayOf(day: string): Weekday {
  return WEEKDAYS[new Date(`${day}T12:00:00.000Z`).getUTCDay()];
}

/**
 * Giorno indicato in una domanda, rispetto a `today` (YYYY-MM-DD, calendario di struttura):
 * «oggi», «stanotte», «domani», «dopodomani», «ieri», un giorno della settimana (il prossimo, oggi
 * compreso) o una data «12/11» / «12/11/2026» / «2026-11-12». Null se la domanda non nomina un giorno.
 */
export function dayFromText(text: string, today: string): string | null {
  const q = normalize(text);
  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(q);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/.exec(q);
  if (dmy) {
    const year = dmy[3] ?? today.slice(0, 4);
    const day = `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    if (Number.isFinite(new Date(`${day}T12:00:00Z`).getTime())) return day;
  }
  if (/\bdopodomani\b/.test(q)) return addDays(today, 2);
  if (/\bdomani\b/.test(q)) return addDays(today, 1);
  if (/\bieri\b/.test(q)) return addDays(today, -1);
  if (/\b(oggi|stanotte|stasera|stamattina|stamane|adesso|ora)\b/.test(q)) return today;
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    const name = weekdayOf(day);
    if (new RegExp(`\\b${name}\\b`).test(q)) return day;
  }
  return null;
}
