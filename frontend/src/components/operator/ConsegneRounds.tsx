import { useEffect, useRef, useState } from 'react';
import type { Operatore, Paziente } from '../../types';
import type { ConsegnaCreate } from '../../lib/consegnaCreation';
import { submitConsegna, type ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { canAdvanceConsegna, type ConsegnaAdvanceToken } from '../../lib/consegnaAdvance';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { useConsegneRoster } from './useConsegneRoster';
import { ConsegnePatientRoster } from './ConsegnePatientRoster';
import { ConsegnaComposer } from './ConsegnaComposer';
export function ConsegneRounds({
  store,
  operatori,
  onAdd,
  active,
}: {
  store: ConsegnaDraftStore;
  operatori: Operatore[];
  onAdd: ConsegnaCreate;
  active: boolean;
}) {
  const [query, setQuery] = useState('');
  const [room, setRoom] = useState('');
  const [selected, setSelected] = useState<Paziente | null>(null);
  const [message, setMessage] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const selection = useRef({ id: '', generation: 0 });
  const lifecycle = useRef(0);
  useEffect(() => {
    const version = ++lifecycle.current;
    return () => {
      lifecycle.current = version + 1;
    };
  }, [active]);
  const roster = useConsegneRoster(query, room, active);
  const latestRoster = useRef(roster);
  useEffect(() => {
    latestRoster.current = roster;
  }, [roster]);
  const patient = selected
    ? (roster.items.find((item) => item.id === selected.id) ?? selected)
    : roster.items[0];
  function selectPatient(value: Paziente) {
    selection.current = { id: value.id, generation: selection.current.generation + 1 };
    setSelected(value);
    setMessage('');
    setFocusRequest((value) => value + 1);
  }
  const first = roster.items[0];
  useEffect(() => {
    if (selected || !first) return;
    const timer = window.setTimeout(() => {
      selection.current = { id: first.id, generation: selection.current.generation + 1 };
      setSelected(first);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected, first]);
  useEffect(() => {
    if (!active) selection.current.generation++;
  }, [active]);
  async function save(advance: boolean) {
    if (!patient || !active) return;
    const version = lifecycle.current;
    const token = store.begin(patient.id);
    if (!token) return;
    if (!selected) selectPatient(patient);
    setMessage('');
    const snapshot = roster.getSnapshot();
    const index = snapshot.items.findIndex((item) => item.id === patient.id);
    const successor = index >= 0 ? (snapshot.items[index + 1]?.id ?? null) : null;
    const frozen: ConsegnaAdvanceToken = {
      patientId: patient.id,
      successorId: successor,
      selection: selection.current.generation,
      roster: snapshot.generation,
      requestKey: snapshot.requestKey,
    };
    const continuation =
      advance && index >= 0 && !successor && snapshot.nextCursor
        ? roster.loadMore()
        : Promise.resolve(null);
    const saved = await submitConsegna(store, token, onAdd);
    if (!saved || version !== lifecycle.current) return;
    setLastSaved(`Consegna salvata per ${patient.lastName}, ${patient.firstName}.`);
    void latestRoster.current.refreshSummary([patient.id]);
    if (!advance) return;
    const nextPage = await continuation;
    if (version !== lifecycle.current) return;
    const current = latestRoster.current.getSnapshot();
    const stillCurrent = canAdvanceConsegna(
      frozen,
      {
        patientId: selection.current.id,
        selection: selection.current.generation,
        roster: current.generation,
        requestKey: current.requestKey,
      },
      store.hasCurrentReceipt(token),
    );
    if (!stillCurrent) return;
    const nextId = frozen.successorId ?? nextPage?.[0]?.id;
    const nextPatient = current.items.find((item) => item.id === nextId);
    if (nextPatient) selectPatient(nextPatient);
    else
      setMessage(
        'Consegna salvata. Il prossimo paziente non è disponibile: resta selezionato quello attuale.',
      );
  }
  const index = patient ? roster.items.findIndex((item) => item.id === patient.id) : -1;
  return (
    <section aria-label="Giro pazienti">
      <RosterOrderControl />
      <div className="handover-rounds__filters">
        <label>
          Cerca paziente
          <input
            type="search"
            className="form-input"
            value={query}
            maxLength={80}
            placeholder="Nome, cognome o codice fiscale"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Camera
          <input
            type="search"
            className="form-input"
            value={room}
            maxLength={80}
            placeholder="Filtra camera"
            onChange={(event) => setRoom(event.target.value)}
          />
        </label>
      </div>
      {roster.error && (
        <p role="alert">
          {roster.error}{' '}
          <button type="button" className="link-btn" onClick={roster.retry}>
            Ricarica giro
          </button>
        </p>
      )}
      {lastSaved && (
        <p role="status" aria-live="polite">
          {lastSaved}
        </p>
      )}
      <div className="handover-rounds__layout">
        <div className="handover-rounds__list" aria-busy={roster.loading}>
          {roster.loading && <p role="status">Caricamento pazienti…</p>}
          {!roster.loading && !roster.error && !roster.items.length && (
            <p>Nessun paziente per questi filtri.</p>
          )}
          <ConsegnePatientRoster
            patients={roster.items}
            selectedId={patient?.id}
            summaries={roster.summaries}
            store={store}
            onSelect={selectPatient}
            onRetry={(id) => void roster.refreshSummary([id])}
          />
          {roster.nextCursor && (
            <button
              type="button"
              className="btn-secondary"
              disabled={roster.loading || roster.loadingMore}
              onClick={() => void roster.loadMore()}
            >
              {roster.loadingMore ? 'Caricamento…' : 'Carica altri pazienti'}
            </button>
          )}
        </div>
        <div>
          {patient && index < 0 && (
            <p role="status">
              Paziente selezionato fuori dall’elenco corrente. La bozza è conservata.
            </p>
          )}
          {patient ? (
            <ConsegnaComposer
              key={patient.id}
              patient={patient}
              store={store}
              operatori={operatori}
              onSave={(advance) => void save(advance)}
              nextAvailable={
                index >= 0 && (index < roster.items.length - 1 || Boolean(roster.nextCursor))
              }
              message={message}
              focusRequest={focusRequest}
            />
          ) : (
            <p>Seleziona un paziente per scrivere una consegna.</p>
          )}
        </div>
      </div>
    </section>
  );
}
