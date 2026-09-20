import { FACILITY_TIME_ZONE, facilityLocalMinute } from './facilityTime';
import type { PatientParameterReading } from './patientParameterReadings';

export const TREND_PARAMETERS = [
  { key: 'pa', label: 'Pressione', short: 'PA', unit: 'mmHg', color: '#2f6bed' },
  { key: 'spo2', label: 'Saturazione', short: 'SpO₂', unit: '%', color: '#087e8b' },
  { key: 'fc', label: 'Frequenza cardiaca', short: 'FC', unit: 'bpm', color: '#7855ab' },
  { key: 'temperatura', label: 'Temperatura', short: 'TC', unit: '°C', color: '#a16013' },
  { key: 'dtx', label: 'Glicemia', short: 'DTX', unit: 'mg/dL', color: '#287647' },
] as const;
export type TrendParameter = (typeof TREND_PARAMETERS)[number]['key'];
export interface TrendPeriod {
  start: string;
  end: string;
}
export interface TrendPoint {
  id: string;
  parameter: TrendParameter;
  series: string;
  value: number;
  original: string;
  timestamp: number;
  reading: PatientParameterReading;
}
export interface TrendSeries {
  label: string;
  dashed: boolean;
  points: (TrendPoint | null)[];
}
const CIVIL_DAY = 86_400_000;
const civilDate = (value: string) =>
  /^20\d{2}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
  new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

export function shiftCivilDay(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + amount * CIVIL_DAY).toISOString().slice(0, 10);
}
export function trendPreset(days: number, today = facilityLocalMinute().slice(0, 10)): TrendPeriod {
  return { start: shiftCivilDay(today, 1 - days), end: today };
}
export function trendPeriodError(period: TrendPeriod): string | null {
  if (!civilDate(period.start) || !civilDate(period.end))
    return 'Scegli due date valide tra il 2000 e il 2099.';
  if (period.start > period.end)
    return 'La data iniziale deve precedere o coincidere con quella finale.';
  if ((Date.parse(period.end) - Date.parse(period.start)) / CIVIL_DAY >= 366)
    return 'Seleziona un periodo di massimo 366 giorni.';
  return null;
}
export function trendMonths(period: TrendPeriod): string[] {
  const error = trendPeriodError(period);
  if (error) throw new Error(error);
  const result: string[] = [];
  let month = period.start.slice(0, 7);
  while (month <= period.end.slice(0, 7)) {
    result.push(month);
    const [year, number] = month.split('-').map(Number);
    month = `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, '0')}`;
  }
  return result;
}
/** Convert a civil midnight to an instant in the facility zone, including DST. */
export function facilityDayStart(day: string): number {
  const desired = Date.parse(`${day}T00:00:00Z`);
  let instant = desired;
  for (let i = 0; i < 3; i++) {
    const local = Date.parse(`${facilityLocalMinute(new Date(instant))}:00Z`);
    instant += desired - local;
  }
  return instant;
}
export function trendTimeDomain(period: TrendPeriod): [number, number] {
  return [facilityDayStart(period.start), facilityDayStart(shiftCivilDay(period.end, 1))];
}
const TREND_POINT_TIME = new Intl.DateTimeFormat('it-IT', {
  timeZone: FACILITY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'shortOffset',
});
export function trendPointTime(instant: string): string {
  return TREND_POINT_TIME.format(new Date(instant));
}
export function trendNumericValues(parameter: TrendParameter, raw: unknown): number[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const text = raw.trim();
  if (parameter === 'pa')
    return /^\d{1,3}\s*\/\s*\d{1,3}$/.test(text) ? text.split('/').map(Number) : null;
  if (!/^\d{1,4}(?:[.,]\d{1,2})?$/.test(text)) return null;
  const value = Number(text.replace(',', '.'));
  return parameter === 'spo2' && value > 100 ? null : [value];
}
export function buildTrendSeries(
  readings: PatientParameterReading[],
  parameter: TrendParameter,
): {
  series: TrendSeries[];
  invalid: number;
} {
  const definition = TREND_PARAMETERS.find((item) => item.key === parameter)!;
  const labels = parameter === 'pa' ? ['Sistolica', 'Diastolica'] : [definition.label];
  let invalid = 0;
  const series = labels.map((label, index) => ({
    label,
    dashed: index === 1,
    points: [] as (TrendPoint | null)[],
  }));
  for (const reading of readings) {
    const raw = reading.values[parameter];
    const values = trendNumericValues(parameter, raw);
    if (!values && typeof raw === 'string' && raw.trim()) invalid++;
    series.forEach((item, index) =>
      item.points.push(
        values
          ? {
              id: `${reading.id}:${parameter}:${index}`,
              parameter,
              series: item.label,
              value: values[index],
              original: raw!,
              timestamp: Date.parse(reading.measuredAt),
              reading,
            }
          : null,
      ),
    );
  }
  return { series, invalid };
}
/** Padding is visual only: no clinical target ranges or normalization. */
export function trendValueDomain(points: TrendPoint[]): [number, number] {
  const values = points.map((point) => point.value);
  const min = Math.min(...values),
    max = Math.max(...values);
  const padding = max === min ? Math.max(1, Math.abs(max) * 0.05) : (max - min) * 0.15;
  return [Math.max(0, min - padding), max + padding];
}
