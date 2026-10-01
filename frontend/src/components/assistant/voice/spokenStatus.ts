// Phase 5 — optional spoken feedback (TTS). OFF by default, mutable, stoppable.
// It speaks ONLY short fixed status phrases: never the assistant reply, never resident names,
// values, drugs or any other clinical data (those stay on screen). Browser speechSynthesis: the
// text is synthesised on the device; no audio or text is sent to the ClinicOS backend.

import type { AudioState } from './audioSession';

const KEY = 'clinicos.assistant.voiceFeedback';

export const SPOKEN_STATUS: Partial<Record<AudioState, string>> = {
  TRANSCRIPT_FINAL: 'Controlla la trascrizione sullo schermo.',
  AWAITING_CONFIRMATION: 'Anteprima pronta. Controlla e premi Conferma.',
  COMPLETED: 'Operazione completata.',
  CANCELLED: 'Annullato.',
  ERROR: 'Non riuscito. Guarda lo schermo.',
};

export function spokenFeedbackSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function loadSpokenFeedback(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveSpokenFeedback(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable: preference lasts for this view only */
  }
}

export function stopSpeaking() {
  if (spokenFeedbackSupported()) window.speechSynthesis.cancel();
}

export function speakStatus(state: AudioState) {
  const phrase = SPOKEN_STATUS[state];
  if (!phrase || !spokenFeedbackSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.lang = 'it-IT';
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}
