import type { AssessmentDraft } from '../../../lib/assessments/assessmentDraftStore';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import './AssessmentDraftStatus.css';

export const localDraftHelp = (storageFailed: boolean) => storageFailed
  ? 'Le risposte restano in questa finestra, ma il browser non le conserva dopo il ricaricamento. Salva la bozza in ClinicOS e attendi la conferma prima di uscire.'
  : 'Le risposte non salvate restano solo in questa finestra aperta, anche dopo il ricaricamento. Non sono disponibili su un altro dispositivo o dopo un nuovo accesso. Salva la bozza in ClinicOS e attendi la conferma prima di uscire.';

/** Presentation only: the existing store/client is the authority for acknowledged writes. */
export function draftAvailability(draft: AssessmentDraft, storageFailed: boolean) {
  let confirmedAt: string | null = null;
  if (draft.record?.updatedAt) {
    try { confirmedAt = formatFacilityLocalMinute(draft.record.updatedAt); } catch { /* No invented timestamp. */ }
  }
  const local = localDraftHelp(storageFailed);
  if (draft.busy) return {
    label: draft.pending?.kind === 'finalize' ? 'Finalizzazione in corso' : 'Salvataggio in corso',
    help: `Attendi la conferma di ClinicOS prima di uscire. ${local}`, confirmedAt,
  };
  if (draft.pending || draft.failure?.uncertain) return {
    label: draft.failure && !draft.failure.uncertain ? 'Salvataggio non completato' : 'Salvataggio da verificare',
    help: `La conferma non è disponibile: non considerare queste modifiche salvate. Usa le azioni di recupero indicate sotto la compilazione. ${local}`, confirmedAt,
  };
  if (draft.failure?.code === 'assessment_incomplete' && draft.record && !draft.dirty) return {
    label: 'Compilazione da completare', confirmedAt,
    help: 'La bozza è stata salvata, ma mancano risposte per finalizzarla. Completa i campi indicati e salva le modifiche prima di verificare l’anteprima.',
  };
  if (draft.failure) return { label: 'Salvataggio non completato', help: local, confirmedAt };
  if (draft.dirty || !draft.record) return {
    label: draft.record ? 'Modifiche non salvate in ClinicOS' : 'Non salvata in ClinicOS', help: local, confirmedAt,
  };
  return {
    label: 'Bozza salvata in ClinicOS', confirmedAt,
    help: 'Puoi riprenderla dopo un nuovo accesso o su un altro dispositivo con lo stesso account, finché hai accesso al paziente. Gli altri operatori non possono aprire la tua bozza personale.',
  };
}

export function AssessmentDraftStatus({ draft, storageFailed, helpOnly = false }: {
  draft: AssessmentDraft; storageFailed: boolean; helpOnly?: boolean;
}) {
  const state = draftAvailability(draft, storageFailed);
  return <div className="assessment-draft-status" {...(!helpOnly ? { role: 'status', 'aria-live': 'polite' as const } : {})}>
    {!helpOnly && <strong>{state.label}</strong>}
    {state.confirmedAt && <span>Ultimo salvataggio confermato: {state.confirmedAt} · ora della struttura</span>}
    <p>{state.help}</p>
  </div>;
}
