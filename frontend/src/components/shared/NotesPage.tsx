import { useEffect, useRef, useState } from 'react';
import type { NewNotaInput, Nota, PrioritaNota, StatoNota, Operatore } from '../../types';
import type { NotesMailboxQuery } from '../../lib/notesMailbox';
import { IcoCheck, IcoX, IcoSearch, IcoMessage, IcoEdit } from '../../icons';
import { InlineEditableField } from './InlineEditableField';
import { NoteCreateForm } from './NoteCreateForm';
import { PageHeader } from './PageHeader';
import './NotesPage.css';

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

  // Solo lettere, senza titoli ("Dr.ssa", "Dr.Rossi"): "(Sistema)" → "S", nome vuoto → "?".
  function initials(name: string): string {
    const words = name
      .replace(/^\s*(dr\.?\s*ssa|dott\.?\s*ssa|dr|dott|prof)\.?\s*/i, '')
      .split(/[^\p{L}]+/u)
      .filter(Boolean);
    const letters = (words[0]?.[0] ?? '') + (words.length > 1 ? (words.at(-1)?.[0] ?? '') : '');
    return letters.toUpperCase() || '?';
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
    <div className="notes-page notes-page--hmi">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Note' }]}
        title="Note e messaggi"
        subtitle={unreadCount > 0 ? `${unreadCount} da leggere` : 'Tutte lette'}
      />

      <section className="nm-card" aria-labelledby="nm-title">
        <div className="nm-card__head">
          <h2 id="nm-title" className="nm-card__title">
            Messaggi
          </h2>
          <button
            ref={newNoteTriggerRef}
            type="button"
            className="ds-btn ds-btn--primary"
            aria-expanded={formAperto}
            aria-controls="nuova-nota-panel"
            onClick={() => (formAperto ? closeNewNote() : setFormAperto(true))}
          >
            <IcoEdit /> Nuova nota
          </button>
        </div>

        {formAperto && (
          <NoteCreateForm
            key="new-note"
            utenteId={utenteId}
            operatori={operatori}
            onAdd={onAdd}
            onClose={closeNewNote}
          />
        )}

        <div className="nm-tools">
          <div className="search-wrap nm-search">
            <span className="search-wrap__ico">
              <IcoSearch />
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Cerca nelle note…"
              aria-label="Cerca nelle note"
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
          <div className="ds-chip-group" role="group" aria-label="Filtra messaggi">
            {(
              [
                { key: 'tutte', label: 'Tutte', count: 0 },
                { key: 'ricevute', label: 'Ricevute', count: 0 },
                { key: 'inviate', label: 'Inviate', count: 0 },
                {
                  key: 'non_lette',
                  label: 'Non lette',
                  count: unreadCount,
                },
              ] as const
            ).map((filter) => (
              <button
                type="button"
                key={filter.key}
                className="ds-chip"
                onClick={() => setFiltro(filter.key)}
                aria-pressed={filtro === filter.key}
              >
                {filter.label}
                {filter.count > 0 && <span className="ds-chip__count">{filter.count}</span>}
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

        <ul className="nm-list" aria-busy={loading}>
          {loading && note.length === 0 ? (
            <li className="page-loading" role="status">
              Caricamento note…
            </li>
          ) : !loadError && note.length === 0 ? (
            <li className="nm-empty">
              <IcoMessage />
              <p>Nessun messaggio trovato.</p>
            </li>
          ) : (
            note.map((item) => {
              const context = `nota di ${item.autoreNome?.trim() || 'autore sconosciuto'} delle ${fmtTime(item.createdAt)}`;
              return (
                <li
                  key={item.id}
                  className={`nm-row nm-row--${item.priorita}${item.stato === 'non_letta' ? ' nm-row--unread' : ''}${item.stato === 'risolta' ? ' nm-row--done' : ''}`}
                >
                  <span className="nm-avatar" aria-hidden="true">
                    {initials(item.autoreNome)}
                  </span>
                  <div className="nm-row__body">
                    <div className="nm-row__meta">
                      {item.stato === 'non_letta' && (
                        <span className="nm-dot" role="img" aria-label="Non letta" />
                      )}
                      <span className="nm-author">{item.autoreNome}</span>
                      <span className="nm-dest">→ {item.destinatarioNome}</span>
                      {item.pazienteNome && <span className="nm-dest">· {item.pazienteNome}</span>}
                      {item.priorita !== 'normale' && (
                        <span className={`nm-prio nm-prio--${item.priorita}`}>
                          {PRIORITA_LABEL[item.priorita]}
                        </span>
                      )}
                      {item.stato === 'risolta' && (
                        <span className="nm-state">{STATO_LABEL[item.stato]}</span>
                      )}
                      {item.stato === 'letta' && (
                        <span className="nm-sr">{STATO_LABEL[item.stato]}</span>
                      )}
                    </div>
                    <div className="note-message nm-message">
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
                  </div>
                  <div className="nm-row__side">
                    <time className="nm-time" dateTime={item.createdAt}>
                      {fmtTime(item.createdAt)}
                    </time>
                    {item.stato !== 'risolta' && (
                      <div className="nm-actions">
                        {item.stato === 'non_letta' && (
                          <button
                            type="button"
                            className="ds-link"
                            aria-label={`Segna come letta: ${context}`}
                            onClick={() => onUpdateStato(item.id, 'letta')}
                          >
                            Segna come letta
                          </button>
                        )}
                        <button
                          type="button"
                          className="ds-icon-btn"
                          onClick={() => onUpdateStato(item.id, 'risolta')}
                          title="Segna come risolta"
                          aria-label={`Segna come risolta: ${context}`}
                        >
                          <IcoCheck />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {hasMore && (
          <div className="nm-more">
            <button className="btn-secondary" onClick={onLoadMore} disabled={loading}>
              {loading ? 'Caricamento…' : 'Carica altri messaggi'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
