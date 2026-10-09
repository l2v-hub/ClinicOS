import { localIsoDate } from './appointmentRange';

/** Same operator-calendar eligibility for the primary action and empty slots.
 * Preserves the existing primary action's local-day/minute policy, not server authorization. */
export function canOpenOperatorAppointment(
  allowed: boolean,
  date: string,
  time: string,
  occupied: boolean,
  now: Date,
): boolean {
  if (!allowed || occupied || !/^\d{2}:\d{2}$/.test(time)) return false;
  const today = localIsoDate(now);
  if (date < today) return false;
  const [hours, minutes] = time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return false;
  return date > today || hours * 60 + minutes >= now.getHours() * 60 + now.getMinutes();
}

export function firstOperatorAppointmentSlot(
  allowed: boolean,
  date: string,
  slots: readonly string[],
  occupied: ReadonlySet<string>,
  now: Date,
): string | null {
  return (
    slots.find((time) =>
      canOpenOperatorAppointment(allowed, date, time, occupied.has(time), now),
    ) ?? null
  );
}
