import { useState } from 'react';
import type { CartellaPaziente, EsameClinicoRecord, Paziente } from '../../../types';
import { uid, todayStr, nowISO, fmtDate, ClinicalTableSection, InlineForm, EmptyState } from './shared';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

// ── Sort helper: chronological descending (most recent first) ────────────────

export function sortEsamiDesc(records: EsameClinicoRecord[]): EsameClinicoRecord[] {
  return [...records].sort((a, b) => {
    const da = `${a.data}${a.ora ? 'T' + a.ora : 'T00:00'}`;
    const db = `${b.data}${b.ora ? 'T' + b.ora : 'T00:00'}`;
    return db.localeCompare(da);
  });
}

// ── Empty form factory ───────────────────────────────────────────────────────

function emptyForm(): Omit<EsameClinicoRecord, 'id' | 'operatore' | 'createdAt'> {
  return { data: todayStr(), ora: '', descrizione: '', esito: '', allegati: '', note: '' };
}

// ── Single row display ───────────────────────────────────────────────────────

function EsameRow({
  r,
  onEdit,
  onDelete,
}: {
  r: EsameClinicoRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="cr-item-row">
      <div className="cr-item-body">
        <div className="cr-visita-header">
          <span className="cr-visita-tipo">{r.descrizione}</span>
          <span className="cr-diag-meta">
            {fmtDate(r.data)}{r.ora ? ` ${r.ora}` : ''} · {r.operatore}
          </span>
        </div>
        {r.esito && <p className="cr-nota-text">{r.esito}</p>}
        {r.allegati && <p className="cr-diag-note">Allegati: {r.allegati}</p>}
        {r.note && <p className="cr-diag-note">{r.note}</p>}
      </div>
      <div className="cr-item-actions">
        <button className="btn-icon btn-sm" title="Modifica" onClick={onEdit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button className="btn-icon btn-sm btn-icon--danger" title="Elimina" onClick={onDelete}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Inline add/edit form ─────────────────────────────────────────────────────

function EsameForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<EsameClinicoRecord, 'id' | 'operatore' | 'createdAt'>;
  onSave: (data: Omit<EsameClinicoRecord, 'id' | 'operatore' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));

  return (
    <InlineForm onSave={() => onSave(f)} onCancel={onCancel}>
      <div className="op-form-grid">
        <div className="form-field">
          <label className="form-label">Descrizione *</label>
          <input
            className="form-input"
            value={f.descrizione}
            placeholder="es. Emocromo completo, RX torace…"
            onChange={e => set('descrizione', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">Data</label>
          <input className="form-input" type="date" value={f.data} onChange={e => set('data', e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">Ora (facoltativo)</label>
          <input className="form-input" type="time" value={f.ora ?? ''} onChange={e => set('ora', e.target.value)} />
        </div>
      </div>
      <div className="form-field" style={{ marginTop: 8 }}>
        <label className="form-label">Esito / Referto</label>
        <textarea
          className="form-input"
          rows={3}
          value={f.esito}
          onChange={e => set('esito', e.target.value)}
        />
      </div>
      <div className="form-field" style={{ marginTop: 8 }}>
        <label className="form-label">Allegati (nomi file / riferimenti)</label>
        <input className="form-input" value={f.allegati ?? ''} onChange={e => set('allegati', e.target.value)} />
      </div>
      <div className="form-field" style={{ marginTop: 8 }}>
        <label className="form-label">Note (facoltativo)</label>
        <textarea
          className="form-input"
          rows={2}
          value={f.note ?? ''}
          onChange={e => set('note', e.target.value)}
        />
      </div>
    </InlineForm>
  );
}

// ── Reusable section (one of three) ──────────────────────────────────────────

function EsameSection({
  title,
  emptyMsg,
  list,
  operatoreNome,
  onChange,
}: {
  title: string;
  emptyMsg: string;
  list: EsameClinicoRecord[];
  operatoreNome: string;
  onChange: (updated: EsameClinicoRecord[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<EsameClinicoRecord, 'id' | 'operatore' | 'createdAt'> | null>(null);

  const sorted = sortEsamiDesc(list);

  function handleAdd(data: Omit<EsameClinicoRecord, 'id' | 'operatore' | 'createdAt'>) {
    if (!data.descrizione.trim()) return;
    const rec: EsameClinicoRecord = {
      ...data,
      id: uid(),
      operatore: operatoreNome,
      createdAt: nowISO(),
    };
    onChange([...list, rec]);
    setShowAdd(false);
  }

  function handleUpdate(id: string, data: Omit<EsameClinicoRecord, 'id' | 'operatore' | 'createdAt'>) {
    onChange(list.map(r => r.id === id ? { ...r, ...data } : r));
    setEditId(null);
    setEditForm(null);
  }

  function handleDelete(id: string) {
    onChange(list.filter(r => r.id !== id));
  }

  return (
    <ClinicalTableSection
      title={title}
      count={list.length}
      countLabel={list.length === 1 ? 'elemento' : 'elementi'}
      actions={
        <button
          className="btn-sm"
          onClick={() => { setShowAdd(v => !v); setEditId(null); setEditForm(null); }}
        >
          + Aggiungi
        </button>
      }
    >
      <div className="cts__body--padded">
        {showAdd && (
          <EsameForm
            initial={emptyForm()}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}
        <div className="cr-list">
          {sorted.length === 0 && <EmptyState msg={emptyMsg} />}
          {sorted.map(r =>
            editId === r.id && editForm ? (
              <EsameForm
                key={r.id}
                initial={editForm}
                onSave={data => handleUpdate(r.id, data)}
                onCancel={() => { setEditId(null); setEditForm(null); }}
              />
            ) : (
              <EsameRow
                key={r.id}
                r={r}
                onEdit={() => {
                  setEditId(r.id);
                  setEditForm({ data: r.data, ora: r.ora, descrizione: r.descrizione, esito: r.esito, allegati: r.allegati, note: r.note });
                  setShowAdd(false);
                }}
                onDelete={() => handleDelete(r.id)}
              />
            )
          )}
        </div>
      </div>
    </ClinicalTableSection>
  );
}

// ── Main tab component ────────────────────────────────────────────────────────

export function EsamiConsulenzeTab({ cartella, onUpdate, operatoreNome }: Props) {
  return (
    <div className="cr-tab-content">
      <div style={{ marginBottom: 8 }}>
        <h3 className="cr-tab-title" style={{ margin: 0 }}>Esami &amp; Consulenze</h3>
        <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#667085' }}>
          Le tre sezioni sono indipendenti — i dati non sono mescolati.
        </p>
      </div>

      <EsameSection
        title="Esami ematici"
        emptyMsg="Nessun esame ematico registrato."
        list={cartella.esamiEmatici ?? []}
        operatoreNome={operatoreNome}
        onChange={updated => onUpdate({ esamiEmatici: updated })}
      />

      <div style={{ marginTop: 16 }}>
        <EsameSection
          title="RX / Diagnostica per immagini"
          emptyMsg="Nessun esame strumentale / RX registrato."
          list={cartella.esamiStrumentali ?? []}
          operatoreNome={operatoreNome}
          onChange={updated => onUpdate({ esamiStrumentali: updated })}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <EsameSection
          title="Consulenze specialistiche"
          emptyMsg="Nessuna consulenza specialistica registrata."
          list={cartella.consulenze ?? []}
          operatoreNome={operatoreNome}
          onChange={updated => onUpdate({ consulenze: updated })}
        />
      </div>
    </div>
  );
}
