import { useState, useEffect, useCallback } from 'react';
import { IcoPlus, IcoEdit, IcoCheck, IcoX, IcoBed } from '../../icons';
import { API_URL } from '../../config';
import { ClinicalTableSection } from '../operator/cartella/shared';
import { ConfirmDialog } from '../shared/ConfirmDialog';

/* ── API types ─────────────────────────────────────────── */

interface AssignmentAPI {
  id: string;
  patientId: string;
  startDate: string;
  endDate: string | null;
  patient: { firstName: string; lastName: string };
}

interface BedAPI {
  id: string;
  roomId: string;
  label: string;
  stato: string;
  note: string;
  assignments: AssignmentAPI[];
}

interface RoomAPI {
  id: string;
  numero: string;
  tipo: 'singola' | 'doppia' | 'altra';
  piano: string;
  reparto: string;
  stato: 'attiva' | 'inattiva' | 'manutenzione';
  note: string;
  beds: BedAPI[];
}

interface OccupancyAPI {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  maintenanceBeds: number;
  occupancyPct: number;
}

/* ── Helpers ───────────────────────────────────────────── */

type StatoLetto = 'libero' | 'occupato' | 'manutenzione';
type TipoCamera = 'singola' | 'doppia' | 'altra';
type StatoCamera = 'attiva' | 'inattiva' | 'manutenzione';

const STATO_LETTO_CLASS: Record<StatoLetto, string> = {
  libero: 'letto--libero',
  occupato: 'letto--occupato',
  manutenzione: 'letto--manutenzione',
};

const STATO_LETTO_LABEL: Record<StatoLetto, string> = {
  libero: 'Libero',
  occupato: 'Occupato',
  manutenzione: 'Manutenzione',
};

const FORM_CAMERA_VUOTO = {
  numero: '',
  tipo: 'singola' as TipoCamera,
  piano: '1°',
  reparto: '',
  stato: 'attiva' as StatoCamera,
  note: '',
};

function bedIsOccupied(bed: BedAPI): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return bed.assignments.some((a) => a.endDate === null || a.endDate >= today);
}

function bedStatoDisplay(bed: BedAPI): StatoLetto {
  if (bed.stato === 'manutenzione') return 'manutenzione';
  if (bedIsOccupied(bed)) return 'occupato';
  return 'libero';
}

function bedPatientName(bed: BedAPI): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const active = bed.assignments.find((a) => a.endDate === null || a.endDate >= today);
  if (!active) return null;
  return `${active.patient.lastName}, ${active.patient.firstName}`;
}

/* ── Component ─────────────────────────────────────────── */

