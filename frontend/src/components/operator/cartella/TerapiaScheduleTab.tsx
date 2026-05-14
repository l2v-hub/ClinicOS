import { useState, useEffect, useCallback } from 'react';
import type { Paziente, PatientTherapyAPI } from '../../../types';
import { ClinicalTableSection } from './shared';
import { ClinicalTable } from './ClinicalTable';
import type { ColumnDef } from './ClinicalTable';

const API_URL = import.meta.env.VITE_API_URL || '';

const VIA_OPTIONS = ['orale', 'IM', 'SC', 'IV', 'sublinguale', 'topico', 'al bisogno'];

const FASCE_LABELS: { key: string; boolKey: keyof PatientTherapyAPI; label: string }[] = [
  { key: 'mattina', boolKey: 'fasceMattina', label: 'Mattina' },
  { key: 'pranzo', boolKey: 'fascePranzo', label: 'Pranzo' },
  { key: 'pomeriggio', boolKey: 'fascePomeriggio', label: 'Pomeriggio' },
  { key: 'sera', boolKey: 'fasceSera', label: 'Sera' },
  { key: 'notte', boolKey: 'fasceNotte', label: 'Notte' },
];

const STATO_BADGE: Record<string, string> = {
  attiva: 'badge--green',
  sospesa: 'badge--amber',
  conclusa: 'badge--gray',
};

const TIPO_BADGE: Record<string, string> = {
  periodica: 'badge--blue',
  una_tantum: 'badge--gray',
};

const STATO_ORDER: Record<string, number> = { attiva: 0, sospesa: 1, conclusa: 2 };

