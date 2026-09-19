import { useEffect, useMemo, useRef, useState } from 'react';
import { IcoAI, IcoX } from '../../icons';
import type { AssistantNav } from './AIAssistantButton';
import { useAgnosChat, type AgnosTurn, type AgnosExecution } from './agnos/useAgnosChat';
import { TurnView } from './agnos/AgnosTurnView';
import { SpeakerIcon } from './agnos/AgnosVoiceIcons';
import { AgnosComposer } from './agnos/AgnosComposer';
import './agnos/AgnosWorkflow.css';
import { useVoiceInput } from './agnos/useVoiceInput';
import { useSpeechOutput } from './agnos/useSpeechOutput';
import { AgnosBrief } from './agnos/AgnosBrief';
import { navChipLabel } from './agnos/agnosNav';
import { spokenAssistantSummary } from './agnos/assistantFeedback';
import { AgnosSuggestedPrompts } from './agnos/AgnosSuggestedPrompts';
import {
  AGNOS_TURN_WINDOW,
  agnosHistoryWindow,
  revealPreviousAgnosTurns,
} from './agnos/agnosHistory';

// 015 — chatbot unificato (testo + voce): read answers (with sources) +
// CRU write actions with preview/confirm. Replaces AIAssistantButton as THE
// assistant entry point (same FAB affordance). Delete is never executable:
// l'assistente rifiuta e rimanda al comando dell'interfaccia.
// Dictation prepares a proposal with channel:'voce' through the same plan/execute
// path as typed text. The operator reviews/edits the proposal before explicit save.
// UI: un solo assistente virtuale. La scelta manuale del sub-agent è sparita —
// è l'intent a decidere chi risponde (backend `resolveAgent`), così l'operatore
// che chiede un dato clinico lo ottiene invece di ricevere un rimando.

interface Props {
  forceOpen?: boolean;
  openRequestId?: number;
  onClose?: () => void;
  operatorId?: string;
  operatorRole?: string;
  operatorName?: string;
  currentPatientId?: string;
  currentPatientName?: string;
  /** Rotta corrente: contesto additivo inviato a plan/execute. */
  navKey?: string;
  /** Nome del paziente bersaglio di un'azione di navigazione, per comporre l'etichetta del chip. */
  resolvePatientName?: (id: string) => string | undefined;
  /** SPEC-015 US4: actionType dell'azione eseguita, per refresh mirato (cartella vs agenda). */
  onExecuted?: (info: AgnosExecution) => void | Promise<void>;
  onNavigate?: (nav: AssistantNav, signal?: AbortSignal) => Promise<boolean>;
}

/** Testo da leggere per un turno Agnos risolto (esiti, rifiuti, errori, read); null = non leggere. */
function spokenTextFor(turn: AgnosTurn): string | null {
  if (turn.role !== 'agnos') return null;
  if (turn.status === 'attesa' || turn.status === 'in-conferma') return null;
  if (turn.read) return spokenAssistantSummary(turn.read);
  if (turn.text) return turn.text;
  return null;
}