export function RoomsManagement() {
  const [rooms, setRooms] = useState<RoomAPI[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formAperto, setFormAperto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_CAMERA_VUOTO);
  const [saving, setSaving] = useState(false);

  const [lettoEdit, setLettoEdit] = useState<{ bedId: string } | null>(null);
  const [lettoForm, setLettoForm] = useState<{ stato: string; note: string }>({
    stato: 'libero',
    note: '',
  });

  const [filtroReparto, setFiltroReparto] = useState('tutti');

  /* ── Data loading ─────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [roomsRes, occRes] = await Promise.all([
        fetch(`${API_URL}/admin/rooms`),
        fetch(`${API_URL}/admin/rooms/occupancy`),
      ]);
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (occRes.ok) setOccupancy(await occRes.json());
    } catch {
      /* silently fail, keep existing data */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Derived data ─────────────────────────────────────── */

  const reparti = ['tutti', ...Array.from(new Set(rooms.map((r) => r.reparto).filter(Boolean)))];

  const roomsFiltrate =
    filtroReparto === 'tutti' ? rooms : rooms.filter((r) => r.reparto === filtroReparto);

  /* ── Room CRUD ────────────────────────────────────────── */

  async function salvaCamera() {
    if (!form.numero.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const url = editId ? `${API_URL}/admin/rooms/${editId}` : `${API_URL}/admin/rooms`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: form.numero,
          tipo: form.tipo,
          piano: form.piano,
          reparto: form.reparto,
          stato: form.stato,
          note: form.note,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Errore nel ${editId ? 'salvataggio' : 'creazione'} della camera`);
        return;
      }
      setFormAperto(false);
      setEditId(null);
      setForm(FORM_CAMERA_VUOTO);
      await loadData();
    } catch {
      setError('Errore di rete durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  const [pendingRoom, setPendingRoom] = useState<RoomAPI | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  async function eliminaCamera(roomId: string) {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/rooms/${roomId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setError(data.error || 'Impossibile eliminare: ci sono assegnazioni attive');
        } else {
          setError(data.error || "Errore durante l'eliminazione");
        }
        return;
      }
      await loadData();
    } catch {
      setError("Errore di rete durante l'eliminazione");
    }
  }

  async function confirmDeleteRoom() {
    if (!pendingRoom) return;
    setDeletingRoom(true);
    await eliminaCamera(pendingRoom.id);
    setDeletingRoom(false);
    setPendingRoom(null);
  }

  function apriModificaCamera(room: RoomAPI) {
    setEditId(room.id);
    setForm({
      numero: room.numero,
      tipo: room.tipo,
      piano: room.piano,
      reparto: room.reparto,
      stato: room.stato,
      note: room.note,
    });
    setFormAperto(true);
  }

  /* ── Bed edit ─────────────────────────────────────────── */

  function apriLettoEdit(bed: BedAPI) {
    setLettoEdit({ bedId: bed.id });
    setLettoForm({ stato: bed.stato, note: bed.note ?? '' });
  }

  async function salvaLetto() {
    if (!lettoEdit) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/beds/${lettoEdit.bedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stato: lettoForm.stato,
          note: lettoForm.note || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Errore nel salvataggio del letto');
        return;
      }
      setLettoEdit(null);
      await loadData();
    } catch {
      setError('Errore di rete durante il salvataggio del letto');
    }
  }

  /* ── Render ───────────────────────────────────────────── */

  if (loading) {
    return (
      <div
        className="rooms-view"
        style={{ display: 'flex', justifyContent: 'center', padding: 48 }}
      >
        <span>Caricamento...</span>
      </div>
    );
  }

  const occ = occupancy;

  return (
    <div className="rooms-view">
      <div className="view-header">
        <div>
          <h2 className="view-header__title">Posti Letto</h2>
          <p className="view-header__sub">
            {occ ? `${occ.totalRooms} camere · ${occ.totalBeds} letti` : `${rooms.length} camere`}
          </p>
        </div>
        <button
          className="btn-success"
          style={{ minHeight: 44 }}
          onClick={() => {
            setFormAperto((v) => !v);
            setEditId(null);
            setForm(FORM_CAMERA_VUOTO);
          }}
        >
          <IcoPlus /> Nuova camera
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div
          className="alert alert--error"
          style={{
            marginBottom: 16,
            padding: '10px 16px',
            background: 'var(--red-bg, #fef2f2)',
            border: '1px solid var(--red, #ef4444)',
            borderRadius: 8,
            color: 'var(--red, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>{error}</span>
          <button className="icon-btn" onClick={() => setError(null)}>
            <IcoX />
          </button>
        </div>
      )}

      {/* Occupancy stats */}
      <div className="occupancy-stats">
        <div className="occ-stat">
          <span className="occ-stat__val" style={{ color: 'var(--red)' }}>
            {occ?.occupiedBeds ?? 0}
          </span>
          <span className="occ-stat__lbl">Occupati</span>
        </div>
        <div className="occ-stat">
          <span className="occ-stat__val" style={{ color: 'var(--emerald)' }}>
            {occ?.freeBeds ?? 0}
          </span>
          <span className="occ-stat__lbl">Liberi</span>
        </div>
        <div className="occ-stat">
          <span className="occ-stat__val">{occ?.maintenanceBeds ?? 0}</span>
          <span className="occ-stat__lbl">Manutenzione</span>
        </div>
        <div className="occ-stat">
          <span className="occ-stat__val">{occ?.occupancyPct ?? 0}%</span>
          <span className="occ-stat__lbl">Tasso occupazione</span>
          <div className="workload-bar-track" style={{ marginTop: 6 }}>
            <div
              className="workload-bar-fill"
              style={{
                width: `${occ?.occupancyPct ?? 0}%`,
                background:
                  (occ?.occupancyPct ?? 0) >= 90
                    ? 'var(--red)'
                    : (occ?.occupancyPct ?? 0) >= 70
                      ? 'var(--amber)'
                      : 'var(--emerald)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Room form */}
      {formAperto && (
        <div className="op-form-panel">
          <div className="op-form-panel__header">
            <h3 className="op-form-panel__title">{editId ? 'Modifica Camera' : 'Nuova Camera'}</h3>
            <button className="icon-btn" onClick={() => setFormAperto(false)}>
              <IcoX />
            </button>
          </div>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">N° camera *</label>
              <input
                className="form-input"
                value={form.numero}
                onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                placeholder="es. 101, PS-02"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as TipoCamera }))}
              >
                <option value="singola">Singola</option>
                <option value="doppia">Doppia</option>
                <option value="altra">Altra</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Piano</label>
              <input
                className="form-input"
                value={form.piano}
                onChange={(e) => setForm((p) => ({ ...p, piano: e.target.value }))}
                placeholder="1°, PT…"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Reparto</label>
              <input
                className="form-input"
                value={form.reparto}
                onChange={(e) => setForm((p) => ({ ...p, reparto: e.target.value }))}
                placeholder="Cardiologia…"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Stato</label>
              <select
                className="form-select"
                value={form.stato}
                onChange={(e) => setForm((p) => ({ ...p, stato: e.target.value as StatoCamera }))}
              >
                <option value="attiva">Attiva</option>
                <option value="inattiva">Inattiva</option>
                <option value="manutenzione">Manutenzione</option>
              </select>
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 8 }}>
            <label className="form-label">Note</label>
            <input
              className="form-input"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Note sulla camera…"
            />
          </div>
          <div className="op-form-panel__actions">
            <button
              className="btn-secondary"
              style={{ minHeight: 44 }}
              onClick={() => setFormAperto(false)}
            >
              Annulla
            </button>
            <button
              className="btn-success"
              style={{ minHeight: 44 }}
              onClick={salvaCamera}
              disabled={saving}
            >
              <IcoCheck /> {saving ? 'Salvataggio…' : editId ? 'Salva modifiche' : 'Crea camera'}
            </button>
          </div>
        </div>
      )}

      {/* Bed edit modal */}
      {lettoEdit && (
        <div className="modal-overlay" onClick={() => setLettoEdit(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Modifica Letto</h3>
              <button className="icon-btn" onClick={() => setLettoEdit(null)}>
                <IcoX />
              </button>
            </div>
            <div className="modal-body">
              <div className="op-form-grid">
                <div className="form-field">
                  <label className="form-label">Stato</label>
                  <select
                    className="form-select"
                    value={lettoForm.stato}
                    onChange={(e) => setLettoForm((p) => ({ ...p, stato: e.target.value }))}
                  >
                    <option value="libero">Libero</option>
                    <option value="occupato">Occupato</option>
                    <option value="manutenzione">Manutenzione</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Note</label>
                  <input
                    className="form-input"
                    value={lettoForm.note}
                    onChange={(e) => setLettoForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                style={{ minHeight: 44 }}
                onClick={() => setLettoEdit(null)}
              >
                Annulla
              </button>
              <button className="btn-success" style={{ minHeight: 44 }} onClick={salvaLetto}>
                <IcoCheck /> Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtro reparto */}
      <div className="filter-chips" style={{ marginBottom: 16 }}>
        {reparti.map((r) => (
          <button
            key={r}
            className={`filter-chip${filtroReparto === r ? ' active' : ''}`}
            style={{ minHeight: 44 }}
            onClick={() => setFiltroReparto(r)}
          >
            {r === 'tutti' ? 'Tutti i reparti' : r}
          </button>
        ))}
      </div>

      {/* Rooms grid */}
      <ClinicalTableSection title="Camere" count={roomsFiltrate.length} countLabel="camere">
        <div className="rooms-grid">
          {roomsFiltrate.map((room) => {
            const occupati = room.beds.filter((b) => bedStatoDisplay(b) === 'occupato').length;
            return (
              <div
                key={room.id}
                className={`room-card${room.stato === 'inattiva' ? ' room-card--inactive' : ''}${room.stato === 'manutenzione' ? ' room-card--inactive' : ''}`}
              >
                <div className="room-card__header">
                  <div className="room-number-badge">
                    <IcoBed />
                    <span>{room.numero}</span>
                  </div>
                  <div className="room-card__info">
                    <span className="room-tipo">{room.tipo}</span>
                    <span className="room-piano">
                      {room.piano} · {room.reparto}
                    </span>
                  </div>
                  <div className="room-occupancy-indicator">
                    <span
                      style={{
                        color: occupati === room.beds.length ? 'var(--red)' : 'var(--emerald)',
                        fontWeight: 700,
                      }}
                    >
                      {occupati}/{room.beds.length}
                    </span>
                  </div>
                  <button
                    className="icon-btn icon-btn--sm icon-btn--edit"
                    style={{ minHeight: 44, minWidth: 44 }}
                    onClick={() => apriModificaCamera(room)}
                    title="Modifica camera"
                  >
                    <IcoEdit />
                  </button>
                  <button
                    className="icon-btn icon-btn--sm"
                    style={{ minHeight: 44, minWidth: 44, color: 'var(--red)' }}
                    onClick={() => setPendingRoom(room)}
                    title="Elimina camera"
                  >
                    <IcoX />
                  </button>
                </div>

                {room.note && <p className="room-note">{room.note}</p>}
                {room.stato === 'manutenzione' && (
                  <p className="room-note" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                    In manutenzione
                  </p>
                )}

                <div className="letti-list">
                  {room.beds.map((bed) => {
                    const stato = bedStatoDisplay(bed);
                    const patientName = bedPatientName(bed);
                    return (
                      <div key={bed.id} className={`letto-row ${STATO_LETTO_CLASS[stato]}`}>
                        <span className="letto-num">{bed.label}</span>
                        <span className={`letto-stato-badge letto-stato--${stato}`}>
                          {STATO_LETTO_LABEL[stato]}
                        </span>
                        {patientName && <span className="letto-paziente">{patientName}</span>}
                        {bed.note && <span className="letto-note">{bed.note}</span>}
                        <button
                          className="icon-btn icon-btn--sm"
                          style={{ minHeight: 44, minWidth: 44 }}
                          onClick={() => apriLettoEdit(bed)}
                          title="Modifica letto"
                        >
                          <IcoEdit />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ClinicalTableSection>

      <ConfirmDialog
        open={pendingRoom !== null}
        title="Eliminare la camera?"
        message={
          pendingRoom
            ? `La camera ${pendingRoom.numero} verrà eliminata. L'azione non è reversibile.`
            : ''
        }
        confirmLabel="Elimina camera"
        busy={deletingRoom}
        onConfirm={() => void confirmDeleteRoom()}
        onCancel={() => setPendingRoom(null)}
      />
    </div>
  );
}
