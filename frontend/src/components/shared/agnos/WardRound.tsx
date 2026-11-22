import { useEffect, useState, useSyncExternalStore } from 'react';
import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import { fetchPatientPage } from '../../../lib/patientPage';
import {
  PARAMETER_OPTIONS,
  ParameterReadingSaveError,
  saveParameterReading,
} from '../../../lib/patientParameterReadings';
import {
  ROUND_LABELS,
  applyDictation,
  assignUnassigned,
  draftIssue,
  draftRequest,
  roundSummary,
  startRound,
  updateDraft,
  type RoundDraft,
  type RoundKey,
  type RoundPatient,
  type RoundState,
} from '../../../lib/wardRound';
import { useVoiceInput } from './useVoiceInput';
import { MicIcon } from './AgnosVoiceIcons';

// Milo fase 4: giro visita a voce. Le bozze vivono solo nella memoria della pagina (mai
// nell'archivio del browser) e sopravvivono alla chiusura del pannello finché il giro è aperto.
// Si scrive SOLO alla conferma di ciascun paziente, con la rotta della pagina Parametri.

let roundState: RoundState | null = null;
const listeners = new Set<() => void>();
const setRound = (next: RoundState | null) => {
  roundState = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => roundState;
export function useWardRound() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
/** Stato del giro (anche per i test): null = nessun giro aperto. */
export function setWardRoundState(next: RoundState | null) {
  setRound(next);
}
export function getWardRoundState() {
  return roundState;
}

type SaveReading = typeof saveParameterReading;
/**
 * Conferma di UN paziente: una sola rilevazione con i suoi valori alla rotta della pagina Parametri.
 * Errore ⇒ la bozza resta, con lo stesso requestId per il nuovo tentativo.
 */
export async function confirmWardRoundDraft(key: string, save: SaveReading = saveParameterReading) {
  const draft = roundState?.drafts.find((d) => d.key === key);
  if (!roundState || !draft || draftIssue(draft) || !['bozza', 'errore'].includes(draft.status))
    return;
  setRound(updateDraft(roundState, key, { status: 'invio', error: undefined }));
  try {
    await save(API_URL, draft.patientId, draftRequest(draft), { headers: operatorHeaders() });
    if (roundState) setRound(updateDraft(roundState, key, { status: 'registrato' }));
  } catch (error) {
    const message =
      error instanceof ParameterReadingSaveError ? error.message : 'Registrazione non riuscita.';
    if (roundState) setRound(updateDraft(roundState, key, { status: 'errore', error: message }));
  }
}

const KEYS: RoundKey[] = ['pa', 'spo2', 'fc', 'fr', 'temperatura', 'dtx', 'o2', 'coscienza'];
const PLACEHOLDER: Partial<Record<RoundKey, string>> = {
  pa: '120/80',
  spo2: '%',
  fc: 'bpm',
  fr: 'atti/min',
  temperatura: '°C',
  dtx: 'mg/dL',
};
const STATUS_LABEL: Record<RoundDraft['status'], string> = {
  bozza: 'Bozza',
  invio: 'Registrazione…',
  registrato: 'Registrato',
  errore: 'Da riprovare',
  scartato: 'Scartato',
};

function patientName(p: RoundPatient | undefined) {
  if (!p) return 'Paziente';
  const place = [p.room ? `stanza ${p.room}` : '', p.bed ? `letto ${p.bed}` : '']
    .filter(Boolean)
    .join(' · ');
  return `${p.lastName} ${p.firstName}${place ? ` — ${place}` : ''}`;
}

function DraftCard({
  draft,
  patient,
  onChange,
  onConfirm,
  onDiscard,
}: {
  draft: RoundDraft;
  patient?: RoundPatient;
  onChange: (values: RoundDraft['values']) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const locked =
    draft.status === 'registrato' || draft.status === 'invio' || draft.status === 'scartato';
  const issue = locked ? null : draftIssue(draft);
  return (
    <article
      className={`ward-round__draft ward-round__draft--${draft.status}`}
      aria-label={patientName(patient)}
    >
      <header className="ward-round__draft-head">
        <strong>{patientName(patient)}</strong>
        <span className="ward-round__status">{STATUS_LABEL[draft.status]}</span>
      </header>
      <div className="ward-round__values">
        {KEYS.map((key) => {
          const id = `${draft.key}-${key}`;
          const options = PARAMETER_OPTIONS[key as keyof typeof PARAMETER_OPTIONS];
          const value = draft.values[key] ?? '';
          const set = (v: string) => onChange({ ...draft.values, [key]: v || undefined });
          return (
            <label key={key} htmlFor={id} className={value ? 'is-filled' : ''}>
              <span>{ROUND_LABELS[key]}</span>
              {options ? (
                <select
                  id={id}
                  className="form-input"
                  value={value}
                  disabled={locked}
                  onChange={(e) => set(e.target.value)}
                >
                  <option value="">—</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  className="form-input"
                  inputMode={key === 'pa' ? 'text' : 'decimal'}
                  placeholder={PLACEHOLDER[key]}
                  value={value}
                  disabled={locked}
                  onChange={(e) => set(e.target.value.trim())}
                />
              )}
            </label>
          );
        })}
      </div>
      {draft.notes.length > 0 && (
        <ul className="ward-round__notes">
          {draft.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {draft.error && (
        <p className="ward-round__error" role="alert">
          {draft.error}
        </p>
      )}
      {issue && !draft.error && <p className="ward-round__issue">{issue}</p>}
      {!locked && (
        <div className="ward-round__actions">
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            disabled={!!issue}
            onClick={onConfirm}
          >
            Conferma e registra
          </button>
          <button type="button" className="ds-btn ds-btn--secondary" onClick={onDiscard}>
            Scarta
          </button>
        </div>
      )}
    </article>
  );
}

export function WardRound({
  onClose,
  initialRoster,
}: {
  onClose: () => void;
  /** Elenco già noto (test); altrimenti i primi 100 pazienti del perimetro dal backend. */
  initialRoster?: RoundPatient[];
}) {
  const round = useWardRound();
  const [roster, setRoster] = useState<RoundPatient[] | null>(initialRoster ?? null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [consentAsked, setConsentAsked] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!roundState) setRound(startRound());
    if (initialRoster) return;
    const controller = new AbortController();
    fetchPatientPage(
      API_URL,
      { limit: 100 },
      { headers: operatorHeaders(), signal: controller.signal },
    )
      .then((page) =>
        setRoster(
          page.items.map((p) => ({
            id: p.id,
            lastName: p.lastName ?? '',
            firstName: p.firstName ?? '',
            room: p.location?.room ?? null,
            bed: p.location?.bed ?? null,
          })),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted)
          setRosterError('Elenco dei pazienti non disponibile: riprova più tardi.');
      });
    return () => controller.abort();
  }, [initialRoster]);

  const dictate = (raw: string) => {
    if (!roster || !roundState || !raw.trim()) return;
    setRound(applyDictation(roundState, raw, roster));
  };
  const voice = useVoiceInput({ onFinalTranscript: dictate });
  const byId = new Map((roster ?? []).map((p) => [p.id, p]));

  if (!round) return null;
  const summary = roundSummary(round);

  function finish() {
    voice.cancel();
    setRound(null);
    onClose();
  }

  if (ending)
    return (
      <section className="ward-round" aria-label="Riepilogo del giro visita">
        <h3 className="ward-round__title">Fine giro</h3>
        <p className="ward-round__lead">
          Registrati {summary.registered.length} · in bozza {summary.pending.length} · non
          attribuiti {summary.unassigned.length}
        </p>
        {summary.registered.length > 0 && (
          <div className="ward-round__group">
            <h4>Registrati nella pagina Parametri</h4>
            <ul>
              {summary.registered.map((d) => (
                <li key={d.key}>
                  <strong>{patientName(byId.get(d.patientId))}</strong>:{' '}
                  {Object.entries(d.values)
                    .map(([k, v]) => `${ROUND_LABELS[k as RoundKey]} ${v}`)
                    .join(' · ')}
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary.pending.length > 0 && (
          <div className="ward-round__group ward-round__group--warn">
            <h4>Non registrati (andranno persi chiudendo il giro)</h4>
            <ul>
              {summary.pending.map((d) => (
                <li key={d.key}>{patientName(byId.get(d.patientId))}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.unassigned.length > 0 && (
          <div className="ward-round__group ward-round__group--warn">
            <h4>Dettature senza paziente</h4>
            <ul>
              {summary.unassigned.map((u, i) => (
                <li key={i}>«{u.text}»</li>
              ))}
            </ul>
          </div>
        )}
        <div className="ward-round__actions">
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => setEnding(false)}
          >
            Torna al giro
          </button>
          <button type="button" className="ds-btn ds-btn--primary" onClick={finish}>
            Chiudi il giro
          </button>
        </div>
      </section>
    );

  const visible = round.drafts.filter((d) => d.status !== 'scartato');
  return (
    <section className="ward-round" aria-label="Giro visita">
      <div className="ward-round__bar">
        <h3 className="ward-round__title">Giro visita</h3>
        <div className="ward-round__bar-actions">
          <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
            Riduci
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => setEnding(true)}
          >
            Termina giro
          </button>
        </div>
      </div>
      <p className="ward-round__lead">
        Detta paziente e parametri di seguito, anche più pazienti: «Rossi pressione 140 su 85,
        saturazione 95, vigile. Letto 4 temperatura 37 e 8». Niente è registrato finché non confermi
        il paziente.
      </p>
      {rosterError && (
        <p className="ward-round__error" role="alert">
          {rosterError}
        </p>
      )}
      {consentAsked && !voice.consentGranted ? (
        <div className="agnos-consent-prompt">
          <strong>Usa la voce per il giro</strong>
          <p>
            Il servizio vocale del browser può elaborare l’audio online. Il testo dettato resta in
            questa pagina come bozza: i dati sono salvati solo quando confermi ciascun paziente.
          </p>
          <div className="ward-round__actions">
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              onClick={() => {
                setConsentAsked(false);
                void voice.grantConsentAndStart();
              }}
            >
              Attiva microfono
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={() => setConsentAsked(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <div className="ward-round__input">
          <textarea
            className="form-input"
            rows={2}
            value={voice.listening ? voice.interimText : text}
            readOnly={voice.active}
            placeholder="Detta o scrivi: paziente e parametri…"
            aria-label="Dettatura del giro"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                dictate(text);
                setText('');
              }
            }}
          />
          <div className="ward-round__actions">
            <button
              type="button"
              className={`ds-btn ${voice.active ? 'ds-btn--primary' : 'ds-btn--secondary'}`}
              disabled={!roster || !voice.supported}
              aria-pressed={voice.active}
              onClick={() => {
                if (voice.active) voice.stop();
                else if (voice.consentGranted) void voice.start();
                else setConsentAsked(true);
              }}
            >
              <MicIcon /> {voice.active ? 'Fine dettatura' : 'Detta'}
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              disabled={!roster || !text.trim() || voice.active}
              onClick={() => {
                dictate(text);
                setText('');
              }}
            >
              Aggiungi
            </button>
          </div>
          {voice.error && (
            <p className="ward-round__error" role="alert">
              {voice.error}
            </p>
          )}
        </div>
      )}

      {round.unassigned.length > 0 && (
        <div className="ward-round__group ward-round__group--warn">
          <h4>Da attribuire</h4>
          <ul>
            {round.unassigned.map((u, i) => (
              <li key={i}>
                <span>«{u.text}»</span>
                {u.notes.length > 0 && (
                  <span className="ward-round__note-inline"> — {u.notes.join('; ')}</span>
                )}
                {u.candidates?.length ? (
                  <span className="ward-round__assign">
                    {u.candidates.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="ds-btn ds-btn--secondary"
                        onClick={() => roundState && setRound(assignUnassigned(roundState, i, id))}
                      >
                        {patientName(byId.get(id))}
                      </button>
                    ))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="ward-round__empty">Nessun paziente ancora: inizia a dettare.</p>
      ) : (
        <div className="ward-round__drafts">
          {visible.map((draft) => (
            <DraftCard
              key={draft.key}
              draft={draft}
              patient={byId.get(draft.patientId)}
              onChange={(values) =>
                roundState && setRound(updateDraft(roundState, draft.key, { values }))
              }
              onConfirm={() => void confirmWardRoundDraft(draft.key)}
              onDiscard={() =>
                roundState && setRound(updateDraft(roundState, draft.key, { status: 'scartato' }))
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
