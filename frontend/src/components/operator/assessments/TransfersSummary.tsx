import type { TransfersAssessmentDto } from '../../../lib/assessments/assessmentTypes';
import {
  transfersSections,
  transfersSnapshotSections,
  TRANSFERS,
} from '../../../lib/assessments/transfersDefinition';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { PatientIdentity } from '../../shared/PatientIdentity';
export function TransfersSummary({ record }: { record: TransfersAssessmentDto }) {
  const snapshot = record.finalSnapshot;
  const sections =
    snapshot?.sections ??
    (record.completion.complete
      ? transfersSnapshotSections(record.answers)
      : transfersSections(record.answers));
  return (
    <section
      className="assessment-summary transfers-summary"
      aria-label={snapshot ? 'Scheda finale trasferimenti' : 'Anteprima trasferimenti'}
    >
      <h3>{snapshot ? 'Scheda finale' : 'Anteprima prima della finalizzazione'}</h3>
      {snapshot && <PatientIdentity patient={snapshot.patient} />}
      <dl className="assessment-metadata">
        <div>
          <dt>Valutata</dt>
          <dd>{formatFacilityLocalMinute(record.assessedAt)} · Europe/Rome</dd>
        </div>
        <div>
          <dt>Compilatore</dt>
          <dd>{record.author.name}</dd>
        </div>
        <div>
          <dt>Registrata</dt>
          <dd>{formatFacilityLocalMinute(record.createdAt)}</dd>
        </div>
        {record.finalizedAt && (
          <div>
            <dt>Finalizzata</dt>
            <dd>{formatFacilityLocalMinute(record.finalizedAt)}</dd>
          </div>
        )}
        {record.predecessorId && (
          <div>
            <dt>Rettifica</dt>
            <dd>{record.correctionReason}</dd>
          </div>
        )}
        {snapshot?.predecessor && (
          <div>
            <dt>Scheda precedente</dt>
            <dd>
              {formatFacilityLocalMinute(snapshot.predecessor.assessedAt)} ·{' '}
              {snapshot.predecessor.authorName}
            </dd>
          </div>
        )}
      </dl>
      {sections.map((section) => (
        <section className="transfers-summary-group" key={section.id}>
          <h4>{section.label}</h4>
          <dl>
            {section.rows.map((row) => (
              <div key={row.path}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="assessment-hint">
        La finalizzazione registra compilatore e data; non è una firma digitale. La scheda non
        modifica automaticamente prescrizioni, degenza o contenzioni.
      </p>
      <details>
        <summary>Fonte e versione</summary>
        <p>
          {TRANSFERS.version} · Nel modello “Sollievo” indica la struttura. Desk: deambulatore con
          tavolo.
        </p>
        <p className="assessment-source">
          SHA-256: {snapshot?.form.sourceSha256 ?? TRANSFERS.sourceSha256}
        </p>
      </details>
    </section>
  );
}
