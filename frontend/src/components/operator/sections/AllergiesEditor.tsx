import { useState } from 'react';
import type { AllergiaItem } from '../../../types';
import type { SectionProps } from './types';
import { IcoCheck, IcoX, IcoPlus } from '../../../icons';
import { uid, todayStr } from '../cartella/shared';

export function AllergiesEditor({ value, onChange, readOnly, operatoreNome }: SectionProps<AllergiaItem[]>) {
  const list = value ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<AllergiaItem>>({});

  function add() {
    if (!form.allergene) return;
    const newItem: AllergiaItem = {
      id: uid(),
      allergene: '',
      gravita: 'lieve',
      reazione: '',
      documentato: todayStr(),
      documentatoDa: operatoreNome ?? '',
      ...form,
    } as AllergiaItem;
    onChange([newItem, ...list]);
    setShowForm(false);
    setForm({});
  }

  function remove(id: string) {
    onChange(list.filter(a => a.id !== id));
  }

  return (
    <>
      <div className="ec-modal-list">
        {list.length === 0 && <p className="cr-empty">Nessuna allergia registrata.</p>}
        {list.map(a => (
          <div key={a.id} className="ec-modal-item">
            <div className="ec-modal-item__main">
              <span className="ec-modal-item__title">{a.allergene}</span>
              {a.reazione && <span className="ec-modal-item__sub">{a.reazione}</span>}
              <span className={`badge ${a.gravita === 'grave' ? 'badge--red' : a.gravita === 'moderata' ? 'badge--amber' : 'badge--gray'}`}>{a.gravita}</span>
            </div>
            {!readOnly && (
              <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => remove(a.id)} title="Elimina"><IcoX /></button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        showForm ? (
          <div className="ec-modal-add-form">
            <div className="op-form-grid">
              <div className="form-field">
                <label className="form-label">Allergene *</label>
                <input className="form-input" value={form.allergene ?? ''} onChange={e => setForm(p => ({ ...p, allergene: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Gravità</label>
                <select className="form-select" value={form.gravita ?? 'lieve'} onChange={e => setForm(p => ({ ...p, gravita: e.target.value as AllergiaItem['gravita'] }))}>
                  <option value="lieve">Lieve</option><option value="moderata">Moderata</option><option value="grave">Grave</option>
                </select>
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 4 }}>
              <label className="form-label">Reazione</label>
              <input className="form-input" value={form.reazione ?? ''} onChange={e => setForm(p => ({ ...p, reazione: e.target.value }))} />
            </div>
            <div className="ec-modal-add-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => { setShowForm(false); setForm({}); }}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={add}><IcoCheck /> Salva</button>
            </div>
          </div>
        ) : (
          <button className="btn-secondary btn-sm" onClick={() => setShowForm(true)}><IcoPlus /> Aggiungi allergia</button>
        )
      )}
    </>
  );
}
