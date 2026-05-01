import { useState } from 'react';
import type { Camera, Letto, StatoLetto, TipoCamera } from '../../types';
import { IcoPlus, IcoEdit, IcoCheck, IcoX, IcoBed } from '../../icons';

interface RoomsManagementProps {
  camere: Camera[];
  onAddCamera: (c: Omit<Camera, 'id'>) => void;
  onUpdateCamera: (id: string, updates: Partial<Camera>) => void;
  onUpdateLetto: (cameraId: string, lettoId: string, updates: Partial<Letto>) => void;
}

const STATO_LETTO_CLASS: Record<StatoLetto, string> = {
  libero: 'letto--libero',
  occupato: 'letto--occupato',
  manutenzione: 'letto--manutenzione',
};

const STATO_LETTO_LABEL: Record<StatoLetto, string> = {
  libero: 'Libero', occupato: 'Occupato', manutenzione: 'Manutenzione',
};

const FORM_CAMERA_VUOTO = {
  numero: '', tipo: 'singola' as TipoCamera, piano: '1°', reparto: '', stato: 'attiva' as Camera['stato'], note: '',
};

export function RoomsManagement({ camere, onAddCamera, onUpdateCamera, onUpdateLetto }: RoomsManagementProps) {
  const [formAperto, setFormAperto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_CAMERA_VUOTO);
  const [lettoEdit, setLettoEdit] = useState<{ cameraId: string; lettoId: string } | null>(null);
  const [lettoForm, setLettoForm] = useState<{ stato: StatoLetto; pazienteNome: string; note: string }>({
    stato: 'libero', pazienteNome: '', note: '',
  });
  const [filtroReparto, setFiltroReparto] = useState('tutti');

  const reparti = ['tutti', ...Array.from(new Set(camere.map(c => c.reparto)))];

  const camereFiltrate = filtroReparto === 'tutti'
    ? camere
    : camere.filter(c => c.reparto === filtroReparto);

  // Stats
  const totaleLetti = camere.flatMap(c => c.letti);
  const lettiOccupati = totaleLetti.filter(l => l.stato === 'occupato').length;
  const lettiLiberi = totaleLetti.filter(l => l.stato === 'libero').length;
  const occupancyPct = totaleLetti.length > 0 ? Math.round((lettiOccupati / totaleLetti.length) * 100) : 0;

  function salvaCamera() {
    if (!form.numero.trim()) return;
    const numLetti = form.tipo === 'singola' ? 1 : 2;
    const letti: Letto[] = Array.from({ length: numLetti }, (_, i) => ({
      id: crypto.randomUUID(), numero: i + 1, stato: 'libero',
    }));
    if (editId) {
      onUpdateCamera(editId, { numero: form.numero, tipo: form.tipo, piano: form.piano, reparto: form.reparto, stato: form.stato, note: form.note });
    } else {
      onAddCamera({ ...form, letti });
    }
    setFormAperto(false);
    setEditId(null);
    setForm(FORM_CAMERA_VUOTO);
  }

  function apriModificaCamera(c: Camera) {
    setEditId(c.id);
    setForm({ numero: c.numero, tipo: c.tipo, piano: c.piano, reparto: c.reparto, stato: c.stato, note: c.note });
    setFormAperto(true);
  }

  function apriLettoEdit(cameraId: string, letto: Letto) {
    setLettoEdit({ cameraId, lettoId: letto.id });
    setLettoForm({ stato: letto.stato, pazienteNome: letto.pazienteNome ?? '', note: letto.note ?? '' });
  }

  function salvaLetto() {
    if (!lettoEdit) return;
    onUpdateLetto(lettoEdit.cameraId, lettoEdit.lettoId, {
      stato: lettoForm.stato,
      pazienteNome: lettoForm.pazienteNome || undefined,
      note: lettoForm.note || undefined,
    });
    setLettoEdit(null);
  }

  return (
    <div className="rooms-view">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Posti Letto</h2>
          <p className="view-header__sub">{camere.length} camere · {totaleLetti.length} letti</p>
        </div>
        <button className="btn-primary" onClick={() => { setFormAperto(v => !v); setEditId(null); setForm(FORM_CAMERA_VUOTO); }}>
          <IcoPlus /> Nuova camera
        </button>
      </div>

      {/* Occupancy stats */}
      <div className="occupancy-stats">
        <div className="occ-stat">
          <span className="occ-stat__val" style={{ color: 'var(--red)' }}>{lettiOccupati}</span>
          <span className="occ-stat__lbl">Occupati</span>
        </div>
        <div className="occ-stat">
          <span className="occ-stat__val" style={{ color: 'var(--emerald)' }}>{lettiLiberi}</span>
          <span className="occ-stat__lbl">Liberi</span>
        </div>
        <div className="occ-stat">
          <span className="occ-stat__val">{totaleLetti.filter(l => l.stato === 'manutenzione').length}</span>
          <span className="occ-stat__lbl">Manutenzione</span>
        </div>
        <div className="occ-stat">
          <span className="occ-stat__val">{occupancyPct}%</span>
          <span className="occ-stat__lbl">Tasso occupazione</span>
          <div className="workload-bar-track" style={{ marginTop: 6 }}>
            <div className="workload-bar-fill" style={{
              width: `${occupancyPct}%`,
              background: occupancyPct >= 90 ? 'var(--red)' : occupancyPct >= 70 ? 'var(--amber)' : 'var(--emerald)',
            }} />
          </div>
        </div>
      </div>

      {/* Form nuova/modifica camera */}
      {formAperto && (
        <div className="op-form-panel">
          <div className="op-form-panel__header">
            <h3 className="op-form-panel__title">{editId ? 'Modifica Camera' : 'Nuova Camera'}</h3>
            <button className="icon-btn" onClick={() => setFormAperto(false)}><IcoX /></button>
          </div>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">N° camera *</label>
              <input className="form-input" value={form.numero}
                onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="es. 101, PS-02" />
            </div>
            <div className="form-field">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoCamera }))}>
                <option value="singola">Singola</option>
                <option value="doppia">Doppia</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Piano</label>
              <input className="form-input" value={form.piano}
                onChange={e => setForm(p => ({ ...p, piano: e.target.value }))} placeholder="1°, PT…" />
            </div>
            <div className="form-field">
              <label className="form-label">Reparto</label>
              <input className="form-input" value={form.reparto}
                onChange={e => setForm(p => ({ ...p, reparto: e.target.value }))} placeholder="Cardiologia…" />
            </div>
            <div className="form-field">
              <label className="form-label">Stato</label>
              <select className="form-select" value={form.stato}
                onChange={e => setForm(p => ({ ...p, stato: e.target.value as Camera['stato'] }))}>
                <option value="attiva">Attiva</option>
                <option value="inattiva">Inattiva</option>
              </select>
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 8 }}>
            <label className="form-label">Note</label>
            <input className="form-input" value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Note sulla camera…" />
          </div>
          <div className="op-form-panel__actions">
            <button className="btn-secondary" onClick={() => setFormAperto(false)}>Annulla</button>
            <button className="btn-primary" onClick={salvaCamera}><IcoCheck /> {editId ? 'Salva modifiche' : 'Crea camera'}</button>
          </div>
        </div>
      )}

      {/* Letto edit modal */}
      {lettoEdit && (
        <div className="modal-overlay" onClick={() => setLettoEdit(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Modifica Letto</h3>
              <button className="icon-btn" onClick={() => setLettoEdit(null)}><IcoX /></button>
            </div>
            <div className="modal-body">
              <div className="op-form-grid">
                <div className="form-field">
                  <label className="form-label">Stato</label>
                  <select className="form-select" value={lettoForm.stato}
                    onChange={e => setLettoForm(p => ({ ...p, stato: e.target.value as StatoLetto }))}>
                    <option value="libero">Libero</option>
                    <option value="occupato">Occupato</option>
                    <option value="manutenzione">Manutenzione</option>
                  </select>
                </div>
                {lettoForm.stato === 'occupato' && (
                  <div className="form-field">
                    <label className="form-label">Paziente</label>
                    <input className="form-input" value={lettoForm.pazienteNome}
                      onChange={e => setLettoForm(p => ({ ...p, pazienteNome: e.target.value }))}
                      placeholder="Cognome, Nome" />
                  </div>
                )}
                <div className="form-field">
                  <label className="form-label">Note</label>
                  <input className="form-input" value={lettoForm.note}
                    onChange={e => setLettoForm(p => ({ ...p, note: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setLettoEdit(null)}>Annulla</button>
              <button className="btn-primary" onClick={salvaLetto}><IcoCheck /> Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Filtro reparto */}
      <div className="filter-chips" style={{ marginBottom: 16 }}>
        {reparti.map(r => (
          <button key={r}
            className={`filter-chip${filtroReparto === r ? ' active' : ''}`}
            onClick={() => setFiltroReparto(r)}>
            {r === 'tutti' ? 'Tutti i reparti' : r}
          </button>
        ))}
      </div>

      {/* Camere grid */}
      <div className="rooms-grid">
        {camereFiltrate.map(cam => {
          const occupati = cam.letti.filter(l => l.stato === 'occupato').length;
          return (
            <div key={cam.id} className={`room-card${cam.stato === 'inattiva' ? ' room-card--inactive' : ''}`}>
              <div className="room-card__header">
                <div className="room-number-badge">
                  <IcoBed />
                  <span>{cam.numero}</span>
                </div>
                <div className="room-card__info">
                  <span className="room-tipo">{cam.tipo}</span>
                  <span className="room-piano">{cam.piano} · {cam.reparto}</span>
                </div>
                <div className="room-occupancy-indicator">
                  <span style={{ color: occupati === cam.letti.length ? 'var(--red)' : 'var(--emerald)', fontWeight: 700 }}>
                    {occupati}/{cam.letti.length}
                  </span>
                </div>
                <button className="icon-btn icon-btn--sm" onClick={() => apriModificaCamera(cam)} title="Modifica camera">
                  <IcoEdit />
                </button>
              </div>

              {cam.note && <p className="room-note">{cam.note}</p>}

              <div className="letti-list">
                {cam.letti.map(letto => (
                  <div key={letto.id} className={`letto-row ${STATO_LETTO_CLASS[letto.stato]}`}>
                    <span className="letto-num">Letto {letto.numero}</span>
                    <span className={`letto-stato-badge letto-stato--${letto.stato}`}>
                      {STATO_LETTO_LABEL[letto.stato]}
                    </span>
                    {letto.pazienteNome && <span className="letto-paziente">{letto.pazienteNome}</span>}
                    {letto.note && <span className="letto-note">{letto.note}</span>}
                    <button className="icon-btn icon-btn--sm" onClick={() => apriLettoEdit(cam.id, letto)} title="Modifica letto">
                      <IcoEdit />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
