import { useState } from 'react';
import type { MotivoNonErogazione } from '../../types';
import type { AdessoDose } from '../../lib/adessoQueue';
import { MOTIVI } from '../../lib/therapyGiro';
import {
  recordAdministration,
  type AdministrationOutcome,
} from '../../lib/therapyAdministrationWrite';

export interface TurnoDose {
  key: string;
  patientId: string;
  dose: AdessoDose;
}

type Choice = { motivo: MotivoNonErogazione | null; note: string };

/** «Somministra N» del Turno (#445, decisione del responsabile 12/10/2026): l'elenco delle dosi
 *  sul posto, ognuna visibile e spuntata; «···» registra la mancata somministrazione con i motivi
 *  del giro. «Conferma» usa gli stessi endpoint del giro (chiave dello slot, conferma esplicita).
 *  Le dosi a scala glicemica richiedono la glicemia: restano fuori e si registrano dalla terapia. */
export function TurnoDosePanel({
  nome,
  doses,
  onDone,
  onClose,
  onOpenTherapy,
}: {
  nome: string;
  doses: TurnoDose[];
  onDone: () => void;
  onClose: () => void;
  onOpenTherapy: () => void;
}) {
  const [included, setIncluded] = useState(
    () => new Set(doses.filter((d) => d.dose.doseMode !== 'glucose_scale').map((d) => d.key)),
  );
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [openReasons, setOpenReasons] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recorded, setRecorded] = useState<Set<string>>(() => new Set());

  const pending = doses.filter((d) => included.has(d.key) && !recorded.has(d.key));
  const incomplete = pending.some((d) => {
    const c = choices[d.key];
    return c?.motivo === 'altro' && !c.note.trim();
  });
  const outcomeOf = (key: string): AdministrationOutcome => {
    const c = choices[key];
    return c?.motivo
      ? { kind: 'not_administered', motivo: c.motivo, note: c.note }
      : { kind: 'administered' };
  };

  async function confirm() {
    if (sending || pending.length === 0 || incomplete) return;
    setSending(true);
    const failed: Record<string, string> = {};
    const done = new Set(recorded);
    // Una alla volta: ogni dose ha il proprio esito, un errore non annulla le altre.
    for (const d of pending) {
      const result = await recordAdministration(
        {
          patientId: d.patientId,
          therapyId: d.dose.therapyId,
          date: d.dose.date,
          fascia: d.dose.fascia,
          ...(d.dose.scheduledTime !== undefined ? { scheduledTime: d.dose.scheduledTime } : {}),
        },
        outcomeOf(d.key),
        { confirmed: true },
      );
      if (result.ok) done.add(d.key);
      else failed[d.key] = result.message;
    }
    setRecorded(done);
    setErrors(failed);
    setSending(false);
    if (Object.keys(failed).length === 0) onDone();
  }

  return (
    <div className="turno-dose-panel" role="group" aria-label={`Somministrazione: ${nome}`}>
      <ul className="turno-dose-panel__list">
        {doses.map((d) => {
          const glucose = d.dose.doseMode === 'glucose_scale';
          const label = `${d.dose.farmaco} · ${d.dose.dose} · ${d.dose.via}`;
          const choice = choices[d.key];
          const motivo = MOTIVI.find((m) => m.value === choice?.motivo);
          const done = recorded.has(d.key);
          return (
            <li key={d.key} className="turno-dose-panel__row">
              <label className="turno-dose-panel__check">
                <input
                  type="checkbox"
                  checked={included.has(d.key)}
                  disabled={glucose || sending || done}
                  onChange={(e) => {
                    const next = new Set(included);
                    if (e.target.checked) next.add(d.key);
                    else next.delete(d.key);
                    setIncluded(next);
                  }}
                />
                <span>
                  <span className="turno-dose-panel__drug">{label}</span>
                  {glucose ? (
                    <span className="turno-dose-panel__note">
                      Scala glicemica: serve la glicemia.{' '}
                      <button type="button" className="ds-link" onClick={onOpenTherapy}>
                        Registra dalla terapia
                      </button>
                    </span>
                  ) : done ? (
                    <span className="turno-dose-panel__note is-done">Registrata</span>
                  ) : (
                    <span className={`turno-dose-panel__note${motivo ? ' is-warn' : ''}`}>
                      {motivo ? `Non somministrata: ${motivo.label}` : 'Somministrata'}
                    </span>
                  )}
                  {errors[d.key] && (
                    <span className="turno-dose-panel__error" role="alert">
                      {errors[d.key]}
                    </span>
                  )}
                </span>
              </label>
              {!glucose && !done && (
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary turno-dose-panel__more"
                  aria-label={`Altro esito: ${label}`}
                  aria-expanded={openReasons === d.key}
                  disabled={sending}
                  onClick={() => setOpenReasons(openReasons === d.key ? null : d.key)}
                >
                  ···
                </button>
              )}
              {openReasons === d.key && (
                <div className="turno-dose-panel__reasons">
                  <button
                    type="button"
                    className="ds-chip"
                    aria-pressed={!choice?.motivo}
                    onClick={() => {
                      setChoices({ ...choices, [d.key]: { motivo: null, note: '' } });
                      setOpenReasons(null);
                    }}
                  >
                    Somministrata
                  </button>
                  {MOTIVI.map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      className="ds-chip"
                      aria-pressed={choice?.motivo === m.value}
                      onClick={() => {
                        setChoices({
                          ...choices,
                          [d.key]: { motivo: m.value, note: choice?.note ?? '' },
                        });
                        if (m.value !== 'altro') setOpenReasons(null);
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                  {choice?.motivo === 'altro' && (
                    <input
                      className="form-input"
                      aria-label={`Motivo della mancata somministrazione: ${label}`}
                      value={choice.note}
                      onChange={(e) =>
                        setChoices({
                          ...choices,
                          [d.key]: { motivo: 'altro', note: e.target.value },
                        })
                      }
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="turno-dose-panel__actions">
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Annulla
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          disabled={sending || pending.length === 0 || incomplete}
          onClick={() => void confirm()}
        >
          {sending ? 'Registrazione…' : `Conferma ${pending.length}`}
        </button>
      </div>
    </div>
  );
}
