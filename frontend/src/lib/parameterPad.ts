// Rilevazione rapida (HMI 1): campi numerici in card, tastierino, pressione in due campi.
// Il valore salvato resta quello di sempre: la pressione è un solo campo "sistolica/diastolica".
import type { ParameterValues, PatientParameterReading } from './patientParameterReadings';
import { facilityLocalMinute } from './facilityTime';

export type PadField = 'fr' | 'spo2' | 'pas' | 'pad' | 'fc' | 'temperatura' | 'dtx';

export const PAD_FIELDS: { key: PadField; label: string; unit: string; decimals: boolean }[] = [
  { key: 'fr', label: 'FR', unit: 'atti/min', decimals: false },
  { key: 'spo2', label: 'SpO2', unit: '%', decimals: true },
  { key: 'pas', label: 'PA sistolica', unit: 'mmHg', decimals: false },
  { key: 'pad', label: 'PA diastolica', unit: 'mmHg', decimals: false },
  { key: 'fc', label: 'FC', unit: 'bpm', decimals: true },
  { key: 'temperatura', label: 'Temperatura', unit: '°C', decimals: true },
  { key: 'dtx', label: 'DTX', unit: 'mg/dL', decimals: true },
];

/** "148/86" → { pas: "148", pad: "86" }; un valore senza barra resta nella sistolica. */
export function splitPa(pa: string | undefined): { pas: string; pad: string } {
  const text = pa ?? '';
  const slash = text.indexOf('/');
  if (slash < 0) return { pas: text.trim(), pad: '' };
  return { pas: text.slice(0, slash).trim(), pad: text.slice(slash + 1).trim() };
}
/** Ricompone la pressione; con un solo lato compilato resta "148/" e la validazione lo segnala. */
export function joinPa(pas: string, pad: string): string {
  return pas || pad ? `${pas}/${pad}` : '';
}

export function padValue(values: ParameterValues, key: PadField): string {
  if (key === 'pas') return splitPa(values.pa).pas;
  if (key === 'pad') return splitPa(values.pa).pad;
  return values[key] ?? '';
}
/** Chiave e valore da scrivere nella bozza per un campo del tastierino. */
export function padUpdate(
  values: ParameterValues,
  key: PadField,
  text: string,
): [keyof ParameterValues, string] {
  if (key === 'pas') return ['pa', joinPa(text, splitPa(values.pa).pad)];
  if (key === 'pad') return ['pa', joinPa(splitPa(values.pa).pas, text)];
  return [key, text];
}

/** Tasto del tastierino applicato al testo del campo: cifre, virgola (una sola), cancella. */
export function applyPadKey(current: string, key: string, decimals: boolean): string {
  if (key === 'back') return current.slice(0, -1);
  if (key === ',') {
    if (!decimals || current.includes(',') || current.includes('.')) return current;
    return current ? `${current},` : current;
  }
  if (!/^\d$/.test(key) || current.length >= 6) return current;
  return current + key;
}

export function nextPadField(key: PadField): PadField | null {
  const index = PAD_FIELDS.findIndex((field) => field.key === key);
  return PAD_FIELDS[index + 1]?.key ?? null;
}

export interface PreviousValue {
  value: string;
  measuredAt: string;
}
/** Ultimo valore registrato per campo (le rilevazioni arrivano dalla più recente). */
export function previousValues(
  readings: PatientParameterReading[],
): Partial<Record<PadField | 'o2' | 'coscienza', PreviousValue>> {
  const out: Partial<Record<PadField | 'o2' | 'coscienza', PreviousValue>> = {};
  const ordered = [...readings].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  for (const reading of ordered) {
    const values = reading.values ?? {};
    for (const key of ['fr', 'spo2', 'fc', 'temperatura', 'dtx', 'o2', 'coscienza'] as const) {
      const text = values[key]?.trim();
      if (text && !out[key]) out[key] = { value: text, measuredAt: reading.measuredAt };
    }
    const pa = values.pa?.trim();
    if (pa && !out.pas) {
      const { pas, pad } = splitPa(pa);
      if (pas) out.pas = { value: pas, measuredAt: reading.measuredAt };
      if (pad) out.pad = { value: pad, measuredAt: reading.measuredAt };
    }
  }
  return out;
}

/** "08:05" per oggi, "26/09 08:05" per i giorni precedenti (orario della struttura). */
export function whenLabel(instant: string, now: Date = new Date()): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return '';
  const local = facilityLocalMinute(date);
  const time = local.slice(11, 16);
  if (local.slice(0, 10) === facilityLocalMinute(now).slice(0, 10)) return time;
  return `${local.slice(8, 10)}/${local.slice(5, 7)} ${time}`;
}

/**
 * Testo scritto, incollato o dettato in un campo: resta esattamente com'è (nessuna pulizia, nessun
 * troncamento). Un valore che non è un numero pulito lo rifiuta la validazione di sempre, come nella
 * tabella precedente: così non nasce mai un numero valido diverso da quello inserito.
 * Unica trasformazione: nella sistolica, la prima "/" divide il testo fra sistolica e diastolica
 * senza scartare nulla ("120/80/70" arriva intero alla validazione). Restituisce null quando il
 * testo è solo una barra, e `split` quando il fuoco deve passare alla diastolica.
 */
export function padInput(
  values: ParameterValues,
  key: PadField,
  raw: string,
): { field: keyof ParameterValues; value: string; split: boolean } | null {
  if (key === 'pas') {
    const slash = raw.indexOf('/');
    if (slash >= 0) {
      const left = raw.slice(0, slash).trim();
      const right = raw.slice(slash + 1).trim();
      if (!left && !right) return null;
      // "130/" non cancella la diastolica già scritta.
      return { field: 'pa', value: joinPa(left, right || splitPa(values.pa).pad), split: true };
    }
  }
  const [field, value] = padUpdate(values, key, raw);
  return { field, value, split: false };
}

export type PreviousKey = PadField | 'o2' | 'coscienza';
/** Riga "Prima": mai un'assenza non verificata. Se lo storico ha altre pagine non lette, un campo
 * mancante non è "nessuna rilevazione" ma "non fra le ultime N". */
export function previousText(
  state:
    | { status: 'loading' }
    | { status: 'error' }
    | {
        status: 'ready';
        values: ReturnType<typeof previousValues>;
        hasMore: boolean;
        count: number;
      },
  key: PreviousKey,
  now: Date = new Date(),
): string {
  if (state.status === 'loading') return 'Prima: …';
  if (state.status === 'error') return 'Precedente non disponibile';
  const item = state.values[key];
  if (!item)
    return state.hasMore
      ? state.count === 1
        ? "Prima: non nell'ultima rilevazione"
        : `Prima: non fra le ultime ${state.count} rilevazioni`
      : 'Nessuna rilevazione precedente';
  const shown = key === 'o2' ? (item.value === 'si' ? 'con O2' : 'in aria') : item.value;
  return `Prima: ${shown} · ${whenLabel(item.measuredAt, now)}`;
}
