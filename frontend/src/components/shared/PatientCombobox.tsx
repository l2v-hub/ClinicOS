import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Paziente } from '../../types';
import { IcoCheck, IcoSearch, IcoX } from '../../icons';
import { usePatientDirectorySearch } from '../../lib/usePatientDirectorySearch';
import {
  nextPatientOptionIndex,
  patientDisplayName,
  patientFiscalCode,
} from '../../lib/patientComboboxModel';
import './PatientCombobox.css';

export interface PatientComboboxProps {
  inputId: string;
  label: string;
  selected: Paziente | null;
  onChange: (patient: Paziente | null) => void;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export function PatientCombobox({
  inputId,
  label,
  selected,
  onChange,
  required = false,
  disabled = false,
  helperText = 'Cerca per nome, cognome o codice fiscale e seleziona un risultato.',
}: PatientComboboxProps) {
  const reactId = useId().replace(/:/g, '');
  const listboxId = `${inputId}-${reactId}-listbox`;
  const helpId = `${inputId}-${reactId}-help`;
  const selectionId = `${inputId}-${reactId}-selection`;
  const [query, setQuery] = useState(selected ? patientDisplayName(selected) : '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const search = usePatientDirectorySearch(query, { enabled: open, limit: 8 });
  const ready = query.trim().length >= 2;
  const results = search.results;

  const safeActiveIndex = activeIndex >= results.length ? -1 : activeIndex;

  const describedBy = useMemo(
    () => [helpId, selected ? selectionId : ''].filter(Boolean).join(' '),
    [helpId, selected, selectionId],
  );

  function choose(patient: Paziente) {
    setQuery(patientDisplayName(patient));
    setOpen(false);
    setActiveIndex(-1);
    onChange(patient);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === 'Enter' && open && safeActiveIndex >= 0 && results[safeActiveIndex]) {
      event.preventDefault();
      choose(results[safeActiveIndex]);
      return;
    }
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      if (!ready || results.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        nextPatientOptionIndex(
          current,
          results.length,
          event.key as Parameters<typeof nextPatientOptionIndex>[2],
        ),
      );
    }
  }

  const activeOptionId =
    open && safeActiveIndex >= 0 && results[safeActiveIndex]
      ? `${listboxId}-option-${results[safeActiveIndex].id}`
      : undefined;

  return (
    <div
      className="form-field patient-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label className="form-label" htmlFor={inputId}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <div className="patient-combobox__control">
        <span className="patient-combobox__search-icon" aria-hidden="true">
          <IcoSearch />
        </span>
        <input
          id={inputId}
          className="form-input patient-combobox__input"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && ready}
          aria-controls={open && ready && results.length > 0 ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-describedby={describedBy}
          aria-invalid={Boolean(query.trim() && !selected)}
          aria-required={required}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value.slice(0, 80));
            setOpen(true);
            setActiveIndex(-1);
            if (selected) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Nome, cognome o codice fiscale"
          disabled={disabled}
        />
        {query && !disabled && (
          <button
            type="button"
            className="patient-combobox__clear"
            aria-label={selected ? `Rimuovi ${patientDisplayName(selected)}` : 'Cancella ricerca'}
            onClick={() => {
              setQuery('');
              setOpen(false);
              setActiveIndex(-1);
              onChange(null);
            }}
          >
            <IcoX />
          </button>
        )}
      </div>

      <p id={helpId} className="patient-combobox__help">
        {helperText}
      </p>

      {selected && (
        <div id={selectionId} className="patient-combobox__selection" aria-live="polite">
          <span className="patient-combobox__selection-icon" aria-hidden="true">
            <IcoCheck />
          </span>
          <span>
            <strong>{patientDisplayName(selected)}</strong>
            <span>
              CF {patientFiscalCode(selected)} · Scheda {selected.medicalRecordNumber}
            </span>
          </span>
        </div>
      )}

      {open && !disabled && (
        <div className="patient-combobox__popup">
          {!ready ? (
            <p className="patient-combobox__status" role="status">
              Digita almeno 2 caratteri per cercare tra i pazienti registrati.
            </p>
          ) : search.loading ? (
            <p className="patient-combobox__status" role="status">
              Ricerca in corso…
            </p>
          ) : search.error ? (
            <p className="patient-combobox__status patient-combobox__status--error" role="alert">
              {search.error}
            </p>
          ) : results.length === 0 ? (
            <p className="patient-combobox__status" role="status">
              Nessun paziente trovato.
            </p>
          ) : (
            <ul id={listboxId} className="patient-combobox__list" role="listbox">
              {results.map((patient, index) => (
                <li
                  id={`${listboxId}-option-${patient.id}`}
                  key={patient.id}
                  className={`patient-combobox__option${safeActiveIndex === index ? ' is-active' : ''}`}
                  role="option"
                  aria-selected={safeActiveIndex === index}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(patient);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="patient-combobox__option-name">
                    {patientDisplayName(patient)}
                  </span>
                  <span className="patient-combobox__option-identity">
                    <strong>CF {patientFiscalCode(patient)}</strong>
                    <span>Scheda {patient.medicalRecordNumber}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
