import { useEffect, useRef, useState } from 'react';
import { IcoAI, IcoX } from '../../icons';
import { AnswerView, type AssistantAnswer, type AssistantNav } from './AIAssistantButton';
import { useAgnosChat, type AgnosTurn } from './agnos/useAgnosChat';
import { useVoiceInput } from './agnos/useVoiceInput';
import { useSpeechOutput } from './agnos/useSpeechOutput';

// 015 AGNOS — unified chatbot (testo + voce): read answers (with sources) +
// CRU write actions with preview/confirm. Replaces AIAssistantButton as THE
// Agnos entry point (same FAB affordance). Delete is never executable: Agnos
// refuses and points the operator to the traditional UI command.
// US3: dictation drops the transcript INTO the text field (editable before
// send, FR-016) and the command travels with channel:'voce' through the SAME
// plan/execute path as typed text. Optional TTS reads Agnos replies aloud.

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
  operatorId?: string;
  operatorRole?: string;
  operatorName?: string;
  currentPatientId?: string;
  currentPatientName?: string;
  /** SPEC-015 US4: actionType dell'azione eseguita, per refresh mirato (cartella vs agenda). */
  onExecuted?: (info: { actionType?: string }) => void;
  onNavigate?: (nav: AssistantNav) => void;
}

/** Testo sintetico da leggere ad alta voce per una risposta read (mai i dati clinici estesi). */
function readSpokenSummary(read: AssistantAnswer): string {
  if (read.refusal) return read.refusal;
  if (read.notFound || !read.results.length) return 'Informazione non trovata.';
  const labels = read.sources.slice(0, 3).map((s) => s.label).filter(Boolean);
  const count = read.results.length === 1 ? '1 risultato' : `${read.results.length} risultati`;
  return labels.length ? `Trovato ${count}: ${labels.join('; ')}.` : `Trovato ${count}.`;
}

/** Testo da leggere per un turno Agnos risolto (esiti, rifiuti, errori, read); null = non leggere. */
function spokenTextFor(turn: AgnosTurn): string | null {
  if (turn.role !== 'agnos') return null;
  if (turn.status === 'attesa' || turn.status === 'in-conferma') return null;
  if (turn.read) {
    // Agnos KB (Task 7): esito `clarify` — legge SOLO la frase introduttiva, mai le chip.
    if (turn.read.suggestions && turn.read.suggestions.length > 0) return turn.read.answerText || null;
    return readSpokenSummary(turn.read);
  }
  if (turn.text) return turn.text;
  return null;
}

