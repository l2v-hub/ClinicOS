import { useState } from 'react';
import type { CartellaPaziente, DiarioEntry, TurnoDiario, TipoDiarioEntry, Paziente } from '../../../types';
import { uid, todayStr, nowISO, nowTime, fmtDate, PrintButton, ClinicalTableSection } from './shared';
import { ClinicalTable, type ColumnDef } from './ClinicalTable';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  tipo: 'infermieristico' | 'medico';
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const TURNO_LABEL: Record<TurnoDiario, string> = { mattina: 'M', pomeriggio: 'P', notte: 'N' };
const TURNO_LABEL_FULL: Record<TurnoDiario, string> = { mattina: 'Mattina', pomeriggio: 'Pomeriggio', notte: 'Notte' };
const TIPO_LABEL: Record<TipoDiarioEntry, string> = { ordinario: 'Ordinario', segnalazione: 'Segnalazione', urgente: 'Urgente' };
const TIPO_BADGE: Record<TipoDiarioEntry, string> = { ordinario: 'badge--gray', segnalazione: 'badge--amber', urgente: 'badge--red' };
const TURNO_BADGE: Record<TurnoDiario, string> = { mattina: 'badge--blue', pomeriggio: 'badge--teal', notte: 'badge--indigo' };

const PRIORITA_BADGE: Record<string, string> = {
  normale: 'consegna-priorita-badge consegna-priorita-badge--normale',
  alta: 'consegna-priorita-badge consegna-priorita-badge--alta',
  urgente: 'consegna-priorita-badge consegna-priorita-badge--urgente',
};

function fieldKey(tipo: 'infermieristico' | 'medico'): 'diarioInfermieristico' | 'diarioMedico' {
  return tipo === 'infermieristico' ? 'diarioInfermieristico' : 'diarioMedico';
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase();
}

// ── Modulo infermieristico ────────────────────────────────────────────────────

