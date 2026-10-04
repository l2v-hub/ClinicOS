// Phase 5 — voice controls of the AI Assistant: mic button (always visible state), level meter,
// transcript review (edit / send / repeat / cancel / write by hand), optional spoken status.

import { MicIcon, SpeakerIcon } from '../../shared/agnos/AgnosVoiceIcons';
import { AUDIO_STATE_LABELS, micOpen } from './audioSession';
import type { VoiceChannel } from './useVoiceChannel';

export function VoiceMicButton({ voice, busy }: { voice: VoiceChannel; busy: boolean }) {
  const { audio } = voice;
  const listening = micOpen(audio.state);
  if (!voice.available) {
    const reason = voice.statusError
      ? 'Voce non disponibile'
      : !voice.status
        ? 'Verifica voce…'
        : !voice.status.voiceAllowed
          ? 'Voce non consentita al tuo ruolo'
          : !voice.status.channelEnabled
            ? 'Voce non attiva in questo ambiente'
            : 'Trascrizione vocale non configurata';
    return (
      <button
        type="button"
        className="ds-btn ds-btn--secondary am-mic"
        disabled
        title={reason}
        aria-label={`Microfono: ${reason}`}
        data-testid="am-mic"
        data-state="UNAVAILABLE"
      >
        <MicIcon />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`ds-btn ${listening ? 'ds-btn--primary' : 'ds-btn--secondary'} am-mic`}
      disabled={
        !listening && (busy || audio.state === 'TRANSCRIBING' || audio.state === 'PROCESSING')
      }
      aria-pressed={listening}
      aria-label={
        listening ? 'Fine: invia la frase alla trascrizione' : 'Parla (premi e dì il comando)'
      }
      title={listening ? 'Fine' : 'Parla'}
      data-testid="am-mic"
      data-state={audio.state}
      onClick={() => (listening ? voice.finish() : voice.start())}
    >
      <MicIcon />
      <span className="am-mic__label">{listening ? 'Fine' : 'Parla'}</span>
    </button>
  );
}

export function VoicePanel({ voice, busy }: { voice: VoiceChannel; busy: boolean }) {
  const { audio } = voice;
  const listening = micOpen(audio.state);
  const showPanel = audio.state !== 'IDLE' || Boolean(audio.notice);
  if (!showPanel && !voice.spoken) return null;
  return (
    <section
      className={`am-voice am-voice--${audio.state.toLowerCase()}`}
      aria-label="Comando vocale"
      data-testid="am-voice"
      data-state={audio.state}
    >
      <div className="am-voice__bar">
        <span className={`am-voice__dot${listening ? ' is-live' : ''}`} aria-hidden="true" />
        <strong className="am-voice__state" role="status" data-testid="am-voice-state">
          {AUDIO_STATE_LABELS[audio.state]}
        </strong>
        {listening && (
          <span className="am-voice__meter" aria-hidden="true">
            <span style={{ width: `${Math.round(voice.level * 100)}%` }} />
          </span>
        )}
        <span className="am-voice__spacer" />
        {voice.spokenSupported && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary am-voice__tts"
            aria-pressed={voice.spoken}
            onClick={voice.toggleSpoken}
            title={
              voice.spoken
                ? 'Disattiva conferme vocali'
                : 'Leggi ad alta voce trascrizione e anteprima del comando'
            }
            data-testid="am-voice-tts"
          >
            <SpeakerIcon muted={!voice.spoken} />
            <span>{voice.spoken ? 'Voce on' : 'Voce off'}</span>
          </button>
        )}
        {(listening || audio.state === 'TRANSCRIBING') && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={voice.cancel}
            data-testid="am-voice-cancel"
          >
            Annulla
          </button>
        )}
      </div>

      {audio.notice && (
        <p
          className={`am-voice__notice${audio.state === 'ERROR' ? ' am-voice__notice--error' : ''}`}
          data-testid="am-voice-notice"
        >
          {audio.notice}
        </p>
      )}

      {audio.state === 'TRANSCRIPT_READY' && (
        <form
          className="am-voice__review"
          data-testid="am-voice-review"
          onSubmit={(e) => {
            e.preventDefault();
            voice.submit();
          }}
        >
          <label className="am-voice__review-label" htmlFor="am-voice-transcript">
            Ho capito questo — correggi se serve, poi invia. Niente viene eseguito senza la tua
            conferma.
          </label>
          <textarea
            id="am-voice-transcript"
            className="am-input"
            rows={2}
            value={audio.transcript}
            onChange={(e) => voice.edit(e.target.value)}
            data-testid="am-voice-transcript"
          />
          <div className="am-voice__actions">
            <button
              type="submit"
              className="ds-btn ds-btn--primary"
              disabled={busy || !audio.transcript.trim()}
              data-testid="am-voice-send"
            >
              Invia
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={voice.retry}
              data-testid="am-voice-retry"
            >
              Ripeti
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={voice.switchToText}
              data-testid="am-voice-text"
            >
              Scrivi a mano
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={voice.cancel}
              data-testid="am-voice-discard"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {audio.state === 'AWAITING_CONFIRMATION' && (
        <p className="am-voice__hint" data-testid="am-voice-confirm-hint">
          La conferma è solo con il pulsante «Conferma» dell’anteprima: dire «conferma» non esegue
          nulla.
        </p>
      )}

      {audio.state === 'ERROR' && audio.errorCode && (
        <div className="am-voice__actions">
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={voice.switchToText}
            data-testid="am-voice-fallback"
          >
            Scrivi il messaggio
          </button>
        </div>
      )}
    </section>
  );
}
