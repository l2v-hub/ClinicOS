// Dettaglio di un orario del calendario terapie del paziente: le terapie programmate a quell'ora e,
// per i ruoli che possono registrarla, la somministrazione con le stesse azioni del giro terapia
// (TherapyGiroRows) e gli stessi endpoint. Nessuna regola nuova: stato e conferme vengono dal server.
import { useEffect, useState } from 'react';
import type { MotivoNonErogazione, TherapyActionInfo, TherapySlot } from '../../../types';
import type { CalendarOccurrence } from '../../../lib/patientTherapyCalendar';
import { API_URL } from '../../../config';
import { cachedGetJson } from '../../../lib/cachedFetch';
import { useCan, useCapabilityDecided, useRequiresConfirmation } from '../../../lib/capabilities';
import { getCurrentOperator } from '../../../lib/operatorSession';
import { patientGiroTime, type GiroTime } from '../../../lib/therapyGiro';
import { recordAdministration } from '../../../lib/therapyAdministrationWrite';
import { TherapyGiroRows } from '../TherapyGiroRows';
// Le righe del giro portano con sé i loro stili (badge, pulsanti, motivi), anche fuori dal giro.
import '../TherapyRoundsPage.css';

// Lo stato vale solo per la richiesta da cui è nato (paziente, data, ora, ricarica).
type LoadState =
  { key: string; status: 'error' } | { key: string; status: 'ready'; time: GiroTime | null };

interface Props {
  patientId: string;
  date: string;
  time: string;
  events: CalendarOccurrence[];
  onClose: () => void;
}

export function PatientTherapySlotDetail({ patientId, date, time, events, onClose }: Props) {
  // Stessa regola del giro (App): entrambe le capability, mai la vista gestionale dell'admin.
  const canConfirm = useCan('administration.confirm');
  const canRecordNot = useCan('administration.record_not_administered');
  // Con la policy attiva decide la mappa delle capability (supervisore «con conferma» incluso);
  // senza mappa resta la regola storica: mai la vista gestionale dell'admin.
  const decided = useCapabilityDecided('administration.confirm');
  const canAdminister =
    canConfirm && canRecordNot && (decided || getCurrentOperator()?.role !== 'admin');
  const needsConfirmation = useRequiresConfirmation('administration.confirm');
  const [revision, setRevision] = useState(0);
  const requestKey = `${patientId}|${date}|${time}|${revision}`;
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const state = loaded?.key === requestKey ? loaded : { status: 'loading' as const };
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    cachedGetJson<TherapySlot[]>(`${API_URL}/therapy-slots?date=${date}`).then(
      (slots) => {
        if (active)
          setLoaded({
            key: requestKey,
            status: 'ready',
            time: patientGiroTime(Array.isArray(slots) ? slots : [], patientId, time),
          });
      },
      () => {
        if (active) setLoaded({ key: requestKey, status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [patientId, date, time, requestKey]);

  async function record(
    info: TherapyActionInfo,
    outcome: Parameters<typeof recordAdministration>[1],
    confirmed = false,
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
  }

  const headingId = `ptc-detail-${time.replace(':', '')}`;
  return (
    <section
      className="patient-therapy-slot-detail"
      aria-labelledby={headingId}
      data-testid="patient-therapy-slot-detail"
    >
      <header className="patient-therapy-slot-detail__head">
        <h4 id={headingId}>
          Ore {time} · {events.length} {events.length === 1 ? 'terapia' : 'terapie'}
        </h4>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
          Chiudi
        </button>
      </header>
      <h5 className="patient-therapy-slot-detail__sub">Somministrazione del {formatDay(date)}</h5>
      {state.status === 'loading' && <p role="status">Caricamento dello stato…</p>}
      {state.status === 'error' && (
        <div role="alert" className="patient-therapy-slot-detail__msg">
          Impossibile caricare lo stato della somministrazione.{' '}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setRevision((v) => v + 1)}
          >
            Riprova
          </button>
        </div>
      )}
      {state.status === 'ready' && !state.time && (
        <p className="patient-therapy-slot-detail__msg">
          Nessuna somministrazione prevista a quest’ora per questa data.
        </p>
      )}
      {state.status === 'ready' && state.time && (
        <>
          {!canAdminister && (
            <p className="patient-therapy-slot-detail__msg">
              Il tuo ruolo consulta lo stato ma non registra la somministrazione.
            </p>
          )}
          <TherapyGiroRows
            time={state.time}
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
        </>
      )}
      {feedback && (
        <p
          className={`patient-therapy-slot-detail__feedback is-${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      )}
    </section>
  );
}

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
