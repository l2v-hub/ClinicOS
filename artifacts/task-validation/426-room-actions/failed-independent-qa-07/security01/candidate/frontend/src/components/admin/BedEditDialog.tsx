import type { Dispatch, SetStateAction } from 'react';
import { IcoCheck, IcoX } from '../../icons';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { MAX_FACILITY_NOTE_LENGTH, bedEditName, type BedEditTarget, type BedFormValues } from './RoomManagementModel';

interface Props {
  target: BedEditTarget;
  form: BedFormValues;
  onChange: Dispatch<SetStateAction<BedFormValues>>;
  bedSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}
export function BedEditDialog({ target, form, onChange, bedSaving, onSave, onClose }: Props) {
  const title = bedEditName(target.label, target.roomNumber);
  return (
    <AccessibleDialogSurface labelledBy="bed-edit-dialog-title" onClose={onClose} dismissible={!bedSaving}>
      <div className="modal-header">
        <h3 className="modal-title" id="bed-edit-dialog-title">{title}</h3>
        <button type="button" className="icon-btn" aria-label={`Chiudi ${title}`} data-dialog-initial-focus
          disabled={bedSaving} onClick={onClose}><IcoX /></button>
      </div>
      <div className="modal-body">
        <div className="op-form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="bed-edit-status">Stato</label>
            <select id="bed-edit-status" className="form-select" value={form.stato} disabled={bedSaving}
              onChange={e => onChange(p => ({ ...p, stato: e.target.value }))}>
              <option value="libero">Libero</option><option value="manutenzione">Manutenzione</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="bed-edit-notes">Note</label>
            <input id="bed-edit-notes" className="form-input" value={form.note} maxLength={MAX_FACILITY_NOTE_LENGTH}
              disabled={bedSaving} onChange={e => onChange(p => ({ ...p, note: e.target.value }))} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn-secondary" disabled={bedSaving} onClick={onClose}>Annulla</button>
        <button type="button" className="btn-success" disabled={bedSaving} onClick={onSave}>
          <IcoCheck /> {bedSaving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </AccessibleDialogSurface>
  );
}
