// Phase 5 — speech-to-text contract (provider-neutral). Voice is a CHANNEL: the transcript it
// produces is shown to the user and then enters the SAME Assistant path as typed text
// (/skills/converse). Nothing here interprets or acts.
//
//   SpeechToTextProvider.transcribe(audio, locale, context?) → TranscriptResult
//
// Default provider: the AI runtime (`POST {AI_RUNTIME_URL}/v1/voice/transcribe`), which owns the
// provider credentials and the model choice (AI_STT_MODEL, e.g. google:gemini-3.5-flash-lite).
// Audio lives only in memory for the duration of the request; it is never stored or logged.

export interface Utterance {
  bytes: Buffer;
  mimeType: string;
  /** Captured speech duration reported by the client (after VAD trimming). */
  durationMs?: number;
  /** Where the audio came from (browser mic today; clip-on / wearable later). Never used by skills. */
  source?: string;
}

export interface TranscriptResult {
  text: string;
  locale: string;
  /** Provider confidence when available (Gemini: not provided). */
  confidence: number | null;
  timestamps: { startMs: number; endMs: number; text: string }[];
  /** True when the provider heard no intelligible speech: nothing must be sent to the Assistant. */
  empty: boolean;
  metadata: {
    provider: string;
    model: string;
    durationMs: number;
    roundTripMs: number;
    /** Provider token counts when reported (cost measurement). */
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  };
  error?: { code: string; message: string };
}

export interface SpeechToTextProvider {
  transcribe(
    audio: Utterance,
    locale: string,
    context?: { requestId?: string },
  ): Promise<TranscriptResult>;
}

export class SttUnavailableError extends Error {
  constructor(
    public readonly code:
      'stt_unavailable' | 'stt_timeout' | 'stt_provider_error' | 'stt_invalid_audio',
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const STT_TIMEOUT_MS = 25_000;

export function createRuntimeSttProvider(
  env: NodeJS.ProcessEnv = process.env,
): SpeechToTextProvider {
  return {
    async transcribe(audio, locale) {
      const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
      const token = env.AI_RUNTIME_SERVICE_TOKEN;
      if (!base || !token)
        throw new SttUnavailableError(
          'stt_unavailable',
          'Trascrizione vocale non configurata',
          503,
        );
      const t0 = Date.now();
      let response: Response;
      try {
        response = await fetch(`${base}/v1/voice/transcribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: audio.bytes.toString('base64'),
            mime_type: audio.mimeType,
            locale,
          }),
          signal: AbortSignal.timeout(STT_TIMEOUT_MS),
        });
      } catch (error) {
        const timeout = error instanceof Error && error.name === 'TimeoutError';
        throw new SttUnavailableError(
          timeout ? 'stt_timeout' : 'stt_unavailable',
          timeout ? 'Trascrizione troppo lenta' : 'Servizio di trascrizione non raggiungibile',
          timeout ? 504 : 503,
        );
      }
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        const detail = (body?.detail ?? {}) as { kind?: string };
        if (response.status === 503 || detail.kind === 'not_configured')
          throw new SttUnavailableError(
            'stt_unavailable',
            'Trascrizione vocale non disponibile',
            503,
          );
        if (response.status === 504)
          throw new SttUnavailableError('stt_timeout', 'Trascrizione troppo lenta', 504);
        if (response.status === 400)
          throw new SttUnavailableError('stt_invalid_audio', 'Audio non valido', 400);
        throw new SttUnavailableError(
          'stt_provider_error',
          'Errore del servizio di trascrizione',
          502,
        );
      }
      const metadata = (body?.metadata ?? {}) as {
        provider?: string;
        model?: string;
        durationMs?: number;
        usage?: Record<string, unknown>;
      };
      const usage = Object.fromEntries(
        ['inputTokens', 'outputTokens', 'totalTokens']
          .map((k) => [k, metadata.usage?.[k]])
          .filter(([, v]) => typeof v === 'number'),
      );
      const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 2000) : '';
      return {
        text,
        locale: typeof body?.locale === 'string' ? body.locale : locale,
        confidence: typeof body?.confidence === 'number' ? body.confidence : null,
        timestamps: [],
        empty: body?.empty === true || !text,
        metadata: {
          provider: String(metadata.provider ?? 'runtime'),
          model: String(metadata.model ?? ''),
          durationMs: Number(metadata.durationMs ?? 0),
          roundTripMs: Date.now() - t0,
          ...(Object.keys(usage).length ? { usage } : {}),
        },
      };
    },
  };
}

/** WAV sanity check (RIFF/WAVE, PCM) — other containers are validated by the provider. */
export function looksLikeWav(bytes: Buffer): boolean {
  return (
    bytes.length > 44 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WAVE'
  );
}

// WAV only: it is the only container validated here (RIFF/WAVE) before a paid provider call.
// Other containers (webm/ogg from a future device) need their own validation first.
export const STT_MIME_TYPES = new Set(['audio/wav', 'audio/x-wav']);
export const MAX_UTTERANCE_BYTES = 2 * 1024 * 1024;
/** ~30 ms of 16 kHz PCM16: anything shorter cannot hold a word. */
export const MIN_UTTERANCE_BYTES = 1000;

/**
 * Per-environment switch of the voice channel (default OFF). The AI runtime is shared between
 * environments, so enabling STT there must not silently turn voice on everywhere: each backend
 * opts in with VOICE_CHANNEL_ENABLED=true (sending audio to the STT provider is a privacy decision).
 */
export function voiceChannelEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.VOICE_CHANNEL_ENABLED || '').trim().toLowerCase() === 'true';
}

let runtimeStatusCache: { at: number; available: boolean } | null = null;

/** Whether the runtime has an STT model configured (GET /v1/voice/stt-status, cached 60 s). */
export async function runtimeSttAvailable(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
  const token = env.AI_RUNTIME_SERVICE_TOKEN;
  if (!base || !token) return false;
  if (runtimeStatusCache && Date.now() - runtimeStatusCache.at < 60_000)
    return runtimeStatusCache.available;
  let available: boolean;
  try {
    const response = await fetch(`${base}/v1/voice/stt-status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2_000),
    });
    const body = (await response.json().catch(() => null)) as { available?: boolean } | null;
    available = response.ok && body?.available === true;
  } catch {
    available = false;
  }
  runtimeStatusCache = { at: Date.now(), available };
  return available;
}
