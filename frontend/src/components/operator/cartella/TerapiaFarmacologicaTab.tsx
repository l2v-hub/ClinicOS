import { useState, useEffect, useCallback } from 'react';
import type { Paziente, PatientTherapyAPI, TherapySlot } from '../../../types';
import { ClinicalTableSection } from './shared';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Constants ─────────────────────────────────────────────────────────────────

const VIA_OPTIONS = ['orale', 'IM', 'SC', 'IV', 'sublinguale', 'topico', 'al bisogno'];

const FASCE_LABELS: { key: string; boolKey: keyof PatientTherapyAPI; label: string }[] = [
  { key: 'mattina',    boolKey: 'fasceMattina',    label: 'Mattina'    },
  { key: 'pranzo',     boolKey: 'fascePranzo',     label: 'Pranzo'     },
  { key: 'pomeriggio', boolKey: 'fascePomeriggio', label: 'Pomeriggio' },
  { key: 'sera',       boolKey: 'fasceSera',       label: 'Sera'       },
  { key: 'notte',      boolKey: 'fasceNotte',      label: 'Notte'      },
];

const STATO_BADGE: Record<string, string> = {
  attiva: 'badge--green', sospesa: 'badge--amber', conclusa: 'badge--gray',
};

const TIPO_BADGE: Record<string, string> = {
  periodica: 'badge--blue', una_tantum: 'badge--gray',
};

const STATO_ORDER: Record<string, number> = { attiva: 0, sospesa: 1, conclusa: 2 };

// ── Types ─────────────────────────────────────────────────────────────────────

type SubTab = 'attivi' | 'programmazione' | 'giornaliere' | 'storico' | 'sospese';

interface MedAdmin {
  id: string;
  farmacoNome: string;
  farmacoDose: string;
  farmacoVia: string;
  date: string;
  fascia: string;
  ora: string;
  stato: string;
  operatoreNome?: string;
  confirmedAt?: string;
  motivo?: string;
  note?: string;
}

interface Props {
  paziente: Paziente;
  operatoreNome: string;
}

// ── Form helpers ──────────────────────────────────────────────────────────────

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

function todayStr(): string { return new Date().toISOString().slice(0, 10); }

