// Phase 5 — voice channel of the AI Assistant (push-to-talk).
//
// Mic (explicit tap) → STT → FINAL transcript shown for review (edit / resend / cancel / text) →
// «Invia» → the SAME submitText the keyboard uses (source 'voice') → Agno → skill → policy +
// resident scope → preview → UI «Conferma». Voice never confirms: the confirmation stays a button.
//
// Transports (chosen by the backend status):
//  • webrtc (default, Azure gpt-live-transcribe): ephemeral session from the backend, WebRTC on the
//    mic stream, PARTIAL deltas shown live (display only), local VAD end of turn → commit → FINAL.
//  • server: local VAD → one WAV utterance → POST /skills/voice/transcribe → FINAL.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AssistantHttpError } from '../assistantApi';
import {
  openRealtimeTranscription,
  type RealtimeEvent,
  type RealtimeTransport,
} from './realtimeTransport';
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
  stopSpeaking,
  spokenFeedbackSupported,
} from './spokenStatus';
import { useVoiceCapture, type CaptureEvent } from './useVoiceCapture';
import { DEFAULT_VAD_CONFIG } from './vad';
import {
  loadVoiceStatus,
  negotiateRealtimeCall,
  transcribeUtterance,
  type VoiceStatus,
} from './voiceApi';

const STT_ERROR_TEXT: Record<string, string> = {
  stt_unavailable: 'Trascrizione vocale non disponibile ora: scrivi il messaggio.',
  stt_timeout: 'La trascrizione ci sta mettendo troppo: riprova o scrivi il messaggio.',
  stt_provider_error: 'Il servizio di trascrizione ha dato errore: riprova o scrivi il messaggio.',
  stt_unreachable: 'Servizio di trascrizione non raggiungibile: scrivi il messaggio.',
  invalid_audio: 'Audio non valido: riprova o scrivi il messaggio.',
  utterance_too_long: 'Frase troppo lunga: dividila in più comandi o scrivila.',
  voice_denied: 'Il tuo ruolo non può usare il canale vocale: scrivi il messaggio.',
  voice_disabled: 'Canale vocale non attivo in questo ambiente: scrivi il messaggio.',
  realtime_unreachable: 'Trascrizione realtime non raggiungibile: scrivi il messaggio.',
  realtime_disconnected: 'Connessione di trascrizione interrotta: riprova o scrivi il messaggio.',
  realtime_failed: 'Connessione di trascrizione non riuscita: riprova o scrivi il messaggio.',
  realtime_timeout: 'Connessione di trascrizione troppo lenta: riprova o scrivi il messaggio.',
  webrtc_unsupported: 'Il browser non supporta la trascrizione realtime: scrivi il messaggio.',
};

/** After the commit, the FINAL transcript must arrive within this time. */
const FINAL_TIMEOUT_MS = 15_000;
/** Delay between the local end of turn and the commit (RTP audio still in flight). */
const COMMIT_DELAY_MS = 250;

interface Options {
  residentId: string | null;
  busy: boolean;
  /** The Assistant entry point: submitText(text, 'voice'). */
  onSubmit: (text: string) => void;
  /** «Scrivi a mano»: moves the transcript into the text composer. */
  onSwitchToText: (text: string) => void;
}

