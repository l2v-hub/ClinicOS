import { useCallback, useEffect, useRef, useState } from 'react';

// 015 AGNOS US3 (T019) — dettatura client-side estratta dal vecchio FAB
// VoiceAssistant. Il Web Speech (it-IT) trascrive NEL BROWSER: l'audio non
// lascia mai il dispositivo (FR-015); solo il testo finale raggiunge il
// chiamante via onFinalTranscript. L'ascolto parte SOLO su start() esplicito;
// permesso negato → messaggio chiaro, si continua a digitare.

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
}

export function useVoiceInput({ onFinalTranscript }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const textRef = useRef('');
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const supported = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  /** Ferma l'ascolto: onend consegna la trascrizione finale al chiamante. */
  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    if (recRef.current) return; // già in ascolto
    setError(null);
    const SRClass = getSpeechRecognition();
    if (!SRClass) {
      setError(MSG_UNSUPPORTED);
      return;
    }
    try {
      // Prompt esplicito del permesso (FR-015); l'audio non viene mai inviato altrove.
      // Lo stream serve solo al prompt: chiuderlo subito, o l'indicatore mic del browser resta acceso.
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      setError(MSG_DENIED);
      return;
    }
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
      recRef.current?.stop();
    },
    [],
  );

  return { supported, listening, interimText, error, start, stop };
}
