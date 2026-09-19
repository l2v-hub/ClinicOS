import type { CartellaPaziente } from '../types';
import { facilityLocalMinute, formatFacilityLocalMinute } from './facilityTime';

export const PARAMETER_FIELDS = [
  { key: 'pa', label: 'PA', unit: 'mmHg' },
  { key: 'spo2', label: 'SpO₂', unit: '%' },
  { key: 'fc', label: 'FC', unit: 'bpm' },
  { key: 'temperatura', label: 'TC', unit: '°C' },
  { key: 'dtx', label: 'DTX', unit: 'mg/dL' },
  { key: 'evacuazione', label: 'Evacuazione', unit: '' },
] as const;
export type ParameterValues = Partial<
  Record<(typeof PARAMETER_FIELDS)[number]['key'] | 'note', string>
>;
export interface ParameterReadingRequest {
  requestId: string;
  measuredAt: string;
  values: ParameterValues;
}
export interface PatientParameterReading extends ParameterReadingRequest {
  id: string;
  patientId: string;
  authorOperatorId: string;
  authorName: string;
  createdAt: string;
}
export interface SavedParameterReading {
  reading: PatientParameterReading;
  summary: { date: string; count: number; lastReadingAt: string | null };
}
export interface ParameterReadingsPage {
  readings: PatientParameterReading[];
  hasMore: boolean;
  nextCursor: string | null;
}
export class ParameterReadingSaveError extends Error {
  readonly uncertain: boolean;
  constructor(message: string, uncertain: boolean) {
    super(message);
    this.uncertain = uncertain;
  }
}
export function parameterValuesError(values: ParameterValues): string | null {
  if (!PARAMETER_FIELDS.some((field) => values[field.key]?.trim()))
    return 'Inserisci almeno un parametro.';
  if (values.pa?.trim() && !/^\d{1,3}\s*\/\s*\d{1,3}$/.test(values.pa.trim()))
    return 'Pressione: usa il formato 120/80.';
  for (const key of ['spo2', 'fc', 'temperatura', 'dtx'] as const) {
    const text = values[key]?.trim();
    if (text && !/^\d{1,4}(?:[.,]\d{1,2})?$/.test(text))
      return `${PARAMETER_FIELDS.find((f) => f.key === key)!.label}: inserisci un numero valido.`;
  }
  if (Number(values.spo2?.replace(',', '.')) > 100) return 'SpO₂ deve essere compresa tra 0 e 100.';
  return null;
}
export function createParameterReadingRequest(
  values: ParameterValues,
  now = new Date(),
): ParameterReadingRequest {
  const error = parameterValuesError(values);
  if (error) throw new Error(error);
  return {
    requestId: crypto.randomUUID(),
    measuredAt: now.toISOString(),
    values: Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => value?.trim())
        .map(([key, value]) => [key, value!.trim()]),
    ),
  };
}
interface FetchOptions {
  headers: HeadersInit;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}