function emptyForm(): TherapyForm {
  return {
    farmacoNome: '', dosaggio: '', viaSomministrazione: 'orale',
    tipo: 'periodica', stato: 'attiva', dataInizio: todayStr(), dataFine: '',
    fasceMattina: true, fascePranzo: false, fascePomeriggio: false,
    fasceSera: false, fasceNotte: false,
    orarioSpecifico: '', prescrittore: '', note: '',
    dataSomministrazione: todayStr(), orarioSomministrazione: '',
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

// ── Component ─────────────────────────────────────────────────────────────────

export function TerapiaFarmacologicaTab({ paziente, operatoreNome }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('attivi');
  const [therapies, setTherapies] = useState<PatientTherapyAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TherapyForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Daily view state
  const [dailyDate, setDailyDate] = useState(todayStr());
  const [dailySlots, setDailySlots] = useState<TherapySlot[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<MedAdmin[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────────

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
      setError(err instanceof Error ? err.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, [paziente.id]);

  const loadDaily = useCallback(async (date: string) => {
    try {
      setDailyLoading(true);
      const res = await fetch(`${API_URL}/therapy-slots?date=${date}`);
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const slots: TherapySlot[] = await res.json();
      setDailySlots(slots);
    } catch {
      setDailySlots([]);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_URL}/patients/${paziente.id}/medication-administrations?limit=200`);
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data: MedAdmin[] = await res.json();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [paziente.id]);

  useEffect(() => { loadTherapies(); }, [loadTherapies]);
  useEffect(() => {
    if (subTab === 'giornaliere') loadDaily(dailyDate);
  }, [subTab, dailyDate, loadDaily]);
  useEffect(() => {
    if (subTab === 'storico') loadHistory();
  }, [subTab, loadHistory]);

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const openAdd = () => { setEditId(null); setForm(emptyForm()); setShowForm(true); setSubTab('programmazione'); };
  const openEdit = (t: PatientTherapyAPI) => { setEditId(t.id); setForm(therapyToForm(t)); setShowForm(true); setSubTab('programmazione'); };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm()); };

  const handleSave = async () => {
    if (!form.farmacoNome.trim() || !form.dosaggio.trim() || !form.dataInizio) return;
    const payload = formToPayload(form, paziente.id, operatoreNome);
    try {
      setSaving(true);
      setError('');
      const url = editId
        ? `${API_URL}/patients/${paziente.id}/therapies/${editId}`
        : `${API_URL}/patients/${paziente.id}/therapies`;
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      closeForm();
      await loadTherapies();
      setSubTab('attivi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eliminare questa terapia?')) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      await loadTherapies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore eliminazione');
    }
  };

  const handleSospendi = async (t: PatientTherapyAPI) => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: 'sospesa' }),
      });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      await loadTherapies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sospensione');
    }
  };

  const handleRiattiva = async (t: PatientTherapyAPI) => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: 'attiva' }),
      });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      await loadTherapies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore riattivazione');
    }
  };

  const updateForm = (patch: Partial<TherapyForm>) => setForm(prev => ({ ...prev, ...patch }));

  // ── Derived data ──────────────────────────────────────────────────────────────

  const attive = therapies.filter(t => t.stato === 'attiva');
  const inattive = therapies.filter(t => t.stato !== 'attiva');

  // Filter daily slots for this patient
  const patientDailyAdmins = dailySlots.flatMap(slot =>
    (slot.patients ?? [])
      .filter(p => p.patientId === paziente.id)
      .flatMap(p => p.administrations.map(a => ({ ...a, slotLabel: slot.label, fascia: slot.fascia, ora: slot.ora })))
  );

  // ── Sub-tab nav ────────────────────────────────────────────────────────────────

  const SUB_TABS: { id: SubTab; label: string; count?: number }[] = [
    { id: 'attivi',         label: 'Farmaci attivi',              count: attive.length },
    { id: 'programmazione', label: 'Programmazione' },
    { id: 'giornaliere',    label: 'Somministrazioni giornaliere' },
    { id: 'storico',        label: 'Storico',                     count: history.length },
    { id: 'sospese',        label: 'Sospese/concluse',            count: inattive.length },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <ClinicalTableSection
      title="Terapia Farmacologica"
      count={attive.length}
      countLabel="farmaci attivi"
      actions={
        <button className="btn-primary btn-sm" onClick={openAdd}>+ Aggiungi farmaco</button>
      }
    >
      {error && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#991B1B', fontSize: 13, margin: '0 12px 12px' }}>
          {error}
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="tf-subtabs">
        {SUB_TABS.map(st => (
          <button
            key={st.id}
            className={`tf-subtab${subTab === st.id ? ' tf-subtab--active' : ''}`}
            onClick={() => setSubTab(st.id)}>
            {st.label}
            {st.count !== undefined && st.count > 0 && (
              <span className="tf-subtab__badge">{st.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Sub-tab: Farmaci attivi ── */}
      {subTab === 'attivi' && (
        loading ? (
          <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</p>
        ) : attive.length === 0 ? (
          <p className="cr-empty">Nessun farmaco attivo. <button className="link-btn" onClick={openAdd}>+ Aggiungi</button></p>
        ) : (
          <div className="clinicos-table-wrap">
            <table className="clinicos-table">
              <thead>
                <tr>
                  <th>Farmaco</th><th>Dosaggio</th><th>Via</th><th>Tipo</th>
                  <th>Fasce orarie</th><th>Inizio</th><th>Fine</th>
                  <th>Prescrittore</th><th></th>
                </tr>
              </thead>
              <tbody>
                {attive.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.farmacoNome}</td>
                    <td>{t.dosaggio}</td>
                    <td>{t.viaSomministrazione}</td>
                    <td><span className={`badge ${TIPO_BADGE[t.tipo] ?? 'badge--gray'}`}>{t.tipo === 'una_tantum' ? 'una tantum' : t.tipo}</span></td>
                    <td>
                      <div className="fascia-chips">
                        {FASCE_LABELS.filter(f => t[f.boolKey] as boolean).map(f => (
                          <span key={f.key} className="fascia-chip">{f.label}</span>
                        ))}
                        {t.orarioSpecifico && <span className="fascia-chip">{t.orarioSpecifico}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{t.dataInizio}</td>
                    <td style={{ fontSize: 12 }}>{t.dataFine ?? '—'}</td>
                    <td style={{ fontSize: 12 }}>{t.prescrittore ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn icon-btn--sm" title="Modifica" onClick={() => openEdit(t)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="icon-btn icon-btn--sm icon-btn--danger" title="Sospendi" onClick={() => handleSospendi(t)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                          </svg>
                        </button>
                        <button className="icon-btn icon-btn--sm icon-btn--danger" title="Elimina" onClick={() => handleDelete(t.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Sub-tab: Programmazione ── */}
      {subTab === 'programmazione' && (
        <div className="cts__body--padded">
          {showForm ? (
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
                <label>Tipo terapia</label>
                <div className="tipo-radio">
                  <label><input type="radio" name="tf-tipo" value="periodica" checked={form.tipo === 'periodica'} onChange={() => updateForm({ tipo: 'periodica' })} /> Periodica</label>
                  <label><input type="radio" name="tf-tipo" value="una_tantum" checked={form.tipo === 'una_tantum'} onChange={() => updateForm({ tipo: 'una_tantum' })} /> Una tantum</label>
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
                    <label>Orario</label>
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
                <button className="btn-primary btn-sm" disabled={saving} onClick={handleSave}>
                  {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Salva terapia'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn-primary btn-sm" style={{ marginBottom: 12 }} onClick={openAdd}>+ Nuova terapia</button>
              {loading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</p>
              ) : therapies.length === 0 ? (
                <p className="cr-empty">Nessuna terapia programmata.</p>
              ) : (
                <div className="clinicos-table-wrap">
                  <table className="clinicos-table">
                    <thead>
                      <tr>
                        <th>Farmaco</th><th>Dosaggio</th><th>Via</th><th>Stato</th>
                        <th>Tipo</th><th>Inizio</th><th>Fasce</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {therapies.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.farmacoNome}</td>
                          <td>{t.dosaggio}</td>
                          <td>{t.viaSomministrazione}</td>
                          <td><span className={`badge ${STATO_BADGE[t.stato] ?? 'badge--gray'}`}>{t.stato}</span></td>
                          <td><span className={`badge ${TIPO_BADGE[t.tipo] ?? 'badge--gray'}`}>{t.tipo === 'una_tantum' ? 'una tantum' : t.tipo}</span></td>
                          <td style={{ fontSize: 12 }}>{t.dataInizio}</td>
                          <td>
                            <div className="fascia-chips">
                              {FASCE_LABELS.filter(f => t[f.boolKey] as boolean).map(f => (
                                <span key={f.key} className="fascia-chip">{f.label}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="icon-btn icon-btn--sm" title="Modifica" onClick={() => openEdit(t)}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button className="icon-btn icon-btn--sm icon-btn--danger" title="Elimina" onClick={() => handleDelete(t.id)}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Sub-tab: Somministrazioni giornaliere ── */}
      {subTab === 'giornaliere' && (
        <div className="cts__body--padded">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Data:</label>
            <input
              className="form-input"
              type="date"
              value={dailyDate}
              style={{ width: 160 }}
              onChange={e => setDailyDate(e.target.value)}
            />
          </div>
          {dailyLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</p>
          ) : patientDailyAdmins.length === 0 ? (
            <p className="cr-empty">Nessuna somministrazione prevista per questa data.</p>
          ) : (
            <div className="clinicos-table-wrap">
              <table className="clinicos-table">
                <thead>
                  <tr>
                    <th>Farmaco</th><th>Dosaggio</th><th>Via</th>
                    <th>Fascia</th><th>Orario</th><th>Stato</th>
                    <th>Operatore</th><th>Ora conferma</th><th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {patientDailyAdmins.map((a, i) => (
                    <tr key={`${a.therapyId}-${i}`}>
                      <td style={{ fontWeight: 600 }}>{a.drugName}</td>
                      <td>{a.dosage}</td>
                      <td>{a.route}</td>
                      <td>{(a as { slotLabel?: string }).slotLabel ?? a.fascia}</td>
                      <td>{a.scheduledTime}</td>
                      <td>
                        <span className={`badge ${a.status === 'administered' ? 'badge--green' : a.status === 'not_administered' ? 'badge--red' : 'badge--amber'}`}>
                          {a.status === 'administered' ? 'Erogata' : a.status === 'not_administered' ? 'Non erogata' : 'Da erogare'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{a.administeredBy ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        {a.administeredAt ? new Date(a.administeredAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{a.notAdministeredReason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Sub-tab: Storico ── */}
      {subTab === 'storico' && (
        historyLoading ? (
          <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>Caricamento storico...</p>
        ) : history.length === 0 ? (
          <p className="cr-empty">Nessuna somministrazione registrata.</p>
        ) : (
          <div className="clinicos-table-wrap">
            <table className="clinicos-table">
              <thead>
                <tr>
                  <th>Data</th><th>Farmaco</th><th>Dose</th><th>Via</th>
                  <th>Fascia</th><th>Stato</th><th>Operatore</th><th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 12 }}>{h.date}</td>
                    <td style={{ fontWeight: 600 }}>{h.farmacoNome}</td>
                    <td>{h.farmacoDose}</td>
                    <td>{h.farmacoVia}</td>
                    <td>{h.fascia}</td>
                    <td>
                      <span className={`badge ${h.stato === 'erogata' ? 'badge--green' : h.stato === 'non_erogata' ? 'badge--red' : 'badge--amber'}`}>
                        {h.stato === 'erogata' ? 'Erogata' : h.stato === 'non_erogata' ? 'Non erogata' : 'Da erogare'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{h.operatoreNome ?? '—'}</td>
                    <td style={{ fontSize: 12 }}>{h.motivo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Sub-tab: Sospese/concluse ── */}
      {subTab === 'sospese' && (
        loading ? (
          <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</p>
        ) : inattive.length === 0 ? (
          <p className="cr-empty">Nessuna terapia sospesa o conclusa.</p>
        ) : (
          <div className="clinicos-table-wrap">
            <table className="clinicos-table">
              <thead>
                <tr>
                  <th>Farmaco</th><th>Dosaggio</th><th>Via</th><th>Stato</th>
                  <th>Inizio</th><th>Fine</th><th>Note</th><th></th>
                </tr>
              </thead>
              <tbody>
                {inattive.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.farmacoNome}</td>
                    <td>{t.dosaggio}</td>
                    <td>{t.viaSomministrazione}</td>
                    <td><span className={`badge ${STATO_BADGE[t.stato] ?? 'badge--gray'}`}>{t.stato}</span></td>
                    <td style={{ fontSize: 12 }}>{t.dataInizio}</td>
                    <td style={{ fontSize: 12 }}>{t.dataFine ?? '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note ?? ''}</td>
                    <td>
                      <button className="icon-btn icon-btn--sm" title="Riattiva" onClick={() => handleRiattiva(t)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </ClinicalTableSection>
  );
}
