import { useId, type RefObject } from 'react';
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
  consent: boolean;
  onConsent: (value: boolean) => void;
  onInput: (value: string) => void;
  onSend: () => void;
  onMic: () => void;
}
export function AgnosComposer({ inputRef, input, dictated, busy, voice, tts, consent, onConsent, onInput, onSend, onMic }: Props) {
  const id = useId();
  const message = voice.phase === 'starting' ? 'Attivo il microfono… Consenti l’accesso nel browser.'
    : voice.phase === 'listening' ? 'Sto ascoltando… premi Termina quando hai finito.'
      : voice.phase === 'processing' ? 'Completo la trascrizione…' : '';
  const transcript = voice.active && voice.interimText
    ? `${input.trim() ? `${input.trimEnd()} ` : ''}${voice.interimText}` : input;
  return <div className="agnos-composer">
    {(message || voice.error || tts.speaking) && <div className="agnos-voicebar">
      {message && <span role="status" className="agnos-voice-status"><span className="agnos-voice-status__dot" />{message}</span>}
      {voice.error && <span role="alert" className="agnos-voice-error">{voice.error}</span>}
      {tts.speaking && <button type="button" className="btn-secondary" onClick={tts.stop}>Interrompi lettura</button>}
    </div>}
    <form className="ai-asst__compose agnos-compose" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <label htmlFor={id} className="agnos-compose-label">
        {voice.active ? 'Trascrizione in corso' : dictated ? 'Ho capito questo · controlla e modifica' : 'La tua richiesta'}
      </label>
      <textarea id={id} ref={inputRef} className="agnos-input" rows={3} value={transcript}
        onChange={(event) => onInput(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend(); } }}
        placeholder={voice.active ? 'Le parole riconosciute compariranno qui…' : 'Scrivi una domanda o un comando…'}
        aria-label="Comando per l’assistente virtuale" disabled={busy} readOnly={voice.active} />
      {dictated && !voice.active && <p className="agnos-compose-help">Rileggi la trascrizione, poi premi Invia richiesta. Nessuna azione è stata avviata.</p>}
      <div className="agnos-compose-actions">
        <button type="button" className={`btn-secondary agnos-mic${voice.listening ? ' agnos-mic--listening' : ''}`}
          onClick={onMic} disabled={busy || !voice.supported || !consent || voice.phase === 'processing'}
          aria-pressed={voice.active} aria-label={voice.active ? 'Termina dettatura' : 'Parla: detta una richiesta'}>
          <MicIcon />{voice.active ? 'Termina' : 'Parla'}
        </button>
        <button type="submit" className="btn-primary ai-asst__send" disabled={busy || voice.active || !input.trim()}>Invia richiesta</button>
      </div>
    </form>
    {voice.supported ? <label className="agnos-voice-consent">
      <input type="checkbox" checked={consent} onChange={(event) => onConsent(event.target.checked)} />
      <span>Consento la dettatura tramite il servizio vocale del browser. ClinicOS riceve solo il testo, dopo il mio invio.</span>
    </label> : <p className="agnos-compose-help">Dettatura non disponibile in questo browser. Puoi scrivere la richiesta.</p>}
  </div>;
}
