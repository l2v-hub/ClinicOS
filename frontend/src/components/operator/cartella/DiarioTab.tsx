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

function fieldKey(tipo: 'infermieristico' | 'medico'): 'diarioInfermieristico' | 'diarioMedico' {
  return tipo === 'infermieristico' ? 'diarioInfermieristico' : 'diarioMedico';
}

// ── Modulo paper view ─────────────────────────────────────────────────────

function DiarioModulo({ entries, paziente, tipo }: {
  entries: DiarioEntry[]; paziente: Paziente; tipo: 'infermieristico' | 'medico';
}) {
  const titolo = tipo === 'infermieristico' ? 'DIARIO INFERMIERISTICO' : 'DIARIO CLINICO';
  const EMPTY_ROWS = Math.max(0, 12 - entries.length);

  return (
    <div className="fm">
      <div className="fm-title">{titolo}</div>

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

      <table className="diario-modulo-table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>DATA</th>
            {tipo === 'infermieristico' && <th style={{ width: 50 }}>TURNO</th>}
            <th>ANNOTAZIONI</th>
            <th style={{ width: 90 }}>FIRMA</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td className="col-data">{e.data.split('-').reverse().join('/')}<br /><small>{e.ora}</small></td>
              {tipo === 'infermieristico' && <td className="col-turno" style={{ fontWeight: 700 }}>{TURNO_LABEL[e.turno]}</td>}
              <td className="col-testo">{e.testo}</td>
              <td className="col-firma">{e.operatore.split(' ').map((p: string) => p[0]).join('.')}</td>
            </tr>
          ))}
          {/* Empty rows for pen-filling */}
          {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
            <tr key={`empty-${i}`} className="empty-row">
              <td className="col-data"></td>
              {tipo === 'infermieristico' && <td className="col-turno"></td>}
              <td className="col-testo" style={{ height: 40 }}></td>
              <td className="col-firma"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function DiarioTab({ cartella, paziente, tipo, onUpdate, operatoreNome }: Props) {
  const field = fieldKey(tipo);
  const entries: DiarioEntry[] = cartella[field] ?? [];
  const titolo = tipo === 'infermieristico' ? 'Diario Infermieristico' : 'Diario Medico';

  const [showAdd, setShowAdd] = useState(false);
  const [filterTurno, setFilterTurno] = useState<TurnoDiario | 'tutti'>('tutti');
  const [modulo, setModulo] = useState(false);
  const [form, setForm] = useState({
    data: todayStr(), ora: nowTime(),
    turno: 'mattina' as TurnoDiario, tipo: 'ordinario' as TipoDiarioEntry,
    testo: '',
  });

  function set(f: Partial<typeof form>) { setForm(p => ({ ...p, ...f })); }

  function handleSave() {
    if (!form.testo.trim()) return;
    const entry: DiarioEntry = {
      id: uid(), data: form.data, ora: form.ora,
      turno: form.turno, tipo: form.tipo, testo: form.testo,
      operatore: operatoreNome, createdAt: nowISO(),
    };
    onUpdate({ [field]: [entry, ...entries] });
    setShowAdd(false);
    setForm({ data: todayStr(), ora: nowTime(), turno: 'mattina', tipo: 'ordinario', testo: '' });
  }

  function handleDelete(id: string) {
    onUpdate({ [field]: entries.filter(e => e.id !== id) });
  }

  const filtered = filterTurno === 'tutti' ? entries : entries.filter(e => e.turno === filterTurno);

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>

      {/* ── Modulo view ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>← Vista operativa</button>
          <PrintButton label="Stampa modulo" />
        </div>
        <DiarioModulo entries={entries} paziente={paziente} tipo={tipo} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <div className="cr-tab-header">
          <h3 className="cr-tab-title">{titolo}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-secondary btn-sm" onClick={() => setModulo(true)} title="Vista modulo cartaceo">📋 Vista modulo</button>
            <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Nuova voce</button>
          </div>
        </div>

        {tipo === 'infermieristico' && (
          <div className="diario-filters">
            {(['tutti', 'mattina', 'pomeriggio', 'notte'] as const).map(t => (
              <button key={t} className={`filter-chip${filterTurno === t ? ' active' : ''}`} onClick={() => setFilterTurno(t)}>
                {t === 'tutti' ? 'Tutti i turni' : TURNO_LABEL_FULL[t]}
              </button>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="cr-inline-form">
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
            <div className="form-row">
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: 16 }}>
                {(['ordinario', 'segnalazione', 'urgente'] as TipoDiarioEntry[]).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input type="radio" name="tipo-entry" checked={form.tipo === t} onChange={() => set({ tipo: t })} />
                    {TIPO_LABEL[t]}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Annotazione</label>
              <textarea className="form-input" rows={5} value={form.testo} onChange={e => set({ testo: e.target.value })} placeholder="Descrizione clinica / osservazione…" />
            </div>
            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={handleSave}>Salva</button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="cr-empty">Nessuna voce nel diario.</p>
        ) : (
          <div className="diario-entries">
            {filtered.map(e => (
              <div key={e.id} className={`diario-entry diario-entry--${e.tipo}`}>
                <div className="diario-entry__aside">
                  <div className="diario-entry__date">{fmtDate(e.data)}</div>
                  <div className="diario-entry__time">{e.ora}</div>
                  {tipo === 'infermieristico' && (
                    <span className={`badge ${TURNO_BADGE[e.turno]}`} style={{ fontSize: 11 }}>{TURNO_LABEL_FULL[e.turno]}</span>
                  )}
                </div>
                <div className="diario-entry__body">
                  <div className="diario-entry__header">
                    <span className={`badge ${TIPO_BADGE[e.tipo]}`}>{TIPO_LABEL[e.tipo]}</span>
                    <span className="cr-meta">{e.operatore}</span>
                    <button className="icon-btn icon-btn--sm icon-btn--danger" style={{ marginLeft: 'auto' }} onClick={() => handleDelete(e.id)} title="Elimina">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="diario-entry__text">{e.testo}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
