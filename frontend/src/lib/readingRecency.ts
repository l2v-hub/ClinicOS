import { facilityLocalMinute, formatFacilityLocalMinute } from './facilityTime';

export interface ReadingRecency {
  absolute: string;
  elapsed: string;
  valid: boolean;
}

/** Historical provenance only: elapsed units are descriptive, never clinical cutoffs. */
export function readingRecency(instant: string, now: Date = new Date()): ReadingRecency {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(instant);
  const date = new Date(instant);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  const day = Number(match?.[3]);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!match || !Number.isFinite(date.getTime()) || month < 1 || month > 12 ||
    day < 1 || day > days[month - 1] || Number(match[4]) > 23 ||
    Number(match[5]) > 59 || Number(match[6]) > 59)
    return { absolute: 'Data/ora non verificabile', elapsed: '', valid: false };
  const absolute = formatFacilityLocalMinute(facilityLocalMinute(date));
  const age = now.getTime() - date.getTime();
  if (!Number.isFinite(age)) return { absolute, elapsed: 'recenza non verificabile', valid: true };
  if (age < 0) return { absolute, elapsed: 'data/ora futura — da verificare', valid: true };
  const minutes = Math.floor(age / 60_000);
  let elapsed = 'meno di un minuto fa';
  const units: [number, string, string][] = [
    [10_080, 'settimana', 'settimane'], [1440, 'giorno', 'giorni'],
    [60, 'ora', 'ore'], [1, 'minuto', 'minuti'],
  ];
  for (const [size, singular, plural] of units) {
    if (minutes < size) continue;
    const count = Math.floor(minutes / size);
    elapsed = `${count} ${count === 1 ? singular : plural} fa`;
    break;
  }
  return { absolute, elapsed, valid: true };
}

export function readingRecencyText(instant: string, now: Date = new Date()): string {
  const { absolute, elapsed, valid } = readingRecency(instant, now);
  return `${valid ? 'Misurato il ' : ''}${absolute}${elapsed ? ` · ${elapsed}` : ''}`;
}
