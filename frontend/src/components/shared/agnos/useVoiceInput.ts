import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceStartGate } from './voiceStartGate';

// Web Speech is controlled by the browser: depending on browser/OS, recognition may use a remote
// speech service. ClinicOS receives only the resulting transcript, but must not claim on-device STT.

// Minimal Web Speech typing (not in lib.dom for all targets).
type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SR) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MSG_UNSUPPORTED =
  'Riconoscimento vocale non supportato dal browser: puoi digitare il comando.';
const MSG_DENIED = 'Permesso del microfono negato: puoi continuare a digitare il comando.';
const MSG_CAPTURE = 'Errore di acquisizione audio: riprova oppure digita il comando.';

interface UseVoiceInputOptions {
  /** Chiamata una sola volta, a fine ascolto, con la trascrizione finale (non vuota). */
  onFinalTranscript: (text: string) => void;
  consentGranted: boolean;
}

export function useVoiceInput({ onFinalTranscript, consentGranted }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const textRef = useRef('');
  const onFinalRef = useRef(onFinalTranscript);
  const consentRef = useRef(consentGranted);
  const startGateRef = useRef(createVoiceStartGate());

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
    consentRef.current = consentGranted;
  }, [onFinalTranscript, consentGranted]);

  const supported = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  /** Ferma l'ascolto: onend consegna la trascrizione finale al chiamante. */
  const stop = useCallback(() => {
    startGateRef.current.cancel();
    recRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    if (recRef.current || !consentRef.current) return;
    const token = startGateRef.current.begin();
    if (token === null) return;
    setError(null);
    const SRClass = getSpeechRecognition();
    if (!SRClass) {
      setError(MSG_UNSUPPORTED);
      return;
    }
    try {
      // The stream is only used for the permission prompt; stop it immediately afterwards.
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      if (startGateRef.current.isCurrent(token)) setError(MSG_DENIED);
      startGateRef.current.cancel();
      return;
    }
    if (!consentRef.current || !startGateRef.current.complete(token)) return;
    const rec = new SRClass();
    rec.lang = 'it-IT';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
        .trim();
      textRef.current = text;
      setInterimText(text);
    };
    rec.onerror = (e) => {
      setError(
        e?.error === 'not-allowed' || e?.error === 'service-not-allowed' ? MSG_DENIED : MSG_CAPTURE,
      );
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterimText('');
      const finalText = textRef.current.trim();
      textRef.current = '';
      if (finalText) onFinalRef.current(finalText);
    };
    recRef.current = rec;
    textRef.current = '';
    setInterimText('');
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
      setError(MSG_CAPTURE);
    }
  }, []);

  // Unmount: mai lasciare il riconoscitore attivo.
  useEffect(
    () => () => {
      startGateRef.current.cancel();
      recRef.current?.stop();
    },
    [],
  );

  return { supported, listening, interimText, error, start, stop };
}
