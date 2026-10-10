import { useState, useEffect, useCallback, useRef } from 'react';
import { IcoPlus, IcoEdit, IcoX, IcoBed, IcoTrash } from '../../icons';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { ClinicalTableSection } from '../operator/cartella/shared';
import { RoomFormPanel } from './RoomFormPanel';
import { BedEditDialog } from './BedEditDialog';
import './RoomActions.css';
import { FORM_CAMERA_VUOTO, STATO_LETTO_CLASS, STATO_LETTO_LABEL, bedStatoDisplay, activeBedAssignment, fetchFacilityData, roomActionNames, bedEditName, type RoomAPI, type BedAPI, type OccupancyAPI, type StatoLetto, type BedEditTarget } from './RoomManagementModel';
import { ConfirmDialog } from '../shared/ConfirmDialog';

/* ── Component ─────────────────────────────────────────── */

export function RoomsManagement() {
  const [rooms, setRooms] = useState<RoomAPI[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formAperto, setFormAperto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_CAMERA_VUOTO);
  const [saving, setSaving] = useState(false);

  const [lettoEdit, setLettoEdit] = useState<BedEditTarget | null>(null);
  const [bedSaving, setBedSaving] = useState(false);
  const bedSaveInFlight = useRef(false);
  const [lettoForm, setLettoForm] = useState<{ stato: string; note: string }>({
    stato: 'libero',
    note: '',
  });

  const [filtroReparto, setFiltroReparto] = useState('tutti');
  const [filtroStatoLetto, setFiltroStatoLetto] = useState<'tutti' | StatoLetto>('tutti');

  /* ── Data loading ─────────────────────────────────────── */

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchFacilityData();
      setRooms(data.rooms);
      setOccupancy(data.occupancy);
    } catch {
      setLoadError(
        'Impossibile aggiornare camere e occupazione. I dati mostrati potrebbero non essere aggiornati.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFacilityData(controller.signal)
      .then((data) => {
        setRooms(data.rooms);
        setOccupancy(data.occupancy);
        setLoadError(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError(
            'Impossibile caricare camere e occupazione. Riprova per visualizzare i dati.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  /* ── Derived data ─────────────────────────────────────── */

  const reparti = ['tutti', ...Array.from(new Set(rooms.map((r) => r.reparto).filter(Boolean)))];

  const roomsPerReparto =
    filtroReparto === 'tutti' ? rooms : rooms.filter((r) => r.reparto === filtroReparto);

  const contiStatoLetto: Record<StatoLetto, number> = { libero: 0, occupato: 0, manutenzione: 0 };
  roomsPerReparto.forEach((r) => r.beds.forEach((b) => (contiStatoLetto[bedStatoDisplay(b)] += 1)));

  const lettiVisibili = (room: RoomAPI) =>
    filtroStatoLetto === 'tutti'
      ? room.beds
      : room.beds.filter((b) => bedStatoDisplay(b) === filtroStatoLetto);

  const roomsFiltrate =
    filtroStatoLetto === 'tutti'
      ? roomsPerReparto
      : roomsPerReparto.filter((r) => lettiVisibili(r).length > 0);

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
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
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
      const res = await fetch(`${API_URL}/admin/rooms/${roomId}`, {
        method: 'DELETE',
        headers: operatorHeaders(),
      });
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
    setEditRoomNumber(room.numero);
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

  function apriLettoEdit(bed: BedAPI, room: RoomAPI) {
    setLettoEdit({ bedId: bed.id, label: bed.label, roomNumber: room.numero });
    // "occupato" is derived from active assignments; it is never a persisted bed status.
    setLettoForm({
      stato: bed.stato === 'manutenzione' ? 'manutenzione' : 'libero',
      note: bed.note ?? '',
    });
  }

  async function salvaLetto() {
    if (!lettoEdit || bedSaveInFlight.current) return;
    bedSaveInFlight.current = true;
    setBedSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/beds/${lettoEdit.bedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
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
    } finally {
      bedSaveInFlight.current = false;
      setBedSaving(false);
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
        <div className="alert alert--error" role="alert">
          <span className="alert__text">{error}</span>
          <button className="icon-btn" onClick={() => setError(null)} aria-label="Chiudi errore">
            <IcoX />
          </button>
        </div>
      )}

      {loadError && (
        <div className="alert alert--error" role="alert">
          <span className="alert__text">{loadError}</span>
          <button className="btn-secondary" onClick={() => void loadData()}>
            Riprova
          </button>
        </div>
      )}

      {/* Occupancy stats */}
      <div className="occupancy-stats" hidden={!occupancy}>
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

      {/* Presentation-only editors; resource identity stays separate from editable values. */}
      {formAperto && (
        <RoomFormPanel roomNumber={editId ? editRoomNumber : null} form={form} onChange={setForm}
          saving={saving} onSave={() => void salvaCamera()} onClose={() => setFormAperto(false)} />
      )}
      {lettoEdit && (
        <BedEditDialog target={lettoEdit} form={lettoForm} onChange={setLettoForm}
          bedSaving={bedSaving} onSave={() => void salvaLetto()} onClose={() => setLettoEdit(null)} />
      )}

      {/* Filtro reparto */}
      <div className="filter-chips" style={{ marginBottom: 16 }}>
        {reparti.map((r) => (
          <button
            key={r}
            type="button"
            className="ds-chip"
            aria-pressed={filtroReparto === r}

            onClick={() => setFiltroReparto(r)}
          >
            {r === 'tutti' ? 'Tutti i reparti' : r}
          </button>
        ))}
      </div>

      {/* Filtro stato letto */}
      <div className="filter-chips" style={{ marginBottom: 16 }}>
        {(
          [
            { key: 'tutti', label: 'Tutti gli stati' },
            { key: 'occupato', label: `Occupati (${contiStatoLetto.occupato})` },
            { key: 'libero', label: `Liberi (${contiStatoLetto.libero})` },
            { key: 'manutenzione', label: `Manutenzione (${contiStatoLetto.manutenzione})` },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            className="ds-chip"
            aria-pressed={filtroStatoLetto === f.key}

            onClick={() => setFiltroStatoLetto(f.key)}
          >
            {f.label}
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
                  <div className="room-card__actions">
                  <button
                    className="icon-btn icon-btn--sm icon-btn--edit"

                    onClick={() => apriModificaCamera(room)}
                    title={roomActionNames(room.numero).edit}
                    aria-label={roomActionNames(room.numero).edit}
                  >
                    <IcoEdit />
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"

                    onClick={() => setPendingRoom(room)}
                    title={roomActionNames(room.numero).remove}
                    aria-label={roomActionNames(room.numero).remove}
                  >
                    <IcoTrash />
                  </button>
                  </div>
                </div>

                {room.note && <p className="room-note">{room.note}</p>}
                {room.stato === 'manutenzione' && (
                  <p className="room-note" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                    In manutenzione
                  </p>
                )}

                <div className="letti-list">
                  {lettiVisibili(room).map((bed) => {
                    const stato = bedStatoDisplay(bed);
                    const activeAssignment = activeBedAssignment(bed);
                    const patientName = activeAssignment
                      ? `${activeAssignment.patient.lastName}, ${activeAssignment.patient.firstName}`
                      : null;
                    const operatorName = activeAssignment?.patient.registeredBy?.user.fullName;
                    return (
                      <div key={bed.id} className={`letto-row ${STATO_LETTO_CLASS[stato]}`}>
                        <span className="letto-num">{bed.label}</span>
                        <span className={`letto-stato-badge letto-stato--${stato}`}>
                          {STATO_LETTO_LABEL[stato]}
                        </span>
                        {patientName && activeAssignment && (
                          <button
                            type="button"
                            className="letto-paziente letto-paziente--link"
                            onClick={() => {
                              window.location.hash = `/dettaglio-paziente/${activeAssignment.patientId}`;
                            }}
                            aria-label={`Apri la scheda di ${activeAssignment.patient.firstName} ${activeAssignment.patient.lastName}`}
                          >
                            <span>{patientName}</span>
                            {operatorName && <small>Operatore: {operatorName}</small>}
                          </button>
                        )}
                        {bed.note && <span className="letto-note">{bed.note}</span>}
                        <button
                          className="icon-btn icon-btn--sm"

                          onClick={() => apriLettoEdit(bed, room)}
                          title={bedEditName(bed.label, room.numero)}
                          aria-label={bedEditName(bed.label, room.numero)}
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
        title={pendingRoom ? roomActionNames(pendingRoom.numero).deleteTitle : 'Eliminare la camera?'}
        message={
          pendingRoom
            ? `La camera ${pendingRoom.numero} verrà eliminata. L'azione non è reversibile.`
            : ''
        }
        confirmLabel={pendingRoom ? roomActionNames(pendingRoom.numero).remove : 'Elimina camera'}
        busy={deletingRoom}
        onConfirm={() => void confirmDeleteRoom()}
        onCancel={() => setPendingRoom(null)}
      />
    </div>
  );
}
