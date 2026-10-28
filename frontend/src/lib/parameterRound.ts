import type { PatientParametersPageItem } from './patientParametersPage';

/** Only authoritative daily zero counts identify an unfinished patient; unknown is never zero. */
export function nextParameterPatient(
  items: PatientParametersPageItem[],
  savedId: string,
  day: string,
  wrap = true,
): PatientParametersPageItem | null {
  const index = items.findIndex((item) => item.patient.id === savedId);
  const ordered =
    index < 0
      ? items
      : [...items.slice(index + 1), ...(wrap ? items.slice(0, index) : [])];
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
  let next = nextParameterPatient(items, savedId, day, false);
  const visited = new Set<string>();
  while (!next && cursor && isCurrent()) {
    if (visited.has(cursor))
      throw new Error('Impossibile verificare le pagine successive del giro.');
    visited.add(cursor);
    const page = await loadPage(cursor);
    if (!isCurrent() || !page) return null;
    next = nextParameterPatient(page.items, savedId, day, false);
    cursor = page.nextCursor;
  }
  if (!next && isCurrent() && cursor === null) {
    next = nextParameterPatient(items, savedId, day, true);
  }
  return isCurrent() ? next : null;
}