export async function saveParameterReading(
  apiUrl: string,
  patientId: string,
  request: ParameterReadingRequest,
  options: FetchOptions,
): Promise<SavedParameterReading> {
  try {
    const response = await (options.fetcher ?? fetch)(
      `${apiUrl}/patients/${encodeURIComponent(patientId)}/parameter-readings`,
      {
        method: 'POST',
        headers: {
          ...Object.fromEntries(new Headers(options.headers)),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: options.signal,
      },
    );
    const data = (await response.json()) as {
      reading?: PatientParameterReading;
      summary?: SavedParameterReading['summary'];
      error?: string;
    };
    if (!response.ok)
      throw new ParameterReadingSaveError(
        data.error || 'Salvataggio non completato.',
        response.status >= 500 || response.status === 409,
      );
    if (
      !data.reading?.id ||
      data.reading.patientId !== patientId ||
      data.reading.requestId !== request.requestId
    )
      throw new Error('Risposta incompleta');
    if (
      !data.summary ||
      !/^20\d{2}-\d{2}-\d{2}$/.test(data.summary.date) ||
      !Number.isInteger(data.summary.count) ||
      data.summary.count < 1 ||
      typeof data.summary.lastReadingAt !== 'string' ||
      !Number.isFinite(Date.parse(data.summary.lastReadingAt))
    )
      throw new Error('Riepilogo incompleto');
    return { reading: data.reading, summary: data.summary };
  } catch (error) {
    if (error instanceof ParameterReadingSaveError) throw error;
    throw new ParameterReadingSaveError(
      'Non posso verificare il salvataggio. Riprova per recuperare la stessa rilevazione.',
      true,
    );
  }
}
export async function fetchParameterReadings(
  apiUrl: string,
  patientId: string,
  filters: { date?: string; month?: string; cursor?: string },
  options: FetchOptions,
): Promise<ParameterReadingsPage> {
  const params = new URLSearchParams({ limit: '50' });
  if (filters.date) params.set('date', filters.date);
  if (filters.month) params.set('month', filters.month);
  if (filters.cursor) params.set('cursor', filters.cursor);
  const response = await (options.fetcher ?? fetch)(
    `${apiUrl}/patients/${encodeURIComponent(patientId)}/parameter-readings?${params}`,
    { headers: options.headers, signal: options.signal, cache: 'no-store' },
  );
  if (!response.ok) throw new Error('Non è possibile caricare lo storico. Riprova.');
  const data = (await response.json()) as ParameterReadingsPage;
  if (
    !Array.isArray(data.readings) ||
    typeof data.hasMore !== 'boolean' ||
    (data.nextCursor !== null && typeof data.nextCursor !== 'string')
  )
    throw new Error('Risposta dello storico non valida.');
  return data;
}
export function readingTime(instant: string): string {
  return formatFacilityLocalMinute(instant);
}
export interface LegacyParameterEntry {
  id: string;
  date: string;
  time: string;
  values: string;
  author?: string;
}
/** Legacy dates without a recorded time must not become invented midnight observations. */
export function legacyParameterEntries(cartella: CartellaPaziente): LegacyParameterEntry[] {
  const result: LegacyParameterEntry[] = [];
  for (const month of cartella.parametriMensili ?? []) {
    for (const day of month.giorni ?? []) {
      const values = [
        ...PARAMETER_FIELDS.filter((f) => f.key !== 'dtx').map((f) => [f.label, day[f.key]]),
        ['DTX 08', day.dtx08],
        ['DTX 12', day.dtx12],
        ['DTX 18', day.dtx18],
        ['Catetere', day.catetere],
        ['Note', day.note],
      ]
        .filter(([, v]) => typeof v === 'string' && v.trim())
        .map(([label, v]) => `${label}: ${v}`)
        .join(' · ');
      if (!values) continue;
      const date = `${month.anno}-${String(month.mese).padStart(2, '0')}-${String(day.giorno).padStart(2, '0')}`;
      result.push({
        id: `month:${month.id}:${day.giorno}`,
        date,
        time: 'Orario non disponibile',
        values,
        author: [day.firmaIpM, day.firmaIpP].filter(Boolean).join(' · '),
      });
    }
  }
  for (const vital of cartella.parametriVitali ?? []) {
    if (!vital.valore) continue;
    let date = '';
    let time = 'Orario non disponibile';
    if (/^\d{4}-\d{2}-\d{2}$/.test(vital.rilevato)) date = vital.rilevato;
    else if (Number.isFinite(Date.parse(vital.rilevato))) {
      const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(vital.rilevato)
        ? vital.rilevato
        : facilityLocalMinute(new Date(vital.rilevato));
      date = local.slice(0, 10);
      time = local.slice(11, 16);
    }
    result.push({
      id: `vital:${vital.id}`,
      date,
      time,
      values: `${vital.etichetta}: ${vital.valore} ${vital.unita ?? ''}${vital.note ? ` · ${vital.note}` : ''}`,
      author: vital.rilevatoDa,
    });
  }
  return result.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}
