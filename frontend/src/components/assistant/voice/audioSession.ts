// Phase 5 — audio session state machine (pure, no browser APIs).
//
//   IDLE → LISTENING → SPEECH_ACTIVE → TRANSCRIBING → TRANSCRIPT_READY → PROCESSING
//        → AWAITING_CONFIRMATION | COMPLETED | ERROR | CANCELLED
//
// The machine only tracks the VOICE channel. The Assistant workflow (preview, confirmation,
// execution) stays in assistantState.ts and the backend; the voice state just mirrors it after the
// transcript has been sent. A transcript is never an action: TRANSCRIPT_READY waits for the user.

export type AudioState =
  | 'IDLE'
  | 'LISTENING'
  | 'SPEECH_ACTIVE'
  | 'TRANSCRIBING'
  | 'TRANSCRIPT_READY'
  | 'PROCESSING'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'ERROR'
  | 'CANCELLED';

export interface AudioSession {
  state: AudioState;
  /** Transcript under review (TRANSCRIPT_READY) — editable by the user before sending. */
  transcript: string;
  /** Resident active when the utterance was captured: a change discards the transcript. */
  residentId: string | null;
  /** Human-readable reason for ERROR / CANCELLED / discarded audio. */
  notice: string | null;
  /** Error code for ERROR (e.g. stt_unavailable, mic_denied) — drives the text fallback hint. */
  errorCode: string | null;
  /** Monotonic id of the capture: late STT answers of an older capture are ignored. */
  captureId: number;
  metrics: { speechMs?: number; sttMs?: number };
}

export type AssistantTurnStatus =
  | 'START'
  | 'CONTEXT_REQUIRED'
  | 'READY'
  | 'NEEDS_CLARIFICATION'
  | 'NEEDS_CONFIRMATION'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'DENIED'
  | 'FAILED'
  | 'CANCELLED';

export type AudioEvent =
  | { type: 'start'; residentId: string | null }
  | { type: 'speech_start' }
  | { type: 'utterance'; speechMs: number }
  | { type: 'discarded'; reason: 'no_speech' | 'too_short' }
  | { type: 'transcribed'; captureId: number; text: string; empty: boolean; sttMs?: number }
  | { type: 'failed'; code: string; message: string; captureId?: number }
  | { type: 'edit'; text: string }
  | { type: 'submit' }
  | { type: 'assistant'; status: AssistantTurnStatus | 'REQUEST_FAILED' }
  | { type: 'resident_changed'; residentId: string | null }
  | { type: 'cancel'; reason?: string }
  | { type: 'reset' };

export const initialAudioSession: AudioSession = {
  state: 'IDLE',
  transcript: '',
  residentId: null,
  notice: null,
  errorCode: null,
  captureId: 0,
  metrics: {},
};

export const AUDIO_STATE_LABELS: Record<AudioState, string> = {
  IDLE: 'Microfono spento',
  LISTENING: 'Microfono attivo — parla pure',
  SPEECH_ACTIVE: 'Ti sto ascoltando…',
  TRANSCRIBING: 'Trascrizione in corso…',
  TRANSCRIPT_READY: 'Controlla la trascrizione',
  PROCESSING: 'L’assistente sta elaborando…',
  AWAITING_CONFIRMATION: 'Anteprima pronta: conferma con il pulsante',
  COMPLETED: 'Fatto',
  ERROR: 'Voce non disponibile',
  CANCELLED: 'Annullato',
};

/** The microphone is open (audio frames are being analysed locally) only in these states. */
export function micOpen(state: AudioState): boolean {
  return state === 'LISTENING' || state === 'SPEECH_ACTIVE';
}

/** A new capture may start from any resting state (never while audio or a request is in flight). */
export function canStartCapture(state: AudioState): boolean {
  return (
    state === 'IDLE' ||
    state === 'COMPLETED' ||
    state === 'ERROR' ||
    state === 'CANCELLED' ||
    state === 'AWAITING_CONFIRMATION' ||
    state === 'TRANSCRIPT_READY'
  );
}

const DISCARD_NOTICE = {
  no_speech: 'Nessun parlato rilevato: non è stato inviato nulla.',
  too_short: 'Audio troppo breve: non è stato inviato nulla.',
} as const;

function assistantToAudio(status: AssistantTurnStatus | 'REQUEST_FAILED'): AudioState {
  switch (status) {
    case 'NEEDS_CONFIRMATION':
      return 'AWAITING_CONFIRMATION';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'DENIED':
    case 'FAILED':
    case 'REQUEST_FAILED':
      return 'ERROR';
    case 'EXECUTING':
      return 'PROCESSING';
    default:
      // Clarification / context needed: the voice turn is over, the assistant waits for input.
      return 'IDLE';
  }
}

export function audioReducer(session: AudioSession, event: AudioEvent): AudioSession {
  const s = session.state;
  switch (event.type) {
    case 'start':
      if (!canStartCapture(s)) return session;
      return {
        ...initialAudioSession,
        state: 'LISTENING',
        residentId: event.residentId,
        captureId: session.captureId + 1,
      };
    case 'speech_start':
      return s === 'LISTENING' ? { ...session, state: 'SPEECH_ACTIVE' } : session;
    case 'utterance':
      if (!micOpen(s)) return session;
      return {
        ...session,
        state: 'TRANSCRIBING',
        metrics: { ...session.metrics, speechMs: event.speechMs },
      };
    case 'discarded':
      if (!micOpen(s)) return session;
      return { ...session, state: 'IDLE', notice: DISCARD_NOTICE[event.reason] };
    case 'transcribed':
      if (s !== 'TRANSCRIBING' || event.captureId !== session.captureId) return session;
      if (event.empty || !event.text.trim())
        return {
          ...session,
          state: 'IDLE',
          notice: 'Non ho capito le parole: nessun comando inviato. Riprova o scrivi.',
          metrics: { ...session.metrics, sttMs: event.sttMs },
        };
      return {
        ...session,
        state: 'TRANSCRIPT_READY',
        transcript: event.text.trim(),
        notice: null,
        metrics: { ...session.metrics, sttMs: event.sttMs },
      };
    case 'failed':
      if (event.captureId !== undefined && event.captureId !== session.captureId) return session;
      return {
        ...session,
        state: 'ERROR',
        transcript: '',
        errorCode: event.code,
        notice: event.message,
      };
    case 'edit':
      return s === 'TRANSCRIPT_READY' ? { ...session, transcript: event.text } : session;
    case 'submit':
      if (s !== 'TRANSCRIPT_READY' || !session.transcript.trim()) return session;
      return { ...session, state: 'PROCESSING', notice: null };
    case 'assistant':
      if (s !== 'PROCESSING' && s !== 'AWAITING_CONFIRMATION') return session;
      return { ...session, state: assistantToAudio(event.status), transcript: '' };
    case 'resident_changed':
      if (event.residentId === session.residentId) return session;
      if (s === 'TRANSCRIPT_READY' || s === 'TRANSCRIBING' || micOpen(s))
        return {
          ...session,
          state: 'CANCELLED',
          transcript: '',
          captureId: session.captureId + 1,
          notice: 'Ospite cambiato: la trascrizione è stata scartata.',
        };
      return { ...session, residentId: event.residentId };
    case 'cancel':
      if (s === 'IDLE') return session;
      return {
        ...session,
        state: 'CANCELLED',
        transcript: '',
        captureId: session.captureId + 1,
        notice: event.reason ?? 'Comando vocale annullato: non è stato inviato nulla.',
      };
    case 'reset':
      return { ...initialAudioSession, captureId: session.captureId + 1 };
    default:
      return session;
  }
}
