// Phase 5 — voice channel of the AI Assistant (push-to-talk).
//
// Mic (explicit tap) → local VAD → one WAV utterance → POST /skills/voice/transcribe → transcript
// shown for review (edit / resend / cancel / switch to text) → «Invia» → the SAME submitText the
// keyboard uses (source 'voice') → Agno → skill → policy + resident scope → preview → UI «Conferma».
// Voice never confirms: the confirmation stays the preview button.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AssistantHttpError, type AssistantPreview } from '../assistantApi';
import {
  audioReducer,
  canStartCapture,
  initialAudioSession,
  micOpen,
  type AssistantTurnStatus,
} from './audioSession';
import {
  loadSpokenFeedback,
  saveSpokenFeedback,
  speakStatus,
  speakFeedback,
  interpretedPreviewSpeech,
  stopSpeaking,
  spokenFeedbackSupported,
} from './spokenStatus';
import { useVoiceCapture, type CaptureEvent } from './useVoiceCapture';
import { DEFAULT_VAD_CONFIG } from './vad';
import { loadVoiceStatus, transcribeUtterance, type VoiceStatus } from './voiceApi';

const STT_ERROR_TEXT: Record<string, string> = {
  stt_unavailable: 'Trascrizione vocale non disponibile ora: scrivi il messaggio.',
  stt_timeout: 'La trascrizione ci sta mettendo troppo: riprova o scrivi il messaggio.',
  stt_provider_error: 'Il servizio di trascrizione ha dato errore: riprova o scrivi il messaggio.',
  stt_unreachable: 'Servizio di trascrizione non raggiungibile: scrivi il messaggio.',
  invalid_audio: 'Audio non valido: riprova o scrivi il messaggio.',
  utterance_too_long: 'Frase troppo lunga: dividila in più comandi o scrivila.',
  voice_denied: 'Il tuo ruolo non può usare il canale vocale: scrivi il messaggio.',
};

interface Options {
  preview?: AssistantPreview | null;
  residentId: string | null;
  busy: boolean;
  /** The Assistant entry point: submitText(text, 'voice'). */
  onSubmit: (text: string) => void;
  /** «Scrivi a mano»: moves the transcript into the text composer. */
  onSwitchToText: (text: string) => void;
}