interface Props {
  paziente: Paziente;
  operatoreNome: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TherapyForm {
  farmacoNome: string;
  dosaggio: string;
  viaSomministrazione: string;
  tipo: 'periodica' | 'una_tantum';
  stato: 'attiva' | 'sospesa' | 'conclusa';
  dataInizio: string;
  dataFine: string;
  fasceMattina: boolean;
  fascePranzo: boolean;
  fascePomeriggio: boolean;
  fasceSera: boolean;
  fasceNotte: boolean;
  orarioSpecifico: string;
  prescrittore: string;
  note: string;
  dataSomministrazione: string;
  orarioSomministrazione: string;
}

function emptyForm(): TherapyForm {
  return {
    farmacoNome: '', dosaggio: '', viaSomministrazione: 'orale',
    tipo: 'periodica', stato: 'attiva', dataInizio: todayStr(), dataFine: '',
    fasceMattina: true, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false,
    orarioSpecifico: '', prescrittore: '', note: '',
    dataSomministrazione: todayStr(), orarioSomministrazione: '',
  };
}

function formToPayload(form: TherapyForm, patientId: string, operatoreNome: string) {
  return {
    patientId,
    farmacoNome: form.farmacoNome,
    dosaggio: form.dosaggio,
    viaSomministrazione: form.viaSomministrazione,
    tipo: form.tipo,
    stato: form.stato,
    dataInizio: form.dataInizio,
    dataFine: form.tipo === 'periodica' && form.dataFine ? form.dataFine : null,
    fasceMattina: form.fasceMattina,
    fascePranzo: form.fascePranzo,
    fascePomeriggio: form.fascePomeriggio,
    fasceSera: form.fasceSera,
    fasceNotte: form.fasceNotte,
    orarioSpecifico: form.orarioSpecifico || null,
    prescrittore: form.prescrittore || null,
    operatoreInseritore: operatoreNome,
    note: form.note || null,
    dataSomministrazione: form.tipo === 'una_tantum' && form.dataSomministrazione ? form.dataSomministrazione : null,
    orarioSomministrazione: form.tipo === 'una_tantum' && form.orarioSomministrazione ? form.orarioSomministrazione : null,
  };
}

function therapyToForm(t: PatientTherapyAPI): TherapyForm {
  return {
    farmacoNome: t.farmacoNome,
    dosaggio: t.dosaggio,
    viaSomministrazione: t.viaSomministrazione,
    tipo: t.tipo,
    stato: t.stato,
    dataInizio: t.dataInizio,
    dataFine: t.dataFine ?? '',
    fasceMattina: t.fasceMattina,
    fascePranzo: t.fascePranzo,
    fascePomeriggio: t.fascePomeriggio,
    fasceSera: t.fasceSera,
    fasceNotte: t.fasceNotte,
    orarioSpecifico: t.orarioSpecifico ?? '',
    prescrittore: t.prescrittore ?? '',
    note: t.note ?? '',
    dataSomministrazione: t.dataSomministrazione ?? todayStr(),
    orarioSomministrazione: t.orarioSomministrazione ?? '',
  };
}

// ── ClinicalTable for therapy list ───────────────────────────────────────────

function TerapiaProgrammataTable({
  therapies,
  onEdit,
  onDelete,
}: {
  therapies: PatientTherapyAPI[];
  onEdit: (t: PatientTherapyAPI) => void;
  onDelete: (id: string) => void;
}) {
  const columns: ColumnDef<PatientTherapyAPI>[] = [
    {
      key: 'farmacoNome',
      label: 'Farmaco',
      sortable: true,
      filterable: true,
      filterType: 'text',
      render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      key: 'dosaggio',
      label: 'Dosaggio',
      sortable: true,
    },
    {
      key: 'viaSomministrazione',
      label: 'Via',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: VIA_OPTIONS.map(v => ({ value: v, label: v })),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'periodica', label: 'Periodica' },
        { value: 'una_tantum', label: 'Una tantum' },
      ],
      render: (v) => <span className={`badge ${TIPO_BADGE[v] ?? 'badge--gray'}`}>{v === 'una_tantum' ? 'una tantum' : v}</span>,
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'attiva', label: 'Attiva' },
        { value: 'sospesa', label: 'Sospesa' },
        { value: 'conclusa', label: 'Conclusa' },
      ],
      render: (v) => <span className={`badge ${STATO_BADGE[v] ?? 'badge--gray'}`}>{v}</span>,
    },
    {
      key: 'fasceMattina',
      label: 'Fasce orarie',
      render: (_v, row) => (
        <div className="fascia-chips">
          {FASCE_LABELS.filter(f => row[f.boolKey] as boolean).map(f => (
            <span key={f.key} className="fascia-chip">{f.label}</span>
          ))}
          {row.orarioSpecifico && <span className="fascia-chip">{row.orarioSpecifico}</span>}
        </div>
      ),
    },
    {
      key: 'dataInizio',
      label: 'Inizio',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (v) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      key: 'dataFine',
      label: 'Fine',
      sortable: true,
      render: (v) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'prescrittore',
      label: 'Prescrittore',
      sortable: true,
      filterable: true,
      filterType: 'text',
      render: (v) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'note',
      label: 'Note',
      render: (v) => <span style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{v ?? ''}</span>,
    },
    {
      key: 'id',
      label: '',
      width: '72px',
      render: (_v, row) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn icon-btn--sm" title="Modifica" onClick={() => onEdit(row)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="icon-btn icon-btn--sm icon-btn--danger" title="Elimina" onClick={() => onDelete(row.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <ClinicalTable<PatientTherapyAPI>
      title="Terapie programmate"
      columns={columns}
      data={therapies}
      count={therapies.length}
      countLabel="terapie"
      emptyMessage="Nessuna terapia programmata."
    />
  );
}

