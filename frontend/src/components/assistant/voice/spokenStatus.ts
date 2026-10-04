// User-requested voice readback of reviewed transcripts and server-bound proposals.
// No clinical action is executed by speech synthesis. User can mute or stop it.

import type { AudioState } from './audioSession';
import type { AssistantPreview } from '../assistantApi';

const KEY = 'clinicos.assistant.voiceFeedback';

export const SPOKEN_STATUS: Partial<Record<AudioState, string>> = {
  TRANSCRIPT_READY: 'Controlla la trascrizione sullo schermo.',
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
    return window.localStorage.getItem(KEY) !== 'off';
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
  if (phrase) speakFeedback(phrase);
}

export function interpretedPreviewSpeech(preview: AssistantPreview): string {
  const details = Object.entries(preview.values).map(([label, value]) => `${label}: ${value}`).join('. ');
  return [`Ho interpretato questa azione: ${preview.action}.`,
    preview.patient ? `Per ${preview.patient.label}.` : '', details,
    ...preview.warnings,
    preview.confirmable ? 'Verifica i dettagli. Confermi il comando che ho interpretato? Premi Conferma per procedere.'
      : `${preview.blockedReason || 'Completa i dati prima di procedere.'} Nessuna azione è stata eseguita.`].filter(Boolean).join(' ');
}

/** User-requested readback; content is never logged or sent through a new app service. */
export function speakFeedback(text: string) {
  if (!text.trim() || !spokenFeedbackSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'it-IT';
  const voices = window.speechSynthesis.getVoices().filter(voice => /^it(?:-|_)/i.test(voice.lang));
  const local = voices.filter(voice => voice.localService);
  const available = local.length ? local : voices;
  utterance.voice = available.find(voice => /natural|neural|elsa|isabella/i.test(voice.name)) ?? available[0] ?? null;
  utterance.rate = 0.92;
  utterance.pitch = 1.03;
  window.speechSynthesis.speak(utterance);
}