export function useVoiceChannel({ residentId, busy, onSubmit, onSwitchToText, preview }: Options) {
  const [audio, dispatch] = useReducer(audioReducer, initialAudioSession);
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [spoken, setSpoken] = useState(loadSpokenFeedback);
  const inFlight = useRef<AbortController | null>(null);
  const captureId = useRef(0);
  const submitted = useRef(false);
  /** A capture started by the user is live: only its utterance may be uploaded (QA H1). */
  const listening = useRef(false);

  useEffect(() => {
    let alive = true;
    loadVoiceStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatusError(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    captureId.current = audio.captureId;
  }, [audio.captureId]);

  const onCapture = useCallback((event: CaptureEvent) => {
    switch (event.type) {
      case 'speech_start':
        if (listening.current) dispatch({ type: 'speech_start' });
        return;
      case 'discarded':
        if (listening.current) dispatch({ type: 'discarded', reason: event.reason });
        listening.current = false;
        return;
      case 'interrupted':
        if (listening.current) dispatch({ type: 'cancel', reason: event.reason });
        listening.current = false;
        return;
      case 'error':
        if (listening.current)
          dispatch({ type: 'failed', code: event.code, message: event.message });
        listening.current = false;
        return;
      case 'utterance': {
        // Cancelled / resident changed / switched to text while the VAD was closing the turn:
        // the audio is dropped here and never leaves the device.
        if (!listening.current) return;
        listening.current = false;
        dispatch({ type: 'utterance', speechMs: event.speechMs });
        const id = captureId.current;
        const controller = new AbortController();
        inFlight.current = controller;
        transcribeUtterance(event.wav, event.speechMs, controller.signal)
          .then((result) =>
            dispatch({
              type: 'transcribed',
              captureId: id,
              text: result.text,
              empty: result.empty,
              sttMs: result.metadata?.roundTripMs,
            }),
          )
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            const code =
              error instanceof AssistantHttpError ? (error.code ?? 'stt_error') : 'stt_error';
            dispatch({
              type: 'failed',
              captureId: id,
              code,
              message:
                STT_ERROR_TEXT[code] ??
                (error instanceof Error
                  ? error.message
                  : 'Trascrizione non riuscita: scrivi il messaggio.'),
            });
          })
          .finally(() => {
            if (inFlight.current === controller) inFlight.current = null;
          });
        return;
      }
    }
  }, []);

  const capture = useVoiceCapture(onCapture);
  const abortCapture = capture.abort;

  /** Stop everything in flight: mic (also a pending permission prompt) and the STT request. */
  const stopAll = useCallback(() => {
    listening.current = false;
    abortCapture();
    inFlight.current?.abort();
    inFlight.current = null;
  }, [abortCapture]);

  // Assistant closed: nothing keeps running (mic released by useVoiceCapture, STT request aborted).
  useEffect(() => () => { stopAll(); stopSpeaking(); }, [stopAll]);

  // Resident changed while a capture / transcript is pending → stop the mic, drop the audio and
  // the transcript (never re-target).
  const lastResident = useRef(residentId);
  useEffect(() => {
    if (lastResident.current === residentId) return;
    lastResident.current = residentId;
    stopAll();
    stopSpeaking();
    dispatch({ type: 'resident_changed', residentId });
  }, [residentId, stopAll]);

  const spokenKey = useRef('');
  useEffect(() => {
    if (!spoken) return;
    if (audio.state === 'TRANSCRIPT_READY') {
      const key = `transcript:${audio.captureId}`;
      if (spokenKey.current === key) return;
      spokenKey.current = key;
      speakFeedback(`Ho capito: ${audio.transcript}. Controlla la trascrizione e premi Invia per preparare l’azione.`);
    } else if (audio.state === 'AWAITING_CONFIRMATION' && preview) {
      const key = `preview:${preview.previewId}`;
      if (spokenKey.current === key) return;
      spokenKey.current = key;
      speakFeedback(interpretedPreviewSpeech(preview));
    } else if (audio.state !== 'AWAITING_CONFIRMATION') speakStatus(audio.state);
  }, [audio.state, audio.captureId, audio.transcript, spoken, preview]);

  const available = Boolean(status?.voiceAllowed && status.sttConfigured);

  const start = useCallback(() => {
    if (!available || busy || !canStartCapture(audio.state)) return;
    stopSpeaking();
    submitted.current = false;
    stopAll(); // «Ripeti» from a pending transcript: nothing of the previous capture survives
    listening.current = true;
    dispatch({ type: 'start', residentId });
    const vad = status?.vad ?? DEFAULT_VAD_CONFIG;
    // A 16 kHz PCM16 utterance is 32 KB/s: never record more than the backend accepts.
    const maxMsByBytes = Math.floor(((status?.maxUtteranceBytes ?? 2_097_152) - 44) / 32) - 1500;
    void capture.start({ ...vad, maxUtteranceMs: Math.min(vad.maxUtteranceMs, maxMsByBytes) });
  }, [audio.state, available, busy, capture, residentId, status, stopAll]);

  const finish = useCallback(() => capture.finish(), [capture]);

  const cancel = useCallback(() => {
    stopAll();
    stopSpeaking();
    dispatch({ type: 'cancel' });
  }, [stopAll]);

  const submit = useCallback(() => {
    const text = audio.transcript.trim();
    if (audio.state !== 'TRANSCRIPT_READY' || !text || busy || submitted.current) return;
    submitted.current = true; // one transcript → at most one Assistant request
    stopSpeaking();
    dispatch({ type: 'submit' });
    onSubmit(text);
  }, [audio.state, audio.transcript, busy, onSubmit]);

  const switchToText = useCallback(() => {
    const text = audio.transcript;
    stopAll();
    stopSpeaking();
    dispatch({ type: 'reset' });
    onSwitchToText(text);
  }, [audio.transcript, onSwitchToText, stopAll]);

  const onAssistant = useCallback((next: AssistantTurnStatus | 'REQUEST_FAILED') => {
    dispatch({ type: 'assistant', status: next });
  }, []);

  const toggleSpoken = useCallback(() => {
    setSpoken((on) => {
      const next = !on;
      saveSpokenFeedback(next);
      if (!next) stopSpeaking();
      return next;
    });
  }, []);

  return {
    audio,
    available,
    status,
    statusError,
    level: capture.level,
    micActive: capture.active || micOpen(audio.state),
    start,
    finish,
    cancel,
    submit,
    switchToText,
    edit: (text: string) => dispatch({ type: 'edit', text }),
    retry: start,
    onAssistant,
    spoken,
    spokenSupported: spokenFeedbackSupported(),
    toggleSpoken,
    stopSpeaking,
  };
}

export type VoiceChannel = ReturnType<typeof useVoiceChannel>;
