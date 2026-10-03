// Read-only paper sheet for the preview before finalization and for finalized records.
import type { PaperScale } from '../../../lib/assessments/paper/definitions';
import {
  answeredPaperCount,
  paperResult,
  type PaperAnswers,
  type PaperResult,
} from '../../../lib/assessments/paper/engine';
import type { PatientIdentityData } from '../../../lib/patientIdentity';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { PaperSheet } from './PaperSheet';
import { measureText, paperFields } from './paperFields';

export interface PaperSummaryRecord {
  status: 'draft' | 'final';
  formVersion: string;
  assessedAt: string;
  createdAt: string;
  finalizedAt: string | null;
  author: { name: string };
  correctionReason: string | null;
  answers: PaperAnswers;
  snapshot: {
    patient: PatientIdentityData;
    selected: PaperAnswers;
    result: PaperResult;
    predecessor: { assessedAt: string; authorName: string } | null;
    notes: string;
    selectedText: Record<string, string>;
  } | null;
}
export function PaperSummary({
  scale,
  record,
  patient,
}: {
  scale: PaperScale;
  record: PaperSummaryRecord;
  patient?: PatientIdentityData;
}) {
  const answers = record.snapshot?.selected ?? record.answers;
  const result = record.snapshot?.result ?? paperResult(scale, record.answers);
  const identity = record.snapshot?.patient ?? patient;
  const notes =
    record.snapshot?.notes ??
    (typeof record.answers.notes === 'string' ? record.answers.notes : '');
  return (
    <section
      className="assessment-summary paper-summary"
      aria-label={
        record.status === 'final'
          ? `Valutazione finale ${scale.appTitle}`
          : `Anteprima ${scale.appTitle}`
      }
    >
      <h3>
        {record.status === 'final'
          ? `Valutazione finale ${scale.appTitle}`
          : 'Anteprima prima della finalizzazione'}
      </h3>
      <dl className="assessment-metadata">
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
        <div>
          <dt>Versione del modulo</dt>
          <dd>{record.formVersion}</dd>
        </div>
        {record.correctionReason && (
          <div>
            <dt>Motivo della rettifica</dt>
            <dd>{record.correctionReason}</dd>
          </div>
        )}
        {record.snapshot?.predecessor && (
          <div>
            <dt>Valutazione rettificata</dt>
            <dd>
              {formatFacilityLocalMinute(record.snapshot.predecessor.assessedAt)} ·{' '}
              {record.snapshot.predecessor.authorName}
            </dd>
          </div>
        )}
      </dl>
      {identity && (
        <PaperSheet
          scale={scale}
          answers={answers}
          result={result}
          answeredCount={answeredPaperCount(scale, answers)}
          signatureName={record.author.name}
          selectedText={record.snapshot?.selectedText}
          fields={paperFields(scale, {
            patient: identity,
            assessedAt: record.assessedAt,
            authorName: record.author.name,
            total: result ? `${result.total} / ${scale.maximum}` : '—',
            measures: {
              weight: measureText(answers.weightKg, 1),
              height: measureText(answers.heightM, 2),
            },
          })}
          footerNote={notes ? <p className="assessment-hint">Note: {notes}</p> : undefined}
        />
      )}
    </section>
  );
}
