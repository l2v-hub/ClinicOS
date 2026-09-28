import { useId, useLayoutEffect, type RefObject } from 'react';
import type { useVoiceInput } from './useVoiceInput';
import type { useSpeechOutput } from './useSpeechOutput';
import { MicIcon } from './AgnosVoiceIcons';

interface Props {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  dictated: boolean;
  busy: boolean;
  voice: ReturnType<typeof useVoiceInput>;
  tts: ReturnType<typeof useSpeechOutput>;
  consentPrompt: boolean;
  onAcceptConsent: () => void;
  onDismissConsent: () => void;
  onCancelVoice: () => void;
  onRevokeConsent: () => void;
  onInput: (value: string) => void;
  onSend: () => void;
  onMic: () => void;
}
export function AgnosComposer({ inputRef, input, dictated, busy, voice, tts, consentPrompt, onAcceptConsent, onDismissConsent, onCancelVoice, onRevokeConsent, onInput, onSend, onMic }: Props) {
  const id = useId();
  const message = voice.phase === 'starting' ? 'Attivo il microfono… Consenti l’accesso nel browser.'
    : voice.phase === 'listening' ? 'Sto ascoltando… premi di nuovo il microfono per vedere la proposta.'
      : voice.phase === 'processing' ? 'Completo la trascrizione…' : '';
  const transcript = voice.active && voice.interimText
    ? `${input.trim() ? `${input.trimEnd()} ` : ''}${voice.interimText}` : input;
  // Il campo parte da una riga e cresce col testo (fino a 150px). Dove il browser non supporta
  // field-sizing (es. Safari) l'altezza si calcola qui.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || (typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content'))) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 4, 150)}px`;
  }, [transcript, inputRef]);
  return <div className="agnos-composer">
    {consentPrompt ? <section className="agnos-consent-prompt" aria-labelledby={`${id}-consent`}>
      <strong id={`${id}-consent`}>Usa la voce per preparare un comando</strong>
      <p>Il servizio vocale del browser può elaborare l’audio online. Al termine della dettatura, il testo viene inviato a ClinicOS per preparare la proposta.</p>
      <p><strong>Vedrai cosa ho capito e cosa propongo. I dati saranno salvati solo dopo la tua conferma.</strong></p>
      <div className="agnos-compose-actions">
        <button type="button" className="ds-btn ds-btn--primary" autoFocus disabled={busy} onClick={onAcceptConsent}>Attiva microfono</button>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onDismissConsent}>Annulla</button>
      </div>
    </section> : <>

    {(message || voice.error || tts.speaking) && <div className="agnos-voicebar">
      {message && <span role="status" className="agnos-voice-status"><span className="agnos-voice-status__dot" />{message}</span>}
      {voice.error && <span role="alert" className="agnos-voice-error">{voice.error}</span>}
      {tts.speaking && <button type="button" className="ds-btn ds-btn--secondary" onClick={tts.stop}>Interrompi lettura</button>}
    </div>}
    <form className="ai-asst__compose agnos-compose" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      {/* HMI 1: campo "Chiedi o detta" con microfono; l'etichetta resta per i lettori di schermo,
          visibile solo quando descrive una trascrizione da controllare */}
      <label htmlFor={id} className={voice.active || dictated ? 'agnos-compose-label' : 'ds-sr-only'}>
        {voice.active ? 'Trascrizione in corso' : dictated ? 'Ho capito questo · controlla e modifica' : 'La tua richiesta'}
      </label>
      <div className="agnos-compose-row">
      <textarea id={id} ref={inputRef} className="form-input agnos-input" rows={1} value={transcript}
        onChange={(event) => onInput(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend(); } }}
        placeholder={voice.active ? 'Le parole riconosciute compariranno qui…' : 'Chiedi o detta'}
        aria-label="Comando per l’assistente virtuale" disabled={busy} readOnly={voice.active} />
        <button type="button" className={`ds-icon-btn agnos-mic${voice.listening ? ' ds-icon-btn--recording' : ''}`}
          onClick={onMic} disabled={busy || !voice.supported || voice.phase === 'processing'}
          aria-pressed={voice.active} aria-label={voice.active ? 'Termina dettatura' : 'Parla: detta una richiesta'}
          title={voice.active ? 'Termina dettatura' : 'Parla: detta una richiesta'}>
          <MicIcon />
        </button>
      </div>
      {dictated && !voice.active && <p className="agnos-compose-help">Modifica la richiesta e premi Invia richiesta per aggiornare la proposta.</p>}
      {voice.supported && <p className="agnos-compose-help">
        {input.trim() ? 'La dettatura completa il testo qui sopra. ' : ''}
        Al termine vedrai la proposta, da controllare e confermare.
      </p>}
      <div className="agnos-compose-actions">
        {voice.active
          ? <button type="button" className="ds-btn ds-btn--secondary" onClick={onCancelVoice}>Annulla dettatura</button>
          : <button type="submit" className="ds-btn ds-btn--primary ai-asst__send" disabled={busy || !input.trim()}>Invia richiesta</button>}
      </div>
    </form>
    {voice.supported ? voice.consentGranted && <div className="agnos-voice-consent">
      <button type="button" className="link-btn" onClick={onRevokeConsent}>Disattiva dettatura</button>
    </div> : <p className="agnos-compose-help">Dettatura non disponibile in questo browser. Puoi scrivere la richiesta.</p>}
    </>}
  </div>;
}
