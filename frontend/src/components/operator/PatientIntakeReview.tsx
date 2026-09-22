import { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import {
  parsePatientIntakeReview,
  type PatientIntakeReviewData,
} from '../../lib/patientIntakeReview';

/** Retained OCR rows are reference material, never an executable therapy editor. */
export function PatientIntakeReview({
  patientId,
  operatorId,
  operatorRole,
}: {
  patientId: string;
  operatorId: string;
  operatorRole?: string;
}) {
  const scope = `${patientId}:${operatorId}:${operatorRole ?? ''}`;
  const [result, setResult] = useState<{
    scope: string;
    data?: PatientIntakeReviewData;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`${API_URL}/patients/${encodeURIComponent(patientId)}/intake-review`, {
      headers: operatorHeaders(),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Impossibile caricare le terapie rimaste in bozza');
        return parsePatientIntakeReview(await response.json());
      })
      .then((data) => {
        if (active) setResult({ scope, data });
      })
      .catch(() => {
        if (active)
          setResult({ scope, error: 'Impossibile caricare le terapie rimaste in bozza.' });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [patientId, scope, retry]);
  if (result?.scope !== scope) return null;
  if (result.error)
    return (
      <p className="form-hint">
        {result.error}{' '}
        <button type="button" className="btn-ghost" onClick={() => setRetry((n) => n + 1)}>
          Riprova
        </button>
      </p>
    );
  const rows = result.data?.deferredTherapies ?? [];
  if (!rows.length) return null;
  return (
    <details className="clinical-card" key={patientId}>
      <summary>Terapie rimaste in bozza · {rows.length}</summary>
      <p>
        Da verificare. Queste righe non sono prescrizioni e non sono somministrabili. Gli originali
        restano nei Documenti.
      </p>
      <ul>
        {rows.map((row, index) => (
          <li key={index}>
            <strong>{row.name || 'Farmaco da identificare'}</strong>
            <p>
              {[row.dose, row.route, row.frequency, row.times.join(', ')]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {row.notes && <p>{row.notes}</p>}
            <p>{row.reason || 'Esclusa dalla conferma; da verificare'}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
