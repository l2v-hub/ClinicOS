import type { PatientIntakeReviewState } from '../../lib/patientIntakeReview';
export type { PatientIntakeReviewState } from '../../lib/patientIntakeReview';
/** Retained OCR rows remain reference material, independent of legacy pain overflow. */
export function PatientIntakeReview({ state, onRetry }: { state: PatientIntakeReviewState; onRetry: () => void }) {
  if (state.status === 'loading') return null;
  if (state.status === 'error') return <p className="form-hint">
    Impossibile caricare le terapie rimaste in bozza.{' '}
    <button type="button" className="btn-ghost" onClick={onRetry}>Riprova</button>
  </p>;
  const rows = state.data?.deferredTherapies ?? [];
  if (!rows.length) return null;
  return <details className="clinical-card">
    <summary>Terapie rimaste in bozza · {rows.length}</summary>
    <p>Da verificare. Queste righe non sono prescrizioni e non sono somministrabili. Gli originali restano nei Documenti.</p>
    <ul>{rows.map((row, index) => <li key={index}>
      <strong>{row.name || 'Farmaco da identificare'}</strong>
      <p>{[row.dose, row.route, row.frequency, row.times.join(', ')].filter(Boolean).join(' · ')}</p>
      {row.notes && <p>{row.notes}</p>}
      <p>{row.reason || 'Esclusa dalla conferma; da verificare'}</p>
    </li>)}</ul>
  </details>;
}