export function TerapiaScheduleTab({ paziente, operatoreNome }: Props) {
  const [therapies, setTherapies] = useState<PatientTherapyAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TherapyForm>(emptyForm());

  const loadTherapies = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies`);
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data: PatientTherapyAPI[] = await res.json();
      data.sort((a, b) => (STATO_ORDER[a.stato] ?? 9) - (STATO_ORDER[b.stato] ?? 9));
      setTherapies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento terapie');
    } finally {
      setLoading(false);
    }
  }, [paziente.id]);

  useEffect(() => { loadTherapies(); }, [loadTherapies]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (t: PatientTherapyAPI) => {
    setEditId(t.id);
    setForm(therapyToForm(t));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.farmacoNome.trim() || !form.dosaggio.trim() || !form.dataInizio) return;
    const payload = formToPayload(form, paziente.id, operatoreNome);
    try {
      setError('');
      if (editId) {
        const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Errore ${res.status}`);
      } else {
        const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Errore ${res.status}`);
      }
      closeForm();
      await loadTherapies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      await loadTherapies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore eliminazione');
    }
  };

  const updateForm = (patch: Partial<TherapyForm>) => setForm(prev => ({ ...prev, ...patch }));

  const activeCount = therapies.filter(t => t.stato === 'attiva').length;

  return (
    <ClinicalTableSection
      title="Terapia Programmata"
      count={activeCount}
      countLabel="terapie attive"
      actions={
        <button className="btn-primary btn-sm" onClick={openAdd}>+ Aggiungi terapia</button>
      }
    >
      {error && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#991B1B', fontSize: 13, margin: '0 12px 12px' }}>
          {error}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="terapia-sched-form">
          <div className="form-group">
            <label>Nome farmaco *</label>
            <input className="form-input" value={form.farmacoNome} placeholder="es. Paracetamolo"
              onChange={e => updateForm({ farmacoNome: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Dosaggio *</label>
            <input className="form-input" value={form.dosaggio} placeholder="es. 500 mg"
              onChange={e => updateForm({ dosaggio: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Via somministrazione</label>
            <select className="form-select" value={form.viaSomministrazione}
              onChange={e => updateForm({ viaSomministrazione: e.target.value })}>
              {VIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Stato</label>
            <select className="form-select" value={form.stato}
              onChange={e => updateForm({ stato: e.target.value as TherapyForm['stato'] })}>
              <option value="attiva">Attiva</option>
              <option value="sospesa">Sospesa</option>
              <option value="conclusa">Conclusa</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <div className="tipo-radio">
              <label>
                <input type="radio" name="terapia-tipo" value="periodica" checked={form.tipo === 'periodica'}
                  onChange={() => updateForm({ tipo: 'periodica' })} />
                Periodica
              </label>
              <label>
                <input type="radio" name="terapia-tipo" value="una_tantum" checked={form.tipo === 'una_tantum'}
                  onChange={() => updateForm({ tipo: 'una_tantum' })} />
                Una tantum
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Data inizio *</label>
            <input className="form-input" type="date" value={form.dataInizio}
              onChange={e => updateForm({ dataInizio: e.target.value })} />
          </div>
          {form.tipo === 'periodica' && (
            <div className="form-group">
              <label>Data fine</label>
              <input className="form-input" type="date" value={form.dataFine}
                onChange={e => updateForm({ dataFine: e.target.value })} />
            </div>
          )}
          {form.tipo === 'una_tantum' && (
            <>
              <div className="form-group">
                <label>Data somministrazione</label>
                <input className="form-input" type="date" value={form.dataSomministrazione}
                  onChange={e => updateForm({ dataSomministrazione: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Orario somministrazione</label>
                <input className="form-input" type="time" value={form.orarioSomministrazione}
                  onChange={e => updateForm({ orarioSomministrazione: e.target.value })} />
              </div>
            </>
          )}
          <div className="form-group form-group--full">
            <label>Fasce orarie</label>
            <div className="fascia-check">
              {FASCE_LABELS.map(f => (
                <label key={f.key}>
                  <input type="checkbox" checked={form[f.boolKey as keyof TherapyForm] as boolean}
                    onChange={e => updateForm({ [f.boolKey]: e.target.checked })} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Orario specifico</label>
            <input className="form-input" type="time" value={form.orarioSpecifico}
              onChange={e => updateForm({ orarioSpecifico: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Prescrittore</label>
            <input className="form-input" value={form.prescrittore} placeholder="Dr. ..."
              onChange={e => updateForm({ prescrittore: e.target.value })} />
          </div>
          <div className="form-group form-group--full">
            <label>Note</label>
            <textarea className="form-input" rows={2} value={form.note}
              onChange={e => updateForm({ note: e.target.value })} />
          </div>
          <div className="form-actions">
            <button className="btn-secondary btn-sm" onClick={closeForm}>Annulla</button>
            <button className="btn-primary btn-sm" onClick={handleSave}>
              {editId ? 'Aggiorna' : 'Salva'}
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</p>
      ) : (
        <TerapiaProgrammataTable
          therapies={therapies}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
    </ClinicalTableSection>
  );
}
