// Phase 5 — client-side VAD / turn-detection parameters, served to the Assistant UI so they can be
// tuned per environment without a frontend release. The VAD itself runs in the browser (never an LLM).

export interface VoiceVadConfig {
  /** RMS level (dB) above the adaptive noise floor that counts as speech. */
  speechMarginDb: number;
  /** Absolute floor (dBFS) below which a frame is always silence. */
  minSpeechDb: number;
  /** Speech shorter than this is discarded (clicks, coughs). */
  minSpeechMs: number;
  /** Silence after speech that ends the utterance (turn detection). */
  endSilenceMs: number;
  /** Hard cap of one utterance. */
  maxUtteranceMs: number;
  /** No speech within this time after the mic opens → stop, nothing sent. */
  noSpeechTimeoutMs: number;
  /** Hands-free session: inactivity before the mic closes by itself. */
  sessionIdleTimeoutMs: number;
}

export const DEFAULT_VAD: VoiceVadConfig = {
  speechMarginDb: 12,
  minSpeechDb: -50,
  minSpeechMs: 300,
  endSilenceMs: 900,
  maxUtteranceMs: 15_000,
  noSpeechTimeoutMs: 6_000,
  sessionIdleTimeoutMs: 30_000,
};

const ENV_KEYS: Record<keyof VoiceVadConfig, string> = {
  speechMarginDb: 'VOICE_VAD_SPEECH_MARGIN_DB',
  minSpeechDb: 'VOICE_VAD_MIN_SPEECH_DB',
  minSpeechMs: 'VOICE_VAD_MIN_SPEECH_MS',
  endSilenceMs: 'VOICE_VAD_END_SILENCE_MS',
  maxUtteranceMs: 'VOICE_VAD_MAX_UTTERANCE_MS',
  noSpeechTimeoutMs: 'VOICE_VAD_NO_SPEECH_TIMEOUT_MS',
  sessionIdleTimeoutMs: 'VOICE_SESSION_IDLE_TIMEOUT_MS',
};

export function voiceVadConfig(env: NodeJS.ProcessEnv = process.env): VoiceVadConfig {
  const out = { ...DEFAULT_VAD };
  for (const [key, name] of Object.entries(ENV_KEYS) as [keyof VoiceVadConfig, string][]) {
    const raw = env[name];
    const value = Number(raw);
    if (raw !== undefined && raw !== '' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}
