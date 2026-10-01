// AI Assistant — full-screen operational mode (Phase 4, Prompt 4 §3–§14).
//
// UI → /skills (Agno skill router → skill → policy/scope → Tool Layer → backend) → UI.
// The component never decides permissions: identity, role, skills, starters, resident scope and
// workflow state all come from the server. «Conferma» is an explicit UI event bound to the preview
// id shown; «Modifica» returns to an editable state (new preview id); «Annulla» writes nothing.
//
// Phase 5 (voice): push-to-talk → local VAD → STT → transcript REVIEWED by the user → the SAME
// `submitText(text, 'voice')` as the keyboard; confirmation stays a button (never spoken).

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  converse,
  loadAssistantSession,
  searchResidents,
  selectResident,
  type AssistantPreview,
  type AssistantResident,
  type ClassicScreen,
  type ConverseRequest,
} from './assistantApi';
import {
  STATUS_LABELS,
  assistantReducer,
  canConfirm,
  canRetry,
  initialAssistantState,
  therapyAttachment,
  isActive,
  prescriptionPayload,
} from './assistantState';
import { VoiceMicButton, VoicePanel } from './voice/VoicePanel';
import { useVoiceChannel } from './voice/useVoiceChannel';
import { capturing, type AssistantTurnStatus } from './voice/audioSession';
import './AssistantMode.css';

export type AssistantInputSource = 'keyboard' | 'starter' | 'voice';

interface Props {
  /** Resident of the classic page the user came from (verified by the server before use). */
  pageResident: { id: string; label?: string } | null;
  onClose: () => void;
  /** Fallback to the classic GUI (Prompt 4 §13). */
  onOpenClassic: (screen: ClassicScreen) => void;
}

const VALUE_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'pa', label: 'Pressione', placeholder: '120/80' },
  { key: 'spo2', label: 'SpO₂ %', placeholder: '97' },
  { key: 'fc', label: 'Freq. cardiaca', placeholder: '72' },
  { key: 'temperatura', label: 'Temperatura', placeholder: '36.8' },
  { key: 'fr', label: 'Freq. respiratoria', placeholder: '16' },
  { key: 'dtx', label: 'Glicemia (DTX)', placeholder: '110' },
];

const CLASS_LABELS: Record<AssistantPreview['confirmationClass'], string> = {
  READ: 'Lettura',
  LOW_RISK_WRITE: 'Scrittura',
  SENSITIVE_WRITE: 'Scrittura clinica',
  HIGH_RISK: 'Azione clinica critica',
};

