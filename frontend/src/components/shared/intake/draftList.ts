// Elenco «Ingressi in bozza»: una voce per paziente.
//
// Il server segnala i doppioni (`duplicateOfId` = la bozza più recente dello stesso paziente, per
// identità forte). Qui si decide solo cosa mostrare: la più recente come voce principale, le
// precedenti sotto di lei; le bozze manuali ancora vuote non sono un ingresso in corso.
// Mai un riuso lato server della bozza vuota: due schede aperte condividerebbero la stessa bozza
// e i dati di due pazienti potrebbero mescolarsi.
import type { DraftResponse } from './intakeDraftApi';

export interface DraftGroup {
  primary: DraftResponse;
  /** Bozze precedenti dello stesso paziente, dalla più recente. */
  older: DraftResponse[];
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') return Object.values(value as object).some(hasValue);
  return true;
}

/** Valori che la scheda scrive da sola all'apertura (data e ora di presa in carico = adesso). */
const AUTOMATIC_INTAKE_FIELDS = new Set(['dataPresa', 'oraPresa']);

/**
 * Nessun dato inserito dall'operatore: le chiavi `_…` sono contabilità del server e data/ora di
 * presa in carico sono precompilate dalla scheda appena si apre.
 */
export function isBlankDraftData(data: Record<string, unknown> | null | undefined): boolean {
  return !Object.entries(data ?? {}).some(([key, value]) => {
    if (key.startsWith('_')) return false;
    if (key === 'ingresso' && value && typeof value === 'object' && !Array.isArray(value))
      return Object.entries(value).some(
        ([field, entry]) => !AUTOMATIC_INTAKE_FIELDS.has(field) && hasValue(entry),
      );
    return hasValue(value);
  });
}

export function isBlankDraft(draft: DraftResponse): boolean {
  return isBlankDraftData(draft.data);
}

export function draftPatientName(draft: DraftResponse): string {
  const identity = (draft.data?.anagrafica ?? {}) as { firstName?: string; lastName?: string };
  return (
    [identity.lastName, identity.firstName]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ') || 'Identità da completare'
  );
}

/** «da documenti» quando la bozza ha (o nasce da) una sessione documenti, altrimenti «a mano». */
export function draftResumePath(draft: DraftResponse): 'documenti' | 'manuale' {
  return draft.source === 'import' && draft.importJobId ? 'documenti' : 'manuale';
}

export function draftUpdatedLabel(draft: DraftResponse, now = new Date()): string {
  const updated = draft.updatedAt ? new Date(draft.updatedAt) : null;
  if (!updated || Number.isNaN(updated.getTime())) return '';
  const time = updated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (updated.toDateString() === now.toDateString()) return `oggi alle ${time}`;
  const date = updated.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  return `il ${date} alle ${time}`;
}

/** Bozze visibili raggruppate per paziente, nell'ordine ricevuto (più recenti prima). */
export function groupDrafts(items: readonly DraftResponse[]): DraftGroup[] {
  const visible = items.filter((draft) => draft.source === 'import' || !isBlankDraft(draft));
  const ids = new Set(visible.map((draft) => draft.id));
  const groups = new Map<string, DraftGroup>();
  for (const draft of visible) {
    // Un doppione il cui principale non è visibile resta una voce a sé: nessuna bozza sparisce.
    if (!draft.duplicateOfId || !ids.has(draft.duplicateOfId))
      groups.set(draft.id, { primary: draft, older: [] });
  }
  for (const draft of visible) {
    if (draft.duplicateOfId && ids.has(draft.duplicateOfId))
      groups.get(draft.duplicateOfId)?.older.push(draft);
  }
  return [...groups.values()];
}
