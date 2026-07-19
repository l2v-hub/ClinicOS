import { useCallback, useEffect, useState } from 'react';

// 015 AGNOS US3 (T020, decisione D6) — lettura vocale delle risposte con
// window.speechSynthesis (zero dipendenze, tutto locale). Voce it-IT quando
// disponibile, altrimenti degrado pulito sulla voce predefinita (la risposta
// resta comunque testuale, FR-017). Toggle persistito in localStorage;
// cancel() su nuovo input / stop / chiusura pannello; testi lunghi troncati.

const STORAGE_KEY = 'agnos-tts';
const MAX_SPOKEN_CHARS = 300;

function readStoredEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useSpeechOutput() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [enabled, setEnabled] = useState(readStoredEnabled);
  const [speaking, setSpeaking] = useState(false);

  /** Interrompe subito qualsiasi riproduzione in corso (FR-017). */
  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage non disponibile: il toggle vale per la sessione */
      }
      return next;
    });
  }, []);

  // Disattivare il toggle interrompe anche la riproduzione in corso.
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      window.speechSynthesis.cancel(); // una sola lettura alla volta
      const spoken =
        trimmed.length > MAX_SPOKEN_CHARS ? `${trimmed.slice(0, MAX_SPOKEN_CHARS)}…` : trimmed;
      const utter = new SpeechSynthesisUtterance(spoken);
      utter.lang = 'it-IT';
      // Voce italiana se presente; altrimenti fallback silenzioso alla predefinita.
      const itVoice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith('it'));
      if (itVoice) utter.voice = itVoice;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [supported, enabled],
  );

  // Unmount: mai lasciare il sintetizzatore in riproduzione.
  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel();
    },
    [supported],
  );

  return { supported, enabled, toggle, speaking, speak, stop };
}
