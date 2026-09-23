import type { MnaResult, MnaSnapshot } from '../../../lib/assessments/mnaTypes';
import { MNA_COPYRIGHT, MNA_PROVENANCE, MNA_REFERENCES } from '../../../lib/assessments/mnaItems';
export function MnaOutcomes({ result }: { result: MnaResult }) {
  return (
    <div className="assessment-result mna-outcomes">
      <p>
        <strong>Screening:</strong>{' '}
        {result.screening
          ? `${result.screening.score}/14 · ${result.screening.label}`
          : 'incompleto, nessun esito'}
      </p>
      <p>
        <strong>Valutazione globale:</strong>{' '}
        {result.global
          ? `subtotale ${result.global.score.toLocaleString('it-IT')}/16`
          : 'incompleta, nessun subtotale'}
      </p>
      {result.total && (
        <p>
          <strong>
            Valutazione totale: {result.total.score.toLocaleString('it-IT')}/30 ·{' '}
            {result.total.label}
          </strong>
        </p>
      )}
    </div>
  );
}
export function MnaSource({ snapshot }: { snapshot?: MnaSnapshot | null }) {
  return (
    <footer className="mna-source">
      <p className="assessment-source">{snapshot?.copyright ?? MNA_COPYRIGHT}</p>
      <details>
        <summary>Fonte, riferimenti e correzioni documentate</summary>
        <p>{snapshot?.provenance ?? MNA_PROVENANCE}</p>
        <ul>
          {(snapshot?.references ?? MNA_REFERENCES).map((reference) => (
            <li key={reference}>{reference}</li>
          ))}
        </ul>
      </details>
    </footer>
  );
}
