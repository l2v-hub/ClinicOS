import { useEffect, useState } from 'react';
import type { Nota, PrioritaNota, StatoNota, Operatore, Paziente } from '../../types';
import type { NotesMailboxQuery } from '../../lib/notesMailbox';
import { IcoPlus, IcoCheck, IcoX, IcoSearch, IcoMessage } from '../../icons';
import { InlineEditableField } from './InlineEditableField';
import { PageHeader } from './PageHeader';
import { PatientCombobox } from './PatientCombobox';

interface NotesPageProps {
  note: Nota[];
  utenteId: string;
  utenteNome: string;
  isAdmin: boolean;
  operatori: Operatore[];
  loading: boolean;
  loadError: string | null;
  unreadCount: number;
  hasMore: boolean;
  onAdd: (n: Omit<Nota, 'id' | 'createdAt'>) => Promise<boolean>;
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

const FORM_VUOTO = {
  destinatarioId: 'tutti',
  destinatarioNome: 'Tutti gli operatori',
  pazienteId: '',
  pazienteNome: '',
  priorita: 'normale' as PrioritaNota,
  messaggio: '',
};

export function NotesPage({
  note,
  utenteId,
  utenteNome,
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
  const [form, setForm] = useState(FORM_VUOTO);
  const [selectedPatient, setSelectedPatient] = useState<Paziente | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void onQueryChange({ box: FILTER_BOX[filtro], q: ricerca });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filtro, onQueryChange, ricerca]);

  const destinatari = [
    { id: 'tutti', nome: 'Tutti gli operatori' },
    { id: 'admin', nome: 'Amministrazione' },
    ...operatori
      .filter((operatore) => operatore.stato === 'attivo' && operatore.id !== utenteId)
      .map((operatore) => ({
        id: operatore.id,
        nome: `${operatore.cognome} ${operatore.nome}`,
      })),
  ];

  function selectPaziente(patient: Paziente | null) {
    setSelectedPatient(patient);
    setForm((current) => ({
      ...current,
      pazienteId: patient?.id ?? '',
      pazienteNome: patient ? `${patient.lastName}, ${patient.firstName}` : '',
    }));
  }

  function resetForm() {
    setForm(FORM_VUOTO);
    setSelectedPatient(null);
    setSaveError(null);
  }

  async function salva() {
    if (!form.messaggio.trim() || saving) return;
    const dest = destinatari.find((item) => item.id === form.destinatarioId) ?? destinatari[0];
    setSaving(true);
    setSaveError(null);
    const saved = await onAdd({
      autoreId: utenteId,
      autoreNome: utenteNome,
      destinatarioId: dest.id,
      destinatarioNome: dest.nome,
      pazienteId: form.pazienteId || undefined,
      pazienteNome: form.pazienteNome || undefined,
      priorita: form.priorita,
      messaggio: form.messaggio.trim(),
      stato: 'non_letta',
    });
    setSaving(false);
    if (!saved) {
      setSaveError('Invio non riuscito. Controlla i dati e riprova.');
      return;
    }
    setFormAperto(false);
    resetForm();
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
            type="button"
            className="btn-success"
            aria-expanded={formAperto}
            aria-controls="nuova-nota-panel"
            onClick={() => setFormAperto((open) => !open)}
          >
            <IcoPlus /> Nuova nota
          </button>
        }
      />

      {formAperto && (
        <div id="nuova-nota-panel" className="op-form-panel">
          <div className="op-form-panel__header">
            <h3 className="op-form-panel__title">Nuova nota / messaggio</h3>
            <button
              className="icon-btn"
              aria-label="Chiudi nuova nota"
              onClick={() => setFormAperto(false)}
              disabled={saving}
            >
              <IcoX />
            </button>
          </div>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Destinatario</label>
              <select
                className="form-select"
                value={form.destinatarioId}
                onChange={(event) => {
                  const dest =
                    destinatari.find((item) => item.id === event.target.value) ?? destinatari[0];
                  setForm((current) => ({
                    ...current,
                    destinatarioId: dest.id,
                    destinatarioNome: dest.nome,
                  }));
                }}
                disabled={saving}
              >
                {destinatari.map((dest) => (
                  <option key={dest.id} value={dest.id}>
                    {dest.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Priorità</label>
              <select
                className="form-select"
                value={form.priorita}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priorita: event.target.value as PrioritaNota,
                  }))
                }
                disabled={saving}
              >
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <PatientCombobox
              inputId="note-patient"
              label="Paziente (opzionale)"
              selected={selectedPatient}
              onChange={selectPaziente}
              disabled={saving}
            />
          </div>
          <div className="form-field" style={{ marginTop: 8 }}>
            <label className="form-label">Messaggio *</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.messaggio}
              onChange={(event) =>
                setForm((current) => ({ ...current, messaggio: event.target.value }))
              }
              placeholder="Scrivi il messaggio…"
              maxLength={4000}
              disabled={saving}
            />
          </div>
          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="op-form-panel__actions">
            <button
              className="btn-secondary"
              onClick={() => setFormAperto(false)}
              disabled={saving}
            >
              Annulla
            </button>
            <button
              className="btn-success"
              onClick={() => void salva()}
              disabled={saving || !form.messaggio.trim()}
            >
              <IcoCheck /> {saving ? 'Invio…' : 'Invia'}
            </button>
          </div>
        </div>
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
