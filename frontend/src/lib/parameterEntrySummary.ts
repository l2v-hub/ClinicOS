import type { PatientParametersPageItem } from './patientParametersPage';
import type { SavedParameterReading } from './patientParameterReadings';

/** Reading archives are append-only. Older responses must not lower a day's counters. */
export function applySavedParameterSummary(
  item: PatientParametersPageItem,
  saved: SavedParameterReading['summary'],
): PatientParametersPageItem {
  const sameDay = item.summaryDate === saved.date;
  if (sameDay && (item.cartella.readingCount ?? 0) > saved.count) return item;
  return {
    ...item,
    summaryDate: saved.date,
    cartella: {
      ...item.cartella,
      readingCount: saved.count,
      noteCount: saved.noteCount ?? (sameDay ? item.cartella.noteCount : undefined),
      lastReadingAt: saved.lastReadingAt,
    },
  };
}

/** Keep mounted rows/drafts at midnight, but never label yesterday's totals as today. */
export function resetParameterDay(
  item: PatientParametersPageItem,
  date: string,
): PatientParametersPageItem {
  return {
    ...item,
    summaryDate: date,
    summaryPending: true,
    cartella: {
      ...item.cartella,
      readingCount: undefined,
      noteCount: undefined,
      lastReadingAt: undefined,
    },
  };
}
