import { createDraft, getDraft, type DraftResponse } from './intakeDraftApi';

type Actor = { operatorId?: string; operatorRole?: string };
// Richiesta in corso per attore, con la bozza che sta aprendo ('' = una nuova).
const pending = new Map<string, { target: string; request: Promise<DraftResponse> }>();
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
/** «Elimina bozza»: se era la bozza ricordata da questa scheda, non va più riaperta. */
export function forgetManualDraft(actor: Actor, draftId: string) {
  if (remembered(actor) === draftId) clearManualDraft(actor);
}
/**
 * Persist only the opaque draft ID; a failed resume must not create another patient draft.
 * `resumeId` = «Riprendi bozza» dall'elenco: quella bozza diventa quella della scheda corrente.
 */
export function openManualDraft(actor: Actor, resumeId?: string): Promise<DraftResponse> {
  const actorKey = key(actor);
  const id = resumeId ?? remembered(actor);
  const target = id ?? '';
  const current = pending.get(actorKey);
  // Una richiesta in corso si riusa solo se apre la stessa bozza: «Riprendi bozza · X» non deve
  // ricevere la bozza di un'apertura precedente ancora in volo.
  if (current && (current.target === target || !resumeId)) return current.request;
  const opened = id
    ? getDraft(id, actor).then((draft) =>
        // Una bozza eliminata (anche da un'altra scheda) non si riapre: si parte da una nuova.
        draft.status === 'abandoned' ? createDraft('manual', actor) : draft,
      )
    : createDraft('manual', actor);
  const request = opened
    .then((draft) => {
      try {
        window.sessionStorage.setItem(actorKey, draft.id);
      } catch {
        /* Keep in-memory draft. */
      }
      return draft;
    })
    .finally(() => {
      if (pending.get(actorKey)?.request === request) pending.delete(actorKey);
    });
  pending.set(actorKey, { target, request });
  return request;
}
