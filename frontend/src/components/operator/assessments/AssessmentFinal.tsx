import type { AssessmentDto } from '../../../lib/assessments/assessmentTypes';
import { AssessmentSummary } from './AssessmentSummary';
export function AssessmentFinal({
  record,
  busy,
  onPdf,
  onRefreshPdf,
  onOpenArchive,
  onOpenRecord,
  onCorrect,
}: {
  record: AssessmentDto;
  busy: boolean;
  onPdf: () => void;
  onRefreshPdf: (retry: boolean) => void;
  onOpenArchive?: (documentId: string, assessmentId: string) => void;
  onOpenRecord: (id: string) => void;
  onCorrect: () => void;
}) {
  return (
    <>
      <p className="assessment-saved" role="status">
        Valutazione finale salvata.
      </p>
      <AssessmentSummary record={record} />
      <div className="assessment-pdf">
        <h3>PDF e archivio</h3>
        <p>
          {record.pdf?.status === 'ready'
            ? 'PDF archiviato in Documenti → Moduli e valutazioni → PAINAD.'
            : record.pdf?.status === 'failed'
              ? 'PDF non generato. La valutazione finale è conservata.'
              : 'PDF in preparazione. La valutazione finale è conservata.'}
        </p>
        <div className="assessment-actions">
          {record.pdf?.status === 'ready' && (
            <>
              <button type="button" className="btn-primary" disabled={busy} onClick={onPdf}>
                Apri PDF
              </button>
              {onOpenArchive && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onOpenArchive(record.pdf!.documentId!, record.id)}
                >
                  Vai al documento in archivio
                </button>
              )}
            </>
          )}
          {record.pdf?.status !== 'ready' && (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => onRefreshPdf(false)}
            >
              Aggiorna stato PDF
            </button>
          )}
          {record.pdf?.retryAvailable && (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => onRefreshPdf(true)}
            >
              Riprova generazione PDF
            </button>
          )}
        </div>
      </div>
      <div className="assessment-actions">
        {record.correctedById ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onOpenRecord(record.correctedById!)}
          >
            Apri rettifica finale
          </button>
        ) : (
          <button type="button" className="btn-secondary" onClick={onCorrect}>
            Crea rettifica
          </button>
        )}
        {record.predecessorId && (
          <button
            type="button"
            className="link-btn"
            onClick={() => onOpenRecord(record.predecessorId!)}
          >
            Apri valutazione precedente
          </button>
        )}
      </div>
    </>
  );
}
