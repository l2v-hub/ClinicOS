import type { MnaAssessmentDto } from '../../../lib/assessments/assessmentTypes';
import { mnaSnapshotItems, mnaTitle } from '../../../lib/assessments/mnaDefinition';
import { mnaMeasurements } from '../../../lib/assessments/mnaValidation';
import { mnaBmiOrNull } from '../../../lib/assessments/mnaInputValidation';
import { displayMnaBmi } from '../../../lib/assessments/mnaLocalInputs';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { MnaOutcomes, MnaSource } from './MnaContent';
export function MnaSummary({ record }: { record: MnaAssessmentDto }) {
  const snapshot = record.finalSnapshot;
  const items = snapshot?.items ?? mnaSnapshotItems(record.answers);
  const measurements = snapshot?.measurements ?? mnaMeasurements(record.answers);
  const bmi = snapshot ? snapshot.bmi : mnaBmiOrNull(record.answers.measurements);
  return (
    <section
      className="assessment-summary mna-summary"
      aria-label={record.status === 'final' ? mnaTitle(record.extent) : 'Anteprima MNA'}
    >
      <h3>
        {snapshot?.title ?? mnaTitle(record.extent)}
        {record.status === 'draft' ? ' · anteprima prima della finalizzazione' : ''}
      </h3>
      {snapshot && <PatientIdentity patient={snapshot.patient} />}
      <dl className="assessment-metadata">
        {snapshot && (
          <>
            <div>
              <dt>Sesso</dt>
              <dd>{snapshot.demographics.sex ?? 'Non disponibile'}</dd>
            </div>
            <div>
              <dt>Età alla data della valutazione ({snapshot.demographics.ageOnDate})</dt>
              <dd>
                {snapshot.demographics.ageAtAssessment === null
                  ? 'Non disponibile'
                  : `${snapshot.demographics.ageAtAssessment} anni`}
              </dd>
            </div>
          </>
        )}
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
      <MnaOutcomes result={snapshot?.result ?? record.result} />
      {(['screening', 'global'] as const).map((group) => (
        <section key={group}>
          <h4>
            {group === 'screening'
              ? 'Screening A–F'
              : record.extent === 'screening'
                ? 'Dati globali aggiuntivi conservati — non inclusi nel totale'
                : 'Valutazione globale G–R'}
          </h4>
          <ol start={group === 'screening' ? 1 : 7}>
            {items
              .filter((item) => item.group === group)
              .map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.id}. {item.label} ·{' '}
                    {item.score === null
                      ? 'Non compilato'
                      : `${item.score.toLocaleString('it-IT')} ${item.score === 1 ? 'punto' : 'punti'}`}
                  </strong>
                  {item.id === 'K' ? (
                    <ul>
                      {item.subitems?.map((subitem) => (
                        <li key={subitem.id}>
                          {subitem.label}:{' '}
                          {subitem.answer === null ? 'Non compilato' : subitem.answer ? 'Sì' : 'No'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{item.description ?? 'Non compilato'}</p>
                  )}
                  {['F', 'Q', 'R'].includes(item.id) && (
                    <p>
                      Metodo:{' '}
                      {(item.answer as { method: string }).method === 'measured'
                        ? 'da misure'
                        : 'categoria dichiarata'}
                    </p>
                  )}
                </li>
              ))}
          </ol>
        </section>
      ))}
      <h4>Misure</h4>
      <dl className="assessment-metadata">
        {measurements.map((measurement) => (
          <div key={measurement.id}>
            <dt>
              {measurement.label} ({measurement.unit})
            </dt>
            <dd>
              {measurement.value === null
                ? 'Non disponibile'
                : String(measurement.value).replace('.', ',')}
              <br />
              Data indicata: {measurement.measuredOn ?? 'non disponibile'}
              <br />
              Origine: inserimento manuale nella valutazione
            </dd>
          </div>
        ))}
        <div>
          <dt>IMC (kg/m²)</dt>
          <dd>{bmi === null ? 'Non disponibile da misure' : displayMnaBmi(bmi)}</dd>
        </div>
      </dl>
      <h4>Note</h4>
      <p className="mna-note-text">
        {(snapshot?.notes ?? record.answers.notes) || 'Nessuna nota.'}
      </p>
      <p className="assessment-hint">
        Le fasce sono l’interpretazione dello strumento. Non generano automaticamente diagnosi o
        trattamenti.
      </p>
      <MnaSource snapshot={snapshot} />
    </section>
  );
}