function resultReferences(result: unknown): string[] {
  if (!result || typeof result !== 'object') return [];
  return Object.entries(result as Record<string, unknown>)
    .filter(([key, value]) => /Id$/.test(key) && typeof value === 'string' && value)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 12)}…`);
}

export function AssistantMode({ pageResident, onClose, onOpenClassic }: Props) {
  const [state, dispatch] = useReducer(assistantReducer, initialAssistantState);
  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<AssistantResident[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mainEnd = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const residentId = state.resident?.id ?? null;
  /** Latest voice channel callback: server outcome of every turn → audio session state. */
  const voiceTurn = useRef<(status: AssistantTurnStatus | 'REQUEST_FAILED') => void>(() => {});

  const refreshSession = useCallback(async (resident: string | null) => {
    try {
      dispatch({ type: 'session_loaded', session: await loadAssistantSession(resident) });
    } catch (error) {
      dispatch({
        type: 'session_failed',
        message: error instanceof Error ? error.message : 'Assistente non disponibile',
      });
    }
  }, []);

  useEffect(() => {
    void refreshSession(pageResident?.id ?? null);
    inputRef.current?.focus();
  }, [pageResident?.id, refreshSession]);

  // Keep the latest turn AND its card (preview / choices / result) in view.
  useEffect(() => {
    mainEnd.current?.scrollIntoView?.({ block: 'end' });
  }, [state.transcript.length, state.workflow?.status, state.workflow?.preview?.previewId]);

  const workflow = state.workflow;
  const active = isActive(workflow);

  /** Single entry for every server turn: no double submit, context always attached. */
  const send = useCallback(
    async (
      body: Omit<ConverseRequest, 'context'>,
      userText?: string,
      contextId = residentId,
      source?: AssistantInputSource,
    ) => {
      if (inFlight.current) return;
      inFlight.current = true;
      dispatch({
        type: 'request_started',
        userText,
        source,
        confirming: body.action === 'confirm' ? (body.previewId ?? null) : null,
      });
      try {
        let response = await converse({
          ...body,
          context: { currentPatientId: contextId },
          ...(source === 'voice' ? { inputChannel: 'voice' as const } : {}),
        });
        // Prescription draft: attach the therapy built with the classic mapper → the preview is
        // rebuilt from that exact payload (and gets a new previewId) before any «Conferma».
        const therapy = therapyAttachment(response);
        if (therapy && response.workflowId) {
          response = await converse({
            workflowId: response.workflowId,
            action: 'edit',
            payload: { therapy },
            context: { currentPatientId: contextId },
          });
        }
        dispatch({ type: 'response', response });
        voiceTurn.current(response.status);
        if (response.status === 'COMPLETED' || response.status === 'DENIED') {
          // Capabilities may have changed (e.g. revocation): refresh skills/starters from the server.
          void refreshSession(contextId);
        }
      } catch (error) {
        dispatch({
          type: 'request_failed',
          message: error instanceof Error ? error.message : 'Errore imprevisto',
        });
        voiceTurn.current('REQUEST_FAILED');
      } finally {
        inFlight.current = false;
      }
    },
    [refreshSession, residentId],
  );

  /** Text-to-command entry (keyboard today, voice in Prompt 5: same function, source 'voice'). */
  function submitText(text: string, source: AssistantInputSource) {
    const message = text.trim();
    if (!message || state.busy) return;
    setDraft('');
    void send(
      { message, ...(active && workflow?.workflowId ? { workflowId: workflow.workflowId } : {}) },
      message,
      residentId,
      source,
    );
  }

  const voice = useVoiceChannel({
    residentId,
    busy: state.busy,
    onSubmit: (text) => submitText(text, 'voice'),
    onSwitchToText: (text) => {
      setDraft(text);
      inputRef.current?.focus();
    },
  });
  useEffect(() => {
    voiceTurn.current = voice.onAssistant;
  }, [voice.onAssistant]);

  async function changeResident(next: AssistantResident | null) {
    setPickerOpen(false);
    setPickerQuery('');
    const previous = residentId;
    dispatch({
      type: 'resident_set',
      resident: next,
      notice: next ? `Ospite attivo: ${next.label}` : 'Contesto ospite chiuso.',
    });
    // Sensitive workflow + resident change → the backend invalidates it now (Prompt 4 §6).
    if (active && workflow?.workflowId && (next?.id ?? null) !== previous) {
      await send(
        { workflowId: workflow.workflowId, action: 'cancel' },
        undefined,
        next?.id ?? null,
      );
    }
    void refreshSession(next?.id ?? null);
  }

  async function pickResident(candidate: AssistantResident) {
    setPickerError(null);
    try {
      const { resident } = await selectResident(candidate.id); // backend scope check
      await changeResident(resident);
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : 'Ospite non selezionabile');
    }
  }

  useEffect(() => {
    if (!pickerOpen) return;
    const q = pickerQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      searchResidents(q)
        .then(({ residents }) => setPickerResults(residents))
        .catch((error) =>
          setPickerError(error instanceof Error ? error.message : 'Ricerca non disponibile'),
        );
    }, 250);
    return () => clearTimeout(timer);
  }, [pickerOpen, pickerQuery]);

  function confirmPreview(preview: AssistantPreview) {
    if (!canConfirm(state)) return;
    // The payload is already bound to this preview on the server: confirm = preview id only.
    void send({
      workflowId: workflow!.workflowId!,
      action: 'confirm',
      previewId: preview.previewId,
    });
  }

  function submitEdit(edit: NonNullable<ConverseRequest['edit']>) {
    if (!workflow?.workflowId) return;
    void send({ workflowId: workflow.workflowId, action: 'edit', edit });
  }

  // Prompt 4 §12: the resident an open operation targets is always shown, even if not the context.
  const operationTarget = isActive(workflow) ? (workflow?.resident ?? null) : null;
  const visiblePickerResults = pickerQuery.trim().length >= 2 ? pickerResults : [];
  const session = state.session;
  const preview = workflow?.status === 'NEEDS_CONFIRMATION' ? (workflow.preview ?? null) : null;
  const prescription =
    preview?.skillId === 'therapy.prescribe' && !preview.therapyBound
      ? prescriptionPayload(preview)
      : null;
  const showConfirm = Boolean(preview) && canConfirm(state);

  return (
    <div
      ref={dialogRef}
      className="am"
      role="dialog"
      aria-modal="true"
      aria-label="Assistente AI"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !state.busy) {
          e.stopPropagation();
          // First Escape stops an open microphone / pending transcript; the next one closes.
          if (capturing(voice.audio.state) || voice.audio.state === 'TRANSCRIPT_FINAL') {
            voice.cancel();
            return;
          }
          onClose();
          return;
        }
        if (e.key !== 'Tab' || !dialogRef.current) return;
        // Focus trap: Tab / Shift+Tab stay inside the modal.
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
          ),
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <header className="am-header">
        <button type="button" className="ds-btn ds-btn--secondary am-back" onClick={onClose}>
          ← Torna all’applicazione
        </button>
        <h1 className="am-title">Assistente AI</h1>
        <div className="am-identity" data-testid="am-identity">
          {session ? (
            <>
              <span className="am-identity__name">{session.identity.name}</span>
              <span className="ds-badge ds-badge--info">{session.role.label}</span>
            </>
          ) : (
            <span className="am-muted">Caricamento…</span>
          )}
        </div>
      </header>

      <section className="am-resident" aria-label="Ospite attivo" data-testid="am-resident">
        <div className="am-resident__current">
          <span className="am-resident__label">Ospite attivo</span>
          <strong className="am-resident__name" data-testid="am-resident-name">
            {state.resident ? state.resident.label : 'Nessun ospite'}
          </strong>
          {operationTarget && operationTarget.id !== state.resident?.id && (
            <span className="am-resident__target" data-testid="am-operation-target">
              Operazione in corso per: <strong>{operationTarget.label}</strong>
            </span>
          )}
        </div>
        <div className="am-resident__actions">
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => setPickerOpen((open) => !open)}
            disabled={state.busy}
            aria-expanded={pickerOpen}
          >
            Cambia ospite
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => void changeResident(null)}
            disabled={state.busy || !state.resident}
          >
            Chiudi contesto
          </button>
        </div>
        {pickerOpen && (
          <div className="am-picker">
            <input
              className="am-input"
              type="search"
              placeholder="Cerca ospite per nome o cognome…"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              aria-label="Cerca ospite"
              autoFocus
            />
            {pickerError && <p className="am-error">{pickerError}</p>}
            <ul className="am-picker__list">
              {visiblePickerResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="am-picker__item"
                    onClick={() => void pickResident(r)}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
              {pickerQuery.trim().length >= 2 &&
                visiblePickerResults.length === 0 &&
                !pickerError && (
                  <li className="am-muted">Nessun ospite tra quelli a cui hai accesso.</li>
                )}
            </ul>
          </div>
        )}
      </section>

      {state.notice && (
        <div
          className={`am-notice am-notice--${state.notice.tone}`}
          role={state.notice.tone === 'error' ? 'alert' : 'status'}
        >
          <span>{state.notice.text}</span>
          <button
            type="button"
            className="am-link"
            onClick={() => dispatch({ type: 'dismiss_notice' })}
          >
            Chiudi
          </button>
        </div>
      )}

      <main className="am-main">
        {state.sessionError && (
          <p className="am-error" role="alert">
            {state.sessionError}
          </p>
        )}

        <div className="am-transcript" aria-live="polite" data-testid="am-transcript">
          {state.transcript.map((t) => (
            <div key={t.id} className={`am-msg am-msg--${t.who}`}>
              {t.status && t.who === 'assistant' && (
                <span className={`am-status am-status--${t.status.toLowerCase()}`}>
                  {STATUS_LABELS[t.status]}
                </span>
              )}
              {t.who === 'user' && t.source === 'voice' && (
                <span className="am-msg__source" data-testid="am-msg-voice">
                  Dettato a voce
                </span>
              )}
              <p>{t.text}</p>
            </div>
          ))}
        </div>

        {state.busy && (
          <p className="am-loading" role="status" data-testid="am-loading">
            {state.confirming ? 'Esecuzione in corso…' : 'Sto elaborando…'}
          </p>
        )}

        {workflow && workflow.status === 'NEEDS_CLARIFICATION' && workflow.candidates?.length ? (
          <div className="am-card" data-testid="am-candidates">
            <p className="am-card__title">Scegli</p>
            <div className="am-choices">
              {workflow.candidates.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className="ds-btn ds-btn--secondary am-choice"
                  disabled={state.busy}
                  onClick={() => submitText(String(i + 1), 'keyboard')}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {workflow && workflow.pending === 'edit' && workflow.editable && (
          <AssistantEditForm
            key={`${workflow.workflowId}-${state.transcript.length}`}
            editable={workflow.editable}
            busy={state.busy}
            onSubmit={submitEdit}
            onCancel={() => void send({ workflowId: workflow.workflowId!, action: 'cancel' })}
          />
        )}

        {preview && (
          <section className="am-card am-preview" aria-label="Anteprima" data-testid="am-preview">
            <div className="am-preview__head">
              <p className="am-card__title">{preview.action}</p>
              <span
                className={`ds-badge ${preview.confirmationClass === 'HIGH_RISK' ? 'ds-badge--alarm' : 'ds-badge--warning'}`}
              >
                {CLASS_LABELS[preview.confirmationClass]}
              </span>
            </div>
            <dl className="am-preview__data">
              <dt>Ospite</dt>
              <dd data-testid="am-preview-patient">{preview.patient?.label ?? '—'}</dd>
              {Object.entries(preview.values).map(([k, v]) => (
                <div key={k} className="am-preview__row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <dt>Eseguito da</dt>
              <dd>
                {preview.actor.name} ({session?.role.label ?? preview.actor.role})
              </dd>
              <dt>Origine</dt>
              <dd>Richiesta all’assistente (AI) — nulla è stato ancora scritto</dd>
            </dl>
            {(preview.warnings.length > 0 || (prescription?.issues.length ?? 0) > 0) && (
              <ul className="am-warnings" data-testid="am-warnings">
                {preview.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {prescription?.issues.map((w) => (
                  <li key={w}>Da completare nella scheda Terapia: {w}</li>
                ))}
              </ul>
            )}
            {!preview.confirmable && preview.blockedReason && (
              <p className="am-error">{preview.blockedReason}</p>
            )}
            <div className="am-actions">
              {showConfirm && (
                <button
                  type="button"
                  className="ds-btn ds-btn--primary am-confirm"
                  data-testid="am-confirm"
                  disabled={state.busy}
                  onClick={() => confirmPreview(preview)}
                >
                  Conferma
                </button>
              )}
              {preview.editable.length > 0 && (
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary"
                  data-testid="am-modify"
                  disabled={state.busy}
                  onClick={() => void send({ workflowId: workflow!.workflowId!, action: 'modify' })}
                >
                  Modifica
                </button>
              )}
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                data-testid="am-cancel"
                disabled={state.busy}
                onClick={() => void send({ workflowId: workflow!.workflowId!, action: 'cancel' })}
              >
                Annulla
              </button>
            </div>
          </section>
        )}

        {workflow && canRetry(workflow) && (
          <div className="am-actions">
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              disabled={state.busy}
              onClick={() => void send({ workflowId: workflow.workflowId!, action: 'retry' })}
            >
              Riprova
            </button>
          </div>
        )}

        {workflow?.status === 'COMPLETED' && state.lastVerified && (
          <section className="am-card am-result" data-testid="am-result" aria-label="Esito">
            <p className="am-card__title">
              <span className="ds-badge ds-badge--ok">Esito confermato dal sistema</span>
            </p>
            <p>{state.lastVerified.reply}</p>
            {resultReferences(state.lastVerified.result).length > 0 && (
              <p className="am-muted">
                Riferimenti: {resultReferences(state.lastVerified.result).join(' · ')}
              </p>
            )}
          </section>
        )}

        {workflow?.classicScreen && (
          <div className="am-actions">
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              data-testid="am-classic"
              onClick={() => onOpenClassic(workflow.classicScreen!)}
            >
              Apri {workflow.classicScreen.label}
            </button>
          </div>
        )}

        {!active && session && (
          <section className="am-starters" aria-label="Suggerimenti" data-testid="am-starters">
            {session.starters.map((s) => (
              <button
                key={s.skillId}
                type="button"
                className="am-starter"
                disabled={state.busy}
                onClick={() => submitText(s.label, 'starter')}
              >
                {s.label}
              </button>
            ))}
            {session.starters.length === 0 && (
              <p className="am-muted">
                Nessuna azione dell’assistente disponibile per il tuo ruolo.
              </p>
            )}
          </section>
        )}
        <div ref={mainEnd} aria-hidden="true" />
      </main>

      <VoicePanel voice={voice} busy={state.busy} />

      <form
        className="am-composer"
        onSubmit={(e) => {
          e.preventDefault();
          submitText(draft, 'keyboard');
        }}
      >
        <textarea
          ref={inputRef}
          className="am-input am-composer__input"
          rows={2}
          value={draft}
          placeholder={
            active
              ? 'Rispondi all’assistente…'
              : 'Chiedi o dì cosa vuoi fare (es. «registra pressione 120/80»)'
          }
          aria-label="Messaggio per l’assistente"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitText(draft, 'keyboard');
            }
          }}
        />
        <VoiceMicButton voice={voice} busy={state.busy} />
        <button
          type="submit"
          className="ds-btn ds-btn--primary am-send"
          disabled={state.busy || !draft.trim()}
        >
          Invia
        </button>
      </form>
    </div>
  );
}

interface EditFormProps {
  editable: { values?: Record<string, string>; text?: string; priority?: string };
  busy: boolean;
  onSubmit: (edit: NonNullable<ConverseRequest['edit']>) => void;
  onCancel: () => void;
}

/** «Modifica»: editable copy of the current payload; submitting prepares a NEW preview. */
function AssistantEditForm({ editable, busy, onSubmit, onCancel }: EditFormProps) {
  const [values, setValues] = useState<Record<string, string>>({ ...(editable.values ?? {}) });
  const [text, setText] = useState(editable.text ?? '');
  const [priority, setPriority] = useState(editable.priority ?? 'normale');
  return (
    <form
      className="am-card am-edit"
      data-testid="am-edit"
      onSubmit={(e) => {
        e.preventDefault();
        const edit: NonNullable<ConverseRequest['edit']> = {};
        if (editable.values)
          edit.values = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()));
        if (editable.text !== undefined) edit.text = text;
        if (editable.priority !== undefined) edit.priority = priority;
        onSubmit(edit);
      }}
    >
      <p className="am-card__title">Modifica i dati</p>
      {editable.values && (
        <div className="am-edit__grid">
          {VALUE_FIELDS.map((f) => (
            <label key={f.key} className="am-field">
              <span>{f.label}</span>
              <input
                className="am-input"
                inputMode={f.key === 'pa' ? 'text' : 'decimal'}
                placeholder={f.placeholder}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}
      {editable.text !== undefined && (
        <label className="am-field">
          <span>Testo</span>
          <textarea
            className="am-input"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      )}
      {editable.priority !== undefined && (
        <label className="am-field">
          <span>Priorità</span>
          <select
            className="am-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="normale">Normale</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
      )}
      <div className="am-actions">
        <button type="submit" className="ds-btn ds-btn--primary" disabled={busy}>
          Prepara nuova anteprima
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

export default AssistantMode;
