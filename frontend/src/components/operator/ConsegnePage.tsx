import { useState } from 'react';
import type { Consegna, PrioritaConsegna, StatoConsegna } from '../../types';
import { IcoPlus, IcoCheck, IcoX, IcoSearch, IcoEdit, IcoClock } from '../../icons';
import { InlineEditableField } from '../shared/InlineEditableField';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { comparePazientiNome } from '../../lib/patientSort';

interface ConsegnePageProps {
  consegne: Consegna[];
  operatoreNome: string;
  isAdmin: boolean;
  onAdd: (c: Omit<Consegna, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, patch: Partial<Consegna>) => void | Promise<boolean>;
  onUpdateStato: (id: string, stato: Consegna['stato']) => void;
  onDelete: (id: string) => void;
  onSelectPaziente?: (nome: string) => void;
}

const PRIORITA_ORDER: Record<PrioritaConsegna, number> = { urgente: 0, alta: 1, normale: 2 };
const TIPO_OPTIONS = [
  'Monitoraggio',
  'Terapia',
  'Esami',
  'Dimissione',
  'Medicazione',
  'Consultazione',
  'Rivalutazione',
  'Altro',
];
const PRIORITA_LABEL: Record<PrioritaConsegna, string> = {
  normale: 'Normale',
  alta: 'Alta',
  urgente: 'Urgente',
};
const STATO_LABEL: Record<StatoConsegna, string> = {
  aperta: 'Aperta',
  in_corso: 'In corso',
  completata: 'Completata',
};

const FORM_VUOTO = {
  pazienteNome: '',
  tipo: 'Monitoraggio',
  priorita: 'normale' as PrioritaConsegna,
  note: '',
  oraScadenza: '',
  operatoreAssegnato: '',
};

