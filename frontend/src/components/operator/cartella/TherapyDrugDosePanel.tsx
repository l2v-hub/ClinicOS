// «Tocca un farmaco → somministra lì» (UX 2026-10-03, regola del proprietario): pannello in linea
// sotto la riga del farmaco con le dosi del giorno di QUEL farmaco e, per chi può, le stesse azioni
// del giro (TherapyGiroRows: Somministra / Non somm. con motivo, «altro» con nota obbligatoria).
// I farmaci «al bisogno» hanno «Somministra al bisogno» con l'indicazione obbligatoria.
// Nessuna regola nuova: dose e ora le decide il server, che rifiuta i ruoli non autorizzati.
import { useEffect, useRef, useState } from 'react';
import type { MotivoNonErogazione, PatientTherapyAPI, TherapySlot } from '../../../types';
import { API_URL } from '../../../config';
import { cachedGetJson } from '../../../lib/cachedFetch';
import { useRequiresConfirmation } from '../../../lib/capabilities';
import { useCanAdministerTherapy } from '../../../lib/therapyPermissions';
import { createSubmissionKey } from '../../../lib/submissionKey';
import { patientDrugTimes, administeredTime } from '../../../lib/therapyGiro';
import {
  loadPrnAdministrations,
  recordAdministration,
  recordPrnAdministration,
  type AdministrationOutcome,
  type PrnAdministration,
} from '../../../lib/therapyAdministrationWrite';
import { localIsoDate } from '../../../lib/appointmentRange';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { TherapyGiroRows } from '../TherapyGiroRows';
import '../TherapyRoundsPage.css';
import './TherapyDrugDosePanel.css';

interface Props {
  patientId: string;
  therapy: PatientTherapyAPI;
  /** Giorno delle dosi (default: oggi). */
  date?: string;
  /** Ora "HH:MM" o fascia del server ("mattina"…) da evidenziare (arrivo da un collegamento diretto). */
  focusTime?: string;
  /** Dopo ogni registrazione riuscita (la scheda aggiorna i suoi elenchi). */
  onRecorded?: () => void;
}

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

export function TherapyDrugDosePanel({ patientId, therapy, date, focusTime, onRecorded }: Props) {
  const day = date ?? localIsoDate();
  const canAdminister = useCanAdministerTherapy();
  const needsConfirmation = useRequiresConfirmation('administration.confirm');
  const prn = therapy.tipo === 'al_bisogno';
  return (
    <section
      className="drug-dose-panel"
      aria-label={`Somministrazioni di ${therapy.farmacoNome}`}
      data-testid="drug-dose-panel"
    >
      {!canAdminister && (
        <p className="drug-dose-panel__ro">
          Il tuo ruolo consulta lo stato delle somministrazioni ma non le registra.
        </p>
      )}
      {prn ? (
        <PrnPanel
          patientId={patientId}
          therapy={therapy}
          canAdminister={canAdminister}
          needsConfirmation={needsConfirmation}
          onRecorded={onRecorded}
        />
      ) : (
        <ScheduledPanel
          patientId={patientId}
          therapy={therapy}
          date={day}
          focusTime={focusTime}
          canAdminister={canAdminister}
          needsConfirmation={needsConfirmation}
          onRecorded={onRecorded}
        />
      )}
    </section>
  );
}

