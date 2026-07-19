import { useState } from 'react';
import type { AllergiaItem, AllergyStatus } from '../../../types';
import type { SectionProps } from './types';
import { IcoCheck, IcoX, IcoPlus } from '../../../icons';
import { uid, todayStr } from '../cartella/shared';
import { canSetStatus } from '../../../lib/allergyStatusModel';

// #244: an empty allergy list is ambiguous. The operator can now set an explicit status
// (Presenti / Assenti / Paziente nega). The detail list is kept even when status is not "presenti",
// so switching status never overwrites recorded allergies.
interface AllergiesEditorProps extends SectionProps<AllergiaItem[]> {
  status?: AllergyStatus;
  onStatusChange?: (s: AllergyStatus) => void;
}

const STATUS_OPTIONS: ReadonlyArray<{ key: AllergyStatus; label: string }> = [
  { key: 'presenti', label: 'Presenti' },
  { key: 'assenti', label: 'Assenti' },
  { key: 'paziente_nega', label: 'Paziente nega' },
];

export function AllergiesEditor({
  value,
  onChange,
  readOnly,
  operatoreNome,
  status,
  onStatusChange,
}: AllergiesEditorProps) {
  const list = value ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<AllergiaItem>>({});

  // Effective status: explicit value, else inferred "presenti" when a list already exists.
  const effStatus: AllergyStatus | undefined = status ?? (list.length > 0 ? 'presenti' : undefined);
  const showList = effStatus === 'presenti';

  // #244: 'assenti'/'paziente_nega' assert there are NO allergies — never allow setting
  // either while the detail list still has entries (that was the contradictory state
  // Codex flagged: modal says "nega" while the data proves otherwise). The reason is
  // derived from the list itself (not from a click attempt) so the explanation and the
  // disabled buttons are always in sync — a disabled button can't fire onClick, so a
  // "toggle on click" message would never appear.
  const lockReason = list.length > 0 ? (canSetStatus(list, 'assenti').reason ?? null) : null;

  function setStatus(s: AllergyStatus) {
    const check = canSetStatus(list, s);
    if (!check.ok) return; // belt-and-braces: buttons are already disabled in this state
    onStatusChange?.(s);
    if (s !== 'presenti') setShowForm(false);
  }

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
    // NON chiamare onStatusChange qui: due upd() consecutivi costruiscono i payload dalla
    // stessa cartella e si sovrascrivono (lost update — l'allergene sparirebbe). Col modello
    // #244 la lista non vuota È autoritativa: effStatus/deriveAllergySummary la trattano
    // già come "presenti" senza bisogno di persistere lo status esplicito.
    setShowForm(false);
    setForm({});
  }

  function remove(id: string) {
    onChange(list.filter((a) => a.id !== id));
  }

  return (
    <>
      {/* #244: explicit allergy status selector */}
      <div
        className="allergy-status"
        role="radiogroup"
        aria-label="Stato allergie"
        data-testid="allergy-status"
      >
        {STATUS_OPTIONS.map((o) => {
          const check = canSetStatus(list, o.key);
          const disabled = readOnly || !check.ok;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={effStatus === o.key}
              disabled={disabled}
              title={!check.ok ? check.reason : undefined}
              data-testid={`allergy-status-${o.key}`}
              className={`btn-sm ${effStatus === o.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatus(o.key)}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {lockReason && (
        <p className="cr-empty" role="alert" data-testid="allergy-status-blocked">
          <span className="status-badge status-badge--warning">Non consentito</span> {lockReason}
        </p>
      )}

      {effStatus === 'assenti' && (
        <p className="cr-empty" data-testid="allergy-none">
          <span className="status-badge status-badge--success">Allergie assenti</span> — verificato
          dall’operatore.
        </p>
      )}
      {effStatus === 'paziente_nega' && (
        <p className="cr-empty" data-testid="allergy-denied">
          <span className="status-badge status-badge--info">Paziente nega allergie</span>
        </p>
      )}
      {effStatus === undefined && (
        <p className="cr-empty" data-testid="allergy-undocumented">
          Stato allergie non documentato — seleziona uno stato.
        </p>
      )}

      {/* AC3/validation: keep recorded detail even under assenti/nega, and flag the conflict */}
      {!showList && list.length > 0 && (
        <p className="cr-empty" role="alert" data-testid="allergy-conflict">
          <span className="status-badge status-badge--warning">Attenzione</span> risultano{' '}
          {list.length} allergie registrate ma lo stato è “
          {STATUS_OPTIONS.find((o) => o.key === effStatus)?.label}”. Il dettaglio è conservato:
          seleziona “Presenti” per rivederlo.
        </p>
      )}

      {showList && (
        <div className="ec-modal-list">
          {list.length === 0 && (
            <p className="cr-empty">Nessuna allergia inserita — aggiungi il dettaglio.</p>
          )}
          {list.map((a) => (
            <div key={a.id} className="ec-modal-item">
              <div className="ec-modal-item__main">
                <span className="ec-modal-item__title">{a.allergene}</span>
                {a.reazione && <span className="ec-modal-item__sub">{a.reazione}</span>}
                <span
                  className={`badge ${a.gravita === 'grave' ? 'badge--red' : a.gravita === 'moderata' ? 'badge--amber' : 'badge--gray'}`}
                >
                  {a.gravita}
                </span>
              </div>
              {!readOnly && (
                <button
                  className="icon-btn icon-btn--sm icon-btn--danger"
                  onClick={() => remove(a.id)}
                  title="Elimina"
                >
                  <IcoX />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly &&
        showList &&
        (showForm ? (
          <div className="ec-modal-add-form">
            <div className="op-form-grid">
              <div className="form-field">
                <label className="form-label">Allergene *</label>
                <input
                  className="form-input"
                  value={form.allergene ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, allergene: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Gravità</label>
                <select
                  className="form-select"
                  value={form.gravita ?? 'lieve'}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gravita: e.target.value as AllergiaItem['gravita'] }))
                  }
                >
                  <option value="lieve">Lieve</option>
                  <option value="moderata">Moderata</option>
                  <option value="grave">Grave</option>
                </select>
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 4 }}>
              <label className="form-label">Reazione</label>
              <input
                className="form-input"
                value={form.reazione ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, reazione: e.target.value }))}
              />
            </div>
            <div className="ec-modal-add-form__actions">
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  setShowForm(false);
                  setForm({});
                }}
              >
                Annulla
              </button>
              <button className="btn-success btn-sm" onClick={add}>
                <IcoCheck /> Salva
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-secondary btn-sm" onClick={() => setShowForm(true)}>
            <IcoPlus /> Aggiungi allergia
          </button>
        ))}
    </>
  );
}
