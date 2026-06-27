import { useState, useEffect, useCallback } from 'react';
import type { DiarioPazienteEntry, DiarioAuthorType, DiarioEntry } from '../../../types';
import { ClinicalTableSection } from './shared';
import { ClinicalTable } from './ClinicalTable';
import type { ColumnDef } from './ClinicalTable';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Constants ──────────────────────────────────────────────────────────────────

const AUTHOR_TYPE_LABELS: Record<DiarioAuthorType, string> = {
  medico: 'Medico',
  infermiere: 'Infermiere',
  oss: 'OSS',
  fisioterapista: 'Fisioterapista',
  operatore: 'Operatore',
  altro: 'Altro',
};

const AUTHOR_TYPE_BADGE: Record<DiarioAuthorType, string> = {
  medico: 'badge--indigo',
  infermiere: 'badge--blue',
  oss: 'badge--teal',
  fisioterapista: 'badge--amber',
  operatore: 'badge--gray',
  altro: 'badge--gray',
};

const PRIORITY_BADGE: Record<string, string> = {
  normale: 'badge--gray',
  importante: 'badge--amber',
  urgente: 'badge--red',
};

const PRIORITY_LABELS: Record<string, string> = {
  normale: 'Normale',
  importante: 'Importante',
  urgente: 'Urgente',
};

const STATUS_BADGE: Record<string, string> = {
  aperta: 'badge--blue',
  completata: 'badge--teal',
  da_rivedere: 'badge--amber',
};

const STATUS_LABELS: Record<string, string> = {
  aperta: 'Aperta',
  completata: 'Completata',
  da_rivedere: 'Da rivedere',
};

