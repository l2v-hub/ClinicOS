// Phase 7 — facility time (Europe/Rome) for shift windows. Shift starts are configuration
// (PROACTIVE_SHIFTS, default «mattina=07:00,pomeriggio=14:00,notte=21:00»), not business logic.

const ZONE = 'Europe/Rome';

export function romeParts(instant: Date): { date: string; hhmm: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hhmm: `${parts.hour}:${parts.minute}`,
  };
}

/** UTC instant of a facility-local date + HH:MM (DST-aware). */
export function romeInstant(date: string, hhmm: string): Date {
  const guess = new Date(`${date}T${hhmm}:00.000Z`);
  // Offset of Rome at that moment, then correct once (handles the DST transition hours too).
  for (let i = 0; i < 2; i += 1) {
    const local = romeParts(guess);
    const asUtc = Date.parse(`${local.date}T${local.hhmm}:00.000Z`);
    const wanted = Date.parse(`${date}T${hhmm}:00.000Z`);
    guess.setTime(guess.getTime() + (wanted - asUtc));
  }
  return guess;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ShiftDef {
  id: string;
  start: string; // HH:MM
}

export function shiftConfig(env: NodeJS.ProcessEnv = process.env): ShiftDef[] {
  const raw = (env.PROACTIVE_SHIFTS || 'mattina=07:00,pomeriggio=14:00,notte=21:00').trim();
  const shifts = raw
    .split(',')
    .map((part) => part.trim().split('='))
    .filter(([id, start]) => id && /^\d{2}:\d{2}$/.test(start ?? ''))
    .map(([id, start]) => ({ id: id.trim(), start: start!.trim() }))
    .sort((a, b) => a.start.localeCompare(b.start));
  return shifts.length ? shifts : [{ id: 'giornata', start: '00:00' }];
}

export interface ShiftWindow {
  current: { id: string; start: string };
  previous: { id: string; start: string };
}

/** Current shift and the one before it, as ISO instants. */
export function shiftWindow(now: Date, shifts = shiftConfig()): ShiftWindow {
  const { date, hhmm } = romeParts(now);
  const starts: { id: string; at: Date }[] = [];
  for (const day of [addDays(date, -1), date]) {
    for (const s of shifts) starts.push({ id: s.id, at: romeInstant(day, s.start) });
  }
  const past = starts.filter((s) => s.at.getTime() <= now.getTime());
  const current = past[past.length - 1] ?? starts[0]!;
  const previous = past[past.length - 2] ?? {
    id: current.id,
    at: new Date(current.at.getTime() - 86_400_000),
  };
  void hhmm;
  return {
    current: { id: current.id, start: current.at.toISOString() },
    previous: { id: previous.id, start: previous.at.toISOString() },
  };
}
