import { useId } from 'react';
import { useRosterOrderContext } from './RosterOrderContext';
import type { RosterOrder } from '../../lib/rosterOrder';
import './RosterOrderControl.css';

export function RosterOrderControl({ onSelect }: { onSelect?: () => void }) {
  const roster = useRosterOrderContext();
  const id = useId();
  const change = (order: RosterOrder) => {
    onSelect?.();
    void roster.choose(order);
  };
  const source = roster.temporary
    ? 'Ordine temporaneo'
    : roster.preference?.source === 'personal'
      ? 'Preferenza personale'
      : roster.preference?.source === 'department'
        ? 'Ordine del reparto'
        : 'Ordine alfabetico predefinito';
  return (
    <section className="roster-order" aria-label="Ordine del giro reparto">
      <div className="roster-order__controls">
        <label htmlFor={`${id}-criterion`}>
          Ordina per
          <select
            id={`${id}-criterion`}
            className="form-input"
            value={roster.order.criterion}
            disabled={!roster.ready || roster.saving}
            onChange={(e) =>
              change({ ...roster.order, criterion: e.target.value as RosterOrder['criterion'] })
            }
          >
            <option value="name">Cognome</option>
            <option value="location">Camera e letto</option>
          </select>
        </label>
        <label htmlFor={`${id}-direction`}>
          Direzione
          <select
            id={`${id}-direction`}
            className="form-input"
            value={roster.order.direction}
            disabled={!roster.ready || roster.saving}
            onChange={(e) =>
              change({ ...roster.order, direction: e.target.value as RosterOrder['direction'] })
            }
          >
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={!roster.ready || roster.saving}
          onClick={() => {
            onSelect?.();
            void roster.choose(roster.order);
          }}
        >
          Applica ordine reparto
        </button>
        {roster.preference?.canEdit && (
          <button
            type="button"
            className="link-btn"
            disabled={roster.saving}
            onClick={() => {
              onSelect?.();
              void roster.choose(null);
            }}
          >
            Usa predefinito reparto
          </button>
        )}
      </div>
      <p className="roster-order__status" role="status" aria-live="polite">
        {roster.loading && !roster.ready
          ? 'Caricamento ordine…'
          : `${roster.preference?.context?.label ?? roster.metadata?.context?.label ?? 'Contesto non disponibile'} · ${source}`}
        {roster.message && ` · ${roster.message}`}
      </p>
      {roster.temporary && !roster.error && (
        <button
          type="button"
          className="link-btn"
          disabled={roster.loading}
          onClick={() => void roster.refresh()}
        >
          Ricarica preferenza
        </button>
      )}
      {roster.error && (
        <div className="roster-order__error" role="alert">
          {roster.error}{' '}
          <button
            type="button"
            className="link-btn"
            disabled={roster.loading || roster.saving}
            onClick={() => void roster.refresh()}
          >
            Ricarica preferenza
          </button>
          {roster.preference?.canEdit && (
            <button
              type="button"
              className="link-btn"
              disabled={roster.loading || roster.saving}
              onClick={() => void roster.choose(roster.order)}
            >
              Riprova salvataggio
            </button>
          )}
        </div>
      )}
    </section>
  );
}
