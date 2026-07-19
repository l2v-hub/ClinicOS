// REQ-041: voice feature configuration. Model-agnostic and Railway-overridable. Closed-by-default
// for anything destructive. Pure function over the environment → fully unit-testable.

export interface VoiceConfig {
  voiceEnabled: boolean; // AI_VOICE_ENABLED
  writeActionsEnabled: boolean; // AI_WRITE_ACTIONS_ENABLED
  deleteActionsEnabled: boolean; // AI_DELETE_ACTIONS_ENABLED (always treated as off in v1)
  requireWriteConfirmation: boolean; // AI_REQUIRE_WRITE_CONFIRMATION
  sttModel: string | null; // AI_STT_MODEL ("provider:model_id") — null → STT degraded
  audioRetentionSeconds: number; // AI_VOICE_AUDIO_RETENTION_SECONDS (0 = delete after processing)
  transcriptRetentionDays: number; // AI_VOICE_TRANSCRIPT_RETENTION_DAYS (0 = do not persist)
}

function boolEnv(env: NodeJS.ProcessEnv, key: string, def: boolean): boolean {
  const v = (env[key] ?? '').trim().toLowerCase();
  if (v === '') return def;
  return v === 'true' || v === '1' || v === 'yes';
}

function intEnv(env: NodeJS.ProcessEnv, key: string, def: number): number {
  const n = parseInt((env[key] ?? '').trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export function loadVoiceConfig(env: NodeJS.ProcessEnv = process.env): VoiceConfig {
  const sttRaw = (env.AI_STT_MODEL ?? '').trim();
  return {
    voiceEnabled: boolEnv(env, 'AI_VOICE_ENABLED', true),
    writeActionsEnabled: boolEnv(env, 'AI_WRITE_ACTIONS_ENABLED', true),
    deleteActionsEnabled: false, // v1: voice deletes are never enabled, regardless of env
    requireWriteConfirmation: boolEnv(env, 'AI_REQUIRE_WRITE_CONFIRMATION', true),
    sttModel: sttRaw ? sttRaw : null,
    audioRetentionSeconds: intEnv(env, 'AI_VOICE_AUDIO_RETENTION_SECONDS', 0),
    transcriptRetentionDays: intEnv(env, 'AI_VOICE_TRANSCRIPT_RETENTION_DAYS', 0),
  };
}

// The STT capabilities a configured model must advertise. When the model can't satisfy these, the
// runtime degrades (server-side transcription unavailable) WITHOUT blocking text search or the
// client-side Web Speech path.
export const REQUIRED_STT_CAPABILITIES = ['audio_input', 'speech_to_text', 'language_it'] as const;

export interface SttStatus {
  available: boolean;
  model: string | null;
  degraded: boolean;
  reason?: string;
}

export function sttStatus(cfg: VoiceConfig = loadVoiceConfig()): SttStatus {
  if (!cfg.sttModel) {
    return {
      available: false,
      model: null,
      degraded: true,
      reason: 'AI_STT_MODEL non configurato',
    };
  }
  // Provider capability verification happens in the runtime; here we report configured intent.
  return { available: true, model: cfg.sttModel, degraded: false };
}
