import type { ReactNode } from 'react';
import type { AdminAttention } from './adminAttentionModel';
import { formatFacilityLocalMinute } from '../../lib/facilityTime';

export function AdminAttentionList({
  rows,
  loading,
  uncertain,
  urgencyCount,
  atLeast,
  onOpen,
  children,
}: {
  rows: AdminAttention[];
  loading: boolean;
  uncertain: boolean;
  urgencyCount: number | null;
  atLeast: boolean;
  onOpen: (row: AdminAttention) => void;
  children?: ReactNode;
}) {
  return (
    <section
      className="admin-attention"
      aria-labelledby="admin-attention-title"
      data-admin-attention
      aria-busy={loading}
    >
      <header className="admin-attention__heading">
        <h2 id="admin-attention-title">Richiede attenzione</h2>
        <p data-admin-urgency-count={urgencyCount ?? 'unknown'}>
          Urgenze da prendere in carico:{' '}
          {urgencyCount === null ? 'dato non disponibile' : `${urgencyCount}${atLeast ? '+' : ''}`}
        </p>
      </header>
      {children}
      {loading && <p role="status">Aggiornamento del reparto…</p>}
      {!loading && rows.length === 0 && (
        <p role="status">
          {uncertain
            ? 'Nessuna voce nei dati disponibili; alcune verifiche non sono complete.'
            : 'Nessuna attenzione rilevata nei dati del reparto.'}
        </p>
      )}
      {rows.length > 0 && (
        <ol className="admin-attention__list">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`admin-attention__row admin-attention__row--${row.severity}`}
              data-attention-id={row.id}
            >
              <div className="admin-attention__content">
                <h3>
                  {row.patientName && <strong>{row.patientName} — </strong>}
                  {row.title}
                </h3>
                <p>
                  {row.detail}
                  {row.openedAt && (
                    <>
                      {' '}
                      ·{' '}
                      <time dateTime={row.openedAt}>{formatFacilityLocalMinute(row.openedAt)}</time>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onOpen(row)}
                aria-label={`${row.action}: ${row.patientName ? `${row.patientName}, ` : ''}${row.title}`}
              >
                {row.action}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
