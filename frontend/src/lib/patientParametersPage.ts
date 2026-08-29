import type { CartellaPaziente, ParametriMensili, Paziente } from '../types';

export type ParameterPagePatient = Pick<
  Paziente,
  'id' | 'medicalRecordNumber' | 'firstName' | 'lastName'
>;

export interface PatientParametersPageItem {
  patient: ParameterPagePatient;
  cartella: Pick<
    CartellaPaziente,
    'pazienteId' | 'parametriMensili' | 'cameraNumero' | 'lettoNumero'
  >;
}

export interface PatientParametersPageResponse {
  items: PatientParametersPageItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function buildPatientParametersPageUrl(
  apiUrl: string,
  filters: { q?: string; cursor?: string; limit?: number; month?: number; year?: number },
): string {
  const requested = Number.isFinite(filters.limit) ? Math.trunc(filters.limit as number) : 25;
  const params = new URLSearchParams({ limit: String(Math.min(25, Math.max(1, requested))) });
  const now = new Date();
  params.set('month', String(filters.month ?? now.getMonth() + 1));
  params.set('year', String(filters.year ?? now.getFullYear()));
  const q = filters.q?.trim();
  if (q) params.set('q', q);
  if (filters.cursor) params.set('cursor', filters.cursor);
  return `${apiUrl}/patients/parameters/page?${params.toString()}`;
}

export async function fetchPatientParametersPage(
  apiUrl: string,
  filters: { q?: string; cursor?: string; limit?: number; month?: number; year?: number },
  options: { headers: HeadersInit; signal?: AbortSignal; fetcher?: typeof fetch },
): Promise<PatientParametersPageResponse> {
  const response = await (options.fetcher ?? fetch)(
    buildPatientParametersPageUrl(apiUrl, filters),
    {
      headers: options.headers,
      signal: options.signal,
    },
  );
  if (!response.ok) throw new Error('Impossibile caricare i parametri pazienti');
  const page = (await response.json()) as PatientParametersPageResponse;
  if (
    !Array.isArray(page.items) ||
    typeof page.hasMore !== 'boolean' ||
    (page.nextCursor !== null && typeof page.nextCursor !== 'string')
  ) {
    throw new Error('Risposta parametri pazienti non valida');
  }
  return page;
}

export async function savePatientParameterMonth(
  apiUrl: string,
  patientId: string,
  month: ParametriMensili,
  options: { headers: HeadersInit; fetcher?: typeof fetch },
): Promise<ParametriMensili> {
  const response = await (options.fetcher ?? fetch)(
    `${apiUrl}/patients/${encodeURIComponent(patientId)}/parameters`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify({ month }),
    },
  );
  if (!response.ok) throw new Error('Impossibile salvare i parametri paziente');
  const payload = (await response.json()) as { month?: ParametriMensili };
  if (!payload.month || !Array.isArray(payload.month.giorni)) {
    throw new Error('Risposta salvataggio parametri non valida');
  }
  return payload.month;
}

export function mergePatientParametersPage(
  current: PatientParametersPageItem[],
  incoming: PatientParametersPageItem[],
  append: boolean,
): PatientParametersPageItem[] {
  if (!append) return incoming;
  const byId = new Map(current.map((item) => [item.patient.id, item]));
  incoming.forEach((item) => byId.set(item.patient.id, item));
  return [...byId.values()];
}
