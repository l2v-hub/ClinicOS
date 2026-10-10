import type { Dispatch, SetStateAction } from 'react';
import { IcoCheck, IcoX } from '../../icons';
import { MAX_FACILITY_NOTE_LENGTH, roomActionNames, type RoomFormValues, type TipoCamera, type StatoCamera } from './RoomManagementModel';

interface Props {
  roomNumber: string | null;
  form: RoomFormValues;
  onChange: Dispatch<SetStateAction<RoomFormValues>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}
export function RoomFormPanel({ roomNumber, form, onChange, saving, onSave, onClose }: Props) {
  const editing = roomNumber !== null;
  const title = editing ? roomActionNames(roomNumber).edit : 'Nuova camera';
  return (
    <section className="op-form-panel" aria-labelledby="room-edit-panel-title">
      <div className="op-form-panel__header">
        <h3 className="op-form-panel__title" id="room-edit-panel-title">{title}</h3>
        <button type="button" className="icon-btn" aria-label={`Chiudi ${title}`} onClick={onClose}><IcoX /></button>
      </div>
      <div className="op-form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="room-edit-number">N° camera *</label>
          <input id="room-edit-number" className="form-input" value={form.numero} maxLength={32}
            onChange={e => onChange(p => ({ ...p, numero: e.target.value }))} placeholder="es. 101, PS-02" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="room-edit-type">Tipo</label>
          <select id="room-edit-type" className="form-select" value={form.tipo}
            onChange={e => onChange(p => ({ ...p, tipo: e.target.value as TipoCamera }))}>
            <option value="singola">Singola</option><option value="doppia">Doppia</option><option value="altra">Altra</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="room-edit-floor">Piano</label>
          <input id="room-edit-floor" className="form-input" value={form.piano} maxLength={64}
            onChange={e => onChange(p => ({ ...p, piano: e.target.value }))} placeholder="1°, PT…" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="room-edit-ward">Reparto</label>
          <input id="room-edit-ward" className="form-input" value={form.reparto} maxLength={64}
            onChange={e => onChange(p => ({ ...p, reparto: e.target.value }))} placeholder="Cardiologia…" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="room-edit-status">Stato</label>
          <select id="room-edit-status" className="form-select" value={form.stato}
            onChange={e => onChange(p => ({ ...p, stato: e.target.value as StatoCamera }))}>
            <option value="attiva">Attiva</option><option value="inattiva">Inattiva</option><option value="manutenzione">Manutenzione</option>
          </select>
        </div>
      </div>
      <div className="form-field" style={{ marginTop: 8 }}>
        <label className="form-label" htmlFor="room-edit-notes">Note</label>
        <input id="room-edit-notes" className="form-input" value={form.note} maxLength={MAX_FACILITY_NOTE_LENGTH}
          onChange={e => onChange(p => ({ ...p, note: e.target.value }))} placeholder="Note sulla camera…" />
      </div>
      <div className="op-form-panel__actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="btn-success" onClick={onSave} disabled={saving}>
          <IcoCheck /> {saving ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea camera'}
        </button>
      </div>
    </section>
  );
}
