import type { TinettiAssessmentDto } from '../../../lib/assessments/assessmentTypes';
import {
  TINETTI,
  TINETTI_GROUPS,
  TINETTI_PROVENANCE,
  tinettiSnapshotItems,
} from '../../../lib/assessments/tinettiDefinition';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { PatientIdentity } from '../../shared/PatientIdentity';
export function TinettiSummary({ record }: { record: TinettiAssessmentDto }) {
  const snapshot = record.finalSnapshot;
  const items = snapshot?.items ?? tinettiSnapshotItems(record.answers);
  const result = snapshot?.result ?? record.result;
  return (
    <section
      className="assessment-summary tinetti-summary"
      aria-label={record.status === 'final' ? 'Valutazione finale Tinetti' : 'Anteprima Tinetti'}
    >
      <h3>
        {record.status === 'final'
          ? 'Valutazione finale Tinetti'
          : 'Anteprima prima della finalizzazione'}
      </h3>
      {snapshot && <PatientIdentity patient={snapshot.patient} />}
      <dl className="assessment-metadata">
        <div>
          <dt>Valutata</dt>
          <dd>{formatFacilityLocalMinute(record.assessedAt)} · Europe/Rome</dd>
        </div>
        <div>
          <dt>Registrata</dt>
          <dd>{formatFacilityLocalMinute(record.createdAt)}</dd>
        </div>
        <div>
          <dt>Autore</dt>
          <dd>{record.author.name}</dd>
        </div>
        <div>
          <dt>Versione del modulo</dt>
          <dd>{record.formVersion}</dd>
        </div>
        {record.finalizedAt && (
          <div>
            <dt>Finalizzata</dt>
            <dd>{formatFacilityLocalMinute(record.finalizedAt)}</dd>
          </div>
        )}
        {record.correctionReason && (
          <div>
            <dt>Motivo della rettifica</dt>
            <dd>{record.correctionReason}</dd>
          </div>
        )}
        {snapshot?.predecessor && (
          <div>
            <dt>Valutazione rettificata</dt>
            <dd>
              {formatFacilityLocalMinute(snapshot.predecessor.assessedAt)} ·{' '}
              {snapshot.predecessor.authorName}
            </dd>
          </div>
        )}
      </dl>
      {TINETTI_GROUPS.map((group) => (
        <section key={group.id}>
          <h4>{group.label}</h4>
          <ol start={group.id === 'balance' ? 1 : 11}>
            {items
              .filter((item) => item.group === group.id)
              .map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.label} · {item.score ?? 'Non valutato'}
                  </strong>
                  <p>{item.description}</p>
                </li>
              ))}
          </ol>
        </section>
      ))}
      {result ? (
        <div className="assessment-result">
          <p>
            Equilibrio {result.balance}/16 · Andatura {result.gait}/12
          </p>
          <strong>
            {result.total}/28 · {result.label}
          </strong>
        </div>
      ) : (
        <p>Compilazione incompleta: nessun risultato o fascia di rischio.</p>
      )}
      <h4>Note</h4>
      <p className="tinetti-note-text">
        {(snapshot?.notes ?? record.answers.notes) || 'Nessuna nota.'}
      </p>
      <p className="assessment-hint">
        Il risultato richiede valutazione clinica. Non genera automaticamente diagnosi o
        trattamenti.
      </p>
      <details>
        <summary>Fonte e versione</summary>
        <p>{snapshot?.provenance ?? TINETTI_PROVENANCE}</p>
        <p className="assessment-source">
          Modello conservato SHA-256: {snapshot?.form.sourceSha256 ?? TINETTI.sourceSha256}
        </p>
        <p className="assessment-source">
          Allegato di riferimento SHA-256:{' '}
          {snapshot?.form.referenceSha256 ?? TINETTI.referenceSha256}
        </p>
      </details>
    </section>
  );
}
