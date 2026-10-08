import { useEffect, useState } from 'react';
import { useCan } from '../../lib/capabilities';
import { getCurrentOperator } from '../../lib/operatorSession';
import { deriveAllergySummary } from '../../lib/allergyStatusModel';
import { readGiroAllergies, type GiroAllergySnapshot } from '../../lib/therapyAllergyRead';

interface Props {
  patientId: string;
  patientName: string;
  contextKey: string;
}
interface ReadState {
  key: string;
  phase: 'ready' | 'error';
  snapshot?: GiroAllergySnapshot;
}

export function TherapyPatientAllergies({ patientId, patientName, contextKey }: Props) {
  const allowed = useCan('clinical_record.get');
  const operator = getCurrentOperator();
  const key = `${operator?.id ?? ''}:${operator?.role ?? ''}:${patientId}:${contextKey}`;
  const [state, setState] = useState<ReadState | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let mounted = true;
    readGiroAllergies(patientId, controller.signal)
      .then(
        (snapshot) => {
          if (mounted) setState({ key, phase: 'ready', snapshot });
        },
        () => {
          if (mounted) setState({ key, phase: 'error' });
        },
      )
      .finally(() => window.clearTimeout(timeout));
    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [allowed, patientId, key, retry]);
  const current = allowed && state?.key === key ? state : null;
  const snapshot = current?.phase === 'ready' ? current.snapshot : undefined;
  const summary = deriveAllergySummary(snapshot?.items, snapshot?.status);
  const message = !allowed
    ? 'Dato non disponibile per il tuo ruolo.'
    : current?.phase === 'error'
      ? 'Dato non disponibile. Riprova la lettura della cartella.'
      : !current
        ? 'Lettura della cartella in corso…'
        : 'Fonte: cartella clinica.';
  return (
    <section className="giro-allergies" aria-label={`Allergie di ${patientName}`}>
      <p className="giro-allergies__status" role="status">
        <strong>Allergie: {summary.label}</strong>
        <span className="giro-allergies__source">{message}</span>
      </p>
      {snapshot?.items.length ? (
        <ul className="giro-allergies__list">
          {snapshot.items.map((item, index) => (
            <li key={index}>
              <strong>{item.allergene}</strong> · Gravità: {item.gravita ?? 'non documentata'}
              {item.reazione && <> · Reazione: {item.reazione}</>}
            </li>
          ))}
        </ul>
      ) : null}
      {current?.phase === 'error' && (
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          onClick={() => {
            setState(null);
            setRetry((n) => n + 1);
          }}
          aria-label={`Rileggi allergie di ${patientName}`}
        >
          Riprova
        </button>
      )}
      {snapshot && (
        <details key={key} className="giro-allergies__details">
          <summary>Dettagli allergie di {patientName}</summary>
          <p>
            {summary.label}. Fonte: cartella clinica; nessuna valutazione automatica di
            compatibilità.
          </p>
          {snapshot.items.map((item, index) => (
            <div key={index} className="giro-allergies__documentation">
              <strong>{item.allergene}</strong>
              <p>
                Documentazione: {item.documentato || 'non indicata'} · Autore:{' '}
                {item.documentatoDa || 'non indicato'}
              </p>
              <p>Note: {item.note || 'non indicate'}</p>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
