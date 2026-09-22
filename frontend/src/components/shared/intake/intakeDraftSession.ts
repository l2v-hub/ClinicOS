import { createDraft, getDraft, type DraftResponse } from './intakeDraftApi';

type Actor = { operatorId?: string; operatorRole?: string };
const pending = new Map<string, Promise<DraftResponse>>();
const key = (actor: Actor) =>
  `clinicos:intake-draft:${actor.operatorId ?? 'session'}:${actor.operatorRole ?? ''}`;
function remembered(actor: Actor): string | null {
  try {
    return window.sessionStorage.getItem(key(actor));
  } catch {
    return null;
  }
}
export function clearManualDraft(actor: Actor) {
  try {
    window.sessionStorage.removeItem(key(actor));
  } catch {
    /* Storage may be unavailable. */
  }
}
/** Persist only the opaque draft ID; a failed resume must not create another patient draft. */
export function openManualDraft(actor: Actor): Promise<DraftResponse> {
  const actorKey = key(actor);
  const current = pending.get(actorKey);
  if (current) return current;
  const id = remembered(actor);
  const request = (id ? getDraft(id, actor) : createDraft('manual', actor))
    .then((draft) => {
      try {
        window.sessionStorage.setItem(actorKey, draft.id);
      } catch {
        /* Keep in-memory draft. */
      }
      return draft;
    })
    .finally(() => pending.delete(actorKey));
  pending.set(actorKey, request);
  return request;
}
