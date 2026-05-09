import { useState } from 'react';
import type { Operatore, RuoloOperatore, StatoOperatore } from '../../types';
import { OPERATOR_COLOR_PALETTE } from '../../types';
import { IcoPlus, IcoEdit, IcoCheck, IcoX, IcoSearch, IcoChevronRight } from '../../icons';

interface OperatorManagementProps {
  operatori: Operatore[];
  onAdd: (op: Omit<Operatore, 'id' | 'pazientiAssegnati' | 'appuntamentiOggi' | 'iniziali'>) => void;
  onUpdate: (id: string, updates: Partial<Operatore>) => void;
  onToggleStato: (id: string) => void;
}

const FORM_VUOTO = {
  nome: '',
  cognome: '',
  ruolo: 'medico' as RuoloOperatore,
  email: '',
  telefono: '',
  reparto: '',
  stato: 'attivo' as StatoOperatore,
  colore: OPERATOR_COLOR_PALETTE[0],
  note: '',
};

export function OperatorManagement({ operatori, onAdd, onUpdate, onToggleStato }: OperatorManagementProps) {
  const [ricerca, setRicerca] = useState('');
  const [filtroStato, setFiltroStato] = useState<'tutti' | StatoOperatore>('tutti');
  const [formAperto, setFormAperto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VUOTO);

  const filtrati = operatori.filter(op => {
    const match = `${op.nome} ${op.cognome} ${op.reparto} ${op.email}`.toLowerCase().includes(ricerca.toLowerCase());
    const statoMatch = filtroStato === 'tutti' || op.stato === filtroStato;
    return match && statoMatch;
  });

  function apriNuovo() {
    setEditId(null);
    // Pick next unused color
    const usedColors = operatori.map(o => o.colore);
    const nextColor = OPERATOR_COLOR_PALETTE.find(c => !usedColors.includes(c)) ?? OPERATOR_COLOR_PALETTE[0];
    setForm({ ...FORM_VUOTO, colore: nextColor });
    setFormAperto(true);
  }

  function apriModifica(op: Operatore) {
    setEditId(op.id);
    setForm({
      nome: op.nome, cognome: op.cognome, ruolo: op.ruolo,
      email: op.email, telefono: op.telefono, reparto: op.reparto,
      stato: op.stato, colore: op.colore, note: op.note ?? '',
    });
    setFormAperto(true);
  }

  function salva() {
    if (!form.nome.trim() || !form.cognome.trim()) return;
    if (editId) {
      onUpdate(editId, form);
    } else {
      onAdd(form);
    }
    setFormAperto(false);
    setEditId(null);
    setForm(FORM_VUOTO);
  }

  function annulla() {
    setFormAperto(false);
    setEditId(null);
    setForm(FORM_VUOTO);
  }

  const ruoloLabel: Record<RuoloOperatore, string> = {
    medico: 'Medico', infermiere: 'Infermiere', coordinatore: 'Coordinatore',
  };

  return (
    <div className="op-management">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Gestione Operatori</h2>
          <p className="view-header__sub">
            {operatori.filter(o => o.stato === 'attivo').length} attivi su {operatori.length} totali
          </p>
        </div>
        <button className="btn-primary" onClick={apriNuovo}>
          <IcoPlus /> Nuovo Operatore
        </button>
      </div>

      {/* Form */}
      {formAperto && (
        <div className="op-form-panel">
          <div className="op-form-panel__header">
            <h3 className="op-form-panel__title">{editId ? 'Modifica Operatore' : 'Nuovo Operatore'}</h3>
            <button className="icon-btn" onClick={annulla}><IcoX /></button>
          </div>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome" />
            </div>
            <div className="form-field">
              <label className="form-label">Cognome *</label>
              <input className="form-input" value={form.cognome}
                onChange={e => setForm(p => ({ ...p, cognome: e.target.value }))} placeholder="Cognome" />
            </div>
            <div className="form-field">
              <label className="form-label">Ruolo</label>
              <select className="form-select" value={form.ruolo}
                onChange={e => setForm(p => ({ ...p, ruolo: e.target.value as RuoloOperatore }))}>
                <option value="medico">Medico</option>
                <option value="infermiere">Infermiere</option>
                <option value="coordinatore">Coordinatore</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Reparto</label>
              <input className="form-input" value={form.reparto}
                onChange={e => setForm(p => ({ ...p, reparto: e.target.value }))} placeholder="Reparto" />
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@clinicos.it" />
            </div>
            <div className="form-field">
              <label className="form-label">Telefono</label>
              <input className="form-input" value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+39 02 …" />
            </div>
            <div className="form-field">
              <label className="form-label">Stato</label>
              <select className="form-select" value={form.stato}
                onChange={e => setForm(p => ({ ...p, stato: e.target.value as StatoOperatore }))}>
                <option value="attivo">Attivo</option>
                <option value="inattivo">Inattivo</option>
              </select>
            </div>

            {/* Color picker */}
            <div className="form-field">
              <label className="form-label">Colore operatore</label>
              <div className="color-picker">
                {OPERATOR_COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${form.colore === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm(p => ({ ...p, colore: c }))}
                    title={c}
                  />
                ))}
                <input type="color" className="color-custom-input" value={form.colore}
                  onChange={e => setForm(p => ({ ...p, colore: e.target.value }))}
                  title="Colore personalizzato" />
              </div>
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 8 }}>
            <label className="form-label">Note</label>
            <input className="form-input" value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Note sull'operatore…" />
          </div>
          <div className="op-form-panel__actions">
            <button className="btn-secondary" onClick={annulla}>Annulla</button>
            <button className="btn-primary" onClick={salva}>
              <IcoCheck /> {editId ? 'Salva modifiche' : 'Crea operatore'}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico"><IcoSearch /></span>
          <input className="search-input" type="search"
            placeholder="Cerca per nome, reparto, email…"
            value={ricerca} onChange={e => setRicerca(e.target.value)} />
          {ricerca && (
            <button className="search-clear-btn" onClick={() => setRicerca('')}><IcoX /></button>
          )}
        </div>
        <div className="filter-chips">
          {(['tutti', 'attivo', 'inattivo'] as const).map(s => (
            <button key={s}
              className={`filter-chip${filtroStato === s ? ' active' : ''}`}
              onClick={() => setFiltroStato(s)}>
              {s === 'tutti' ? 'Tutti' : s === 'attivo' ? 'Attivi' : 'Inattivi'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabella desktop */}
      <div className="table-wrap table-wrap--desktop">
        <div className="clinicos-table-wrap">
        <table className="clinicos-table">
          <thead>
            <tr>
              <th>Operatore</th>
              <th>Ruolo</th>
              <th>Reparto</th>
              <th>Contatti</th>
              <th>Pazienti</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtrati.length === 0 ? (
              <tr><td colSpan={7} className="empty-row">Nessun operatore trovato</td></tr>
            ) : filtrati.map(op => (
              <tr key={op.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="op-avatar-sm" style={{ background: op.colore }}>{op.iniziali}</div>
                    <div>
                      <div className="cell--name">{op.cognome} {op.nome}</div>
                    </div>
                  </div>
                </td>
                <td className="cell--muted">{ruoloLabel[op.ruolo]}</td>
                <td className="cell--muted">{op.reparto}</td>
                <td className="cell--muted" style={{ fontSize: 12 }}>
                  <div>{op.email}</div>
                  <div>{op.telefono}</div>
                </td>
                <td className="cell--muted">{op.pazientiAssegnati}</td>
                <td>
                  <span className={`stato-pill stato-pill--${op.stato}`}>{op.stato}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn icon-btn--sm" onClick={() => apriModifica(op)} title="Modifica">
                      <IcoEdit />
                    </button>
                    <button
                      className={`icon-btn icon-btn--sm${op.stato === 'attivo' ? ' icon-btn--danger' : ' icon-btn--success'}`}
                      onClick={() => onToggleStato(op.id)}
                      title={op.stato === 'attivo' ? 'Disattiva' : 'Riattiva'}
                    >
                      {op.stato === 'attivo' ? <IcoX /> : <IcoCheck />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Card list mobile */}
      <div className="pt-card-list">
        {filtrati.map(op => (
          <div key={op.id} className="pt-list-card" style={{ cursor: 'default' }}>
            <div className="op-avatar-sm" style={{ background: op.colore }}>{op.iniziali}</div>
            <div className="pt-list-card__info">
              <span className="pt-list-card__name">{op.cognome} {op.nome}</span>
              <span className="pt-list-card__meta">{ruoloLabel[op.ruolo]} · {op.reparto}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <span className={`stato-pill stato-pill--${op.stato}`}>{op.stato}</span>
              <div className="table-actions">
                <button className="icon-btn icon-btn--sm" onClick={() => apriModifica(op)}><IcoEdit /></button>
                <button className={`icon-btn icon-btn--sm${op.stato === 'attivo' ? ' icon-btn--danger' : ' icon-btn--success'}`}
                  onClick={() => onToggleStato(op.id)}>
                  {op.stato === 'attivo' ? <IcoX /> : <IcoCheck />}
                </button>
              </div>
            </div>
            <span className="pt-list-card__chevron"><IcoChevronRight /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