export function useVoiceChannel({ residentId, busy, onSubmit, onSwitchToText }: Options) {
  const [audio, dispatch] = useReducer(audioReducer, initialAudioSession);
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [spoken, setSpoken] = useState(loadSpokenFeedback);
  const inFlight = useRef<AbortController | null>(null);
  const captureId = useRef(0);
  const submitted = useRef(false);
  /** A capture started by the user is live: only its utterance may be uploaded (QA H1). */
  const listening = useRef(false);
  /** Realtime session of the live capture (webrtc transport) + its bookkeeping. */
  const realtime = useRef<RealtimeTransport | null>(null);
  const realtimeSeq = useRef(0);
  const realtimeClock = useRef({ t0: 0, commitAt: 0 });
  const finalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Transport of the live capture: a realtime capture never falls back to the upload path (QA H2). */
  const captureMode = useRef<'webrtc' | 'server'>('server');
  /** Aborts a pending WebRTC negotiation (cancel / resident change / unmount — QA M1). */
  const connecting = useRef<AbortController | null>(null);
  /** Latest stopAll (realtime errors stop capture + transport). */
  const stopRef = useRef<() => void>(() => {});

  const closeRealtime = useCallback(() => {
    realtimeSeq.current += 1; // late events of this session are ignored from now on
    connecting.current?.abort();
    connecting.current = null;
    if (finalTimer.current) clearTimeout(finalTimer.current);
    finalTimer.current = null;
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = null;
    realtime.current?.close();
    realtime.current = null;
  }, []);

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

  const onCapture = useCallback(
    (event: CaptureEvent) => {
      switch (event.type) {
        case 'listening':
          if (listening.current) dispatch({ type: 'listening' });
          return;
        case 'speech_start':
          if (listening.current) dispatch({ type: 'speech_start' });
          return;
        case 'discarded':
          // Nothing was said: the realtime turn is never committed (no transcript, no command).
          closeRealtime();
          if (listening.current) dispatch({ type: 'discarded', reason: event.reason });
          listening.current = false;
          return;
        case 'interrupted':
          closeRealtime();
          if (listening.current) dispatch({ type: 'cancel', reason: event.reason });
          listening.current = false;
          return;
        case 'error':
          closeRealtime();
          if (listening.current)
            dispatch({
              type: 'failed',
              code: event.code,
              message: STT_ERROR_TEXT[event.code] ?? event.message,
            });
          listening.current = false;
          return;
        case 'utterance': {
          // Cancelled / resident changed / switched to text while the VAD was closing the turn:
          // the audio is dropped here and never leaves the device.
          if (!listening.current) return;
          listening.current = false;
          dispatch({ type: 'utterance', speechMs: event.speechMs });
          const id = captureId.current;
          if (captureMode.current === 'webrtc') {
            // Realtime capture: the audio is already with the STT. It NEVER falls back to the upload
            // path (QA H2/R1): without a live session the turn is simply dropped.
            const rt = realtime.current;
            if (!rt) {
              dispatch({
                type: 'failed',
                captureId: id,
                code: 'realtime_failed',
                message: STT_ERROR_TEXT.realtime_failed,
              });
              return;
            }
            realtimeClock.current.commitAt = performance.now();
            // Let the last ~250 ms of RTP audio reach the STT before closing the turn («Fine»
            // mid-word). Cancellable: closeRealtime clears it.
            commitTimer.current = setTimeout(() => {
              commitTimer.current = null;
              rt.commit();
            }, COMMIT_DELAY_MS);
            finalTimer.current = setTimeout(() => {
              closeRealtime();
              dispatch({
                type: 'failed',
                captureId: id,
                code: 'stt_timeout',
                message: STT_ERROR_TEXT.stt_timeout,
              });
            }, FINAL_TIMEOUT_MS);
            return;
          }
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
    },
    [closeRealtime],
  );

  /** Realtime events of session `seq` (capture `id`). Partials: display only. */
  const onRealtime = useCallback(
    (seq: number, id: number, event: RealtimeEvent) => {
      if (seq !== realtimeSeq.current) return;
      const now = performance.now();
      switch (event.kind) {
        case 'partial':
          dispatch({
            type: 'partial',
            captureId: id,
            delta: event.delta,
            atMs: Math.round(now - realtimeClock.current.t0),
          });
          return;
        case 'final':
          closeRealtime();
          dispatch({
            type: 'transcribed',
            captureId: id,
            text: event.transcript,
            empty: !event.transcript.trim(),
            sttMs: Math.round(now - realtimeClock.current.commitAt),
          });
          return;
        case 'failed':
        case 'error': {
          const empty = event.kind === 'error' && /commit_empty|buffer_too_small/i.test(event.code);
          // The mic must not keep running behind an error (QA H2): stop capture + transport.
          stopRef.current();
          if (empty) dispatch({ type: 'transcribed', captureId: id, text: '', empty: true });
          else {
            const code =
              event.kind === 'error' && event.code === 'realtime_disconnected'
                ? 'realtime_disconnected'
                : 'stt_provider_error';
            dispatch({ type: 'failed', captureId: id, code, message: STT_ERROR_TEXT[code] });
          }
          return;
        }
        default:
          return;
      }
    },
    [closeRealtime],
  );

  const capture = useVoiceCapture(onCapture);
  const abortCapture = capture.abort;

  /** Stop everything in flight: mic (also a pending permission prompt) and the STT request. */
  const stopAll = useCallback(() => {
    listening.current = false;
    abortCapture();
    closeRealtime();
    inFlight.current?.abort();
    inFlight.current = null;
  }, [abortCapture, closeRealtime]);
  useEffect(() => {
    stopRef.current = stopAll;
  }, [stopAll]);

  // Assistant closed: nothing keeps running (mic released by useVoiceCapture, STT request aborted).
  useEffect(() => () => stopAll(), [stopAll]);

  // Resident changed while a capture / transcript is pending → stop the mic, drop the audio and
  // the transcript (never re-target).
  const lastResident = useRef(residentId);
  useEffect(() => {
    if (lastResident.current === residentId) return;
    lastResident.current = residentId;
    stopAll();
    dispatch({ type: 'resident_changed', residentId });
  }, [residentId, stopAll]);

  // Optional spoken status (off by default; fixed phrases only).
  useEffect(() => {
    if (spoken) speakStatus(audio.state);
  }, [audio.state, spoken]);

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
    const config = { ...vad, maxUtteranceMs: Math.min(vad.maxUtteranceMs, maxMsByBytes) };
    if (status?.transport !== 'webrtc') {
      captureMode.current = 'server';
      void capture.start(config);
      return;
    }
    captureMode.current = 'webrtc';
    const id = audio.captureId + 1; // the id the reducer assigns to this capture
    const seq = realtimeSeq.current + 1;
    realtimeSeq.current = seq;
    const controller = new AbortController();
    connecting.current = controller;
    void capture.start(config, async (stream) => {
      const transport = await openRealtimeTranscription(
        negotiateRealtimeCall,
        stream,
        (event) => onRealtime(seq, id, event),
        { signal: controller.signal },
      );
      if (connecting.current === controller) connecting.current = null;
      if (seq !== realtimeSeq.current) {
        transport.close();
        return;
      }
      realtime.current = transport;
      realtimeClock.current = { t0: performance.now(), commitAt: 0 };
    });
  }, [
    audio.captureId,
    audio.state,
    available,
    busy,
    capture,
    onRealtime,
    residentId,
    status,
    stopAll,
  ]);

  const finish = useCallback(() => capture.finish(), [capture]);

  const cancel = useCallback(() => {
    stopAll();
    stopSpeaking();
    dispatch({ type: 'cancel' });
  }, [stopAll]);

  const submit = useCallback(() => {
    const text = audio.transcript.trim();
    if (audio.state !== 'TRANSCRIPT_FINAL' || !text || busy || submitted.current) return;
    submitted.current = true; // one transcript → at most one Assistant request
    dispatch({ type: 'submit' });
    onSubmit(text);
  }, [audio.state, audio.transcript, busy, onSubmit]);

  const switchToText = useCallback(() => {
    const text = audio.transcript;
    stopAll();
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
