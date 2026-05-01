import { useState } from 'react';
import type { Operatore, ScheduleOperatore, GiornoSettimana } from '../../types';
import { GIORNI_SETTIMANA, GIORNO_LABEL } from '../../types';
import { IcoEdit, IcoCheck, IcoX, IcoClock } from '../../icons';

interface OperatorScheduleProps {
  operatori: Operatore[];
  schedules: ScheduleOperatore[];
  onSave: (s: ScheduleOperatore) => void;
}

const ORA_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  ['00','30'].map(m => `${String(h).padStart(2,'0')}:${m}`)
).flat();

export function OperatorSchedule({ operatori, schedules, onSave }: OperatorScheduleProps) {
  const [selectedOpId, setSelectedOpId] = useState<string>(operatori[0]?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduleOperatore | null>(null);

  const attivi = operatori.filter(o => o.stato === 'attivo');
  const selectedOp = attivi.find(o => o.id === selectedOpId);
  const schedule = schedules.find(s => s.operatoreId === selectedOpId);

  function startEdit() {
    const base = schedule ?? {
      id: crypto.randomUUID(),
      operatoreId: selectedOpId,
      note: '',
      turni: GIORNI_SETTIMANA.map(g => ({
        giorno: g,
        oraInizio: '08:00',
        oraFine: '16:00',
        disponibile: g !== 'sabato' && g !== 'domenica',
      })),
    };
    setEditSchedule({ ...base, turni: base.turni.map(t => ({ ...t })) });
    setEditing(true);
  }

  function toggleGiorno(giorno: GiornoSettimana) {
    if (!editSchedule) return;
    setEditSchedule(s => s ? {
      ...s,
      turni: s.turni.map(t => t.giorno === giorno ? { ...t, disponibile: !t.disponibile } : t),
    } : s);
  }

  function updateOrario(giorno: GiornoSettimana, field: 'oraInizio' | 'oraFine', val: string) {
    if (!editSchedule) return;
    setEditSchedule(s => s ? {
      ...s,
      turni: s.turni.map(t => t.giorno === giorno ? { ...t, [field]: val } : t),
    } : s);
  }

  function salva() {
    if (editSchedule) onSave(editSchedule);
    setEditing(false);
    setEditSchedule(null);
  }

  const displaySchedule = editing ? editSchedule : schedule;

  return (
    <div className="schedule-view">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Orari Operatori</h2>
          <p className="view-header__sub">Gestione turni e disponibilità</p>
        </div>
      </div>

      {/* Operator selector */}
      <div className="schedule-op-selector">
        {attivi.map(op => (
          <button
            key={op.id}
            className={`schedule-op-btn${selectedOpId === op.id ? ' active' : ''}`}
            style={selectedOpId === op.id ? { borderColor: op.colore, background: op.colore + '18' } : {}}
            onClick={() => { setSelectedOpId(op.id); setEditing(false); setEditSchedule(null); }}
          >
            <span className="op-color-dot" style={{ background: op.colore }} />
            <span className="op-avatar-sm" style={{ width: 28, height: 28, fontSize: 10 }}>{op.iniziali}</span>
            <span>{op.cognome} {op.nome}</span>
          </button>
        ))}
      </div>

      {selectedOp && (
        <div className="schedule-card">
          <div className="schedule-card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="op-color-dot" style={{ background: selectedOp.colore, width: 12, height: 12 }} />
              <span style={{ fontWeight: 700 }}>{selectedOp.cognome} {selectedOp.nome}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selectedOp.ruolo} · {selectedOp.reparto}</span>
            </div>
            {!editing ? (
              <button className="btn-secondary btn-sm" onClick={startEdit}>
                <IcoEdit /> Modifica orari
              </button>
            ) : (
              <div className="table-actions">
                <button className="btn-primary btn-sm" onClick={salva}><IcoCheck /> Salva</button>
                <button className="btn-secondary btn-sm" onClick={() => { setEditing(false); setEditSchedule(null); }}>
                  <IcoX /> Annulla
                </button>
              </div>
            )}
          </div>

          {displaySchedule ? (
            <>
              <div className="schedule-grid">
                {GIORNI_SETTIMANA.map(giorno => {
                  const turno = displaySchedule.turni.find(t => t.giorno === giorno);
                  if (!turno) return null;
                  return (
                    <div key={giorno} className={`schedule-day${turno.disponibile ? ' schedule-day--active' : ' schedule-day--off'}`}>
                      <div className="schedule-day__header">
                        <span className="schedule-day__name">{GIORNO_LABEL[giorno]}</span>
                        {editing && (
                          <button
                            className={`filter-chip${turno.disponibile ? ' active' : ''}`}
                            style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                            onClick={() => toggleGiorno(giorno)}
                          >
                            {turno.disponibile ? 'On' : 'Off'}
                          </button>
                        )}
                        {!editing && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                            background: turno.disponibile ? 'var(--emerald-bg)' : 'var(--divider)',
                            color: turno.disponibile ? 'var(--emerald)' : 'var(--text-muted)',
                          }}>
                            {turno.disponibile ? 'Disp.' : 'Off'}
                          </span>
                        )}
                      </div>
                      {turno.disponibile && (
                        <div className="schedule-day__times">
                          {editing ? (
                            <>
                              <select className="form-select" style={{ height: 32, fontSize: 12, padding: '0 6px' }}
                                value={turno.oraInizio}
                                onChange={e => updateOrario(giorno, 'oraInizio', e.target.value)}>
                                {ORA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>
                              <select className="form-select" style={{ height: 32, fontSize: 12, padding: '0 6px' }}
                                value={turno.oraFine}
                                onChange={e => updateOrario(giorno, 'oraFine', e.target.value)}>
                                {ORA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </>
                          ) : (
                            <span className="schedule-time-range">
                              <IcoClock />
                              {turno.oraInizio} – {turno.oraFine}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {editing && (
                <div className="form-field" style={{ marginTop: 14 }}>
                  <label className="form-label">Note</label>
                  <input className="form-input" value={editSchedule?.note ?? ''}
                    onChange={e => setEditSchedule(s => s ? { ...s, note: e.target.value } : s)}
                    placeholder="Note sull'orario…" />
                </div>
              )}
              {!editing && displaySchedule.note && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
                  Nota: {displaySchedule.note}
                </p>
              )}
            </>
          ) : (
            <div className="empty-state-card" style={{ marginTop: 16 }}>
              Nessun orario configurato.{' '}
              <button className="link-btn" onClick={startEdit}>Imposta orario</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
