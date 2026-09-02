import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { IcoCheck, IcoX } from '../../icons';
import { OPERATOR_COLOR_PALETTE } from '../../types';
import type { RuoloOperatore, StatoOperatore } from '../../types';
import type { OperatorFormValue } from './operatorFormModel';
import './OperatorManagement.css';

const COLOR_LABELS = [
  'Blu',
  'Verde acqua',
  'Viola',
  'Ocra',
  'Rosso',
  'Lilla',
  'Verde',
  'Azzurro',
  'Corallo',
  'Ciano',
];

interface OperatorFormPanelProps {
  value: OperatorFormValue;
  editMode: boolean;
  onChange: Dispatch<SetStateAction<OperatorFormValue>>;
  onCancel: () => void;
  onSubmit: () => void;
}

export function OperatorFormPanel({
  value,
  editMode,
  onChange,
  onCancel,
  onSubmit,
}: OperatorFormPanelProps) {
  function update<K extends keyof OperatorFormValue>(key: K, next: OperatorFormValue[K]) {
    onChange((previous) => ({ ...previous, [key]: next }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const title = editMode ? 'Modifica operatore' : 'Nuovo operatore';

  return (
    <form
      id="operator-form-panel"
      className="op-form-panel operator-editor"
      aria-labelledby="operator-form-title"
      onSubmit={submit}
    >
      <header className="op-form-panel__header operator-editor__header">
        <div className="operator-editor__heading">
          <span className="operator-editor__eyebrow">Profilo operatore</span>
          <h3 id="operator-form-title" className="op-form-panel__title">
            {title}
          </h3>
          <p className="operator-editor__intro">
            Compila prima i campi obbligatori. Le preferenze possono essere aggiunte in seguito.
          </p>
        </div>
        <button
          type="button"
          className="icon-btn operator-editor__close"
          onClick={onCancel}
          aria-label={`Chiudi ${title.toLowerCase()}`}
        >
          <IcoX />
        </button>
      </header>

      <div className="operator-editor__body">
        <fieldset className="operator-editor__section">
          <legend>Identità</legend>
          <div className="operator-editor__grid">
            <div className="form-field operator-editor__field--span-3">
              <label className="form-label" htmlFor="operator-name">
                Nome <span aria-hidden="true">*</span>
              </label>
              <input
                id="operator-name"
                name="nome"
                className="form-input"
                value={value.nome}
                onChange={(event) => update('nome', event.target.value)}
                autoComplete="given-name"
                placeholder="Es. Laura"
                required
              />
            </div>
            <div className="form-field operator-editor__field--span-3">
              <label className="form-label" htmlFor="operator-surname">
                Cognome <span aria-hidden="true">*</span>
              </label>
              <input
                id="operator-surname"
                name="cognome"
                className="form-input"
                value={value.cognome}
                onChange={(event) => update('cognome', event.target.value)}
                autoComplete="family-name"
                placeholder="Es. Bianchi"
                required
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="operator-editor__section">
          <legend>Ruolo e assegnazione</legend>
          <div className="operator-editor__grid">
            <div className="form-field">
              <label className="form-label" htmlFor="operator-role">
                Ruolo
              </label>
              <select
                id="operator-role"
                name="ruolo"
                className="form-select"
                value={value.ruolo}
                onChange={(event) => update('ruolo', event.target.value as RuoloOperatore)}
              >
                <option value="medico">Medico</option>
                <option value="infermiere">Infermiere</option>
                <option value="coordinatore">Coordinatore</option>
              </select>
            </div>
            <div className="form-field operator-editor__field--span-2">
              <label className="form-label" htmlFor="operator-qualification">
                Qualifica
              </label>
              <input
                id="operator-qualification"
                name="qualifica"
                className="form-input"
                value={value.qualifica}
                onChange={(event) => update('qualifica', event.target.value)}
                placeholder="Es. OSS, fisioterapista"
              />
            </div>
            <div className="form-field operator-editor__field--span-2">
              <label className="form-label" htmlFor="operator-ward">
                Reparto
              </label>
              <input
                id="operator-ward"
                name="reparto"
                className="form-input"
                value={value.reparto}
                onChange={(event) => update('reparto', event.target.value)}
                placeholder="Es. Medicina interna"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="operator-status">
                Stato
              </label>
              <select
                id="operator-status"
                name="stato"
                className="form-select"
                value={value.stato}
                onChange={(event) => update('stato', event.target.value as StatoOperatore)}
              >
                <option value="attivo">Attivo</option>
                <option value="inattivo">Inattivo</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="operator-editor__section">
          <legend>Contatti</legend>
          <div className="operator-editor__grid">
            <div className="form-field operator-editor__field--span-3">
              <label className="form-label" htmlFor="operator-email">
                Email <span aria-hidden="true">*</span>
              </label>
              <input
                id="operator-email"
                name="email"
                className="form-input"
                type="email"
                value={value.email}
                onChange={(event) => update('email', event.target.value)}
                autoComplete="email"
                placeholder="nome.cognome@clinicos.it"
                required
              />
            </div>
            <div className="form-field operator-editor__field--span-3">
              <label className="form-label" htmlFor="operator-phone">
                Telefono
              </label>
              <input
                id="operator-phone"
                name="telefono"
                className="form-input"
                type="tel"
                value={value.telefono}
                onChange={(event) => update('telefono', event.target.value)}
                autoComplete="tel"
                placeholder="+39 333 000 0000"
              />
            </div>
          </div>
        </fieldset>

        <details className="operator-editor__optional">
          <summary>
            <span className="operator-editor__optional-title">
              <span
                className="operator-editor__selected-color"
                style={{ background: value.colore }}
                aria-hidden="true"
              />
              Preferenze e note
            </span>
            <span className="operator-editor__optional-badge">Opzionale</span>
          </summary>
          <div className="operator-editor__optional-content">
            <fieldset className="operator-editor__color-field">
              <legend>Colore identificativo</legend>
              <div className="operator-editor__color-picker">
                {OPERATOR_COLOR_PALETTE.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    className={`operator-editor__color-swatch${value.colore === color ? ' is-selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => update('colore', color)}
                    aria-label={COLOR_LABELS[index]}
                    aria-pressed={value.colore === color}
                  />
                ))}
                <label className="operator-editor__custom-color">
                  <span>Personalizzato</span>
                  <input
                    id="operator-color"
                    name="colore"
                    type="color"
                    value={value.colore}
                    onChange={(event) => update('colore', event.target.value)}
                    aria-label="Colore personalizzato"
                  />
                </label>
              </div>
            </fieldset>
            <div className="form-field operator-editor__notes">
              <label className="form-label" htmlFor="operator-notes">
                Note
              </label>
              <textarea
                id="operator-notes"
                name="note"
                className="form-input"
                value={value.note}
                onChange={(event) => update('note', event.target.value)}
                placeholder="Informazioni utili sull'operatore"
                rows={2}
              />
            </div>
          </div>
        </details>
      </div>

      <footer className="op-form-panel__actions operator-editor__actions">
        <span className="operator-editor__required-note">
          <span aria-hidden="true">*</span> Campi obbligatori
        </span>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Annulla
        </button>
        <button type="submit" className="btn-success">
          <IcoCheck /> {editMode ? 'Salva modifiche' : 'Crea operatore'}
        </button>
      </footer>
    </form>
  );
}