export function AgnosPanel({ forceOpen, onClose, operatorId, operatorRole, operatorName, currentPatientId, currentPatientName, onExecuted, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** true se il testo in input proviene da dettatura (anche dopo modifica: FR-016 → channel:'voce'). */
  const dictatedRef = useRef(false);

  const { turns, pending, busy, sendCommand, sendText, confirmPending, cancelPending, dismissPendingForEdit } =
    useAgnosChat({ operatorId, operatorRole, operatorName, currentPatientId, currentPatientName, onExecuted });

  const tts = useSpeechOutput();
  const voice = useVoiceInput({
    onFinalTranscript: (text) => {
      setInput((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
      dictatedRef.current = true;
      inputRef.current?.focus();
    },
  });

  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [turns, busy]);

  // TTS: legge una sola volta ogni turno Agnos risolto (esiti, read sintetiche, rifiuti).
  const spokenRef = useRef(new Set<number>());
  const speak = tts.speak;
  useEffect(() => {
    let toSpeak: string | null = null;
    turns.forEach((t, i) => {
      if (spokenRef.current.has(i)) return;
      const text = spokenTextFor(t);
      if (text === null) return;
      spokenRef.current.add(i); // marcato anche a toggle spento: niente arretrati alla riattivazione
      toSpeak = text;
    });
    if (toSpeak) speak(toSpeak);
  }, [turns, speak]);

  function handleClose() {
    if (voice.listening) voice.stop();
    tts.stop(); // FR-017: chiusura pannello = stop riproduzione
    setOpen(false);
    onClose?.();
  }

  function send() {
    const text = input.trim();
    if (!text || busy || voice.listening) return;
    tts.stop(); // FR-017: nuovo invio interrompe la riproduzione
    const channel = dictatedRef.current ? 'voce' as const : 'testo' as const;
    dictatedRef.current = false;
    setInput('');
    void sendCommand(text, channel);
  }

  /** Chip clarify (Task 7): invia il suggerimento come nuovo turno testuale. */
  function handleSuggestion(text: string) {
    if (busy) return;
    tts.stop(); // FR-017: nuovo invio interrompe la riproduzione
    dictatedRef.current = false;
    sendText(text);
  }

  function handleEdit() {
    const original = dismissPendingForEdit();
    if (original !== null) {
      setInput(original.text);
      dictatedRef.current = original.channel === 'voce';
      inputRef.current?.focus();
    }
  }

  function toggleMic() {
    if (voice.listening) { voice.stop(); return; }
    tts.stop(); // non ascoltare e parlare insieme
    void voice.start();
  }

  // Interim visibile: mentre ascolta, il campo mostra testo esistente + trascrizione parziale.
  const displayValue = voice.listening && voice.interimText
    ? `${input.trim() ? `${input.trimEnd()} ` : ''}${voice.interimText}`
    : input;

  const scopeLabel = currentPatientId
    ? `Paziente corrente: ${currentPatientName ?? currentPatientId}`
    : 'Tutti i pazienti autorizzati';

  return (
    <>
      <button type="button" className="ai-fab" onClick={() => setOpen(true)} aria-label="Agnos — Assistente ClinicOS" title="Agnos — Assistente ClinicOS">
        <IcoAI />
      </button>

      {open && (
        <>
          <div className="ai-drawer__scrim" onClick={handleClose} />
          <aside className="ai-drawer agnos-panel" role="dialog" aria-label="Agnos — Assistente ClinicOS">
            <header className="ai-drawer__header">
              <div className="ai-drawer__title">
                <span className="ai-drawer__icon"><IcoAI /></span>
                <span>Agnos</span>
              </div>
              <div className="agnos-header-actions">
                {tts.supported && (
                  <button
                    type="button"
                    className={`icon-btn agnos-tts${tts.enabled ? ' agnos-tts--on' : ''}`}
                    onClick={tts.toggle}
                    aria-pressed={tts.enabled}
                    aria-label={tts.enabled ? 'Disattiva lettura vocale delle risposte' : 'Attiva lettura vocale delle risposte'}
                    title={tts.enabled ? 'Disattiva lettura vocale' : 'Attiva lettura vocale'}
                  >
                    <SpeakerIcon muted={!tts.enabled} />
                  </button>
                )}
                <button type="button" className="icon-btn" onClick={handleClose} aria-label="Chiudi"><IcoX /></button>
              </div>
            </header>

            <div className="ai-asst__scope" aria-label="Perimetro">{scopeLabel}</div>

            <div className="ai-drawer__body ai-asst__body" ref={bodyRef}>
              {turns.length === 0 && (
                <p className="ai-drawer__hint">
                  Chiedi dati esistenti (allergie, terapie, parametri, documenti, appuntamenti) oppure
                  scrivi — o detta con il microfono — un comando, es. «Registra pressione 130 su 80
                  alle 9:00». Ogni modifica viene mostrata in anteprima e salvata solo dopo la tua
                  conferma. Agnos non elimina mai dati e non fornisce diagnosi né terapie.
                </p>
              )}
              {turns.map((t, i) => (
                <TurnView
                  key={i}
                  turn={t}
                  isPending={pending?.turnIndex === i}
                  busy={busy}
                  onConfirm={() => { void confirmPending(); }}
                  onEdit={handleEdit}
                  onCancel={cancelPending}
                  onNavigate={onNavigate}
                  onSuggestion={handleSuggestion}
                />
              ))}
            </div>

            {(voice.listening || voice.error || tts.speaking) && (
              <div className="agnos-voicebar">
                {voice.listening && (
                  <span className="agnos-voice-status" aria-live="polite">
                    <span className="agnos-voice-status__dot" /> Sto ascoltando… parla pure
                  </span>
                )}
                {voice.error && <span className="agnos-voice-error" role="alert">{voice.error}</span>}
                {tts.speaking && (
                  <button type="button" className="btn-secondary agnos-stop-speech" onClick={tts.stop} aria-label="Interrompi la lettura vocale">
                    ■ Interrompi lettura
                  </button>
                )}
              </div>
            )}

            <form className="ai-asst__compose agnos-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea
                ref={inputRef}
                className="agnos-input"
                rows={2}
                value={displayValue}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (!e.target.value.trim()) dictatedRef.current = false; // campo svuotato: si riparte dal testo
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={voice.listening ? 'Sto ascoltando…' : 'Scrivi una domanda o un comando…'}
                aria-label="Comando per Agnos"
                disabled={busy}
                readOnly={voice.listening}
              />
              {voice.supported && (
                <button
                  type="button"
                  className={`icon-btn agnos-mic${voice.listening ? ' agnos-mic--listening' : ''}`}
                  onClick={toggleMic}
                  disabled={busy}
                  aria-pressed={voice.listening}
                  aria-label={voice.listening ? 'Interrompi ascolto' : 'Detta un comando'}
                  title={voice.listening ? 'Interrompi ascolto' : 'Detta un comando'}
                >
                  <MicIcon />
                </button>
              )}
              <button type="submit" className="btn-primary ai-asst__send" disabled={busy || voice.listening || !input.trim()}>Invia</button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}

interface TurnViewProps {
  turn: AgnosTurn;
  isPending: boolean;
  busy: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onNavigate?: (nav: AssistantNav) => void;
  onSuggestion: (text: string) => void;
}

function TurnView({ turn, isPending, busy, onConfirm, onEdit, onCancel, onNavigate, onSuggestion }: TurnViewProps) {
  if (turn.role === 'utente') {
    return <div className="ai-asst__turn agnos-turn agnos-turn--utente"><div className="ai-asst__q">{turn.text}</div></div>;
  }
  return (
    <div className="ai-asst__turn agnos-turn agnos-turn--agnos">
      {turn.status === 'attesa' && <div className="ai-asst__a ai-asst__muted" aria-live="polite">Agnos sta elaborando…</div>}
      {turn.status === 'errore' && <div className="ai-asst__a ai-asst__error" role="alert">{turn.text}</div>}
      {turn.status === 'rifiuto' && (
        <div className="agnos-refusal" role="alert">
          <div>{turn.text}</div>
          <span className="agnos-refusal__hint">Per questa operazione usa il comando nell’interfaccia.</span>
        </div>
      )}
      {turn.status === 'successo' && <div className="voice-done">✓ {turn.text}</div>}
      {turn.read && <AnswerView answer={turn.read} onNavigate={onNavigate} />}
      {turn.read?.suggestions && turn.read.suggestions.length > 0 && (
        <div className="agnos-chips" role="group" aria-label="Forse intendevi">
          {turn.read.suggestions.map((s) => (
            <button key={s} type="button" className="agnos-chip" data-testid="agnos-chip"
              disabled={busy} onClick={() => onSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {turn.preview && (
        <div className={`voice-preview agnos-preview${turn.status === 'annullato' ? ' agnos-preview--annullata' : ''}`} role="group" aria-label="Operazione proposta">
          <div className="voice-preview__title">{turn.preview.title}</div>
          {turn.preview.patientName && (
            <div className="voice-preview__patient">Paziente: <strong>{turn.preview.patientName}</strong></div>
          )}
          {turn.preview.lines.length > 0 && (
            <dl className="voice-preview__lines">
              {turn.preview.lines.map((l, i) => (
                <div key={i} className="voice-preview__row"><dt>{l.label}</dt><dd>{l.value}</dd></div>
              ))}
            </dl>
          )}
          {turn.preview.warnings.map((w, i) => <p key={i} className="voice-warn">⚠ {w}</p>)}
          {turn.preview.ambiguities.map((a, i) => <p key={i} className="voice-amb">⛔ {a}</p>)}

          {turn.status === 'in-conferma' && isPending && (
            <div className="voice-actions">
              <button type="button" className="btn-primary" disabled={!turn.preview.canExecute || busy} onClick={onConfirm}>
                {busy ? 'Salvataggio…' : 'Conferma e salva'}
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={onEdit}>Modifica</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>Annulla</button>
            </div>
          )}
          {turn.status === 'eseguito' && <div className="agnos-preview__stato agnos-preview__stato--ok">✓ Eseguita</div>}
          {turn.status === 'annullato' && <div className="agnos-preview__stato">Annullata</div>}
        </div>
      )}
      {!turn.status && !turn.read && !turn.preview && turn.text && <div className="ai-asst__a">{turn.text}</div>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted
        ? <><line x1="16" y1="9" x2="22" y2="15" /><line x1="22" y1="9" x2="16" y2="15" /></>
        : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
    </svg>
  );
}
