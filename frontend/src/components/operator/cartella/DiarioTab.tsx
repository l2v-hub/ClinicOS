import { useState } from 'react';
import type { CartellaPaziente, DiarioEntry, TurnoDiario, TipoDiarioEntry, Paziente } from '../../../types';
import { uid, todayStr, nowISO, nowTime, fmtDate, PrintButton } from './shared';

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
  normale: 'badge--gray',
  alta: 'badge--amber',
  urgente: 'badge--red',
};
const STATO_INF_BADGE: Record<string, string> = {
  aperta: 'badge--blue',
  in_corso: 'badge--amber',
  completata: 'badge--green',
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

  // Form state
  const [form, setForm] = useState({
    data: todayStr(),
    ora: nowTime(),
    turno: 'mattina' as TurnoDiario,
    tipo: 'ordinario' as TipoDiarioEntry,
    testo: '',
    // infermieristico
    priorita: 'normale' as 'normale' | 'alta' | 'urgente',
    stato: 'aperta' as 'aperta' | 'in_corso' | 'completata',
    collegamento: '',
    sigla: initials(operatoreNome),
    // medico
    prescrizione: '',
    evoluzione: '',
    firmaMedico: '',
    allegati: '',
  });

  function set(f: Partial<typeof form>) { setForm(p => ({ ...p, ...f })); }

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
    setForm({
      data: todayStr(), ora: nowTime(), turno: 'mattina', tipo: 'ordinario', testo: '',
      priorita: 'normale', stato: 'aperta', collegamento: '', sigla: initials(operatoreNome),
      prescrizione: '', evoluzione: '', firmaMedico: '', allegati: '',
    });
  }

  function handleDelete(id: string) {
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
        <div className="cr-tab-header">
          <h3 className="cr-tab-title">{titolo}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-secondary btn-sm" onClick={() => setModulo(true)} title="Vista modulo cartaceo">
              Vista modulo
            </button>
            <button className="btn-primary btn-sm" onClick={() => setShowAdd(v => !v)}>
              {showAdd ? 'Annulla' : '+ Nuova voce'}
            </button>
          </div>
        </div>

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

            {/* Testo principale */}
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

        {/* ── Entries ── */}
        {filtered.length === 0 ? (
          <p className="cr-empty">Nessuna voce nel diario.</p>
        ) : (
          <div className="diario-entries">
            {filtered.map(e => {
              const prio = e.priorita ?? 'normale';
              return (
                <div key={e.id} className={`diario-entry diario-entry--${e.tipo} diario-entry--${prio}`}>
                  <div className="diario-entry__aside">
                    <div className="diario-entry__date">{fmtDate(e.data)}</div>
                    <div className="diario-entry__time">{e.ora}</div>
                    {tipo === 'infermieristico' && (
                      <span className={`badge ${TURNO_BADGE[e.turno]}`} style={{ fontSize: 11 }}>{TURNO_LABEL_FULL[e.turno]}</span>
                    )}
                  </div>
                  <div className="diario-entry__body">
                    <div className="diario-entry__header">
                      {tipo === 'infermieristico' ? (
                        <>
                          <span className={`badge ${PRIORITA_BADGE[prio]}`}>{prio}</span>
                          {e.stato && (
                            <span className={`badge ${STATO_INF_BADGE[e.stato] ?? 'badge--gray'}`}>{e.stato.replace('_', ' ')}</span>
                          )}
                        </>
                      ) : (
                        <span className={`badge ${TIPO_BADGE[e.tipo]}`}>{TIPO_LABEL[e.tipo]}</span>
                      )}
                      <span className="cr-meta">{e.operatore}</span>
                      {tipo === 'infermieristico' && e.sigla && (
                        <span className="badge badge--gray" style={{ fontFamily: 'monospace' }}>{e.sigla}</span>
                      )}
                      <button
                        className="icon-btn icon-btn--sm icon-btn--danger"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => handleDelete(e.id)}
                        title="Elimina"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>

                    {e.collegamento && tipo === 'infermieristico' && (
                      <div className="diario-entry__collegamento">Collegamento: {e.collegamento}</div>
                    )}

                    <div className="diario-entry__text">{e.testo}</div>

                    {tipo === 'medico' && e.prescrizione && (
                      <div className="diario-entry__prescrizione">
                        <strong>Prescrizione:</strong> {e.prescrizione}
                      </div>
                    )}
                    {tipo === 'medico' && e.evoluzione && (
                      <div className="diario-entry__evoluzione">
                        <strong>Evoluzione:</strong> {e.evoluzione}
                      </div>
                    )}
                    {tipo === 'medico' && e.firmaMedico && (
                      <div className="cr-meta" style={{ marginTop: 4 }}>Firma: {e.firmaMedico}</div>
                    )}
                    {tipo === 'medico' && e.allegati && (
                      <div className="diario-entry__allegati">Allegati: {e.allegati}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
