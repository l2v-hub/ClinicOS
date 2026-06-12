import { useState } from 'react';
import type { Nota, PrioritaNota, StatoNota, Operatore } from '../../types';
import { IcoPlus, IcoCheck, IcoX, IcoSearch, IcoMessage } from '../../icons';
import { InlineEditableField } from './InlineEditableField';

interface NotesPageProps {
  note: Nota[];
  utenteId: string;
  utenteNome: string;
  isAdmin: boolean;
  operatori: Operatore[];
  onAdd: (n: Omit<Nota, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, patch: Partial<Nota>) => void | Promise<boolean>;
  onUpdateStato: (id: string, stato: StatoNota) => void;
}

const PRIORITA_LABEL: Record<PrioritaNota, string> = {
  normale: 'Normale', alta: 'Alta', urgente: 'Urgente',
};

const STATO_LABEL: Record<StatoNota, string> = {
  non_letta: 'Non letta', letta: 'Letta', risolta: 'Risolta',
};

const FORM_VUOTO = {
  destinatarioId: 'tutti',
  destinatarioNome: 'Tutti gli operatori',
  pazienteNome: '',
  priorita: 'normale' as PrioritaNota,
  messaggio: '',
};

export function NotesPage({
  note, utenteId, utenteNome, isAdmin, operatori, onAdd, onUpdate, onUpdateStato,
}: NotesPageProps) {
  const [filtro, setFiltro] = useState<'tutte' | 'ricevute' | 'inviate' | 'non_lette'>('tutte');
  const [ricerca, setRicerca] = useState('');
  const [formAperto, setFormAperto] = useState(false);
  const [form, setForm] = useState(FORM_VUOTO);

  const destinatari = [
    { id: 'tutti', nome: 'Tutti gli operatori' },
    { id: 'admin', nome: 'Amministrazione' },
    ...operatori.filter(o => o.stato === 'attivo' && o.id !== utenteId).map(o => ({
      id: o.id, nome: `${o.cognome} ${o.nome}`,
    })),
  ];

  const filtrate = note.filter(n => {
    if (filtro === 'ricevute') {
      if (n.destinatarioId !== utenteId && n.destinatarioId !== 'tutti' && !(isAdmin && n.destinatarioId === 'admin')) return false;
    } else if (filtro === 'inviate') {
      if (n.autoreId !== utenteId) return false;
    } else if (filtro === 'non_lette') {
      if (n.stato !== 'non_letta') return false;
      if (n.destinatarioId !== utenteId && n.destinatarioId !== 'tutti' && !(isAdmin && n.destinatarioId === 'admin')) return false;
    }
    if (ricerca) {
      const q = ricerca.toLowerCase();
      return n.messaggio.toLowerCase().includes(q) || n.autoreNome.toLowerCase().includes(q) ||
        (n.pazienteNome ?? '').toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const nonLette = note.filter(n =>
    n.stato === 'non_letta' && (n.destinatarioId === utenteId || n.destinatarioId === 'tutti' ||
    (isAdmin && n.destinatarioId === 'admin'))
  ).length;

  function salva() {
    if (!form.messaggio.trim()) return;
    const dest = destinatari.find(d => d.id === form.destinatarioId) ?? destinatari[0];
    onAdd({
      autoreId: utenteId,
      autoreNome: utenteNome,
      destinatarioId: dest.id,
      destinatarioNome: dest.nome,
      pazienteNome: form.pazienteNome || undefined,
      priorita: form.priorita,
      messaggio: form.messaggio,
      stato: 'non_letta',
    });
    setFormAperto(false);
    setForm(FORM_VUOTO);
  }

  function fmtTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="notes-page">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Note e Messaggi</h2>
          <p className="view-header__sub">
            {nonLette > 0 ? <span style={{ color: 'var(--red)' }}>{nonLette} non lett{nonLette === 1 ? 'a' : 'e'}</span> : 'Tutte lette'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setFormAperto(v => !v)}>
          <IcoPlus /> Nuova nota
        </button>
      </div>

      {/* Form */}
      {formAperto && (
        <div className="op-form-panel">
          <div className="op-form-panel__header">
            <h3 className="op-form-panel__title">Nuova Nota / Messaggio</h3>
            <button className="icon-btn" onClick={() => setFormAperto(false)}><IcoX /></button>
          </div>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Destinatario</label>
              <select className="form-select" value={form.destinatarioId}
                onChange={e => {
                  const d = destinatari.find(x => x.id === e.target.value) ?? destinatari[0];
                  setForm(p => ({ ...p, destinatarioId: d.id, destinatarioNome: d.nome }));
                }}>
                {destinatari.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Priorità</label>
              <select className="form-select" value={form.priorita}
                onChange={e => setForm(p => ({ ...p, priorita: e.target.value as PrioritaNota }))}>
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Paziente (opz.)</label>
              <input className="form-input" value={form.pazienteNome}
                onChange={e => setForm(p => ({ ...p, pazienteNome: e.target.value }))}
                placeholder="Cognome, Nome" />
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 8 }}>
            <label className="form-label">Messaggio *</label>
            <textarea className="form-input" rows={3} value={form.messaggio}
              onChange={e => setForm(p => ({ ...p, messaggio: e.target.value }))}
              placeholder="Scrivi il messaggio…" />
          </div>
          <div className="op-form-panel__actions">
            <button className="btn-secondary" onClick={() => setFormAperto(false)}>Annulla</button>
            <button className="btn-primary" onClick={salva}><IcoCheck /> Invia</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico"><IcoSearch /></span>
          <input className="search-input" type="search" placeholder="Cerca…"
            value={ricerca} onChange={e => setRicerca(e.target.value)} />
          {ricerca && (
            <button className="search-clear-btn" onClick={() => setRicerca('')}><IcoX /></button>
          )}
        </div>
        <div className="filter-chips">
          {([
            { key: 'tutte',    label: 'Tutte' },
            { key: 'ricevute', label: 'Ricevute' },
            { key: 'inviate',  label: 'Inviate' },
            { key: 'non_lette', label: `Non lette${nonLette > 0 ? ` (${nonLette})` : ''}` },
          ] as const).map(f => (
            <button key={f.key}
              className={`filter-chip${filtro === f.key ? ' active' : ''}`}
              onClick={() => setFiltro(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note list */}
      <div className="notes-list">
        {filtrate.length === 0 ? (
          <div className="empty-state-card">
            <IcoMessage />
            <p>Nessun messaggio trovato.</p>
          </div>
        ) : filtrate.map(n => (
          <div key={n.id} className={`note-card note-card--${n.priorita}${n.stato === 'non_letta' ? ' note-card--unread' : ''}`}>
            <div className="note-card__header">
              <span className={`consegna-priorita-badge consegna-priorita-badge--${n.priorita}`}>
                {PRIORITA_LABEL[n.priorita]}
              </span>
              <span className="note-author">{n.autoreNome}</span>
              <span className="note-arrow">→</span>
              <span className="note-dest">{n.destinatarioNome}</span>
              {n.pazienteNome && (
                <span className="note-patient">· {n.pazienteNome}</span>
              )}
              <span className="note-time">{fmtTime(n.createdAt)}</span>
              <span className={`stato-pill stato-pill--nota-${n.stato}`}>{STATO_LABEL[n.stato]}</span>
            </div>
            <div className="note-message">
              <InlineEditableField
                variant="block"
                label="Messaggio"
                type="textarea"
                value={n.messaggio}
                placeholder="Scrivi il messaggio…"
                disabled={n.autoreId !== utenteId}
                onSave={v => onUpdate(n.id, { messaggio: v })}
              />
            </div>
            {n.stato !== 'risolta' && (
              <div className="note-card__actions">
                {n.stato === 'non_letta' && (
                  <button className="btn-secondary btn-sm" onClick={() => onUpdateStato(n.id, 'letta')}>
                    Segna come letta
                  </button>
                )}
                <button className="icon-btn icon-btn--sm icon-btn--success"
                  onClick={() => onUpdateStato(n.id, 'risolta')} title="Risolto">
                  <IcoCheck />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
