export interface AppointmentRangeRequest {
  from: string;
  to: string;
  operatorId?: string;
}

/** Calendar date in the user's local timezone. `toISOString()` would select the previous day
 * around midnight in positive UTC offsets such as Europe/Rome. */
export function localIsoDate(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildAppointmentRangeUrl(apiUrl: string, request: AppointmentRangeRequest): string {
  const params = new URLSearchParams({ from: request.from, to: request.to, limit: '1000' });
  if (request.operatorId) params.set('operatorId', request.operatorId);
  return `${apiUrl}/appointments?${params.toString()}`;
}
