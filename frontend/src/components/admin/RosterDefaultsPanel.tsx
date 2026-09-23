import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import {
  DEFAULT_ROSTER_ORDER,
  parseRosterDefault,
  parseRosterDefaultsPage,
  rosterJson,
  RosterApiError,
  type RosterDefault,
  type RosterOrder,
} from '../../lib/rosterOrder';
import { useRosterOrderContext } from '../shared/RosterOrderContext';
import '../shared/RosterOrderControl.css';

function DefaultRow({
  row,
  pending,
  onSave,
}: {
  row: RosterDefault;
  pending: boolean;
  onSave: (row: RosterDefault, order: RosterOrder | null) => void;
}) {
  const [order, setOrder] = useState(row.default ?? DEFAULT_ROSTER_ORDER);
  return (
    <div className="roster-defaults__row">
      <h4>{row.label}</h4>
      <div className="roster-order__controls">
        <label>
          Criterio predefinito per {row.label}
          <select
            className="form-input"
            value={order.criterion}
            disabled={pending}
            onChange={(e) =>
              setOrder({ ...order, criterion: e.target.value as RosterOrder['criterion'] })
            }
          >
            <option value="name">Cognome</option>
            <option value="location">Camera e letto</option>
          </select>
        </label>
        <label>
          Direzione per {row.label}
          <select
            className="form-input"
            value={order.direction}
            disabled={pending}
            onChange={(e) =>
              setOrder({ ...order, direction: e.target.value as RosterOrder['direction'] })
            }
          >
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => onSave(row, order)}
        >
          Salva predefinito
        </button>
        <button
          type="button"
          className="link-btn"
          disabled={pending}
          onClick={() => onSave(row, null)}
        >
          Ripristina alfabetico
        </button>
      </div>
      <p className="roster-order__status">
        Impostazione attuale:{' '}
        {row.default
          ? `${row.default.criterion === 'name' ? 'Cognome' : 'Camera e letto'}, ${row.default.direction === 'asc' ? 'crescente' : 'decrescente'}`
          : 'Alfabetico predefinito'}
      </p>
    </div>
  );
}

export function RosterDefaultsPanel() {
  const roster = useRosterOrderContext();
  const [items, setItems] = useState<RosterDefault[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function load(cursor?: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ limit: '50' });
      if (cursor) query.set('cursor', cursor);
      const page = await rosterJson(
        `${API_URL}/admin/roster-contexts?${query}`,
        parseRosterDefaultsPage,
        { headers: operatorHeaders },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setItems((current) =>
        cursor
          ? [...new Map([...current, ...page.items].map((row) => [row.id, row])).values()]
          : page.items,
      );
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Reparti non disponibili.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  async function save(row: RosterDefault, order: RosterOrder | null) {
    if (pending || !roster.preference?.canEditDefault) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(row.id);
    setError('');
    setMessage('');
    try {
      const saved = await rosterJson(
        `${API_URL}/admin/roster-contexts/${encodeURIComponent(row.id)}`,
        parseRosterDefault,
        { headers: operatorHeaders },
        controller.signal,
        { default: order, expectedVersion: row.version },
      );
      if (controller.signal.aborted) return;
      setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setMessage(
        `Ordine predefinito di ${saved.label} salvato. Le preferenze personali restano valide.`,
      );
      void roster.refresh();
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof RosterApiError && cause.status === 409) {
        await load();
        setError('Predefinito modificato nel frattempo. Dati aggiornati: verifica e riprova.');
      } else setError('Predefinito non salvato. Riprova.');
    } finally {
      setPending(null);
    }
  }
  if (!roster.preference?.canEditDefault) return null;
  return (
    <details
      className="roster-order roster-defaults"
      onToggle={(event) => {
        if (event.currentTarget.open && items.length === 0 && !loading) void load();
      }}
    >
      <summary>Ordine predefinito dei reparti</summary>
      <p>
        Si applica agli operatori che usano il predefinito del reparto. Non cambia le preferenze
        personali.
      </p>
      {loading && <p role="status">Caricamento reparti…</p>}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert">
          {error}{' '}
          <button type="button" className="link-btn" onClick={() => void load()}>
            Ricarica
          </button>
        </p>
      )}
      {items.map((row) => (
        <DefaultRow
          key={`${row.id}:${row.version}`}
          row={row}
          pending={Boolean(pending)}
          onSave={(item, order) => void save(item, order)}
        />
      ))}
      {nextCursor && (
        <button
          type="button"
          className="btn-secondary"
          disabled={loading || Boolean(pending)}
          onClick={() => void load(nextCursor)}
        >
          Carica altri reparti
        </button>
      )}
    </details>
  );
}