function ScheduledPanel({
  patientId,
  therapy,
  date,
  focusTime,
  canAdminister,
  needsConfirmation,
  onRecorded,
}: {
  patientId: string;
  therapy: PatientTherapyAPI;
  date: string;
  focusTime?: string;
  canAdminister: boolean;
  needsConfirmation: boolean;
  onRecorded?: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const key = `${patientId}|${therapy.id}|${date}|${revision}`;
  const [loaded, setLoaded] = useState<
    { key: string; status: 'ready'; slots: TherapySlot[] } | { key: string; status: 'error' } | null
  >(null);
  const state = loaded?.key === key ? loaded : { status: 'loading' as const };
  const [feedback, setFeedback] = useState<Feedback>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    cachedGetJson<TherapySlot[]>(`${API_URL}/therapy-slots?date=${date}`).then(
      (slots) => {
        if (active) setLoaded({ key, status: 'ready', slots: Array.isArray(slots) ? slots : [] });
      },
      () => {
        if (active) setLoaded({ key, status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [date, key]);

  const times =
    state.status === 'ready' ? patientDrugTimes(state.slots, patientId, therapy.id) : [];

  // Collegamento diretto a una fascia/ora: la riga di quell'ora entra in vista.
  const isFocusTime = (time: (typeof times)[number]) =>
    !!focusTime &&
    (time.ora === focusTime ||
      time.patients.some((g) => g.items.some((item) => item.fascia === focusTime)));
  useEffect(() => {
    if (!focusTime || state.status !== 'ready') return;
    const frame = window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLElement>('.drug-dose-panel__time.is-focus')
        ?.scrollIntoView({ block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusTime, state.status]);

  async function record(
    info: Parameters<typeof recordAdministration>[0] & { drugName: string },
    outcome: AdministrationOutcome,
    confirmed: boolean,
  ) {
    setFeedback(null);
    const result = await recordAdministration(info, outcome, { confirmed });
    setFeedback(
      result.ok
        ? {
            tone: 'ok',
            text:
              outcome.kind === 'administered'
                ? `Somministrazione di ${info.drugName} registrata.`
                : `Mancata somministrazione di ${info.drugName} registrata.`,
          }
        : { tone: 'error', text: result.message },
    );
    setRevision((value) => value + 1);
    if (result.ok) onRecorded?.();
  }

  return (
    <div ref={rootRef}>
      <h5 className="drug-dose-panel__title">Dosi di {formatDay(date)}</h5>
      {state.status === 'loading' && <p role="status">Caricamento delle dosi…</p>}
      {state.status === 'error' && (
        <div role="alert" className="drug-dose-panel__msg">
          Impossibile caricare le dosi del giorno.{' '}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setRevision((v) => v + 1)}
          >
            Riprova
          </button>
        </div>
      )}
      {state.status === 'ready' && times.length === 0 && (
        <p className="drug-dose-panel__msg">Nessuna dose prevista per questo giorno.</p>
      )}
      {state.status === 'ready' &&
        times.map((time) => (
          <div
            key={time.ora}
            data-dose-time={time.ora}
            className={`drug-dose-panel__time${isFocusTime(time) ? ' is-focus' : ''}`}
            data-therapy-focus={isFocusTime(time) ? '' : undefined}
          >
            <TherapyGiroRows
              time={time}
              date={date}
              filtro="tutte"
              readOnly={!canAdminister}
              hidePatientHead
              requiresConfirmation={needsConfirmation}
              onConfirm={
                canAdminister
                  ? (info, options) =>
                      void record(info, { kind: 'administered' }, options?.confirmed === true)
                  : undefined
              }
              onNotAdministered={
                canAdminister
                  ? (info, motivo: MotivoNonErogazione, note: string, options) =>
                      void record(
                        info,
                        { kind: 'not_administered', motivo, note },
                        options?.confirmed === true,
                      )
                  : undefined
              }
            />
          </div>
        ))}
      {feedback && (
        <p
          className={`drug-dose-panel__feedback is-${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

function PrnPanel({
  patientId,
  therapy,
  canAdminister,
  needsConfirmation,
  onRecorded,
}: {
  patientId: string;
  therapy: PatientTherapyAPI;
  canAdminister: boolean;
  needsConfirmation: boolean;
  onRecorded?: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const key = `${patientId}|${therapy.id}|${revision}`;
  const [loaded, setLoaded] = useState<
    | { key: string; status: 'ready'; items: PrnAdministration[] }
    | { key: string; status: 'error' }
    | null
  >(null);
  const state = loaded?.key === key ? loaded : { status: 'loading' as const };
  const [indication, setIndication] = useState('');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [askConfirm, setAskConfirm] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submission] = useState(createSubmissionKey);

  useEffect(() => {
    const controller = new AbortController();
    loadPrnAdministrations(patientId, undefined, controller.signal).then(
      (items) => setLoaded({ key, status: 'ready', items }),
      () => {
        if (!controller.signal.aborted) setLoaded({ key, status: 'error' });
      },
    );
    return () => controller.abort();
  }, [patientId, key]);

  const doses =
    state.status === 'ready' ? state.items.filter((item) => item.therapyId === therapy.id) : [];
  const indicationMissing = !indication.trim();

  async function submit(confirmed: boolean) {
    if (sending) return;
    setSending(true);
    setFeedback(null);
    const request = {
      patientId,
      therapyId: therapy.id,
      indicazione: indication,
      note,
    };
    const result = await recordPrnAdministration(
      { ...request, requestId: submission.for(request) },
      { confirmed },
    );
    setSending(false);
    if (result.ok) {
      submission.reset();
      setIndication('');
      setNote('');
      setAttempted(false);
      setFeedback({
        tone: 'ok',
        text: `Somministrazione al bisogno di ${result.record.drugName} registrata alle ${administeredTime(result.record.administeredAt) ?? '—'}.`,
      });
      setRevision((v) => v + 1);
      onRecorded?.();
    } else {
      setFeedback({ tone: 'error', text: result.message });
    }
  }

  function start() {
    setAttempted(true);
    if (indicationMissing || sending) return;
    if (needsConfirmation) setAskConfirm(true);
    else void submit(false);
  }

  const idBase = `prn-${therapy.id}`;
  return (
    <div className="drug-dose-panel__prn">
      <h5 className="drug-dose-panel__title">Al bisogno · dosi di oggi</h5>
      {state.status === 'loading' && <p role="status">Caricamento delle dosi al bisogno…</p>}
      {state.status === 'error' && (
        <p role="alert" className="drug-dose-panel__msg">
          Impossibile caricare le dosi al bisogno di oggi.
        </p>
      )}
      {state.status === 'ready' && doses.length === 0 && (
        <p className="drug-dose-panel__msg">Nessuna dose al bisogno somministrata oggi.</p>
      )}
      {doses.length > 0 && (
        <ul className="drug-dose-panel__prn-list" aria-label="Dosi al bisogno di oggi">
          {doses.map((dose) => (
            <li key={dose.id}>
              <span className="giro-badge giro-badge--ok">
                {administeredTime(dose.administeredAt) ?? '—'} · {dose.administeredBy}
              </span>
              <span>
                {dose.dosage} · {dose.route}
              </span>
              <span className="drug-dose-panel__indication">Indicazione: {dose.indication}</span>
              {dose.note && <span className="drug-dose-panel__indication">Nota: {dose.note}</span>}
            </li>
          ))}
        </ul>
      )}
      {canAdminister && (
        <div className="drug-dose-panel__prn-form" role="group" aria-label="Somministra al bisogno">
          <label htmlFor={`${idBase}-ind`} className="form-label">
            Indicazione (obbligatoria)
          </label>
          <textarea
            id={`${idBase}-ind`}
            className="form-input"
            rows={2}
            value={indication}
            aria-required="true"
            aria-invalid={attempted && indicationMissing ? 'true' : undefined}
            placeholder="Es. dolore 6/10, febbre 38,5 °C"
            onChange={(event) => setIndication(event.target.value)}
          />
          {attempted && indicationMissing && (
            <p className="drug-dose-panel__msg is-error" role="alert">
              Scrivi l’indicazione per cui somministri la dose al bisogno.
            </p>
          )}
          <label htmlFor={`${idBase}-note`} className="form-label">
            Nota (facoltativa)
          </label>
          <input
            id={`${idBase}-note`}
            className="form-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="drug-dose-panel__hint">
            Dose e ora le registra il sistema dalla prescrizione: {therapy.dosaggio || '—'} ·{' '}
            {therapy.viaSomministrazione || '—'}.
          </p>
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            disabled={sending}
            onClick={start}
          >
            {sending ? 'Invio…' : 'Somministra al bisogno'}
          </button>
        </div>
      )}
      {feedback && (
        <p
          className={`drug-dose-panel__feedback is-${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      )}
      <ConfirmDialog
        open={askConfirm}
        title="Confermi la somministrazione al bisogno?"
        message={`${therapy.farmacoNome} ${therapy.dosaggio}, ora. Indicazione: ${indication}. Il tuo ruolo registra la somministrazione con conferma esplicita.`}
        confirmLabel="Conferma somministrazione"
        tone="primary"
        busy={sending}
        onConfirm={() => {
          setAskConfirm(false);
          void submit(true);
        }}
        onCancel={() => setAskConfirm(false)}
      />
    </div>
  );
}

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