function DiarioInfModulo({ entries, paziente }: { entries: DiarioEntry[]; paziente: Paziente }) {
  const MIN_ROWS = 30;
  const EMPTY_ROWS = Math.max(0, MIN_ROWS - entries.length);
  return (
    <div className="fm">
      <div className="fm-title">DIARIO INFERMIERISTICO</div>
      <div className="fm-patient-header" style={{ gridTemplateColumns: '1fr 120px' }}>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Cognome e Nome</span>
          <span className="fm-patient-field__val">{paziente.lastName} {paziente.firstName}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Camera</span>
          <span className="fm-patient-field__val"></span>
        </div>
      </div>
      <table className="diario-modulo-table">
        <thead>
          <tr>
            <th style={{ width: 68 }}>DATA</th>
            <th style={{ width: 50 }}>TURNO</th>
            <th>NOTA / CONSEGNA</th>
            <th style={{ width: 90 }}>FIRMA</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td className="col-data">{e.data.split('-').reverse().join('/')}</td>
              <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 12 }}>{TURNO_LABEL[e.turno]}</td>
              <td className="col-testo" style={{ minHeight: 48, lineHeight: 1.8 }}>{e.testo}</td>
              <td className="col-firma">{e.sigla ?? initials(e.operatore)}</td>
            </tr>
          ))}
          {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
            <tr key={`empty-${i}`} className="empty-row">
              <td className="col-data"></td>
              <td></td>
              <td style={{ height: 48 }}></td>
              <td className="col-firma"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Modulo medico ─────────────────────────────────────────────────────────────

function DiarioMedModulo({ entries, paziente }: { entries: DiarioEntry[]; paziente: Paziente }) {
  const EMPTY_ROWS = Math.max(0, 15 - entries.length);
  return (
    <div className="fm">
      <div className="fm-title" style={{ textAlign: 'center' }}>DIARIO MEDICO</div>
      <div className="fm-patient-header cols-4">
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Cognome e Nome</span>
          <span className="fm-patient-field__val">{paziente.lastName} {paziente.firstName}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Tessera sanitaria</span>
          <span className="fm-patient-field__val">{paziente.medicalRecordNumber}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Camera</span>
          <span className="fm-patient-field__val"></span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Letto</span>
          <span className="fm-patient-field__val"></span>
        </div>
      </div>
      <table className="diario-modulo-table diario-medico-table">
        <thead>
          <tr>
            <th style={{ width: 68 }}>DATA</th>
            <th className="col-nota" style={{ minWidth: 220 }}>NOTA MEDICA</th>
            <th className="col-prescrizione" style={{ minWidth: 140 }}>PRESCRIZIONE / INDICAZIONE</th>
            <th style={{ width: 90 }}>FIRMA MEDICO</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td className="col-data" style={{ verticalAlign: 'top', paddingTop: 8 }}>
                {e.data.split('-').reverse().join('/')}<br />
                <small>{e.ora}</small>
              </td>
              <td className="col-nota col-testo" style={{ minHeight: 60, verticalAlign: 'top', paddingTop: 8 }}>
                {e.testo}
                {e.evoluzione && (
                  <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 11 }}>
                    <em>Evoluzione: {e.evoluzione}</em>
                  </div>
                )}
                {e.allegati && (
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>All: {e.allegati}</div>
                )}
              </td>
              <td className="col-prescrizione" style={{ verticalAlign: 'top', paddingTop: 8 }}>
                {e.prescrizione ?? ''}
              </td>
              <td className="col-firma" style={{ verticalAlign: 'top', paddingTop: 8 }}>
                {e.firmaMedico ?? e.operatore.split(' ').map((p: string) => p[0]).join('.')}
              </td>
            </tr>
          ))}
          {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
            <tr key={`empty-${i}`} className="empty-row">
              <td style={{ height: 60 }}></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DiarioTab({ cartella, paziente, tipo, onUpdate, operatoreNome }: Props) {
  const field = fieldKey(tipo);
  const entries: DiarioEntry[] = cartella[field] ?? [];
  const titolo = tipo === 'infermieristico' ? 'Diario Infermieristico' : 'Diario Medico';

  const [showAdd, setShowAdd] = useState(false);
  const [filterTurno, setFilterTurno] = useState<TurnoDiario | 'tutti'>('tutti');
  const [filterPriorita, setFilterPriorita] = useState<'tutte' | 'normale' | 'alta' | 'urgente'>('tutte');
  const [filterDataFrom, setFilterDataFrom] = useState('');
  const [filterDataTo, setFilterDataTo] = useState('');
  const [filterOperatore, setFilterOperatore] = useState('');
  const [modulo, setModulo] = useState(false);

  // Form state (new entry)
  const emptyForm = {
    data: todayStr(),
    ora: nowTime(),
    turno: 'mattina' as TurnoDiario,
    tipo: 'ordinario' as TipoDiarioEntry,
    testo: '',
    priorita: 'normale' as 'normale' | 'alta' | 'urgente',
    stato: 'aperta' as 'aperta' | 'in_corso' | 'completata',
    collegamento: '',
    sigla: initials(operatoreNome),
    prescrizione: '',
    evoluzione: '',
    firmaMedico: '',
    allegati: '',
  };
  const [form, setForm] = useState(emptyForm);
  function set(f: Partial<typeof form>) { setForm(p => ({ ...p, ...f })); }

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  function setEdit(f: Partial<typeof editForm>) { setEditForm(p => ({ ...p, ...f })); }

  function handleEditStart(e: DiarioEntry) {
    setShowAdd(false);
    setEditId(e.id);
    setEditForm({
      data: e.data,
      ora: e.ora,
      turno: e.turno,
      tipo: e.tipo,
      testo: e.testo,
      priorita: (e.priorita ?? 'normale') as 'normale' | 'alta' | 'urgente',
      stato: (e.stato ?? 'aperta') as 'aperta' | 'in_corso' | 'completata',
      collegamento: e.collegamento ?? '',
      sigla: e.sigla ?? initials(operatoreNome),
      prescrizione: e.prescrizione ?? '',
      evoluzione: e.evoluzione ?? '',
      firmaMedico: e.firmaMedico ?? '',
      allegati: e.allegati ?? '',
    });
  }

  function handleEditSave() {
    if (!editForm.testo.trim() || !editId) return;
    const updated = entries.map(e => {
      if (e.id !== editId) return e;
      const base = { ...e, data: editForm.data, ora: editForm.ora, turno: editForm.turno, tipo: editForm.tipo, testo: editForm.testo };
      return tipo === 'infermieristico'
        ? { ...base, priorita: editForm.priorita, stato: editForm.stato, collegamento: editForm.collegamento || undefined, sigla: editForm.sigla || initials(operatoreNome) }
        : { ...base, prescrizione: editForm.prescrizione || undefined, evoluzione: editForm.evoluzione || undefined, firmaMedico: editForm.firmaMedico || undefined, allegati: editForm.allegati || undefined };
    });
    onUpdate({ [field]: updated });
    setEditId(null);
  }

  function handleEditCancel() { setEditId(null); }

  function handleSave() {
    if (!form.testo.trim()) return;
    const base = {
      id: uid(),
      data: form.data,
      ora: form.ora,
      turno: form.turno,
      tipo: form.tipo,
      testo: form.testo,
      operatore: operatoreNome,
      createdAt: nowISO(),
    };
    const entry: DiarioEntry = tipo === 'infermieristico'
      ? {
          ...base,
          priorita: form.priorita,
          stato: form.stato,
          collegamento: form.collegamento || undefined,
          sigla: form.sigla || initials(operatoreNome),
        }
      : {
          ...base,
          prescrizione: form.prescrizione || undefined,
          evoluzione: form.evoluzione || undefined,
          firmaMedico: form.firmaMedico || undefined,
          allegati: form.allegati || undefined,
        };
    onUpdate({ [field]: [entry, ...entries] });
    setShowAdd(false);
    setForm({ ...emptyForm, data: todayStr(), ora: nowTime(), sigla: initials(operatoreNome) });
  }

  function handleDelete(id: string) {
    if (!window.confirm('Eliminare questa voce dal diario?')) return;
    onUpdate({ [field]: entries.filter(e => e.id !== id) });
  }

  const filtered = entries.filter(e => {
    if (tipo === 'infermieristico') {
      if (filterTurno !== 'tutti' && e.turno !== filterTurno) return false;
      if (filterPriorita !== 'tutte' && (e.priorita ?? 'normale') !== filterPriorita) return false;
    }
    if (filterDataFrom && e.data < filterDataFrom) return false;
    if (filterDataTo && e.data > filterDataTo) return false;
    if (filterOperatore && !e.operatore.toLowerCase().includes(filterOperatore.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>

      {/* ── Modulo view ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>← Vista operativa</button>
          <PrintButton label="Stampa modulo" />
        </div>
        {tipo === 'infermieristico'
          ? <DiarioInfModulo entries={entries} paziente={paziente} />
          : <DiarioMedModulo entries={entries} paziente={paziente} />
        }
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <ClinicalTableSection
          title={titolo}
          count={entries.length}
          countLabel="voci"
          actions={<>
            <button className="btn-sm" onClick={() => setModulo(true)} title="Vista modulo cartaceo">
              Vista modulo
            </button>
            <button className="btn-sm" onClick={() => setShowAdd(v => !v)}>
              {showAdd ? 'Annulla' : '+ Nuova voce'}
            </button>
          </>}
        >
        <div className="cts__body--padded">

        {/* ── Add form ── */}
        {showAdd && (
          <div className="cr-inline-form">
            {/* Common: data, ora, turno (inf only) */}
            <div className="form-row-3col">
              <div className="form-row">
                <label className="form-label">Data</label>
                <input type="date" className="form-input" value={form.data} onChange={e => set({ data: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Ora</label>
                <input type="time" className="form-input" value={form.ora} onChange={e => set({ ora: e.target.value })} />
              </div>
              {tipo === 'infermieristico' && (
                <div className="form-row">
                  <label className="form-label">Turno</label>
                  <select className="form-input" value={form.turno} onChange={e => set({ turno: e.target.value as TurnoDiario })}>
                    <option value="mattina">Mattina</option>
                    <option value="pomeriggio">Pomeriggio</option>
                    <option value="notte">Notte</option>
                  </select>
                </div>
              )}
            </div>

            {/* Testo principale — first for quick entry */}
            <div className="form-row">
              <label className="form-label">
                {tipo === 'infermieristico' ? 'Annotazione / Consegna' : 'Nota clinica'}
              </label>
              <textarea
                className="form-input"
                rows={5}
                value={form.testo}
                onChange={e => set({ testo: e.target.value })}
                placeholder={tipo === 'infermieristico'
                  ? 'Descrizione clinica / osservazione / consegna…'
                  : 'Nota clinica…'}
              />
            </div>

            {/* Infermieristico extras */}
            {tipo === 'infermieristico' && (
              <div className="form-row-3col">
                <div className="form-row">
                  <label className="form-label">Priorita'</label>
                  <select className="form-input" value={form.priorita} onChange={e => set({ priorita: e.target.value as typeof form.priorita })}>
                    <option value="normale">Normale</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Stato</label>
                  <select className="form-input" value={form.stato} onChange={e => set({ stato: e.target.value as typeof form.stato })}>
                    <option value="aperta">Aperta</option>
                    <option value="in_corso">In corso</option>
                    <option value="completata">Completata</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Collegamento</label>
                  <select className="form-input" value={form.collegamento} onChange={e => set({ collegamento: e.target.value })}>
                    <option value="">Nessuno</option>
                    <option value="terapia">Terapia</option>
                    <option value="medicazione">Medicazione</option>
                    <option value="parametro">Parametro</option>
                    <option value="evento">Evento</option>
                    <option value="appuntamento">Appuntamento</option>
                  </select>
                </div>
              </div>
            )}

            {/* Medico extras */}
            {tipo === 'medico' && (
              <>
                <div className="form-row">
                  <label className="form-label">Prescrizione</label>
                  <textarea className="form-input" rows={3} value={form.prescrizione} onChange={e => set({ prescrizione: e.target.value })} placeholder="Prescrizioni farmacologiche, esami…" />
                </div>
                <div className="form-row">
                  <label className="form-label">Evoluzione clinica</label>
                  <textarea className="form-input" rows={3} value={form.evoluzione} onChange={e => set({ evoluzione: e.target.value })} placeholder="Evoluzione del quadro clinico…" />
                </div>
                <div className="form-row-3col">
                  <div className="form-row">
                    <label className="form-label">Firma medico</label>
                    <input className="form-input" value={form.firmaMedico} onChange={e => set({ firmaMedico: e.target.value })} placeholder="Dr. Rossi" />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Allegati</label>
                    <input className="form-input" value={form.allegati} onChange={e => set({ allegati: e.target.value })} placeholder="Referti, immagini…" />
                  </div>
                </div>
              </>
            )}

            {/* Infermieristico: sigla */}
            {tipo === 'infermieristico' && (
              <div className="form-row" style={{ maxWidth: 160 }}>
                <label className="form-label">Sigla operatore</label>
                <input className="form-input" value={form.sigla} onChange={e => set({ sigla: e.target.value })} placeholder="XX" />
              </div>
            )}

            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={handleSave}>Salva</button>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="diario-filters">
          {tipo === 'infermieristico' && (
            <>
              {(['tutti', 'mattina', 'pomeriggio', 'notte'] as const).map(t => (
                <button key={t} className={`filter-chip${filterTurno === t ? ' active' : ''}`} onClick={() => setFilterTurno(t)}>
                  {t === 'tutti' ? 'Tutti i turni' : TURNO_LABEL_FULL[t]}
                </button>
              ))}
              <span style={{ width: 1, background: '#DDE3ED', alignSelf: 'stretch' }} />
              {(['tutte', 'normale', 'alta', 'urgente'] as const).map(p => (
                <button key={p} className={`filter-chip${filterPriorita === p ? ' active' : ''}`} onClick={() => setFilterPriorita(p)}>
                  {p === 'tutte' ? 'Tutte le priorita' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dal</label>
            <input type="date" className="form-input" style={{ width: 130, fontSize: 12, padding: '3px 6px' }}
              value={filterDataFrom} onChange={e => setFilterDataFrom(e.target.value)} />
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Al</label>
            <input type="date" className="form-input" style={{ width: 130, fontSize: 12, padding: '3px 6px' }}
              value={filterDataTo} onChange={e => setFilterDataTo(e.target.value)} />
            <input className="form-input" style={{ width: 130, fontSize: 12, padding: '3px 6px' }}
              placeholder="Filtra operatore" value={filterOperatore} onChange={e => setFilterOperatore(e.target.value)} />
            {(filterDataFrom || filterDataTo || filterOperatore || filterTurno !== 'tutti' || filterPriorita !== 'tutte') && (
              <button className="btn-secondary btn-sm" onClick={() => {
                setFilterDataFrom(''); setFilterDataTo(''); setFilterOperatore('');
                setFilterTurno('tutti'); setFilterPriorita('tutte');
              }}>Reimposta</button>
            )}
          </div>
        </div>

        {/* ── Inline edit panel ── */}
        {editId !== null && (
          <div className="cr-inline-form">
            <div className="form-row-3col">
              <div className="form-row">
                <label className="form-label">Data</label>
                <input type="date" className="form-input" value={editForm.data} onChange={e2 => setEdit({ data: e2.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Ora</label>
                <input type="time" className="form-input" value={editForm.ora} onChange={e2 => setEdit({ ora: e2.target.value })} />
              </div>
              {tipo === 'infermieristico' && (
                <div className="form-row">
                  <label className="form-label">Turno</label>
                  <select className="form-input" value={editForm.turno} onChange={e2 => setEdit({ turno: e2.target.value as TurnoDiario })}>
                    <option value="mattina">Mattina</option>
                    <option value="pomeriggio">Pomeriggio</option>
                    <option value="notte">Notte</option>
                  </select>
                </div>
              )}
            </div>
            <div className="form-row">
              <label className="form-label">{tipo === 'infermieristico' ? 'Annotazione / Consegna' : 'Nota clinica'}</label>
              <textarea className="form-input diario-edit-textarea" rows={5} value={editForm.testo} onChange={e2 => setEdit({ testo: e2.target.value })} />
            </div>
            {tipo === 'infermieristico' && (
              <div className="form-row-3col">
                <div className="form-row">
                  <label className="form-label">Priorita'</label>
                  <select className="form-input" value={editForm.priorita} onChange={e2 => setEdit({ priorita: e2.target.value as typeof editForm.priorita })}>
                    <option value="normale">Normale</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Stato</label>
                  <select className="form-input" value={editForm.stato} onChange={e2 => setEdit({ stato: e2.target.value as typeof editForm.stato })}>
                    <option value="aperta">Aperta</option>
                    <option value="in_corso">In corso</option>
                    <option value="completata">Completata</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Collegamento</label>
                  <select className="form-input" value={editForm.collegamento} onChange={e2 => setEdit({ collegamento: e2.target.value })}>
                    <option value="">Nessuno</option>
                    <option value="terapia">Terapia</option>
                    <option value="medicazione">Medicazione</option>
                    <option value="parametro">Parametro</option>
                    <option value="evento">Evento</option>
                    <option value="appuntamento">Appuntamento</option>
                  </select>
                </div>
              </div>
            )}
            {tipo === 'medico' && (
              <>
                <div className="form-row">
                  <label className="form-label">Prescrizione</label>
                  <textarea className="form-input" rows={3} value={editForm.prescrizione} onChange={e2 => setEdit({ prescrizione: e2.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Evoluzione clinica</label>
                  <textarea className="form-input" rows={3} value={editForm.evoluzione} onChange={e2 => setEdit({ evoluzione: e2.target.value })} />
                </div>
                <div className="form-row-3col">
                  <div className="form-row">
                    <label className="form-label">Firma medico</label>
                    <input className="form-input" value={editForm.firmaMedico} onChange={e2 => setEdit({ firmaMedico: e2.target.value })} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Allegati</label>
                    <input className="form-input" value={editForm.allegati} onChange={e2 => setEdit({ allegati: e2.target.value })} />
                  </div>
                </div>
              </>
            )}
            {tipo === 'infermieristico' && (
              <div className="form-row" style={{ maxWidth: 160 }}>
                <label className="form-label">Sigla operatore</label>
                <input className="form-input" value={editForm.sigla} onChange={e2 => setEdit({ sigla: e2.target.value })} />
              </div>
            )}
            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={handleEditCancel}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={handleEditSave}>Salva</button>
            </div>
          </div>
        )}

        {/* ── Entries table ── */}
        {(() => {
          const columns: ColumnDef<DiarioEntry>[] = [
            {
              key: 'data',
              label: 'Data / Ora',
              sortable: true,
              render: (_, e) => (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{fmtDate(e.data)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.ora}</div>
                </div>
              ),
            },
            ...(tipo === 'infermieristico' ? [{
              key: 'turno',
              label: 'Turno',
              sortable: true,
              filterable: true,
              filterType: 'select' as const,
              options: [
                { value: 'mattina', label: 'Mattina' },
                { value: 'pomeriggio', label: 'Pomeriggio' },
                { value: 'notte', label: 'Notte' },
              ],
              render: (_: any, e: DiarioEntry) => <span className={`badge ${TURNO_BADGE[e.turno]}`}>{TURNO_LABEL_FULL[e.turno]}</span>,
            }] : []),
            {
              key: 'tipo',
              label: tipo === 'infermieristico' ? 'Priorità' : 'Tipo',
              sortable: true,
              filterable: true,
              filterType: 'select' as const,
              options: tipo === 'infermieristico'
                ? [
                    { value: 'normale', label: 'Normale' },
                    { value: 'alta', label: 'Alta' },
                    { value: 'urgente', label: 'Urgente' },
                  ]
                : [
                    { value: 'ordinario', label: 'Ordinario' },
                    { value: 'segnalazione', label: 'Segnalazione' },
                    { value: 'urgente', label: 'Urgente' },
                  ],
              render: (_: any, e: DiarioEntry) => tipo === 'infermieristico'
                ? <span className={PRIORITA_BADGE[e.priorita ?? 'normale']}>{e.priorita ?? 'normale'}</span>
                : <span className={`badge ${TIPO_BADGE[e.tipo]}`}>{TIPO_LABEL[e.tipo]}</span>,
            },
            {
              key: 'testo',
              label: tipo === 'infermieristico' ? 'Annotazione' : 'Nota clinica',
              sortable: false,
              render: (_: any, e: DiarioEntry) => (
                <div>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>{e.testo}</div>
                  {tipo === 'medico' && e.prescrizione && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <strong>Presc:</strong> {e.prescrizione}
                    </div>
                  )}
                  {tipo === 'medico' && e.evoluzione && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <strong>Evol:</strong> {e.evoluzione}
                    </div>
                  )}
                  {tipo === 'infermieristico' && e.collegamento && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Coll: {e.collegamento}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'operatore',
              label: 'Operatore',
              sortable: true,
              filterable: true,
              filterType: 'text' as const,
              render: (_: any, e: DiarioEntry) => (
                <div>
                  <div style={{ fontSize: 12 }}>{e.operatore}</div>
                  {tipo === 'infermieristico' && e.sigla && (
                    <span className="badge badge--gray" style={{ fontFamily: 'monospace', fontSize: 10 }}>{e.sigla}</span>
                  )}
                </div>
              ),
            },
            {
              key: 'id',
              label: 'Azioni',
              sortable: false,
              width: '80px',
              render: (_: any, e: DiarioEntry) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn icon-btn--sm" onClick={() => handleEditStart(e)} title="Modifica">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => handleDelete(e.id)} title="Elimina">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ),
            },
          ];
          return (
            <ClinicalTable<DiarioEntry>
              noWrapper
              title=""
              columns={columns}
              data={filtered}
              keyField="id"
              emptyMessage="Nessuna voce nel diario."
            />
          );
        })()}
        </div>
        </ClinicalTableSection>
      </div>
    </div>
  );
}
