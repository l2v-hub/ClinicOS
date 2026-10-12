import { useRef, useState } from 'react';
import type { AdessoDose, TurnoDoseChoice } from '../../lib/adessoQueue';
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

type Choice = TurnoDoseChoice;

/** Senza risposta il server può aver registrato comunque: non si dice «non registrata». */
function failureText(message: string): string {
  return /^Errore di rete/.test(message)
    ? 'Nessuna risposta dal server: esito incerto. La dose resta in verifica finché il server non ne conferma lo stato.'
    : `${message} La dose resta in verifica finché il server non ne conferma lo stato.`;
}

/** «Somministra N» del Turno (#445, decisione del responsabile 12/10/2026): l'elenco delle dosi
 *  sul posto, ognuna visibile e spuntata; «···» registra la mancata somministrazione con i motivi
 *  del giro. «Conferma» usa gli stessi endpoint del giro (chiave dello slot, conferma esplicita).
 *  Le dosi a scala glicemica richiedono la glicemia: restano fuori e si registrano dalla terapia. */
export function TurnoDosePanel({
  nome,
  doses: liveDoses,
  choices,
  onChoice,
  onDone,
  onAttempted,
  onClose,
  onOpenTherapy,
}: {
  nome: string;
  doses: TurnoDose[];
  /** Esiti scelti, tenuti dalla coda: sopravvivono a «Annulla» e alla riapertura. */
  choices: Record<string, Choice>;
  onChoice: (key: string, choice: Choice) => void;
  onDone: () => void;
  /** Ogni dose tentata, riuscita o no: la coda la mette «in verifica» e si rilegge, così un esito
   *  forse già scritto (risposta persa, 5xx dopo il commit) non viene riproposto e sovrascritto. */
  onAttempted: (keys: string[]) => void;
  onClose: () => void;
  onOpenTherapy: () => void;
}) {
  // Righe: quelle dell'apertura più quelle arrivate dopo. Una riga tentata qui resta visibile col
  // suo esito anche quando la coda la mette in verifica; ogni altra riga si può inviare SOLO se la
  // coda viva la dà ancora da fare (un collega può averla registrata nel frattempo: #445 QA 3).
  const [opened] = useState(liveDoses);
  const liveKeys = new Set(liveDoses.map((d) => d.key));
  const doses = [...opened, ...liveDoses.filter((d) => !opened.some((o) => o.key === d.key))];
  const [included, setIncluded] = useState(
    () => new Set(opened.filter((d) => d.dose.doseMode !== 'glucose_scale').map((d) => d.key)),
  );
  const [openReasons, setOpenReasons] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Guardia sincrona: due tocchi nello stesso istante non mandano due serie di richieste.
  const inFlight = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recorded, setRecorded] = useState<Set<string>>(() => new Set());

  // Una dose fallita non si riprova da qui: torna in coda solo se il server la dà ancora da fare.
  const attempted = (key: string) => recorded.has(key) || Boolean(errors[key]);
  const changed = (key: string) => !attempted(key) && !liveKeys.has(key);
  const pending = doses.filter(
    (d) => included.has(d.key) && liveKeys.has(d.key) && !attempted(d.key),
  );
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
    if (inFlight.current || pending.length === 0 || incomplete) return;
    inFlight.current = true;
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
    inFlight.current = false;
    onAttempted(pending.map((d) => d.key));
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
                  checked={included.has(d.key) && !changed(d.key)}
                  disabled={glucose || sending || done || Boolean(errors[d.key]) || changed(d.key)}
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
                  ) : changed(d.key) ? (
                    <span className="turno-dose-panel__note is-warn">
                      Stato cambiato nel frattempo: non viene registrata.{' '}
                      <button type="button" className="ds-link" onClick={onOpenTherapy}>
                        Verifica in terapia
                      </button>
                    </span>
                  ) : !included.has(d.key) ? (
                    <span className="turno-dose-panel__note">Esclusa: non viene registrata</span>
                  ) : (
                    <span className={`turno-dose-panel__note${motivo ? ' is-warn' : ''}`}>
                      {motivo ? `Non somministrata: ${motivo.label}` : 'Somministrata'}
                    </span>
                  )}
                  {errors[d.key] && (
                    <span className="turno-dose-panel__error" role="alert">
                      {failureText(errors[d.key])}
                    </span>
                  )}
                </span>
              </label>
              {!glucose && !attempted(d.key) && !changed(d.key) && included.has(d.key) && (
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
                      onChoice(d.key, { motivo: null, note: '' });
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
                        onChoice(d.key, { motivo: m.value, note: choice?.note ?? '' });
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
                      onChange={(e) => onChoice(d.key, { motivo: 'altro', note: e.target.value })}
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
          {recorded.size || Object.keys(errors).length ? 'Chiudi' : 'Annulla'}
        </button>
        {(pending.length > 0 || sending) && (
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            disabled={sending || incomplete}
            onClick={() => void confirm()}
          >
            {sending ? 'Registrazione…' : `Conferma ${pending.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
