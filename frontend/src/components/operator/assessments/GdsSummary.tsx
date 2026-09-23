import type { Gds15AssessmentDto } from '../../../lib/assessments/assessmentTypes';
import { GDS15_SOURCE_SHA256 } from '../../../lib/assessments/gds15Types';
import {
  gds15SnapshotItems,
  GDS15_INSTRUCTION,
  GDS15_SCREENING_NOTE,
  GDS15_PROVENANCE,
  GDS15_REFERENCE,
} from '../../../lib/assessments/gds15Definition';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { PatientIdentity } from '../../shared/PatientIdentity';
export function GdsSummary({ record }: { record: Gds15AssessmentDto }) {
  const snapshot = record.finalSnapshot;
  const items = snapshot?.items ?? gds15SnapshotItems(record.answers);
  const result = snapshot?.result ?? record.result;
  return (
    <section
      className="assessment-summary gds-summary"
      aria-label={record.status === 'final' ? 'Valutazione finale GDS-15' : 'Anteprima GDS-15'}
    >
      <h3>
        {record.status === 'final'
          ? 'Valutazione finale GDS-15'
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
      <p className="assessment-hint">{snapshot?.instruction ?? GDS15_INSTRUCTION}</p>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.label}</strong>
            <p>
              {item.description} ·{' '}
              {item.score === null
                ? 'Nessun punto assegnato'
                : `${item.score} ${item.score === 1 ? 'punto' : 'punti'}`}
            </p>
          </li>
        ))}
      </ol>
      {result ? (
        <div className="assessment-result">
          <p>Interpretazione dello screening GDS-15</p>
          <strong>
            {result.total}/15 · {result.label}
          </strong>
        </div>
      ) : (
        <p>Compilazione incompleta: nessun risultato o fascia.</p>
      )}
      <h4>Note</h4>
      <p className="gds-note-text">
        {(snapshot?.notes ?? record.answers.notes) || 'Nessuna nota.'}
      </p>
      <p className="assessment-hint">{snapshot?.screeningNote ?? GDS15_SCREENING_NOTE}</p>
      <details>
        <summary>Fonte e versione</summary>
        <p>{snapshot?.provenance ?? GDS15_PROVENANCE}</p>
        <p>{snapshot?.reference ?? GDS15_REFERENCE}</p>
        <p className="assessment-source">
          SHA-256: {snapshot?.form.sourceSha256 ?? GDS15_SOURCE_SHA256}
        </p>
      </details>
    </section>
  );
}
