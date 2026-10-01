// Phase 5 — audio session state machine (pure, no browser APIs).
//
//   IDLE → REQUESTING_PERMISSION → LISTENING → SPEECH_ACTIVE ⇄ TRANSCRIPT_PARTIAL → TRANSCRIBING
//        → TRANSCRIPT_FINAL → PROCESSING → AWAITING_CONFIRMATION | COMPLETED | ERROR | CANCELLED
//
// PARTIAL transcripts (realtime deltas) are display-only: they never leave TRANSCRIPT_PARTIAL /
// TRANSCRIBING and can never be submitted. Only TRANSCRIPT_FINAL (after the turn is committed and
// the provider sent the final transcript) can reach the Assistant — and only by the user's «Invia».
//
// The machine only tracks the VOICE channel. The Assistant workflow (preview, confirmation,
// execution) stays in assistantState.ts and the backend; the voice state just mirrors it after the
// transcript has been sent. A transcript is never an action: TRANSCRIPT_FINAL waits for the user.

export type AudioState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'LISTENING'
  | 'SPEECH_ACTIVE'
  | 'TRANSCRIPT_PARTIAL'
  | 'TRANSCRIBING'
  | 'TRANSCRIPT_FINAL'
  | 'PROCESSING'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'ERROR'
  | 'CANCELLED';

export interface AudioSession {
  state: AudioState;
  /** Final transcript under review (TRANSCRIPT_FINAL) — editable by the user before sending. */
  transcript: string;
  /** Live partial transcript (display only, never submitted). */
  partial: string;
  /** Resident active when the utterance was captured: a change discards the transcript. */
  residentId: string | null;
  /** Human-readable reason for ERROR / CANCELLED / discarded audio. */
  notice: string | null;
  /** Error code for ERROR (e.g. stt_unavailable, mic_denied) — drives the text fallback hint. */
  errorCode: string | null;
  /** Monotonic id of the capture: late STT answers of an older capture are ignored. */
  captureId: number;
  metrics: { speechMs?: number; sttMs?: number; firstPartialMs?: number };
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
  | { type: 'listening' }
  | { type: 'speech_start' }
  | { type: 'partial'; captureId: number; delta: string; atMs?: number }
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
  partial: '',
  residentId: null,
  notice: null,
  errorCode: null,
  captureId: 0,
  metrics: {},
};

export const AUDIO_STATE_LABELS: Record<AudioState, string> = {
  IDLE: 'Microfono spento',
  REQUESTING_PERMISSION: 'Attivazione microfono…',
  LISTENING: 'Microfono attivo — parla pure',
  SPEECH_ACTIVE: 'Ti sto ascoltando…',
  TRANSCRIPT_PARTIAL: 'Ti sto ascoltando… (testo provvisorio)',
  TRANSCRIBING: 'Trascrizione in corso…',
  TRANSCRIPT_FINAL: 'Controlla la trascrizione',
  PROCESSING: 'L’assistente sta elaborando…',
  AWAITING_CONFIRMATION: 'Anteprima pronta: conferma con il pulsante',
  COMPLETED: 'Fatto',
  ERROR: 'Voce non disponibile',
  CANCELLED: 'Annullato',
};

/** The microphone is open (audio frames are being analysed locally) only in these states. */
export function micOpen(state: AudioState): boolean {
  return state === 'LISTENING' || state === 'SPEECH_ACTIVE' || state === 'TRANSCRIPT_PARTIAL';
}

/** A capture is in progress (mic requested or open, or audio being transcribed). */
export function capturing(state: AudioState): boolean {
  return state === 'REQUESTING_PERMISSION' || micOpen(state) || state === 'TRANSCRIBING';
}

/** A new capture may start from any resting state (never while audio or a request is in flight). */
export function canStartCapture(state: AudioState): boolean {
  return (
    state === 'IDLE' ||
    state === 'COMPLETED' ||
    state === 'ERROR' ||
    state === 'CANCELLED' ||
    state === 'AWAITING_CONFIRMATION' ||
    state === 'TRANSCRIPT_FINAL'
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
        state: 'REQUESTING_PERMISSION',
        residentId: event.residentId,
        captureId: session.captureId + 1,
      };
    case 'listening':
      return s === 'REQUESTING_PERMISSION' ? { ...session, state: 'LISTENING' } : session;
    case 'speech_start':
      return s === 'LISTENING' ? { ...session, state: 'SPEECH_ACTIVE' } : session;
    case 'partial': {
      // Display only. A late delta of an older capture, or after the final, is ignored.
      if (event.captureId !== session.captureId) return session;
      if (!micOpen(s) && s !== 'TRANSCRIBING') return session;
      return {
        ...session,
        state: s === 'TRANSCRIBING' ? 'TRANSCRIBING' : 'TRANSCRIPT_PARTIAL',
        partial: (session.partial + event.delta).slice(-2000),
        metrics:
          session.metrics.firstPartialMs === undefined && event.atMs !== undefined
            ? { ...session.metrics, firstPartialMs: event.atMs }
            : session.metrics,
      };
    }
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
          partial: '',
          notice: 'Non ho capito le parole: nessun comando inviato. Riprova o scrivi.',
          metrics: { ...session.metrics, sttMs: event.sttMs },
        };
      return {
        ...session,
        state: 'TRANSCRIPT_FINAL',
        transcript: event.text.trim(),
        partial: '',
        notice: null,
        metrics: { ...session.metrics, sttMs: event.sttMs },
      };
    case 'failed':
      if (event.captureId !== undefined && event.captureId !== session.captureId) return session;
      return {
        ...session,
        state: 'ERROR',
        transcript: '',
        partial: '',
        errorCode: event.code,
        notice: event.message,
      };
    case 'edit':
      return s === 'TRANSCRIPT_FINAL' ? { ...session, transcript: event.text } : session;
    case 'submit':
      // Only a FINAL transcript can be sent; partials never (Prompt 5 §6).
      if (s !== 'TRANSCRIPT_FINAL' || !session.transcript.trim()) return session;
      return { ...session, state: 'PROCESSING', notice: null };
    case 'assistant':
      if (s !== 'PROCESSING' && s !== 'AWAITING_CONFIRMATION') return session;
      return { ...session, state: assistantToAudio(event.status), transcript: '' };
    case 'resident_changed':
      if (event.residentId === session.residentId) return session;
      if (s === 'TRANSCRIPT_FINAL' || capturing(s))
        return {
          ...session,
          state: 'CANCELLED',
          transcript: '',
          partial: '',
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
        partial: '',
        captureId: session.captureId + 1,
        notice: event.reason ?? 'Comando vocale annullato: non è stato inviato nulla.',
      };
    case 'reset':
      return { ...initialAudioSession, captureId: session.captureId + 1 };
    default:
      return session;
  }
}
