import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';

export interface MedicationAdministrationPage<T> {
  items: T[];
  pageInfo: { hasMore: boolean; nextCursor: string | null };
}

export async function loadMedicationAdministrationPage<T>(
  patientId: string,
  cursor: string | null = null,
): Promise<MedicationAdministrationPage<T>> {
  const params = new URLSearchParams({ limit: '100' });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(
    `${API_URL}/patients/${encodeURIComponent(patientId)}/medication-administrations/page?${params}`,
    { headers: operatorHeaders() },
  );
  if (!response.ok) throw new Error(`Errore ${response.status}`);
  const page = (await response.json()) as Partial<MedicationAdministrationPage<T>>;
  if (
    !Array.isArray(page.items) ||
    !page.pageInfo ||
    typeof page.pageInfo.hasMore !== 'boolean' ||
    (page.pageInfo.hasMore
      ? typeof page.pageInfo.nextCursor !== 'string' || page.pageInfo.nextCursor.length === 0
      : page.pageInfo.nextCursor !== null)
  ) {
    throw new Error('Risposta storico somministrazioni non valida');
  }
  return page as MedicationAdministrationPage<T>;
}
