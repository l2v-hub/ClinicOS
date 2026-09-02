import type { ClinicalSummaryEntry, Paziente } from '../types';

export interface PatientPageResponse {
  items: Paziente[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PatientPageFilters {
  q?: string;
  sex?: 'M' | 'F';
  cursor?: string;
  limit?: number;
}

export function buildPatientPageUrl(apiUrl: string, filters: PatientPageFilters): string {
  const requestedLimit = Number.isFinite(filters.limit) ? Math.trunc(filters.limit as number) : 50;
  const limit = Math.min(100, Math.max(1, requestedLimit));
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters.sex) params.set('sex', filters.sex);
  if (filters.cursor) params.set('cursor', filters.cursor);
  return `${apiUrl}/patients/page?${params.toString()}`;
}

export function buildPatientPageRequest(
  apiUrl: string,
  filters: PatientPageFilters,
): { url: string; init: RequestInit } {
  const q = filters.q?.trim();
  if (!q) return { url: buildPatientPageUrl(apiUrl, filters), init: {} };

  const requestedLimit = Number.isFinite(filters.limit) ? Math.trunc(filters.limit as number) : 50;
  const limit = Math.min(100, Math.max(1, requestedLimit));
  const body: Record<string, string> = { q, limit: String(limit) };
  if (filters.sex) body.sex = filters.sex;
  if (filters.cursor) body.cursor = filters.cursor;
  return {
    url: `${apiUrl}/patients/page/search`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  };
}

function patientPageFetchInit(
  request: ReturnType<typeof buildPatientPageRequest>,
  options: { headers: HeadersInit; signal?: AbortSignal },
): RequestInit {
  const headers = new Headers(options.headers);
  new Headers(request.init.headers).forEach((value, key) => headers.set(key, value));
  return { ...request.init, headers, signal: options.signal };
}

export function mergePatientPage(
  current: Paziente[],
  incoming: Paziente[],
  append: boolean,
): Paziente[] {
  if (!append) return incoming;
  const byId = new Map(current.map((patient) => [patient.id, patient]));
  incoming.forEach((patient) => byId.set(patient.id, patient));
  return [...byId.values()];
}

export async function fetchPatientPageWithSummary(
  apiUrl: string,
  filters: PatientPageFilters,
  options: { headers: HeadersInit; signal?: AbortSignal; fetcher?: typeof fetch },
): Promise<{ page: PatientPageResponse; summary: ClinicalSummaryEntry[] }> {
  const fetcher = options.fetcher ?? fetch;
  const request = buildPatientPageRequest(apiUrl, filters);
  const pageResponse = await fetcher(request.url, patientPageFetchInit(request, options));
  if (!pageResponse.ok) throw new Error('Impossibile caricare la pagina pazienti');
  const page = (await pageResponse.json()) as PatientPageResponse;
  if (
    !Array.isArray(page.items) ||
    typeof page.hasMore !== 'boolean' ||
    (page.nextCursor !== null && typeof page.nextCursor !== 'string')
  ) {
    throw new Error('Risposta pagina pazienti non valida');
  }

  const ids = page.items.map((patient) => patient.id);
  if (ids.length === 0) return { page, summary: [] };

  const params = new URLSearchParams({ patientIds: ids.join(',') });
  const summaryResponse = await fetcher(
    `${apiUrl}/patients/clinical-summary?${params.toString()}`,
    { headers: options.headers, signal: options.signal },
  );
  if (!summaryResponse.ok) throw new Error('Impossibile caricare i badge clinici');
  const summary = (await summaryResponse.json()) as unknown;
  if (!Array.isArray(summary)) throw new Error('Risposta riepilogo clinico non valida');
  return { page, summary: summary as ClinicalSummaryEntry[] };
}

export async function fetchPatientPage(
  apiUrl: string,
  filters: PatientPageFilters,
  options: { headers: HeadersInit; signal?: AbortSignal; fetcher?: typeof fetch },
): Promise<PatientPageResponse> {
  const fetcher = options.fetcher ?? fetch;
  const request = buildPatientPageRequest(apiUrl, filters);
  const response = await fetcher(request.url, patientPageFetchInit(request, options));
  if (!response.ok) throw new Error('Impossibile cercare i pazienti');
  const page = (await response.json()) as PatientPageResponse;
  if (
    !Array.isArray(page.items) ||
    typeof page.hasMore !== 'boolean' ||
    (page.nextCursor !== null && typeof page.nextCursor !== 'string')
  ) {
    throw new Error('Risposta ricerca pazienti non valida');
  }
  return page;
}

export async function fetchPatientById(
  apiUrl: string,
  patientId: string,
  options: { headers: HeadersInit; signal?: AbortSignal; fetcher?: typeof fetch },
): Promise<Paziente> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiUrl}/patients/${encodeURIComponent(patientId)}`, {
    headers: options.headers,
    signal: options.signal,
  });
  if (!response.ok) throw new Error('Paziente non disponibile');
  return (await response.json()) as Paziente;
}
