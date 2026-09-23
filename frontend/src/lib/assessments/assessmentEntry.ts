import type { AssessmentDraftStore } from './assessmentDraftStore';
import type { AssessmentType } from './assessmentTypes';
import type { AssessmentCatalogItem } from './assessmentCatalog';
export interface AssessmentEntry { type: AssessmentType; id?: string; localKey?: string }
/** An explicit new request must not turn an existing-record edit into a hidden update. */
export function legacyEntryTransition<T>(action: 'request' | 'resume' | 'discard', state: { editId: string | null; form: T }, empty: () => T) {
  if (action === 'request' && state.editId) return { ...state, blocked: true, showForm: false };
  if (action === 'discard') return { editId: null, form: empty(), blocked: false, showForm: true };
  return { ...state, blocked: false, showForm: true };
}
export function assessmentCatalogEntry(
  patientId: string, type: AssessmentType, action: 'open' | 'new' | 'resume',
  store: AssessmentDraftStore, item?: AssessmentCatalogItem,
): AssessmentEntry {
  if (item && item.type !== type) throw new Error('Tipo di modulo non corrispondente.');
  if (action === 'new') return { type, localKey: store.create(patientId, undefined, type) };
  const local = store.list(patientId, type).find(draft => draft.dirty || draft.pending);
  if (action === 'resume') {
    if (local) return { type, localKey: local.key };
    if (item?.latestOwnDraft) return { type, id: item.latestOwnDraft.id };
    return { type };
  }
  if (item?.latestFinal) return { type, id: item.latestFinal.id };
  if (local) return { type, localKey: local.key };
  return { type, ...(item?.latestOwnDraft ? { id: item.latestOwnDraft.id } : {}) };
}
