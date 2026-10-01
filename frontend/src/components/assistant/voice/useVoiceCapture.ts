// Phase 5 — microphone capture for ONE utterance (push-to-talk).
//
// getUserMedia → [optional realtime transport connects on the same stream] → AudioContext → frame
// tap → local VAD (vad.ts) → end of turn (16 kHz WAV for the server transport, commit for realtime).
// The mic is opened only by an explicit user gesture and is released as soon as the utterance ends,
// is discarded, is cancelled, the tab is hidden or the component unmounts. Frames are analysed in
// memory; nothing is stored, nothing is sent until the VAD has a finished utterance.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceStartGate } from '../../shared/agnos/voiceStartGate';
import { createVad, type Vad, type VadConfig } from './vad';
import { utteranceToWav } from './wav';

export type CaptureEvent =
  | { type: 'listening' }
  | { type: 'speech_start' }
  | { type: 'utterance'; wav: Uint8Array; speechMs: number; capped: boolean }
  | { type: 'discarded'; reason: 'no_speech' | 'too_short' }
  | { type: 'interrupted'; reason: string }
  | {
      type: 'error';
      code: 'mic_denied' | 'mic_missing' | 'mic_unsupported' | 'mic_error' | string;
      message: string;
    };

const FRAME_SIZE = 2048;

const MIC_ERRORS: Record<
  string,
  { code: 'mic_denied' | 'mic_missing' | 'mic_error'; message: string }
> = {
  NotAllowedError: {
    code: 'mic_denied',
    message:
      'Permesso del microfono negato: abilitalo dalle impostazioni del browser o scrivi il messaggio.',
  },
  SecurityError: {
    code: 'mic_denied',
    message: 'Il browser non consente il microfono in questa pagina: scrivi il messaggio.',
  },
  NotFoundError: { code: 'mic_missing', message: 'Nessun microfono trovato: scrivi il messaggio.' },
  NotReadableError: {
    code: 'mic_error',
    message: 'Microfono occupato da un’altra app: chiudila o scrivi il messaggio.',
  },
};

interface Capture {
  stream: MediaStream;
  context: AudioContext;
  processor: ScriptProcessorNode;
  vad: Vad;
}

export function useVoiceCapture(onEvent: (event: CaptureEvent) => void) {
  const capture = useRef<Capture | null>(null);
  /** Mic stream between getUserMedia and «listening» (realtime connecting): cancel must stop it. */
  const pendingStream = useRef<MediaStream | null>(null);
  // A start is pending while the permission prompt is open: cancel / unmount / a newer start must
  // stop the stream the browser hands back later (QA H1) — the mic never opens behind the UI.
  const gate = useRef(createVoiceStartGate());
  const handler = useRef(onEvent);
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  const release = useCallback(() => {
    gate.current.cancel();
    pendingStream.current?.getTracks().forEach((track) => track.stop());
    pendingStream.current = null;
    const current = capture.current;
    capture.current = null;
    if (!current) return;
    current.processor.onaudioprocess = null;
    try {
      current.processor.disconnect();
    } catch {
      /* already disconnected */
    }
    current.stream.getTracks().forEach((track) => track.stop());
    void current.context.close().catch(() => undefined);
    setActive(false);
    setLevel(0);
  }, []);

  const start = useCallback(
    /**
     * `beforeListen` runs with the open mic stream before the VAD starts (e.g. connect the realtime
     * transport): «LISTENING» is announced only when audio actually goes somewhere useful.
     */
    async (config: VadConfig, beforeListen?: (stream: MediaStream) => Promise<void>) => {
      if (capture.current) return;
      const token = gate.current.begin();
      if (token === null) return; // a start is already pending
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        gate.current.cancel();
        handler.current({
          type: 'error',
          code: 'mic_unsupported',
          message: 'Questo browser non supporta il microfono: scrivi il messaggio.',
        });
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (error) {
        if (!gate.current.complete(token)) return; // cancelled meanwhile: no error to show
        const name = error instanceof DOMException ? error.name : '';
        const mapped = MIC_ERRORS[name] ?? {
          code: 'mic_error' as const,
          message: 'Microfono non disponibile: scrivi il messaggio.',
        };
        handler.current({ type: 'error', ...mapped });
        return;
      }
      if (!gate.current.isCurrent(token)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (beforeListen) {
        pendingStream.current = stream;
        try {
          await beforeListen(stream);
          if (pendingStream.current === stream) pendingStream.current = null;
        } catch (error) {
          if (pendingStream.current === stream) pendingStream.current = null;
          stream.getTracks().forEach((track) => track.stop());
          if (!gate.current.complete(token)) return; // cancelled while connecting
          const code =
            error && typeof error === 'object' && 'code' in error
              ? String(error.code)
              : 'transport_error';
          handler.current({
            type: 'error',
            code,
            message:
              error instanceof Error ? error.message : 'Trascrizione realtime non disponibile',
          });
          return;
        }
      }
      if (!gate.current.complete(token)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(FRAME_SIZE, 1, 1);
      const mute = context.createGain();
      mute.gain.value = 0; // the tap must reach the destination to run, but stays silent
      source.connect(processor);
      processor.connect(mute);
      mute.connect(context.destination);
      const vad = createVad(context.sampleRate, config);
      capture.current = { stream, context, processor, vad };
      setActive(true);
      handler.current({ type: 'listening' });
      let frames = 0;
      processor.onaudioprocess = (audio) => {
        if (capture.current?.processor !== processor) return;
        const frame = new Float32Array(audio.inputBuffer.getChannelData(0)); // copy: buffer is reused
        const event = vad.push(frame);
        frames += 1;
        if (frames % 3 === 0) {
          const { db } = vad.level();
          setLevel(Math.max(0, Math.min(1, (db + 60) / 50)));
        }
        if (!event) return;
        if (event.type === 'speech_start') {
          handler.current(event);
          return;
        }
        const rate = context.sampleRate;
        release();
        if (event.type === 'utterance')
          handler.current({
            type: 'utterance',
            wav: utteranceToWav(event.samples, rate),
            speechMs: event.speechMs,
            capped: event.capped,
          });
        else handler.current(event);
      };
      if (context.state === 'suspended') await context.resume().catch(() => undefined);
    },
    [release],
  );

  /** «Fine»: close the utterance now (speech so far) — or discard if nothing was said. */
  const finish = useCallback(() => {
    const current = capture.current;
    if (!current) return;
    const rate = current.context.sampleRate;
    const event = current.vad.flush();
    release();
    if (event.type === 'utterance')
      handler.current({
        type: 'utterance',
        wav: utteranceToWav(event.samples, rate),
        speechMs: event.speechMs,
        capped: event.capped,
      });
    else if (event.type === 'discarded') handler.current(event);
  }, [release]);

  /** Cancel: release the mic, drop the audio, no event (the caller already knows). */
  const abort = useCallback(() => release(), [release]);

  // Interruption: tab hidden / app backgrounded → stop listening, nothing is sent.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && capture.current) {
        release();
        handler.current({
          type: 'interrupted',
          reason: 'Ascolto interrotto (app in background): nulla è stato inviato.',
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, [release]);

  return { start, finish, abort, level, active };
}
