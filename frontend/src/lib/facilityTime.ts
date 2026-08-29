export const FACILITY_TIME_ZONE = 'Europe/Rome';

const FACILITY_DATE_TIME = new Intl.DateTimeFormat('en-CA', {
  timeZone: FACILITY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Canonical wall-clock value accepted by the diary datetime-local input and backend keyset. */
export function facilityLocalMinute(value: Date = new Date()): string {
  if (!Number.isFinite(value.getTime())) throw new Error('Data non valida');
  const parts = Object.fromEntries(
    FACILITY_DATE_TIME.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatFacilityLocalMinute(value: string): string {
  if (!value) return '—';
  const canonical = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  const normalized = canonical ? value : facilityLocalMinute(new Date(value));
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(normalized);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
