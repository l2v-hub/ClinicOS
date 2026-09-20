import { facilityLocalMinute } from './facilityTime';
import { fetchParameterReadings, type PatientParameterReading } from './patientParameterReadings';
import { trendMonths, type TrendPeriod } from './patientParameterTrends';

const INVALID = 'Le rilevazioni ricevute non sono complete o valide. Riprova.';
interface Options {
  headers: HeadersInit;
  signal: AbortSignal;
  fetcher?: typeof fetch;
  onProgress?: (count: number) => void;
}
function validateReading(
  value: unknown,
  patientId: string,
  month: string,
): PatientParameterReading {
  if (!value || typeof value !== 'object') throw new Error(INVALID);
  const row = value as PatientParameterReading;
  if (
    typeof row.id !== 'string' ||
    !row.id ||
    row.patientId !== patientId ||
    typeof row.measuredAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.measuredAt) ||
    !Number.isFinite(Date.parse(row.measuredAt)) ||
    new Date(row.measuredAt).toISOString() !== row.measuredAt ||
    facilityLocalMinute(new Date(row.measuredAt)).slice(0, 7) !== month ||
    typeof row.authorName !== 'string' ||
    !row.values ||
    typeof row.values !== 'object' ||
    Array.isArray(row.values) ||
    Object.values(row.values).some((item) => typeof item !== 'string')
  )
    throw new Error(INVALID);
  return row;
}

/** Publish only a complete range. A failed later page never returns a partial trend. */
export async function loadPatientParameterTrends(
  apiUrl: string,
  patientId: string,
  period: TrendPeriod,
  options: Options,
): Promise<PatientParameterReading[]> {
  const months = trendMonths(period);
  const rows = new Map<string, PatientParameterReading>();
  let pages = 0;
  for (const month of months) {
    let cursor: string | undefined;
    const cursors = new Set<string>();
    do {
      options.signal.throwIfAborted();
      if (++pages > 400)
        throw new Error('Il periodo contiene troppe rilevazioni. Scegli un intervallo più breve.');
      const page = await fetchParameterReadings(apiUrl, patientId, { month, cursor }, options);
      options.signal.throwIfAborted();
      if (
        page.readings.length > 50 ||
        (page.hasMore && !page.nextCursor) ||
        (!page.hasMore && page.nextCursor !== null)
      )
        throw new Error(INVALID);
      let added = 0;
      for (const value of page.readings) {
        const row = validateReading(value, patientId, month);
        if (!rows.has(row.id)) {
          rows.set(row.id, row);
          added++;
        } else if (JSON.stringify(rows.get(row.id)) !== JSON.stringify(row))
          throw new Error(INVALID);
      }
      options.onProgress?.(rows.size);
      if (!page.hasMore) break;
      if (!added || cursors.has(page.nextCursor!)) throw new Error(INVALID);
      cursors.add(page.nextCursor!);
      cursor = page.nextCursor!;
    } while (cursor);
  }
  return [...rows.values()]
    .filter((row) => {
      const day = facilityLocalMinute(new Date(row.measuredAt)).slice(0, 10);
      return day >= period.start && day <= period.end;
    })
    .sort(
      (a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt) || a.id.localeCompare(b.id),
    );
}
