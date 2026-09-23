import type { AssessmentDto } from '../../../lib/assessments/assessmentTypes';
import { PAINAD, PAINAD_BAND_NOTES } from '../../../lib/assessments/painadDefinition';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { TransfersSummary } from './TransfersSummary';
export function AssessmentSummary({ record }: { record: AssessmentDto }) {
  if (record.type === 'postural_transfers') return <TransfersSummary record={record} />;
  const snapshot = record.finalSnapshot;
  const items =
    snapshot?.items ??
    PAINAD.items.map((item) => ({
      id: item.id,
      label: item.label,
      score: record.answers[item.id],
      description:
        record.answers[item.id] === null ? 'Non valutato' : item.options[record.answers[item.id]!],
    }));
  const result = snapshot?.result ?? record.result;
  return (
    <section
      className="assessment-summary"
      aria-label={record.status === 'final' ? 'Valutazione finale' : 'Anteprima della valutazione'}
    >
      <h3>
        {record.status === 'final' ? 'Valutazione finale' : 'Anteprima prima della finalizzazione'}
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
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <strong>
              {item.label} · {item.score ?? 'Non valutato'}
            </strong>
            <p>{item.description}</p>
          </li>
        ))}
      </ol>
      {result && (
        <div className="assessment-result">
          <strong>
            {result.total}/10 · {result.label}
          </strong>
          <p>{snapshot?.interpretation ?? PAINAD_BAND_NOTES[result.band]}</p>
        </div>
      )}
      <p className="assessment-hint">
        Le indicazioni della scheda richiedono valutazione clinica. Non generano automaticamente
        diagnosi o trattamenti.
      </p>
      <details>
        <summary>Fonte e versione</summary>
        <p>
          PAINAD, scheda italiana del 22/09/2026. Correzioni editoriali documentate:
          “osservazionale” e “consolare”.
        </p>
        <p className="assessment-source">
          SHA-256: {snapshot?.form.sourceSha256 ?? PAINAD.sourceSha256}
        </p>
      </details>
    </section>
  );
}
