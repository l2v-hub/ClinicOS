import { validMnaDate } from './mnaInputValidation';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  era: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
function parts(value: string | Date) {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().startsWith('0000-'))
    throw new Error('Data della valutazione MNA non valida.');
  const result = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const day = `${result.year.padStart(4, '0')}-${result.month}-${result.day}`;
  if (result.era !== 'AD' || !validMnaDate(day))
    throw new Error('Data della valutazione MNA fuori dagli anni 0001–9999.');
  return { day, time: `${result.hour}:${result.minute}:${result.second}` };
}
export const mnaAssessmentDate = (value: string | Date) => parts(value).day;
export function mnaLocalMinute(value: string | Date): string {
  const { day, time } = parts(value);
  return `${day}T${time.slice(0, 5)}`;
}
/** Includes historical Rome second offsets; never changes other assessment date semantics. */
export function mnaAssessmentInstants(local: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !validMnaDate(local.slice(0, 10)))
    return [];
  const base = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(base) || new Date(base).toISOString().slice(0, 16) !== local) return [];
  const offsets = new Set<number>();
  for (const hours of [-36, 0, 36]) {
    const sample = new Date(base + hours * 3600000);
    try {
      const { day, time } = parts(sample);
      offsets.add(Date.parse(`${day}T${time}Z`) - sample.getTime());
    } catch {
      /* A sample can lie outside the supported year range. */
    }
  }
  return [...offsets]
    .map((offset) => new Date(base - offset).toISOString())
    .filter((instant) => {
      try {
        return /^\d{4}-/.test(instant) && mnaLocalMinute(instant) === local;
      } catch {
        return false;
      }
    })
    .sort();
}
