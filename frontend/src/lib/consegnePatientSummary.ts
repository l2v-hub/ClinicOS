export interface ConsegnePatientSummary {
  patientId: string;
  total: number;
  open: number;
  urgentOpen: number;
  statoRicovero: string | null;
}
export async function fetchConsegnePatientSummary(
  apiUrl: string,
  patientIds: string[],
  options: { headers: HeadersInit; signal?: AbortSignal; fetcher?: typeof fetch },
) {
  if (patientIds.length > 50) throw new Error('Riepilogo limitato a 50 pazienti.');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const response = await (options.fetcher ?? fetch)(`${apiUrl}/consegne/patient-summary`, {
    method: 'POST',
    headers,
    signal: options.signal,
    cache: 'no-store',
    body: JSON.stringify({ patientIds }),
  });
  if (!response.ok) throw new Error('Riepilogo consegne non disponibile.');
  const body = (await response.json()) as { items?: unknown[] };
  if (!Array.isArray(body.items)) throw new Error('Riepilogo consegne non valido.');
  const ids = new Set(patientIds);
  const seen = new Set<string>();
  return body.items.map((value) => {
    const item = value as ConsegnePatientSummary;
    if (
      !item ||
      !ids.has(item.patientId) ||
      seen.has(item.patientId) ||
      ![item.total, item.open, item.urgentOpen].every(
        (count) => Number.isSafeInteger(count) && count >= 0,
      ) ||
      item.urgentOpen > item.open ||
      item.open > item.total ||
      (item.statoRicovero !== null && typeof item.statoRicovero !== 'string')
    )
      throw new Error('Riepilogo consegne non valido.');
    seen.add(item.patientId);
    return item;
  });
}