export const DIARIO_AUTHOR_FILTERS: { id: string; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'medico', label: 'Medico' },
  { id: 'infermiere', label: 'Infermiere' },
  { id: 'oss', label: 'OSS' },
  { id: 'fisioterapista', label: 'Fisioterapista' },
  { id: 'operatore', label: 'Operatore' },
  { id: 'altro', label: 'Altro' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function nowDT(): string {
  return new Date().toISOString().slice(0, 16);
}

function fmtDT(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// ── Legacy conversion ──────────────────────────────────────────────────────────

function convertLegacyEntries(inf?: DiarioEntry[], med?: DiarioEntry[]): DiarioPazienteEntry[] {
  const infEntries: DiarioPazienteEntry[] = (inf ?? []).map(e => ({
    id: e.id,
    patientId: '',
    authorType: 'infermiere' as DiarioAuthorType,
    authorName: e.operatore,
    title: null,
    content: e.testo,
    priority: e.priorita === 'alta' ? 'importante' : e.priorita === 'urgente' ? 'urgente' : 'normale',
    status: e.stato === 'completata' ? 'completata' : 'aperta',
    entryDateTime: `${e.data}T${e.ora}`,
    category: null,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));

  const medEntries: DiarioPazienteEntry[] = (med ?? []).map(e => ({
    id: e.id,
    patientId: '',
    authorType: 'medico' as DiarioAuthorType,
    authorName: e.operatore,
    title: e.prescrizione ? 'Con prescrizione' : null,
    content: [
      e.testo,
      e.prescrizione ? `Prescrizione: ${e.prescrizione}` : '',
      e.evoluzione ? `Evoluzione: ${e.evoluzione}` : '',
    ].filter(Boolean).join('\n'),
    priority: 'normale',
    status: 'aperta',
    entryDateTime: `${e.data}T${e.ora}`,
    category: null,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));

  return [...infEntries, ...medEntries].sort((a, b) =>
    b.entryDateTime.localeCompare(a.entryDateTime)
  );
}

// ── Form state ─────────────────────────────────────────────────────────────────

interface DiarioForm {
  authorType: DiarioAuthorType;
  authorName: string;
  title: string;
  content: string;
  priority: 'normale' | 'importante' | 'urgente';
  status: 'aperta' | 'completata' | 'da_rivedere';
  entryDateTime: string;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  pazienteId: string;
  operatoreNome: string;
  legacyInfermieristico?: DiarioEntry[];
  legacyMedico?: DiarioEntry[];
  filterBy?: string;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DiarioPazienteTab({ pazienteId, operatoreNome, legacyInfermieristico, legacyMedico, filterBy }: Props) {
  const [entries, setEntries] = useState<DiarioPazienteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<DiarioPazienteEntry | null>(null);
  const [saving, setSaving] = useState(false);

  function emptyForm(): DiarioForm {
    return {
      authorType: 'infermiere',
      authorName: operatoreNome,
      title: '',
      content: '',
      priority: 'normale',
      status: 'aperta',
      entryDateTime: nowDT(),
    };
  }

  const [form, setForm] = useState<DiarioForm>(emptyForm);
  const [editForm, setEditForm] = useState<DiarioForm>(emptyForm);

  const fetchEntries = useCallback(async () => {
    const resolvedFilter = (filterBy ?? 'tutti') as DiarioAuthorType | 'tutti';
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (resolvedFilter !== 'tutti') params.set('authorType', resolvedFilter);
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary?${params}`);
      if (!res.ok) throw new Error('Risposta non valida');
      const data = await res.json() as { entries: DiarioPazienteEntry[] };
      let allEntries = data.entries ?? [];

      // Backward compat: show legacy data if API returns nothing and no filter active
      if (allEntries.length === 0 && resolvedFilter === 'tutti') {
        const legacyEntries = convertLegacyEntries(legacyInfermieristico, legacyMedico);
        allEntries = legacyEntries;
      }

      setEntries(allEntries);
    } catch {
      setError('Errore nel caricamento del diario.');
    } finally {
      setLoading(false);
    }
  }, [pazienteId, filterBy, legacyInfermieristico, legacyMedico]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Save new entry ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorType: form.authorType,
          authorName: form.authorName.trim() || operatoreNome,
          title: form.title.trim() || null,
          content: form.content.trim(),
          priority: form.priority,
          status: form.status,
          entryDateTime: form.entryDateTime,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { entry: DiarioPazienteEntry };
      setEntries(prev => [data.entry, ...prev]);
      setForm(emptyForm());
      setShowAdd(false);
    } catch {
      setError('Errore nel salvataggio della voce.');
    } finally {
      setSaving(false);
    }
  }

  // ── Save edited entry ────────────────────────────────────────────────────────

  async function handleEditSave() {
    if (!editEntry || !editForm.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary/${editEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorType: editForm.authorType,
          authorName: editForm.authorName.trim() || operatoreNome,
          title: editForm.title.trim() || null,
          content: editForm.content.trim(),
          priority: editForm.priority,
          status: editForm.status,
          entryDateTime: editForm.entryDateTime,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { entry: DiarioPazienteEntry };
      setEntries(prev => prev.map(e => e.id === data.entry.id ? data.entry : e));
      setEditEntry(null);
    } catch {
      setError('Errore nel salvataggio della modifica.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete entry ─────────────────────────────────────────────────────────────

  async function handleDelete(entry: DiarioPazienteEntry) {
    if (!window.confirm('Eliminare questa voce del diario?')) return;
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary/${entry.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch {
      setError('Errore nella eliminazione della voce.');
    }
  }

  function startEdit(entry: DiarioPazienteEntry) {
    setEditEntry(entry);
    setEditForm({
      authorType: entry.authorType,
      authorName: entry.authorName,
      title: entry.title ?? '',
      content: entry.content,
      priority: entry.priority,
      status: entry.status,
      entryDateTime: entry.entryDateTime.slice(0, 16),
    });
    setShowAdd(false);
  }

  // Detect legacy entries (patientId is empty string)
  function isLegacy(entry: DiarioPazienteEntry): boolean {
    return entry.patientId === '';
  }

  // ── Table columns ────────────────────────────────────────────────────────────

  const columns: ColumnDef<DiarioPazienteEntry>[] = [
    {
      key: 'entryDateTime',
      label: 'Data / Ora',
      sortable: true,
      width: '130px',
      render: (_v, row) => (
        <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
          {fmtDT(row.entryDateTime)}
        </span>
      ),
    },
    {
      key: 'authorType',
      label: 'Tipo Operatore',
      width: '130px',
      render: (_v, row) => (
        <span className={`badge ${AUTHOR_TYPE_BADGE[row.authorType]}`}>
          {AUTHOR_TYPE_LABELS[row.authorType]}
        </span>
      ),
    },
    {
      key: 'authorName',
      label: 'Autore',
      width: '130px',
      render: (_v, row) => (
        <span style={{ fontSize: '0.85rem' }}>{row.authorName}</span>
      ),
    },
    {
      key: 'content',
      label: 'Titolo / Contenuto',
      render: (_v, row) => (
        <div style={{ maxWidth: 360 }}>
          {row.title && (
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>
              {row.title}
            </div>
          )}
          <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {row.content}
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priorità',
      width: '100px',
      render: (_v, row) => (
        <span className={`badge ${PRIORITY_BADGE[row.priority]}`}>
          {PRIORITY_LABELS[row.priority]}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Stato',
      width: '110px',
      render: (_v, row) => (
        <span className={`badge ${STATUS_BADGE[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Azioni',
      width: '80px',
      render: (_v, row) => {
        if (isLegacy(row)) {
          return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>legacy</span>;
        }
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="icon-btn icon-btn--sm"
              title="Modifica"
              onClick={() => startEdit(row)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              className="icon-btn icon-btn--sm icon-btn--danger"
              title="Elimina"
              onClick={() => handleDelete(row)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        );
      },
    },
  ];

  // ── Form render helper ───────────────────────────────────────────────────────

  function renderForm(
    f: DiarioForm,
    setF: (fn: (prev: DiarioForm) => DiarioForm) => void,
    onSave: () => void,
    onCancel: () => void,
    title: string,
  ) {
    return (
      <div className="cr-inline-form" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div className="form-row">
          <label className="form-label">Tipo operatore</label>
          <select
            className="form-input"
            value={f.authorType}
            onChange={e => setF(prev => ({ ...prev, authorType: e.target.value as DiarioAuthorType }))}
          >
            {Object.entries(AUTHOR_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Nome autore</label>
          <input
            className="form-input"
            type="text"
            value={f.authorName}
            onChange={e => setF(prev => ({ ...prev, authorName: e.target.value }))}
            placeholder={operatoreNome}
          />
        </div>
        <div className="form-row">
          <label className="form-label">Titolo (opzionale)</label>
          <input
            className="form-input"
            type="text"
            value={f.title}
            onChange={e => setF(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Titolo voce…"
          />
        </div>
        <div className="form-row">
          <label className="form-label">Contenuto *</label>
          <textarea
            className="form-input"
            rows={4}
            value={f.content}
            onChange={e => setF(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Descrizione, note cliniche…"
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-row">
          <label className="form-label">Priorità</label>
          <select
            className="form-input"
            value={f.priority}
            onChange={e => setF(prev => ({ ...prev, priority: e.target.value as DiarioForm['priority'] }))}
          >
            <option value="normale">Normale</option>
            <option value="importante">Importante</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Stato</label>
          <select
            className="form-input"
            value={f.status}
            onChange={e => setF(prev => ({ ...prev, status: e.target.value as DiarioForm['status'] }))}
          >
            <option value="aperta">Aperta</option>
            <option value="completata">Completata</option>
            <option value="da_rivedere">Da rivedere</option>
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Data e ora</label>
          <input
            className="form-input"
            type="datetime-local"
            value={f.entryDateTime}
            onChange={e => setF(prev => ({ ...prev, entryDateTime: e.target.value }))}
          />
        </div>
        <div className="cr-inline-form__actions">
          <button className="btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
            Annulla
          </button>
          <button className="btn-primary btn-sm" onClick={onSave} disabled={saving || !f.content.trim()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    );
  }

  // ── Actions for section header ───────────────────────────────────────────────

  const sectionActions = (
    <button
      className="btn-primary btn-sm"
      onClick={() => { setShowAdd(v => !v); setEditEntry(null); }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Aggiungi voce
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="cr-tab-content">
      {/* Error message */}
      {error && (
        <div style={{
          padding: '8px 12px', borderRadius: 6, background: 'var(--red-50, #fef2f2)',
          color: 'var(--red-700, #b91c1c)', fontSize: '0.85rem', marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      <ClinicalTableSection
        title="Diario Paziente"
        count={entries.length}
        countLabel={entries.length === 1 ? 'voce' : 'voci'}
        defaultOpen
        actions={sectionActions}
      >
        {/* Add form */}
        {showAdd && renderForm(
          form,
          setForm as (fn: (prev: DiarioForm) => DiarioForm) => void,
          handleSave,
          () => { setShowAdd(false); setForm(emptyForm()); },
          'Nuova voce diario',
        )}

        {/* Edit form */}
        {editEntry && renderForm(
          editForm,
          setEditForm as (fn: (prev: DiarioForm) => DiarioForm) => void,
          handleEditSave,
          () => setEditEntry(null),
          `Modifica voce — ${fmtDT(editEntry.entryDateTime)}`,
        )}

        {/* Table */}
        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            Caricamento…
          </div>
        ) : (
          <ClinicalTable<DiarioPazienteEntry>
            title="Diario Paziente"
            columns={columns}
            data={entries}
            keyField="id"
            emptyMessage="Nessuna voce nel diario."
            noWrapper
          />
        )}
      </ClinicalTableSection>
    </div>
  );
}
