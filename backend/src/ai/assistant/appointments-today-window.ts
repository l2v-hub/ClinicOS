export const MAX_TODAY_APPOINTMENTS = 200;

export function todayAppointmentLimit(requested: number): number {
  if (!Number.isFinite(requested)) return 1;
  return Math.min(MAX_TODAY_APPOINTMENTS, Math.max(1, Math.floor(requested)));
}

export function boundTodayAppointments<T>(
  rows: readonly T[],
  requestedLimit: number,
): { data: T[]; truncated: boolean } {
  const limit = todayAppointmentLimit(requestedLimit);
  return {
    data: rows.slice(0, limit),
    truncated: rows.length > limit,
  };
}
