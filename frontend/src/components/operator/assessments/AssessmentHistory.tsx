import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import type { AssessmentHistoryItem } from '../../../lib/assessments/assessmentTypes';
import type { useAssessmentHistory } from './useAssessmentHistory';
export function AssessmentHistory({
  history,
  onOpen,
}: {
  history: ReturnType<typeof useAssessmentHistory>;
  onOpen: (record: AssessmentHistoryItem) => void;
}) {
  return (
    <section className="assessment-history" aria-label="Storico del modulo">
      <h3>Storico valutazioni</h3>
      <div className="assessment-filters">
        <label>
          Stato
          <select
            className="form-select"
            value={history.status}
            onChange={(event) => history.setStatus(event.target.value as typeof history.status)}
          >
            <option value="all">Tutte</option>
            <option value="draft">Le mie bozze</option>
            <option value="final">Finali</option>
          </select>
        </label>
        <label>
          Valutazione dal
          <input
            className="form-input"
            type="date"
            value={history.from}
            onChange={(event) => history.setFrom(event.target.value)}
          />
        </label>
        <label>
          Al
          <input
            className="form-input"
            type="date"
            value={history.to}
            onChange={(event) => history.setTo(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={history.refresh}
          disabled={history.loading}
        >
          Aggiorna storico
        </button>
      </div>
      <p className="assessment-hint">
        Le bozze sono visibili solo al loro autore. Ordine per data di registrazione.
      </p>
      {history.loading && <p role="status">Caricamento storico…</p>}
      {history.error && <p role="alert">{history.error}</p>}
      {!history.loading && !history.error && !history.items.length && (
        <p>Nessuna valutazione per questi filtri.</p>
      )}
      <ul className="assessment-history__list">
        {history.items.map((record) => (
          <li key={record.id}>
            <div>
              <strong>
                {record.status === 'draft' ? 'Bozza' : 'Finale'} ·{' '}
                {formatFacilityLocalMinute(record.assessedAt)}
              </strong>
              <p>
                {record.author.name} · Registrata {formatFacilityLocalMinute(record.createdAt)}
              </p>
              <p>
                {record.result
                  ? `${record.result.total}/10 · ${record.result.label}`
                  : record.type === 'painad'
                    ? `${record.answeredCount} di 5 risposte`
                    : record.completion.complete
                      ? 'Compilazione completa'
                      : 'Compilazione da completare'}
                {record.correctedById
                  ? ' · Rettificata'
                  : record.predecessorId
                    ? ' · Rettifica'
                    : ''}
              </p>
              {record.pdf && (
                <span>
                  PDF{' '}
                  {record.pdf.status === 'ready'
                    ? 'archiviato'
                    : record.pdf.status === 'pending'
                      ? 'in preparazione'
                      : 'da rigenerare'}
                </span>
              )}
            </div>
            <button type="button" className="btn-secondary" onClick={() => onOpen(record)}>
              {record.status === 'draft' ? 'Riprendi bozza' : 'Apri valutazione'}
            </button>
          </li>
        ))}
      </ul>
      {history.hasMore && (
        <button
          type="button"
          className="btn-secondary"
          disabled={history.loading}
          onClick={history.loadMore}
        >
          Carica altre valutazioni
        </button>
      )}
    </section>
  );
}
