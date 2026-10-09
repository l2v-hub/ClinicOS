import { useEffect, useId, useRef, useState } from 'react';
import type { Operatore, Paziente } from '../../types';
import type { ConsegnaCreate } from '../../lib/consegnaCreation';
import { submitConsegna, type ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { canAdvanceConsegna, type ConsegnaAdvanceToken } from '../../lib/consegnaAdvance';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { TURNO_LABEL, turnoDaOra } from '../../lib/turno';
import { useConsegneRoster } from './useConsegneRoster';
import { ConsegnePatientRoster } from './ConsegnePatientRoster';
import { ConsegnaComposer } from './ConsegnaComposer';
import { DiarioPazienteTab } from './cartella/DiarioPazienteTab';
import { PatientIdentity } from '../shared/PatientIdentity';
import { useCan } from '../../lib/capabilities';
import { useConsegnaDraft } from '../../lib/useConsegnaDraft';
import { fetchPatientById } from '../../lib/patientPage';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
export function ConsegneRounds({
  store,
  operatori,
  onAdd,
  active,
  initialPatientId,
}: {
  store: ConsegnaDraftStore;
  operatori: Operatore[];
  onAdd: ConsegnaCreate;
  active: boolean;
  initialPatientId?: string;
}) {
  const [query, setQuery] = useState('');
  const [room, setRoom] = useState('');
  const [selected, setSelected] = useState<Paziente | null>(null);
  const [message, setMessage] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [targetError, setTargetError] = useState('');
  const [targetRetry, setTargetRetry] = useState(0);
  const [requestedView, setView] = useState<'diary' | 'compose'>('diary');
  const workspaceId = useId();
  const canCreate = useCan('consegne.create');
  const view = canCreate ? requestedView : 'diary';
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
    : initialPatientId
      ? roster.items.find((item) => item.id === initialPatientId)
      : roster.items[0];
  function selectPatient(value: Paziente) {
    selection.current = { id: value.id, generation: selection.current.generation + 1 };
    setSelected(value);
    setMessage('');
    if (view === 'compose') setFocusRequest((value) => value + 1);
  }
  function openComposer() {
    setView('compose');
    setFocusRequest((value) => value + 1);
  }
  const first = initialPatientId
    ? roster.items.find((item) => item.id === initialPatientId)
    : roster.items[0];
  useEffect(() => {
    if (!active || !initialPatientId) return;
    const controller = new AbortController();
    setTargetError('');
    void fetchPatientById(API_URL, initialPatientId, {
      headers: operatorHeaders(),
      signal: controller.signal,
    })
      .then((value) => {
        if (controller.signal.aborted) return;
        if (selection.current.id && selection.current.id !== initialPatientId) return;
        if (value.id !== initialPatientId) throw new Error('Paziente non disponibile');
        selection.current = { id: value.id, generation: selection.current.generation + 1 };
        setSelected(value);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setTargetError(
            'Il paziente richiesto non è disponibile. Nessun altro paziente è stato selezionato.',
          );
      });
    return () => controller.abort();
  }, [active, initialPatientId, targetRetry]);
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
    setHistoryVersion((value) => value + 1);
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
      <div className="handover-rounds__layout">
        <div className="handover-rounds__list" aria-busy={roster.loading}>
          <span className="ho-eyebrow">Turno {TURNO_LABEL[turnoDaOra(new Date())]}</span>
          <div className="handover-rounds__filters">
            <label>
              <span className="ho-label">Cerca paziente</span>
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
              <span className="ho-label">Camera</span>
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
          <button
            type="button"
            className="ds-link"
            aria-expanded={showOrder}
            aria-controls="ho-order"
            onClick={() => setShowOrder((value) => !value)}
          >
            Ordine del giro
          </button>
          {showOrder && (
            <div id="ho-order">
              <RosterOrderControl />
            </div>
          )}
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
        <div className="handover-rounds__detail">
          {targetError && (
            <p role="alert">
              {targetError}{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => setTargetRetry((value) => value + 1)}
              >
                Riprova paziente
              </button>
            </p>
          )}
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
          {patient && index < 0 && (
            <p role="status">
              Paziente selezionato fuori dall’elenco corrente. La bozza è conservata.
            </p>
          )}
          {patient ? (
            <>
              <header className="handover-rounds__patient-heading">
                <PatientIdentity patient={patient} />
                <a className="ds-link" href={`#/dettaglio-paziente/${patient.id}`}>
                  Apri cartella ↗
                </a>
              </header>
              <div
                className="handover-rounds__tabs"
                role="tablist"
                aria-label="Diario e nuova nota"
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  if (!canCreate) return;
                  event.preventDefault();
                  setFocusRequest(0);
                  const next =
                    event.key === 'Home'
                      ? 'diary'
                      : event.key === 'End'
                        ? 'compose'
                        : view === 'diary'
                          ? 'compose'
                          : 'diary';
                  setView(next);
                  document.getElementById(`${workspaceId}-${next}-tab`)?.focus();
                }}
              >
                <button
                  type="button"
                  role="tab"
                  id={`${workspaceId}-diary-tab`}
                  aria-selected={view === 'diary'}
                  aria-controls={`${workspaceId}-diary-panel`}
                  tabIndex={view === 'diary' ? 0 : -1}
                  onClick={() => setView('diary')}
                >
                  Diario paziente
                </button>
                {canCreate && (
                  <button
                    type="button"
                    role="tab"
                    id={`${workspaceId}-compose-tab`}
                    aria-selected={view === 'compose'}
                    aria-controls={`${workspaceId}-compose-panel`}
                    tabIndex={view === 'compose' ? 0 : -1}
                    onClick={openComposer}
                  >
                    <span aria-hidden="true">＋</span> Nuova nota{' '}
                    <DraftIndicator store={store} patientId={patient.id} />
                  </button>
                )}
              </div>
              <div
                role="tabpanel"
                id={`${workspaceId}-diary-panel`}
                aria-labelledby={`${workspaceId}-diary-tab`}
                hidden={view !== 'diary'}
                className="handover-rounds__history"
              >
                <DiarioPazienteTab
                  key={`history:${patient.id}:${historyVersion}`}
                  pazienteId={patient.id}
                  operatoreNome=""
                  headerActions={
                    canCreate ? (
                      <button
                        type="button"
                        className="ds-btn ds-btn--secondary"
                        onClick={openComposer}
                      >
                        ＋ Nuova nota
                      </button>
                    ) : null
                  }
                />
              </div>
              <div
                role="tabpanel"
                id={`${workspaceId}-compose-panel`}
                aria-labelledby={`${workspaceId}-compose-tab`}
                hidden={view !== 'compose'}
              >
                <ConsegnaComposer
                  key={patient.id}
                  embedded
                  patient={patient}
                  store={store}
                  operatori={operatori}
                  onSave={(advance) => void save(advance)}
                  nextAvailable={
                    index >= 0 && (index < roster.items.length - 1 || Boolean(roster.nextCursor))
                  }
                  message={message}
                  focusRequest={view === 'compose' ? focusRequest : 0}
                  onTherapyCreated={() => setHistoryVersion((value) => value + 1)}
                />
              </div>
            </>
          ) : (
            <p>Seleziona un paziente per scrivere una consegna.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function DraftIndicator({ store, patientId }: { store: ConsegnaDraftStore; patientId: string }) {
  const draft = useConsegnaDraft(store, patientId);
  return draft.dirty ? <span className="handover-rounds__draft-chip">Bozza</span> : null;
}
