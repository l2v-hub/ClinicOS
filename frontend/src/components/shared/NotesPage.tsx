import { useEffect, useRef, useState } from 'react';
import type { NewNotaInput, Nota, PrioritaNota, StatoNota, Operatore } from '../../types';
import type { NotesMailboxQuery } from '../../lib/notesMailbox';
import { IcoPlus, IcoCheck, IcoX, IcoSearch, IcoMessage } from '../../icons';
import { InlineEditableField } from './InlineEditableField';
import { NoteCreateForm } from './NoteCreateForm';
import { PageHeader } from './PageHeader';

interface NotesPageProps {
  note: Nota[];
  utenteId: string;
  isAdmin: boolean;
  operatori: Operatore[];
  loading: boolean;
  loadError: string | null;
  unreadCount: number;
  hasMore: boolean;
  onAdd: (note: NewNotaInput) => Promise<boolean>;
  onUpdate: (id: string, patch: Partial<Nota>) => void | Promise<boolean>;
  onUpdateStato: (id: string, stato: StatoNota) => void;
  onQueryChange: (query: NotesMailboxQuery) => void | Promise<void>;
  onLoadMore: () => void;
  onRetry: () => void;
}

type UiFilter = 'tutte' | 'ricevute' | 'inviate' | 'non_lette';

const FILTER_BOX: Record<UiFilter, NotesMailboxQuery['box']> = {
  tutte: 'all',
  ricevute: 'received',
  inviate: 'sent',
  non_lette: 'unread',
};

const PRIORITA_LABEL: Record<PrioritaNota, string> = {
  normale: 'Normale',
  alta: 'Alta',
  urgente: 'Urgente',
};

const STATO_LABEL: Record<StatoNota, string> = {
  non_letta: 'Non letta',
  letta: 'Letta',
  risolta: 'Risolta',
};

export function NotesPage({
  note,
  utenteId,
  isAdmin,
  operatori,
  loading,
  loadError,
  unreadCount,
  hasMore,
  onAdd,
  onUpdate,
  onUpdateStato,
  onQueryChange,
  onLoadMore,
  onRetry,
}: NotesPageProps) {
  const [filtro, setFiltro] = useState<UiFilter>('tutte');
  const [ricerca, setRicerca] = useState('');
  const [formAperto, setFormAperto] = useState(false);
  const newNoteTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void onQueryChange({ box: FILTER_BOX[filtro], q: ricerca });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filtro, onQueryChange, ricerca]);

  function closeNewNote() {
    setFormAperto(false);
    window.requestAnimationFrame(() => newNoteTriggerRef.current?.focus());
  }

  function fmtTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="notes-page">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Note' }]}
        title="Note e messaggi"
        subtitle={
          unreadCount > 0 ? (
            <span className="page-header__status page-header__status--attention">
              {unreadCount} non lett{unreadCount === 1 ? 'a' : 'e'}
            </span>
          ) : (
            'Tutte lette'
          )
        }
        actions={
          <button
            ref={newNoteTriggerRef}
            type="button"
            className="btn-success"
            aria-expanded={formAperto}
            aria-controls="nuova-nota-panel"
            onClick={() => (formAperto ? closeNewNote() : setFormAperto(true))}
          >
            <IcoPlus /> Nuova nota
          </button>
        }
      />

      {formAperto && (
        <NoteCreateForm
          key="new-note"
          utenteId={utenteId}
          operatori={operatori}
          onAdd={onAdd}
          onClose={closeNewNote}
        />
      )}

      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico">
            <IcoSearch />
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Cerca nelle note…"
            value={ricerca}
            onChange={(event) => setRicerca(event.target.value.slice(0, 100))}
          />
          {ricerca && (
            <button
              className="search-clear-btn"
              aria-label="Cancella ricerca"
              onClick={() => setRicerca('')}
            >
              <IcoX />
            </button>
          )}
        </div>
        <div className="filter-chips">
          {(
            [
              { key: 'tutte', label: 'Tutte' },
              { key: 'ricevute', label: 'Ricevute' },
              { key: 'inviate', label: 'Inviate' },
              {
                key: 'non_lette',
                label: `Non lette${unreadCount > 0 ? ` (${unreadCount})` : ''}`,
              },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              className={`filter-chip${filtro === filter.key ? ' active' : ''}`}
              onClick={() => setFiltro(filter.key)}
              aria-pressed={filtro === filter.key}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="page-load-error" role="alert">
          <strong>{loadError}</strong>
          <button type="button" onClick={onRetry} disabled={loading}>
            Riprova
          </button>
        </div>
      )}

      <div className="notes-list" aria-busy={loading}>
        {loading && note.length === 0 ? (
          <div className="page-loading" role="status">
            Caricamento note…
          </div>
        ) : !loadError && note.length === 0 ? (
          <div className="empty-state-card">
            <IcoMessage />
            <p>Nessun messaggio trovato.</p>
          </div>
        ) : (
          note.map((item) => (
            <div
              key={item.id}
              className={`note-card note-card--${item.priorita}${item.stato === 'non_letta' ? ' note-card--unread' : ''}`}
            >
              <div className="note-card__header">
                <span
                  className={`consegna-priorita-badge consegna-priorita-badge--${item.priorita}`}
                >
                  {PRIORITA_LABEL[item.priorita]}
                </span>
                <span className="note-author">{item.autoreNome}</span>
                <span className="note-arrow">→</span>
                <span className="note-dest">{item.destinatarioNome}</span>
                {item.pazienteNome && <span className="note-patient">· {item.pazienteNome}</span>}
                <span className="note-time">{fmtTime(item.createdAt)}</span>
                <span className={`stato-pill stato-pill--nota-${item.stato}`}>
                  {STATO_LABEL[item.stato]}
                </span>
              </div>
              <div className="note-message">
                <InlineEditableField
                  variant="block"
                  label="Messaggio"
                  type="textarea"
                  value={item.messaggio}
                  placeholder="Scrivi il messaggio…"
                  disabled={!isAdmin && item.autoreId !== utenteId}
                  onSave={(value) => onUpdate(item.id, { messaggio: value })}
                />
              </div>
              {item.stato !== 'risolta' && (
                <div className="note-card__actions">
                  {item.stato === 'non_letta' && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => onUpdateStato(item.id, 'letta')}
                    >
                      Segna come letta
                    </button>
                  )}
                  <button
                    className="icon-btn icon-btn--sm icon-btn--success"
                    onClick={() => onUpdateStato(item.id, 'risolta')}
                    title="Segna come risolta"
                    aria-label="Segna come risolta"
                  >
                    <IcoCheck />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div className="op-form-panel__actions">
          <button className="btn-secondary" onClick={onLoadMore} disabled={loading}>
            {loading ? 'Caricamento…' : 'Carica altri messaggi'}
          </button>
        </div>
      )}
    </div>
  );
}
