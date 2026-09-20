import { facilityLocalMinute } from './facilityTime';
import { shiftCivilDay, trendPreset, type TrendPeriod } from './patientParameterTrends';

export const PARAMETER_PERIODS = [
  { key: 'today', label: 'Oggi' },
  { key: 'week', label: '7 giorni' },
  { key: 'month', label: 'Mese' },
  { key: 'half-year', label: '6 mesi' },
  { key: 'year', label: 'Anno' },
] as const;
export type ParameterPeriodPreset = (typeof PARAMETER_PERIODS)[number]['key'];

/** Calendar anniversaries are clamped before advancing one day: inclusive trailing period. */
export function parameterPeriod(
  preset: ParameterPeriodPreset,
  today = facilityLocalMinute().slice(0, 10),
): TrendPeriod {
  if (preset === 'today' || preset === 'week')
    return trendPreset(preset === 'today' ? 1 : 7, today);
  const months = preset === 'month' ? 1 : preset === 'half-year' ? 6 : 12;
  const [year, month, day] = today.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, 1, 12));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return { start: shiftCivilDay(target.toISOString().slice(0, 10), 1), end: today };
}

export function parameterDayInPeriod(day: string, period: TrendPeriod): boolean {
  return !!day && day >= period.start && day <= period.end;
}
