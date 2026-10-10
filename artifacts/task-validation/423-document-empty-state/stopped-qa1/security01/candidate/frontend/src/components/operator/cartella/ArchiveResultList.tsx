import type { ArchiveEntry } from '../../../lib/patientDocumentArchive';
import { archiveEntryTypeLabel } from '../../../lib/patientDocumentArchive';
import { archivePrintUnavailable } from '../../../lib/archivePrint';
import { fmtDate } from './shared';
import { DOCUMENT_STATUS_LABELS } from './archiveDocumentStatus';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import type { AssessmentTarget } from '../../../lib/assessments/assessmentTypes';

export function ArchiveResultList({
  entries,
  selected,
  complete,
  formOpen,
  saving,
  canSave,
  canClassify,
  onToggle,
  onPreview,
  onEdit,
  onRemove,
  onOpenAssessment,
}: {
  entries: ArchiveEntry[];
  selected: Set<string>;
  complete: boolean;
  formOpen: boolean;
  saving: boolean;
  canSave: boolean;
  canClassify: boolean;
  onToggle: (id: string) => void;
  onPreview: (entry: ArchiveEntry) => void;
  onEdit: (entry: ArchiveEntry) => void;
  onRemove: (entry: ArchiveEntry) => void;
  onOpenAssessment?: (assessment: AssessmentTarget) => void;
}) {
  return (
    <ul className="patient-document-archive__list">
      {entries.map((entry) => (
        <li key={entry.id} className="patient-document-archive__item">
          <div className="patient-document-archive__file-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <path d="M14 3v6h6M8 13h8M8 17h6" />
            </svg>
          </div>
          <div className="patient-document-archive__details">
            <label className="patient-document-archive__print-option no-print">
              <input
                type="checkbox"
                checked={!!entry.document && selected.has(entry.document.id)}
                disabled={!complete || !!archivePrintUnavailable(entry)}
                onChange={() => entry.document && onToggle(entry.document.id)}
                aria-label={`Seleziona per la stampa: ${entry.title}`}
              />
              {archivePrintUnavailable(entry) || 'Seleziona per la stampa'}
            </label>
            <button
              type="button"
              className="patient-document-archive__title"
              onClick={() => onPreview(entry)}
            >
              {entry.title}
            </button>
            <div className="patient-document-archive__meta">
              <span className="badge badge--blue">{archiveEntryTypeLabel(entry)}</span>
              {entry.archived && <span className="badge">Storico</span>}
              <span>{fmtDate(entry.date)}</span>
              <span>
                {DOCUMENT_STATUS_LABELS[entry.record?.stato ?? 'ricevuto'] ?? 'Da verificare'}
              </span>
            </div>
            {entry.document ? (
              <p>
                {entry.document.originalName} ·{' '}
                {(entry.document.sizeBytes / 1024 / 1024).toFixed(1)} MB
              </p>
            ) : (
              <p>{entry.unavailable ? 'Allegato non disponibile' : 'Nessun file allegato'}</p>
            )}
            {entry.document?.assessment && (
              <p>
                Valutata {formatFacilityLocalMinute(entry.document.assessment.assessedAt)} ·
                Registrata {formatFacilityLocalMinute(entry.document.createdAt)}
              </p>
            )}
            {entry.record?.provenienza && <p>Provenienza: {entry.record.provenienza}</p>}
            {entry.record?.scadenza && <p>Scadenza: {fmtDate(entry.record.scadenza)}</p>}
            {entry.record?.firmatoDA && entry.record.firmatoDA !== 'non_firmato' && (
              <p>Firmato da: {entry.record.firmatoDA}</p>
            )}
            {entry.record?.operatore && <p>Registrato da: {entry.record.operatore}</p>}
            {entry.record?.note && (
              <p className="patient-document-archive__notes">{entry.record.note}</p>
            )}
          </div>
          <div className="patient-document-archive__actions no-print">
            <button type="button" className="btn-secondary btn-sm" onClick={() => onPreview(entry)}>
              {entry.document ? 'Visualizza' : 'Dettagli'}
            </button>
            {entry.document?.assessment ? (
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={!onOpenAssessment}
                onClick={() =>
                  onOpenAssessment?.({
                    id: entry.document!.assessment!.id,
                    type: entry.document!.assessment!.type,
                  })
                }
              >
                Apri valutazione
              </button>
            ) : canSave && (!entry.document || canClassify) ? (
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={!complete || formOpen || saving}
                onClick={() => onEdit(entry)}
              >
                Modifica dettagli
              </button>
            ) : null}
            {canSave && entry.record && !entry.document?.assessment && (
              <button
                type="button"
                className="patient-document-archive__remove"
                disabled={!complete || formOpen || saving}
                onClick={() => onRemove(entry)}
              >
                Rimuovi scheda
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