export function ConsegnePage({
  consegne,
  operatoreNome,
  isAdmin,
  onAdd,
  onUpdate,
  onUpdateStato,
  onDelete,
  onSelectPaziente,
}: ConsegnePageProps) {
  const [filtroStato, setFiltroStato] = useState<'tutte' | Consegna['stato']>('tutte');
  const [filtroPriorita, setFiltroPriorita] = useState<'tutte' | PrioritaConsegna>('tutte');
  const [ricerca, setRicerca] = useState('');
  const [formAperto, setFormAperto] = useState(false);
  const [form, setForm] = useState(FORM_VUOTO);

  const filtrate = consegne
    .filter((c) => {
      if (filtroStato !== 'tutte' && c.stato !== filtroStato) return false;
      if (filtroPriorita !== 'tutte' && c.priorita !== filtroPriorita) return false;
      if (ricerca) {
        const q = ricerca.toLowerCase();
        return (
          (c.pazienteNome ?? '').toLowerCase().includes(q) ||
          (c.tipo ?? '').toLowerCase().includes(q) ||
          (c.note ?? '').toLowerCase().includes(q) ||
          (c.operatoreAssegnato ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Issue #129: pazienti in ordine alfabetico (cognome, nome); a parità di
      // paziente prima le priorità più alte, poi le consegne più recenti.
      const sn = comparePazientiNome(a.pazienteNome, b.pazienteNome);
      if (sn !== 0) return sn;
      const sp = PRIORITA_ORDER[a.priorita] - PRIORITA_ORDER[b.priorita];
      if (sp !== 0) return sp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  function salva() {
    if (!form.pazienteNome.trim() || !form.note.trim()) return;
    onAdd({
      pazienteId: '',
      pazienteNome: form.pazienteNome,
      priorita: form.priorita,
      stato: 'aperta',
      tipo: form.tipo,
      note: form.note,
      scadenza: new Date().toISOString().slice(0, 10),
      oraScadenza: form.oraScadenza || undefined,
      operatoreAssegnato: form.operatoreAssegnato || operatoreNome,
      creatoDA: operatoreNome,
    });
    setFormAperto(false);
    setForm(FORM_VUOTO);
  }

  const urgenti = filtrate.filter((c) => c.priorita === 'urgente' && c.stato !== 'completata');
  const altre = filtrate.filter((c) => !(c.priorita === 'urgente' && c.stato !== 'completata'));

  return (
    <div className="consegne-page">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Consegne</h2>
          <p className="view-header__sub">
            {consegne.filter((c) => c.stato !== 'completata').length} aperte ·{' '}
            {consegne.filter((c) => c.priorita === 'urgente' && c.stato !== 'completata').length}{' '}
            urgenti
          </p>
        </div>
        <button className="btn-primary" onClick={() => setFormAperto((v) => !v)}>
          <IcoPlus /> Nuova consegna
        </button>
      </div>

      {/* Form */}
      {formAperto && (
        <div className="op-form-panel">
          <div className="op-form-panel__header">
            <h3 className="op-form-panel__title">Nuova Consegna</h3>
            <button className="icon-btn" onClick={() => setFormAperto(false)}>
              <IcoX />
            </button>
          </div>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Paziente *</label>
              <input
                className="form-input"
                value={form.pazienteNome}
                onChange={(e) => setForm((p) => ({ ...p, pazienteNome: e.target.value }))}
                placeholder="Cognome, Nome"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
              >
                {TIPO_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Priorità</label>
              <select
                className="form-select"
                value={form.priorita}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priorita: e.target.value as PrioritaConsegna }))
                }
              >
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Ora scadenza</label>
              <input
                className="form-input"
                type="time"
                value={form.oraScadenza}
                onChange={(e) => setForm((p) => ({ ...p, oraScadenza: e.target.value }))}
              />
            </div>
            {isAdmin && (
              <div className="form-field">
                <label className="form-label">Assegnata a</label>
                <input
                  className="form-input"
                  value={form.operatoreAssegnato}
                  onChange={(e) => setForm((p) => ({ ...p, operatoreAssegnato: e.target.value }))}
                  placeholder="Nome operatore"
                />
              </div>
            )}
          </div>
          <div className="form-field" style={{ marginTop: 8 }}>
            <label className="form-label">Note *</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Istruzioni per il prossimo operatore…"
            />
          </div>
          <div className="op-form-panel__actions">
            <button className="btn-secondary" onClick={() => setFormAperto(false)}>
              Annulla
            </button>
            <button className="btn-primary" onClick={salva}>
              <IcoCheck /> Crea consegna
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico">
            <IcoSearch />
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Cerca paziente, tipo, note…"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          {ricerca && (
            <button className="search-clear-btn" onClick={() => setRicerca('')}>
              <IcoX />
            </button>
          )}
        </div>
        <div className="filter-chips">
          {(['tutte', 'aperta', 'in_corso', 'completata'] as const).map((s) => (
            <button
              key={s}
              className={`filter-chip${filtroStato === s ? ' active' : ''}`}
              onClick={() => setFiltroStato(s)}
            >
              {s === 'tutte'
                ? 'Tutte'
                : s === 'aperta'
                  ? 'Aperte'
                  : s === 'in_corso'
                    ? 'In corso'
                    : 'Completate'}
            </button>
          ))}
        </div>
        <div className="filter-chips">
          {(['tutte', 'urgente', 'alta', 'normale'] as const).map((p) => (
            <button
              key={p}
              className={`filter-chip filter-chip--priorita${filtroPriorita === p ? ' active' : ''} ${p !== 'tutte' ? `filter-chip--${p}` : ''}`}
              onClick={() => setFiltroPriorita(p)}
            >
              {p === 'tutte' ? 'Tutte' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Urgenti in cima */}
      {urgenti.length > 0 && (filtroStato === 'tutte' || filtroStato === 'aperta') && (
        <div className="consegne-section">
          <h3 className="consegne-section__title consegne-section__title--urgente">Urgenti</h3>
          <div className="consegne-list">
            {urgenti.map((c) => (
              <ConsegnaCard
                key={c.id}
                consegna={c}
                onUpdate={onUpdate}
                onUpdateStato={onUpdateStato}
                onDelete={onDelete}
                isAdmin={isAdmin}
                onSelectPaziente={onSelectPaziente}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tutte le altre */}
      <div className="consegne-list" style={{ marginTop: urgenti.length > 0 ? 24 : 0 }}>
        {altre.length === 0 && urgenti.length === 0 ? (
          <div className="empty-state-card">Nessuna consegna trovata.</div>
        ) : (
          altre.map((c) => (
            <ConsegnaCard
              key={c.id}
              consegna={c}
              onUpdate={onUpdate}
              onUpdateStato={onUpdateStato}
              onDelete={onDelete}
              isAdmin={isAdmin}
              onSelectPaziente={onSelectPaziente}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConsegnaCard({
  consegna: c,
  onUpdate,
  onUpdateStato,
  onDelete,
  isAdmin,
  onSelectPaziente,
}: {
  consegna: Consegna;
  onUpdate: (id: string, patch: Partial<Consegna>) => void | Promise<boolean>;
  onUpdateStato: (id: string, stato: Consegna['stato']) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  onSelectPaziente?: (nome: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div
      className={`consegna-card consegna-card--${c.priorita}${c.stato === 'completata' ? ' consegna-card--done' : ''}`}
    >
      <div className="consegna-card__top">
        <span className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}>
          {PRIORITA_LABEL[c.priorita]}
        </span>
        <span className="consegna-tipo">{c.tipo}</span>
        {c.oraScadenza && (
          <span className="consegna-scadenza">
            <IcoClock />
            {c.oraScadenza}
          </span>
        )}
        <span className={`stato-pill stato-pill--consegna-${c.stato}`}>{STATO_LABEL[c.stato]}</span>
        <button
          className="icon-btn icon-btn--sm consegna-edit-btn"
          onClick={() => setEditOpen(true)}
          title="Modifica consegna"
          aria-label="Modifica consegna"
        >
          <IcoEdit />
        </button>
      </div>
      <div className="consegna-card__patient">
        {c.pazienteNome && (
          <span className="consegna-avatar" aria-hidden="true">
            {c.pazienteNome
              .split(/[,\s]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </span>
        )}
        {onSelectPaziente && c.pazienteNome ? (
          <button
            className="link-btn consegna-paziente"
            onClick={() => onSelectPaziente(c.pazienteNome!)}
          >
            {c.pazienteNome}
          </button>
        ) : (
          <span className="consegna-paziente">{c.pazienteNome}</span>
        )}
      </div>
      <div className="consegna-note">
        <InlineEditableField
          variant="block"
          label="Note consegna"
          type="textarea"
          value={c.note}
          emptyText="Aggiungi note…"
          placeholder="Istruzioni per il prossimo operatore…"
          onSave={(v) => onUpdate(c.id, { note: v })}
        />
      </div>
      <div className="consegna-card__footer">
        <div>
          <span className="consegna-assegnato">→ {c.operatoreAssegnato}</span>
          {c.creatoDA !== c.operatoreAssegnato && (
            <span className="consegna-creato"> · da {c.creatoDA}</span>
          )}
        </div>
        {c.stato !== 'completata' && (
          <div className="table-actions">
            {c.stato === 'aperta' && (
              <button
                className="btn-secondary btn-sm"
                onClick={() => onUpdateStato(c.id, 'in_corso')}
              >
                Prendi in carico
              </button>
            )}
            {c.stato === 'in_corso' && (
              <button
                className="btn-secondary btn-sm"
                onClick={() => onUpdateStato(c.id, 'aperta')}
              >
                Rilascia
              </button>
            )}
            <button
              className="icon-btn icon-btn--sm icon-btn--success"
              onClick={() => onUpdateStato(c.id, 'completata')}
              title="Completa"
            >
              <IcoCheck />
            </button>
            {isAdmin && (
              <button
                className="icon-btn icon-btn--sm icon-btn--danger"
                onClick={() => setConfirmOpen(true)}
                title="Elimina"
              >
                <IcoX />
              </button>
            )}
          </div>
        )}
        {c.stato === 'completata' && isAdmin && (
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            onClick={() => setConfirmOpen(true)}
            title="Elimina"
          >
            <IcoX />
          </button>
        )}
      </div>

      {editOpen && (
        <ConsegnaEditInline
          consegna={c}
          isAdmin={isAdmin}
          onUpdate={onUpdate}
          onClose={() => setEditOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminare la consegna?"
        message="La consegna verrà eliminata. L'azione non è reversibile."
        confirmLabel="Elimina consegna"
        onConfirm={() => {
          onDelete(c.id);
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function ConsegnaEditInline({
  consegna: c,
  isAdmin,
  onUpdate,
  onClose,
}: {
  consegna: Consegna;
  isAdmin: boolean;
  onUpdate: (id: string, patch: Partial<Consegna>) => void | Promise<boolean>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    priorita: c.priorita,
    stato: c.stato,
    tipo: c.tipo,
    oraScadenza: c.oraScadenza ?? '',
    operatoreAssegnato: c.operatoreAssegnato,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const ok = await onUpdate(c.id, {
      priorita: form.priorita,
      stato: form.stato,
      tipo: form.tipo,
      oraScadenza: form.oraScadenza || undefined,
      operatoreAssegnato: form.operatoreAssegnato,
    });
    setSaving(false);
    if (ok === false) setError('Salvataggio non riuscito. Riprova.');
    else onClose();
  }

  // BUG-065 (#103): render the edit form INLINE inside the card (no modal overlay) so it never
  // overlaps the "Nuova consegna" panel or other cards, and entry stays fast.
  return (
    <div
      className="consegna-edit-inline"
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid var(--border, #D0D5DD)',
        borderRadius: 8,
        background: '#F9FAFB',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <strong style={{ fontSize: 13 }}>Modifica consegna</strong>
        <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Chiudi">
          <IcoX />
        </button>
      </div>
      <div>
        <div className="op-form-grid">
          <div className="form-field">
            <label className="form-label">Priorità</label>
            <select
              className="form-select"
              value={form.priorita}
              disabled={saving}
              onChange={(e) =>
                setForm((p) => ({ ...p, priorita: e.target.value as PrioritaConsegna }))
              }
            >
              <option value="normale">Normale</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Stato</label>
            <select
              className="form-select"
              value={form.stato}
              disabled={saving}
              onChange={(e) => setForm((p) => ({ ...p, stato: e.target.value as StatoConsegna }))}
            >
              <option value="aperta">Aperta</option>
              <option value="in_corso">In corso</option>
              <option value="completata">Completata</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={form.tipo}
              disabled={saving}
              onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
            >
              {TIPO_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Ora scadenza</label>
            <input
              className="form-input"
              type="time"
              value={form.oraScadenza}
              disabled={saving}
              onChange={(e) => setForm((p) => ({ ...p, oraScadenza: e.target.value }))}
            />
          </div>
          {isAdmin && (
            <div className="form-field">
              <label className="form-label">Assegnata a</label>
              <input
                className="form-input"
                value={form.operatoreAssegnato}
                disabled={saving}
                onChange={(e) => setForm((p) => ({ ...p, operatoreAssegnato: e.target.value }))}
                placeholder="Nome operatore"
              />
            </div>
          )}
        </div>
        {error && (
          <p className="inline-edit__error" style={{ margin: 0 }}>
            {error}
          </p>
        )}
      </div>
      <div className="table-actions" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn-secondary btn-sm" onClick={onClose} disabled={saving}>
          Annulla
        </button>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
          <IcoCheck /> Salva
        </button>
      </div>
    </div>
  );
}