export function AgnosPanel({
  forceOpen,
  openRequestId,
  onClose,
  operatorId,
  operatorRole,
  operatorName,
  currentPatientId,
  currentPatientName,
  navKey,
  resolvePatientName,
  onExecuted,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [consentPrompt, setConsentPrompt] = useState(false);
  const [input, setInput] = useState('');
  const [workspace, setWorkspace] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [visibleTurnCount, setVisibleTurnCount] = useState(AGNOS_TURN_WINDOW);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** true se il testo in input proviene da dettatura (anche dopo modifica: FR-016 → channel:'voce'). */
  const dictatedRef = useRef(false);
  const voiceSession = useRef<{ scope: string; draft: string } | null>(null);
  const scope = JSON.stringify([operatorId, operatorRole, currentPatientId, navKey]);
  const liveVoiceContext = useRef({ scope, visible: open && !minimized });
  liveVoiceContext.current = { scope, visible: open && !minimized };

  const {
    turns,
    pending,
    busy,
    phase,
    statusText,
    sendCommand,
    confirmPending,
    cancelPending,
    dismissPendingForEdit,
    retryNavigation,
  } = useAgnosChat({
    operatorId,
    operatorRole,
    operatorName,
    currentPatientId,
    navKey,
    onExecuted,
    onNavigate: async (nav, signal) => {
      setWorkspace(true);
      return await onNavigate?.(nav, signal) ?? false;
    },
  });

  const tts = useSpeechOutput();
  const voice = useVoiceInput({
    onFinalTranscript: (text) => {
      const session = voiceSession.current;
      voiceSession.current = null;
      if (!session || session.scope !== liveVoiceContext.current.scope || !liveVoiceContext.current.visible) return;
      const command = [session.draft.trim(), text.trim()].filter(Boolean).join(' ');
      if (!command) return;
      // Planning is read-only. Only confirmPending can execute the displayed proposal.
      if (busy || pending?.uncertain) { setInput(command); dictatedRef.current = true; return; }
      setInput(''); dictatedRef.current = false;
      setVisibleTurnCount(AGNOS_TURN_WINDOW);
      void sendCommand(command, 'voce');
    },
  });
  useEffect(() => { if (!voice.active) voiceSession.current = null; }, [voice.active]);
  const cancelVoice = voice.cancel;
  const stopSpeech = tts.stop;
  useEffect(() => {
    voiceSession.current = null;
    cancelVoice(); stopSpeech(); setConsentPrompt(false); setInput(''); dictatedRef.current = false;
  }, [scope, cancelVoice, stopSpeech]);
  const revokeVoiceConsent = voice.revokeConsent;
  useEffect(() => { revokeVoiceConsent(); }, [operatorId, operatorRole, revokeVoiceConsent]);

  useEffect(() => {
    // `forceOpen` is an external imperative signal, so mirroring it is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (forceOpen) { setOpen(true); setMinimized(false); }
  }, [forceOpen, openRequestId]);
  // Il pannello non si smonta più alla chiusura: la messa a fuoco alla riapertura va rifatta a
  // mano, altrimenti un dialog che resta nel DOM riapre senza dare il focus a nulla.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) inputRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const requests = body.querySelectorAll('.agnos-turn--utente');
    const latestRequest = requests.item(requests.length - 1);
    // Keep what was understood visible alongside the proposal, including after automatic dictation.
    const reviewing = phase === 'planning' || phase === 'approval';
    body.scrollTo({ top: reviewing && latestRequest
      ? body.scrollTop + latestRequest.getBoundingClientRect().top - body.getBoundingClientRect().top
      : body.scrollHeight });
  }, [turns, busy, phase]);

  // TTS: every state transition affects the newest assistant turn. Inspect only that turn instead
  // of rescanning the entire conversation after every patch/append.
  const lastSpokenIndexRef = useRef(-1);
  useEffect(() => { lastSpokenIndexRef.current = -1; }, [operatorId, operatorRole]);
  const speak = tts.speak;
  useEffect(() => {
    const latestIndex = turns.length - 1;
    if (latestIndex <= lastSpokenIndexRef.current) return;
    const latest = turns[latestIndex];
    const text = latest ? spokenTextFor(latest) : null;
    if (text === null) return;
    // Mark even while TTS is disabled: enabling it later must not replay historical PHI.
    lastSpokenIndexRef.current = latestIndex;
    if (open && !minimized) speak(text);
  }, [turns, speak, open, minimized]);

  const visibleHistory = useMemo(
    () => agnosHistoryWindow(turns, visibleTurnCount),
    [turns, visibleTurnCount],
  );

  function cancelDictation() {
    voiceSession.current = null;
    setConsentPrompt(false);
    voice.cancel();
  }

  function handleClose() {
    cancelDictation();
    tts.stop(); // FR-017: chiusura pannello = stop riproduzione
    setOpen(false);
    onClose?.();
  }

  function showPage() {
    cancelDictation();
    tts.stop();
    setMinimized(true);
  }

  function send() {
    const text = input.trim();
    if (!text || busy || voiceSession.current || consentPrompt || pending?.uncertain) return;
    tts.stop(); // FR-017: nuovo invio interrompe la riproduzione
    const channel = dictatedRef.current ? ('voce' as const) : ('testo' as const);
    dictatedRef.current = false;
    setInput('');
    setVisibleTurnCount(AGNOS_TURN_WINDOW);
    void sendCommand(text, channel);
  }

  function prefillSuggestedQuestion(text: string) {
    dictatedRef.current = false;
    setInput(text);
    inputRef.current?.focus();
  }

  function handleEdit() {
    const original = dismissPendingForEdit();
    if (original !== null) {
      setInput(original.text);
      dictatedRef.current = original.channel === 'voce';
      inputRef.current?.focus();
    }
  }

  function startDictation(grantConsent = false) {
    if (busy || pending?.uncertain || !liveVoiceContext.current.visible || voiceSession.current) return;
    setConsentPrompt(false);
    tts.stop();
    voiceSession.current = { scope, draft: input };
    if (grantConsent) void voice.grantConsentAndStart();
    else void voice.start();
  }

  function toggleMic() {
    if (voice.active) { voice.stop(); return; }
    // A completed error/silence session has no result callback; allow a fresh attempt.
    voiceSession.current = null;
    if (busy || pending?.uncertain) return;
    if (!voice.consentGranted) { setConsentPrompt(true); return; }
    startDictation();
  }

  const scopeLabel = currentPatientId
    ? `Paziente corrente: ${currentPatientName ?? currentPatientId}`
    : 'Tutti i pazienti autorizzati';

  const formatNavLabel = (n: AssistantNav) =>
    navChipLabel(n, {
      patientName: n.patientId ? resolvePatientName?.(n.patientId) : undefined,
      isCurrentPatient: !!n.patientId && n.patientId === currentPatientId,
    });

  return (
    <>
      <button
        type="button"
        className="ai-fab"
        onClick={() => { setOpen(true); setMinimized(false); }}
        aria-label="Assistente virtuale ClinicOS"
        title="Assistente virtuale ClinicOS"
      >
        <IcoAI />
      </button>

      {open && !workspace && !minimized && <div className="ai-drawer__scrim" onClick={handleClose} />}
      {open && minimized && <div className="agnos-workflow-dock" role="status">
        <span>{statusText || 'Assistente in attesa'}</span>
        <button className="btn-primary" onClick={() => setMinimized(false)}>Torna all’assistente</button>
      </div>}
      {/* AC6: il pannello resta montato anche da chiuso, così la conversazione sopravvive alla
          navigazione. `inert` è ciò che lo toglie dal tab order e dagli screen reader ora che
          non è più lo smontaggio a farlo. */}
      <aside
        className={`ai-drawer agnos-panel${workspace ? ' agnos-panel--workspace' : ''}${minimized ? ' agnos-panel--minimized' : ''}`}
        role="dialog"
        aria-label="Assistente virtuale ClinicOS"
        aria-hidden={!open || minimized}
        inert={!open || minimized ? true : undefined}
      >
        <header className="ai-drawer__header">
          <div className="ai-drawer__title">
            <span className="ai-drawer__icon">
              <IcoAI />
            </span>
            <span className="assistant-id">
              <span className="assistant-id__name">
                Assistente virtuale <span className="assistant-id__badge">IA</span>
              </span>
              <span className="assistant-id__sub">
                Non è un operatore umano · risponde solo con i dati presenti in ClinicOS
              </span>
            </span>
          </div>
          <div className="agnos-header-actions">
            {tts.supported && (
              <button
                type="button"
                className={`icon-btn agnos-tts${tts.enabled ? ' agnos-tts--on' : ''}`}
                onClick={tts.toggle}
                aria-pressed={tts.enabled}
                aria-label={
                  tts.enabled
                    ? 'Disattiva lettura vocale delle risposte'
                    : 'Attiva lettura vocale delle risposte'
                }
                title={tts.enabled ? 'Disattiva lettura vocale' : 'Attiva lettura vocale'}
              >
                <SpeakerIcon muted={!tts.enabled} />
                <span>Leggi risposte</span>
              </button>
            )}
            <button type="button" className="icon-btn" onClick={handleClose} aria-label="Chiudi">
              <IcoX />
            </button>
          </div>
        </header>

        <div className="ai-asst__scope" aria-label="Perimetro">
          {scopeLabel}
        </div>
        {statusText && <div className="agnos-workflow-status" data-phase={phase} role="status" aria-live="polite" aria-busy={busy}>
          {busy && <span className="agnos-workflow-spinner" aria-hidden="true" />}
          <span>{statusText}</span>
          {workspace && <button className="link-btn" type="button" onClick={showPage}>Mostra pagina</button>}
        </div>}

        <div className="ai-drawer__body ai-asst__body" ref={bodyRef}>
          {/* AC7: il brief NON è un turno — niente lettura TTS, niente conferma, niente indice. */}
          <div hidden={turns.length > 0}><AgnosBrief
            active={open && turns.length === 0}
            kind={operatorRole === 'admin' ? 'facility' : 'operator'}
            operatorId={operatorId}
            operatorRole={operatorRole}
            operatorName={operatorName}
            navKey={navKey}
            showHint={turns.length === 0}
            onNavigate={onNavigate}
            formatNavLabel={formatNavLabel}
          /></div>
          {turns.length === 0 && !pending && (
            <AgnosSuggestedPrompts
              operatorRole={operatorRole}
              hasCurrentPatient={!!currentPatientId}
              selectedText={input}
              disabled={busy || voice.active || consentPrompt}
              onSelect={prefillSuggestedQuestion}
            />
          )}
          {visibleHistory.hiddenCount > 0 && (
            <div className="ai-asst__scope agnos-history-control" role="status">
              <span>
                Cronologia precedente non visualizzata ({visibleHistory.hiddenCount} turni).
              </span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setVisibleTurnCount(revealPreviousAgnosTurns)}
              >
                Mostra i precedenti
              </button>
            </div>
          )}
          {visibleHistory.items.map(({ turn: t, index: i }) => (
            <TurnView
              key={i}
              turn={t}
              isPending={pending?.turnIndex === i}
              busy={busy || voice.active || consentPrompt}
              navigationReady={pending?.navigationReady === true}
              destination={pending?.turnIndex === i ? pending.navigation?.label : undefined}
              onOpenPage={() => { void retryNavigation().then((opened) => { if (opened) showPage(); }); }}
              onConfirm={() => {
                if (voiceSession.current || consentPrompt) return;
                setVisibleTurnCount(AGNOS_TURN_WINDOW);
                void confirmPending();
              }}
              onEdit={handleEdit}
              onCancel={() => {
                setVisibleTurnCount(AGNOS_TURN_WINDOW);
                cancelPending();
              }}
              onNavigate={(nav) => { setWorkspace(true); void onNavigate?.(nav); }}
              formatNavLabel={formatNavLabel}
            />
          ))}
        </div>

        <AgnosComposer inputRef={inputRef} input={input} dictated={dictatedRef.current}
          busy={busy || pending?.uncertain === true} voice={voice} tts={tts} consentPrompt={consentPrompt}
          onAcceptConsent={() => startDictation(true)} onDismissConsent={() => setConsentPrompt(false)}
          onCancelVoice={cancelDictation} onRevokeConsent={() => { cancelDictation(); voice.revokeConsent(); }}
          onInput={(value) => {
            setInput(value); if (!value.trim()) dictatedRef.current = false;
          }} onSend={send} onMic={toggleMic} />
      </aside>
    </>
  );
}
