import type { MedicazioneRecord } from '../types';

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function changedFields<T extends { id: string }>(latest: T, before: T, after: T): T {
  const result = { ...latest };
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof T>) {
    if (!same(before[key], after[key])) result[key] = after[key];
  }
  return result;
}

function reconcile<T extends { id: string }>(
  latest: T[],
  before: T[],
  after: T[],
  merge: (latest: T, before: T, after: T) => T = changedFields,
): T[] {
  const baseline = new Map(before.map((item) => [item.id, item]));
  const current = new Map(latest.map((item) => [item.id, item]));
  const edits = new Map(after.map((item) => [item.id, item]));
  for (const id of baseline.keys()) if (!edits.has(id)) current.delete(id);
  for (const [id, item] of edits) {
    const original = baseline.get(id);
    if (!original) current.set(id, item);
    // A stale edit cannot resurrect a record deleted by an earlier queued write.
    else if (current.has(id) && !same(original, item))
      current.set(id, merge(current.get(id)!, original, item));
  }
  return [...new Set([...after.map((item) => item.id), ...current.keys()])]
    .filter((id) => current.has(id))
    .map((id) => current.get(id)!);
}

/** Three-way record/field deltas preserve concurrent photo, form and follow-up saves. */
export function mergeMedicazioni(
  latest: MedicazioneRecord[],
  before: MedicazioneRecord[],
  after: MedicazioneRecord[],
): MedicazioneRecord[] {
  return reconcile(latest, before, after, (current, original, edit) => {
    const next = changedFields(current, original, edit);
    if (!same(original.patientDocumentIds, edit.patientDocumentIds)) {
      const removed = new Set(
        (original.patientDocumentIds ?? []).filter((id) => !edit.patientDocumentIds?.includes(id)),
      );
      next.patientDocumentIds = [
        ...new Set([
          ...(current.patientDocumentIds ?? []),
          ...(edit.patientDocumentIds ?? []).filter(
            (id) => !original.patientDocumentIds?.includes(id),
          ),
        ]),
      ].filter((id) => !removed.has(id));
    }
    if (!same(original.followUps, edit.followUps)) {
      next.followUps = reconcile(
        current.followUps ?? [],
        original.followUps ?? [],
        edit.followUps ?? [],
      );
    }
    return next;
  });
}
