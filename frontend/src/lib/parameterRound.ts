import type { PatientParametersPageItem } from './patientParametersPage';

/** Only authoritative daily zero counts identify an unfinished patient; unknown is never zero. */
export function nextParameterPatient(
  items: PatientParametersPageItem[],
  savedId: string,
  day: string,
): PatientParametersPageItem | null {
  const index = items.findIndex((item) => item.patient.id === savedId);
  const ordered = [...items.slice(index + 1), ...items.slice(0, Math.max(0, index))];
  return (
    ordered.find(
      (item) =>
        item.patient.id !== savedId &&
        !item.summaryPending &&
        item.summaryDate === day &&
        item.cartella.readingCount === 0,
    ) ?? null
  );
}

export interface ParameterRoundPage {
  items: PatientParametersPageItem[];
  nextCursor: string | null;
}

/** Continue through completed pages; a changed roster selection/day cancels automatic movement. */
export async function nextParameterPatientAcrossPages(
  items: PatientParametersPageItem[],
  savedId: string,
  day: string,
  cursor: string | null,
  loadPage: (cursor: string) => Promise<ParameterRoundPage | undefined>,
  isCurrent: () => boolean,
): Promise<PatientParametersPageItem | null> {
  let next = nextParameterPatient(items, savedId, day);
  const visited = new Set<string>();
  while (!next && cursor && isCurrent()) {
    if (visited.has(cursor))
      throw new Error('Impossibile verificare le pagine successive del giro.');
    visited.add(cursor);
    const page = await loadPage(cursor);
    if (!isCurrent() || !page) return null;
    next = nextParameterPatient(page.items, savedId, day);
    cursor = page.nextCursor;
  }
  return isCurrent() ? next : null;
}
